/**
 * Temple solver: can the hero clear a temple whatever order they spend their keys in?
 *
 * Section 4 of docs/Temple-Generation-Contract.md. Within a stretch of open doors the hero can walk anywhere, so
 * the only choice that matters is which locked door to open next. The solver searches every such choice
 * (depth first over the set of opened doors) and accepts a layout only when no order of openings leaves the hero
 * stuck: that is the "worst key order" of R3. Picking up keys and beating fights never hurts, so the hero is
 * taken to do both the moment a room is in reach.
 *
 * Each rule R1..R9 adds a reason that starts with its number; `solvable` is R2 alone.
 */
import {
  buildTempleGraph,
  describeRoom,
  reachableFrom,
  roomsOfKind,
  type Door,
  type GraphRoom,
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
}

type Verdict = { ok: true; history: string[] } | { ok: false; reason: string };

const NOTABLE = new Set(["entrance", "gate", "boss", "miniboss", "key", "master", "stairs-up", "stairs-down", "teleport"]);

const refOf = (graph: TempleGraph, key: string): RoomRef => graph.rooms.get(key)!.ref;

const name = (graph: TempleGraph, key: string): string => describeRoom(graph.rooms.get(key)!);

const doorName = (graph: TempleGraph, door: Door): string => `${name(graph, door.from)} -> ${name(graph, door.to)}`;

// --- walking with the doors opened so far ----------------------------------------------------------------------

/** A door the hero can walk through now. */
const passable = (door: Door, opened: ReadonlySet<string>, master: boolean): boolean =>
  door.lock === "none" || (door.lock === "small" && opened.has(door.id)) || (door.lock === "master" && master);

/**
 * Everything in reach from the entrance with `opened` doors unlocked. Keys and the master key are picked up on
 * the way; a boss door waits until the master key turns up, then opens.
 */
const explore = (graph: TempleGraph, opened: ReadonlySet<string>): Region => {
  const region: Region = { reached: new Set(), order: [], keysFound: 0, master: false };
  if (!graph.entrance) return region;
  const waiting: Door[] = [];

  const arrive = (key: string): void => {
    if (region.reached.has(key)) return;
    region.reached.add(key);
    region.order.push(key);
    const room = graph.rooms.get(key)!;
    region.keysFound += room.smallKeys;
    const isMasterKeyFound = room.masterKey && !region.master;
    if (isMasterKeyFound) {
      region.master = true;
      waiting.splice(0).forEach((door) => arrive(door.to));
    }
  };

  arrive(graph.entrance);
  for (let i = 0; i < region.order.length; i++) {
    for (const door of graph.out.get(region.order[i]) ?? []) {
      if (passable(door, opened, region.master)) arrive(door.to);
      else if (door.lock === "master") waiting.push(door);
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
  if (goal.gates.length > 0) {
    return goal.gates;
  }
  if (graph.entrance) {
    return [graph.entrance];
  }
  return [];
};

/** What a run still lacks, as text, or nothing when it is done. */
const missing = (graph: TempleGraph, goal: Goal, region: Region, opened: ReadonlySet<string>): string | undefined => {
  if (!goal.bosses.length) return "no boss room to reach";
  const boss = goal.bosses.find((key) => region.reached.has(key));
  if (!boss) return region.master ? "the boss room is out of reach" : "the master key is out of reach";
  const prize = goal.prizes.find((key) => region.reached.has(key));
  const isPrizeOutOfReach = goal.prizes.length > 0 && !prize;
  if (isPrizeOutOfReach) return "the Pegasus chest is out of reach";
  const closed = new Set(graph.doors.filter((door) => !passable(door, opened, true)).map((door) => door.id));
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
    if (!choices.length) verdict = { ok: false, reason: stuckReason(graph, region, opened, history, lacking) };
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
      if (seen.has(key)) continue;
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
  if (lost.length) reasons.push(`R1: ${lost.length} room${lost.length > 1 ? "s" : ""} out of reach: ${listRooms(graph, lost)}`);
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
  if (keys < critical) reasons.push(`R3: ${keys} small key${keys === 1 ? "" : "s"} for ${critical} locked door${critical === 1 ? "" : "s"} on the critical path`);
};

/** R4: the master key waits in or behind the mini-boss room and never behind the boss door. */
const checkMasterKey = (graph: TempleGraph, goal: Goal, reasons: string[]): void => {
  const masters = [...graph.rooms.values()].filter((room) => room.masterKey);
  const minibosses = roomsOfKind(graph, "miniboss").map((room) => room.key);
  if (masters.length !== 1) {
    reasons.push(masters.length ? `R4: ${masters.length} master keys` : "R4: no master key");
    return;
  }
  const master = masters[0];
  const isMasterKeyBehindBossDoor = !openReach(graph, goal.bosses).has(master.key) && openReach(graph).has(master.key);
  const isMasterKeyUnguarded = () => !minibosses.includes(master.key) && openReach(graph, minibosses).has(master.key);
  if (isMasterKeyBehindBossDoor) reasons.push(`R4: master key behind the boss door (${describeRoom(master)})`);
  if (!minibosses.length) reasons.push("R4: no mini-boss room to guard the master key");
  else if (isMasterKeyUnguarded()) reasons.push(`R4: the master key at ${describeRoom(master)} can be reached without passing the mini-boss`);
};

/** R5: mini-boss and boss rooms start their fight on entry. */
const checkAutoFights = (graph: TempleGraph, reasons: string[]): void => {
  for (const room of [...roomsOfKind(graph, "miniboss"), ...roomsOfKind(graph, "boss")]) {
    if (room.room.content?.lockOnEnter !== true) reasons.push(`R5: ${describeRoom(room)} does not lock on enter (content.lockOnEnter)`);
  }
};

/** Doors into a room from rooms that are not behind it. */
const doorsIntoFromOutside = (graph: TempleGraph, room: GraphRoom): Door[] => {
  const beyond = openReach(graph);
  const without = openReach(graph, [room.key]);
  return graph.doors.filter((door) => door.to === room.key && door.kind === "door" && beyond.has(door.from) && without.has(door.from));
};

/** R6: one boss room, one door into it, locked with the master key. */
const checkBossDoor = (graph: TempleGraph, goal: Goal, reasons: string[]): void => {
  if (goal.bosses.length !== 1) {
    reasons.push(goal.bosses.length ? `R6: ${goal.bosses.length} boss rooms` : "R6: no boss room");
    return;
  }
  const boss = graph.rooms.get(goal.bosses[0])!;
  const doors = doorsIntoFromOutside(graph, boss);
  if (doors.length !== 1) reasons.push(`R6: the boss room at ${describeRoom(boss)} has ${doors.length} doors from the temple (needs exactly one)`);
  const unlocked = doors.filter((door) => door.lock !== "master");
  if (unlocked.length) reasons.push(`R6: the boss door at ${describeRoom(boss)} is not locked with locked.master`);
};

/** R7: one Pegasus chest, and only the boss's defeat opens the way to it. */
const checkPegasus = (graph: TempleGraph, goal: Goal, reasons: string[]): void => {
  if (goal.prizes.length !== 1) {
    reasons.push(goal.prizes.length ? `R7: ${goal.prizes.length} Pegasus chests` : "R7: no Pegasus chest");
    return;
  }
  const prize = graph.rooms.get(goal.prizes[0])!;
  const isPrizeOpenWithoutBoss = goal.bosses.length > 0 && openReach(graph, goal.bosses).has(prize.key);
  if (isPrizeOpenWithoutBoss) reasons.push(`R7: the Pegasus chest at ${describeRoom(prize)} can be reached without beating the boss`);
};

/** R9: no small key waits behind the boss door. */
const checkDeadKeys = (graph: TempleGraph, goal: Goal, reasons: string[]): void => {
  if (!goal.bosses.length) return;
  const all = openReach(graph);
  const beforeBoss = openReach(graph, goal.bosses);
  for (const room of graph.rooms.values()) {
    const isDeadKey = room.smallKeys > 0 && all.has(room.key) && !beforeBoss.has(room.key);
    if (isDeadKey) reasons.push(`R9: small key behind the boss door (${describeRoom(room)})`);
  }
};

// --- the entry points -----------------------------------------------------------------------------------------

/** Solve a layout: R1..R9 as reasons, R2 as `solvable`, and the rooms of one winning run. */
export const solveTemple = (layout: TempleLayout): SolveResult => {
  const graph = buildTempleGraph(layout);
  const reasons = graph.issues.map((issue) => `${issue.rule}: ${issue.text}`);
  if (!graph.entrance) return { solvable: false, reasons: [...reasons, "R1: no entrance room"], order: [], criticalPath: [] };

  const goal = goalOf(graph);
  checkConnected(graph, reasons);
  const verdict = search(graph, goal, [], new Map());
  if (!verdict.ok) reasons.push(verdict.reason);
  checkKeyCount(graph, goal, reasons);
  checkMasterKey(graph, goal, reasons);
  checkAutoFights(graph, reasons);
  checkBossDoor(graph, goal, reasons);
  checkPegasus(graph, goal, reasons);
  checkDeadKeys(graph, goal, reasons);

  const run = verdict.ok ? replay(graph, verdict.history) : { order: [], critical: [] };
  return { solvable: verdict.ok, reasons: sortByRule(reasons), order: run.order, criticalPath: run.critical };
};

const sortByRule = (reasons: string[]): string[] => [...reasons].sort((a, b) => Number(a.slice(1, a.indexOf(":"))) - Number(b.slice(1, b.indexOf(":"))));

/** What the compass can point at: the locked doors the hero stands in front of, given the doors opened so far. */
export const openableDoors = (layout: TempleLayout, openedDoorIds: string[] = []): { doors: Door[]; keys: number } => {
  const graph = buildTempleGraph(layout);
  const opened = new Set(openedDoorIds);
  const region = explore(graph, opened);
  return { doors: closedDoorsInReach(graph, region, opened), keys: Math.max(0, region.keysFound - opened.size) };
};
