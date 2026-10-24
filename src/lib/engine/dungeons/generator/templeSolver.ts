/**
 * Temple solver: can the hero clear a temple whatever order they spend their keys in?
 *
 * Section 4 of docs/Temple-Generation-Contract.md. Within a stretch of open doors the hero can walk anywhere, so
 * the only choice that matters is which locked door to open next. The solver searches every such choice
 * (depth first over the set of opened doors) and accepts a layout only when no order of openings leaves the hero
 * stuck: that is the "worst key order" of R3. Picking up keys and beating fights never hurts, so the hero is
 * taken to do both the moment a room is in reach (a monster's key drop included). So does taking a Bomb: a cracked
 * wall is a door that opens, for good, once the hero has reached a room that gives out a Bomb (a shop, a Bomb chest,
 * a Bomb drop). A Bomb is the only thing that opens one, and opens nothing else: no locked door, no boss door.
 * A flight of stairs that waits for its floor to be cleared opens the moment the hero has reached every room to clear
 * on that floor (a fight, or a room holding quests): no key, so it takes no part in the search over door orders.
 *
 * Each rule R1..R9 adds a reason that starts with its number; `solvable` is R2 alone.
 */
import {
  buildTempleGraph,
  describeRoom,
  floorOfKey,
  isRoomToClear,
  reachableFrom,
  roomsOfKind,
  roomsToClearByFloor,
  type Door,
  type GraphRoom,
  type LockKind,
  type RoomRef,
  type TempleGraph,
  type TempleLayout,
} from "./templeGraph";

export interface SolveResult {
  /** The hero reaches the boss, the Pegasus chest and the gate whatever order they open doors in (R2) */
  solvable: boolean;
  /** Every broken rule, "R4: master key behind the boss door" style; empty when the temple passes */
  reasons: string[];
  /** Every room, in the order one winning run first reaches it */
  order: RoomRef[];
  /** The rooms that matter on that run: entrance, keys, locked doors, mini-boss, master key, boss, Pegasus, gate */
  criticalPath: RoomRef[];
}

/** What the hero holds and where they can walk with a given set of doors opened. */
interface Region {
  reached: Set<string>;
  /** Room keys in the order they came into reach */
  order: string[];
  keysFound: number;
  master: boolean;
  /** The hero has reached a room that gives out a Bomb (roomGrants.isBombSource): every cracked wall is theirs to blow */
  bombs: boolean;
  /** Floors whose every room to clear has been reached (a floor with none counts from the start): their floor-cleared stairs are open */
  cleared: Set<string>;
}

type Verdict = { ok: true; history: string[] } | { ok: false; reason: string };

const NOTABLE = new Set(["entrance", "gate", "boss", "miniboss", "key", "master", "stairs-up", "stairs-down", "teleport"]);

const refOf = (graph: TempleGraph, key: string): RoomRef => graph.rooms.get(key)!.ref;

const name = (graph: TempleGraph, key: string): string => describeRoom(graph.rooms.get(key)!);

const doorName = (graph: TempleGraph, door: Door): string => `${name(graph, door.from)} -> ${name(graph, door.to)}`;

// --- walking with the doors opened so far ----------------------------------------------------------------------

/** What the hero carries that opens a door by itself, not a key spent door by door: the Boss Key, a Bomb, a cleared floor. */
interface Carried {
  master: boolean;
  bombs: boolean;
  cleared: ReadonlySet<string>;
}

/** The locks that open by themselves once the hero has found what they wait for: the explorer parks a door behind one. */
const WAITING_LOCKS = new Set<LockKind>(["master", "bomb", "floorCleared"]);

/** The stairs that wait for `floor` to be cleared: the doors its last room to clear lets the hero through. */
const waitsOnFloor =
  (floor: string) =>
  (door: Door): boolean => {
    const isItsStairs = door.lock === "floorCleared" && floorOfKey(door.from) === floor;
    return isItsStairs;
  };

/**
 * A door the hero can walk through now. A Bomb opens only a cracked wall, the Boss Key only a boss door, and a cleared
 * floor only the stairs of that floor.
 */
const passable = (door: Door, opened: ReadonlySet<string>, carried: Carried): boolean => {
  switch (door.lock) {
    case "none":
      return true;
    case "small":
      return opened.has(door.id);
    case "master":
      return carried.master;
    case "bomb":
      return carried.bombs;
    case "floorCleared":
      return carried.cleared.has(floorOfKey(door.from));
  }
};

/**
 * Everything in reach from the entrance with `opened` doors unlocked. Keys, the master key and Bombs are picked up on
 * the way; a boss door waits until the master key turns up, a cracked wall until a room that gives out a Bomb is
 * reached, a floor-cleared flight until every room to clear on its floor is reached, and then each opens.
 */
const explore = (graph: TempleGraph, opened: ReadonlySet<string>): Region => {
  const region: Region = { reached: new Set(), order: [], keysFound: 0, master: false, bombs: false, cleared: new Set() };
  const { entrance } = graph;
  if (!entrance) return region;
  const waiting: Door[] = [];

  // The rooms to clear on each floor that the hero has not reached yet: a floor with none is cleared from the start
  const toClear = new Map([...roomsToClearByFloor(graph)].map(([floor, keys]) => [floor, new Set(keys)]));
  for (const [floor, keys] of toClear) {
    const hasNothingToClear = keys.size === 0;
    if (hasNothingToClear) region.cleared.add(floor);
  }

  /** The floor this room finished clearing (its last room to clear), if it did */
  const clearedBy = (room: GraphRoom): string | undefined => {
    const left = toClear.get(room.ref.floor);
    const isRoomToReach = Boolean(left?.delete(room.key));
    const isFloorJustCleared = isRoomToReach && left?.size === 0;
    if (!isFloorJustCleared) return undefined;
    region.cleared.add(room.ref.floor);
    return room.ref.floor;
  };

  const arrive = (key: string): void => {
    const isReached = region.reached.has(key);
    if (isReached) return;
    region.reached.add(key);
    region.order.push(key);
    const room = graph.rooms.get(key)!;
    region.keysFound += room.smallKeys;

    // What the hero finds here opens the doors that were waiting for it: walk through them now
    const opens: Array<(door: Door) => boolean> = [];
    const isMasterKeyFound = room.masterKey && !region.master;
    if (isMasterKeyFound) {
      region.master = true;
      opens.push((door) => door.lock === "master");
    }
    const isBombFound = room.bombs && !region.bombs;
    if (isBombFound) {
      region.bombs = true;
      opens.push((door) => door.lock === "bomb");
    }
    const floor = isRoomToClear(room) ? clearedBy(room) : undefined;
    if (floor) opens.push(waitsOnFloor(floor));
    for (const isOpened of opens) {
      const ready = waiting.filter(isOpened);
      waiting.splice(0, waiting.length, ...waiting.filter((door) => !isOpened(door)));
      ready.forEach((door) => arrive(door.to));
    }
  };

  arrive(entrance);
  for (let i = 0; i < region.order.length; i++) {
    for (const door of graph.out.get(region.order[i]) ?? []) {
      const isPassable = passable(door, opened, region);
      const isWaitingDoor = WAITING_LOCKS.has(door.lock);
      if (isPassable) arrive(door.to);
      else if (isWaitingDoor) waiting.push(door);
    }
  }
  return region;
};

/** Small-key doors the hero stands in front of and has not opened. */
const closedDoorsInReach = (graph: TempleGraph, region: Region, opened: ReadonlySet<string>): Door[] =>
  graph.doors.filter((door) => door.lock === "small" && !opened.has(door.id) && region.reached.has(door.from));

// --- the goal -------------------------------------------------------------------------------------------------

/** The rooms a run must take in: the boss, the prize behind it, and the way out. */
interface Goal {
  bosses: string[];
  prizes: string[];
  gates: string[];
}

const goalOf = (graph: TempleGraph): Goal => ({
  bosses: roomsOfKind(graph, "boss").map((room) => room.key),
  prizes: [...graph.rooms.values()].filter((room) => room.prize).map((room) => room.key),
  gates: roomsOfKind(graph, "gate").map((room) => room.key),
});

/** The gate the hero leaves by: a gate room when the temple has one, else the entrance. */
const exits = (graph: TempleGraph, goal: Goal): string[] => {
  const hasGates = goal.gates.length > 0;
  if (hasGates) {
    return goal.gates;
  }
  const { entrance } = graph;
  if (entrance) {
    return [entrance];
  }
  return [];
};

/** What a run still lacks, as text, or nothing when it is done. */
const missing = (graph: TempleGraph, goal: Goal, region: Region, opened: ReadonlySet<string>): string | undefined => {
  const hasNoBoss = !goal.bosses.length;
  if (hasNoBoss) return "no boss room to reach";
  const boss = goal.bosses.find((key) => region.reached.has(key));
  if (!boss) return region.master ? "the boss room is out of reach" : "the master key is out of reach";
  const prize = goal.prizes.find((key) => region.reached.has(key));
  const isPrizeOutOfReach = goal.prizes.length > 0 && !prize;
  if (isPrizeOutOfReach) return "the Pegasus chest is out of reach";
  const closed = new Set(graph.doors.filter((door) => !passable(door, opened, { master: true, bombs: region.bombs, cleared: region.cleared })).map((door) => door.id));
  const back = new Set(reachableFrom(graph, prize ?? boss, new Set(), closed));
  return exits(graph, goal).some((key) => back.has(key)) ? undefined : "no way back to the gate";
};

// --- the search over door orders ------------------------------------------------------------------------------

const stuckReason = (graph: TempleGraph, region: Region, opened: Set<string>, history: string[], lacking: string): string => {
  const keys = region.keysFound - opened.size;
  const doors = closedDoorsInReach(graph, region, opened).map((door) => doorName(graph, door));
  const after = history.length ? ` after opening ${history.map((id) => doorName(graph, graph.doors.find((door) => door.id === id)!)).join(", then ")}` : "";
  const standing = doors.length ? `${doors.length} locked door${doors.length > 1 ? "s" : ""} in reach (${doors.join("; ")})` : "no locked door in reach";
  return `R2: ${lacking}${after}: ${keys} key${keys === 1 ? "" : "s"} in hand, ${standing}`;
};

/**
 * Try every order of opening the doors in reach. Succeeds only when every order gets the hero out; the history
 * returned is one winning order. Memoised on the set of opened doors, since the order they were opened in does
 * not change where the hero can go.
 */
const search = (graph: TempleGraph, goal: Goal, history: string[], memo: Map<string, Verdict>): Verdict => {
  const opened = new Set(history);
  const memoKey = [...opened].sort().join("|");
  const known = memo.get(memoKey);
  if (known) return known;

  const region = explore(graph, opened);
  const lacking = missing(graph, goal, region, opened);
  let verdict: Verdict = { ok: true, history };
  if (lacking) {
    const keys = region.keysFound - opened.size;
    const choices = keys > 0 ? closedDoorsInReach(graph, region, opened) : [];
    const isOutOfChoices = !choices.length;
    if (isOutOfChoices) verdict = { ok: false, reason: stuckReason(graph, region, opened, history, lacking) };
    else {
      const branches = choices.map((door) => search(graph, goal, [...history, door.id], memo));
      verdict = branches.find((branch) => !branch.ok) ?? branches[0];
    }
  }
  memo.set(memoKey, verdict);
  return verdict;
};

/** Walk a winning run again, door by door, to list the rooms in the order they came into reach. */
const replay = (graph: TempleGraph, history: string[]): { order: RoomRef[]; critical: RoomRef[] } => {
  const seen = new Set<string>();
  const order: string[] = [];
  const critical: string[] = [];
  const targets = new Set(history.map((id) => graph.doors.find((door) => door.id === id)!.to));
  for (let step = 0; step <= history.length; step++) {
    const region = explore(graph, new Set(history.slice(0, step)));
    for (const key of region.order) {
      const isSeen = seen.has(key);
      if (isSeen) continue;
      seen.add(key);
      order.push(key);
      const room = graph.rooms.get(key)!;
      const isCriticalRoom = NOTABLE.has(room.kind) || room.smallKeys > 0 || room.masterKey || room.prize || targets.has(key);
      if (isCriticalRoom) critical.push(key);
    }
  }
  return { order: order.map((key) => refOf(graph, key)), critical: critical.map((key) => refOf(graph, key)) };
};

// --- the rules -------------------------------------------------------------------------------------------------

/** Rooms in reach from the entrance with every door open, never stepping into `blocked`. */
const openReach = (graph: TempleGraph, blocked: string[] = []): Set<string> => new Set(reachableFrom(graph, graph.entrance!, new Set(blocked)));

const listRooms = (graph: TempleGraph, keys: string[]): string => {
  const shown = keys.slice(0, 4).map((key) => name(graph, key));
  return keys.length > 4 ? `${shown.join(", ")} and ${keys.length - 4} more` : shown.join(", ");
};

/** R1: every room is in reach when all doors stand open. */
const checkConnected = (graph: TempleGraph, reasons: string[]): void => {
  const reach = openReach(graph);
  const lost = [...graph.rooms.keys()].filter((key) => !reach.has(key));
  const hasLostRooms = lost.length > 0;
  if (hasLostRooms) reasons.push(`R1: ${lost.length} room${lost.length > 1 ? "s" : ""} out of reach: ${listRooms(graph, lost)}`);
};

/** A small-key door with no way around it on the way to the boss. */
const isCritical = (graph: TempleGraph, goal: Goal, door: Door): boolean => {
  const reach = new Set(reachableFrom(graph, graph.entrance!, new Set(), new Set([door.id])));
  return !goal.bosses.some((key) => reach.has(key));
};

/** R3: as many small keys as locked doors on the critical path. */
const checkKeyCount = (graph: TempleGraph, goal: Goal, reasons: string[]): void => {
  const keys = [...graph.rooms.values()].reduce((sum, room) => sum + room.smallKeys, 0);
  const critical = graph.doors.filter((door) => door.lock === "small" && isCritical(graph, goal, door)).length;
  const isShortOfKeys = keys < critical;
  if (isShortOfKeys) reasons.push(`R3: ${keys} small key${keys === 1 ? "" : "s"} for ${critical} locked door${critical === 1 ? "" : "s"} on the critical path`);
};

/** R4: the master key waits in or behind the mini-boss room and never behind the boss door. */
const checkMasterKey = (graph: TempleGraph, goal: Goal, reasons: string[]): void => {
  const masters = [...graph.rooms.values()].filter((room) => room.masterKey);
  const minibosses = roomsOfKind(graph, "miniboss").map((room) => room.key);
  const hasOneMasterKey = masters.length === 1;
  if (!hasOneMasterKey) {
    reasons.push(masters.length ? `R4: ${masters.length} master keys` : "R4: no master key");
    return;
  }
  const master = masters[0];
  const isMasterKeyBehindBossDoor = !openReach(graph, goal.bosses).has(master.key) && openReach(graph).has(master.key);
  const isMasterKeyUnguarded = () => !minibosses.includes(master.key) && openReach(graph, minibosses).has(master.key);
  if (isMasterKeyBehindBossDoor) reasons.push(`R4: master key behind the boss door (${describeRoom(master)})`);
  const hasNoMiniboss = !minibosses.length;
  if (hasNoMiniboss) reasons.push("R4: no mini-boss room to guard the master key");
  else if (isMasterKeyUnguarded()) reasons.push(`R4: the master key at ${describeRoom(master)} can be reached without passing the mini-boss`);
};

/** R5: mini-boss and boss rooms start their fight on entry. */
const checkAutoFights = (graph: TempleGraph, reasons: string[]): void => {
  for (const room of [...roomsOfKind(graph, "miniboss"), ...roomsOfKind(graph, "boss")]) {
    const isAutoLocking = room.room.content?.lockOnEnter === true;
    if (!isAutoLocking) reasons.push(`R5: ${describeRoom(room)} does not lock on enter (content.lockOnEnter)`);
  }
};

/** Doors into a room from rooms that are not behind it. */
const doorsIntoFromOutside = (graph: TempleGraph, room: GraphRoom): Door[] => {
  const beyond = openReach(graph);
  const without = openReach(graph, [room.key]);
  return graph.doors.filter((door) => door.to === room.key && door.kind === "door" && beyond.has(door.from) && without.has(door.from));
};

/** R6: one boss room, one door into it. Every door into a boss room needs the master key (templeGraph.lockBetween), so the lock itself is not checked. */
const checkBossDoor = (graph: TempleGraph, goal: Goal, reasons: string[]): void => {
  const hasOneBoss = goal.bosses.length === 1;
  if (!hasOneBoss) {
    reasons.push(goal.bosses.length ? `R6: ${goal.bosses.length} boss rooms` : "R6: no boss room");
    return;
  }
  const boss = graph.rooms.get(goal.bosses[0])!;
  const doors = doorsIntoFromOutside(graph, boss);
  const hasOneDoor = doors.length === 1;
  if (!hasOneDoor) reasons.push(`R6: the boss room at ${describeRoom(boss)} has ${doors.length} doors from the temple (needs exactly one)`);
};

/** R7: one Pegasus chest, and only the boss's defeat opens the way to it. */
const checkPegasus = (graph: TempleGraph, goal: Goal, reasons: string[]): void => {
  const hasOnePrize = goal.prizes.length === 1;
  if (!hasOnePrize) {
    reasons.push(goal.prizes.length ? `R7: ${goal.prizes.length} Pegasus chests` : "R7: no Pegasus chest");
    return;
  }
  const prize = graph.rooms.get(goal.prizes[0])!;
  const isPrizeOpenWithoutBoss = goal.bosses.length > 0 && openReach(graph, goal.bosses).has(prize.key);
  if (isPrizeOpenWithoutBoss) reasons.push(`R7: the Pegasus chest at ${describeRoom(prize)} can be reached without beating the boss`);
};

/** R9: no small key waits behind the boss door. */
const checkDeadKeys = (graph: TempleGraph, goal: Goal, reasons: string[]): void => {
  const hasNoBoss = !goal.bosses.length;
  if (hasNoBoss) return;
  const all = openReach(graph);
  const beforeBoss = openReach(graph, goal.bosses);
  for (const room of graph.rooms.values()) {
    const isDeadKey = room.smallKeys > 0 && all.has(room.key) && !beforeBoss.has(room.key);
    if (isDeadKey) reasons.push(`R9: small key behind the boss door (${describeRoom(room)})`);
  }
};

/**
 * R2, for the stairs that wait for their floor to be cleared: a flight no run opens. With every small key turned (and the
 * Boss Key and a Bomb taken wherever they lie) the floor still has a room to clear the hero never reaches, a room walled
 * off or cut off by this very flight, so the stairs lead nowhere. One reason per such flight, naming the stairs and the
 * first room it waits on.
 */
const deadFloorClearedStairs = (graph: TempleGraph): string[] => {
  const everyKeyTurned = new Set(graph.doors.filter((door) => door.lock === "small").map((door) => door.id));
  const region = explore(graph, everyKeyTurned);
  const toClear = roomsToClearByFloor(graph);
  const reasons: string[] = [];
  for (const door of graph.doors) {
    const floor = floorOfKey(door.from);
    const isDeadStairs = door.lock === "floorCleared" && !region.cleared.has(floor);
    if (!isDeadStairs) continue;
    const waitingOn = (toClear.get(floor) ?? []).find((key) => !region.reached.has(key));
    const stuckOn = waitingOn ? name(graph, waitingOn) : "a room of its floor";
    reasons.push(`R2: the floor-cleared stairs at ${name(graph, door.from)} never open: ${stuckOn} is out of reach`);
  }
  return reasons;
};

// --- the entry points -----------------------------------------------------------------------------------------

/**
 * Solve a layout: R1..R9 as reasons, R2 as `solvable`, and the rooms of one winning run. A floor-cleared flight no run
 * opens is an R2 failure of its own (deadFloorClearedStairs): the temple is not solvable then, even if the keys alone
 * would see the hero through.
 */
export const solveTemple = (layout: TempleLayout): SolveResult => {
  const graph = buildTempleGraph(layout);
  const reasons = graph.issues.map((issue) => `${issue.rule}: ${issue.text}`);
  const hasEntrance = Boolean(graph.entrance);
  if (!hasEntrance) return { solvable: false, reasons: [...reasons, "R1: no entrance room"], order: [], criticalPath: [] };

  const goal = goalOf(graph);
  checkConnected(graph, reasons);
  const verdict = search(graph, goal, [], new Map());
  const isStuck = !verdict.ok;
  if (isStuck) reasons.push(verdict.reason);
  const deadStairs = deadFloorClearedStairs(graph);
  reasons.push(...deadStairs);
  checkKeyCount(graph, goal, reasons);
  checkMasterKey(graph, goal, reasons);
  checkAutoFights(graph, reasons);
  checkBossDoor(graph, goal, reasons);
  checkPegasus(graph, goal, reasons);
  checkDeadKeys(graph, goal, reasons);

  const isSolvable = verdict.ok && deadStairs.length === 0;
  const run = isSolvable ? replay(graph, verdict.history) : { order: [], critical: [] };
  return { solvable: isSolvable, reasons: sortByRule(reasons), order: run.order, criticalPath: run.critical };
};

const sortByRule = (reasons: string[]): string[] => [...reasons].sort((a, b) => Number(a.slice(1, a.indexOf(":"))) - Number(b.slice(1, b.indexOf(":"))));

/** What the compass can point at: the locked doors the hero stands in front of, given the doors opened so far. */
export const openableDoors = (layout: TempleLayout, openedDoorIds: string[] = []): { doors: Door[]; keys: number } => {
  const graph = buildTempleGraph(layout);
  const opened = new Set(openedDoorIds);
  const region = explore(graph, opened);
  return { doors: closedDoorsInReach(graph, region, opened), keys: Math.max(0, region.keysFound - opened.size) };
};
