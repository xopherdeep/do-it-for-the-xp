/**
 * Project Towers progress rules: when a floor is cleared, what its early-finish bonus is and who gets it, which floor
 * wakes next, how the roof finishes the project, and how an extension moves the floors still open. Pure: records,
 * quests and quest-log entries go in and come out as copies; projectService.ts commits them.
 *
 * A floor is cleared when every chore it still has was paid (a chore the Game Master deleted no longer counts, so a
 * floor with none left reads cleared). It is dated by the day the LAST chore was claimed, never the day it was approved,
 * so a late approval costs the hero nothing. The bonus is the part above x1 of the floor's XP and GP, each chore counted
 * once however many heroes were paid for it, split among the heroes who worked it (floorBonus.ts). Settling a floor wakes
 * the one above it, and walks on past any floor with no chores left; the roof settled finishes the project.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { dateKey } from "@/lib/services/core/packs/packCommon";
import { floorBonusPool, floorMultiplier, splitFloorBonus, type FloorBonus } from "./floorBonus";
import { projectStartsOn } from "./projectQuests";
import type { ProjectFloor, ProjectRecord } from "./projectRecord";
import { ROOF_PHASE_ID, extendWindows, type PhaseWindow } from "./projectSchedule";

/** Records, quests and entries are plain data, so a trip through JSON is a deep copy (the storage does the same) */
const copyOf = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const floorOf = (project: ProjectRecord, floorKey: string): ProjectFloor | undefined =>
  project.floors.find((floor) => floor.floorKey === floorKey);

/** The project with `floor` in place of the floor it has under the same key */
const withFloor = (project: ProjectRecord, floor: ProjectFloor): ProjectRecord => ({
  ...project,
  floors: project.floors.map((each) => (each.floorKey === floor.floorKey ? floor : each)),
});

/** The quests, out of those given, that are the floor's chores */
const questsOfFloor = (floor: ProjectFloor, quests: readonly Achievement[]): Achievement[] => {
  const ids = new Set(floor.questIds);
  return quests.filter((quest) => ids.has(String(quest.id)));
};

/** The quest woken: its link carries the instant its floor woke (a quest with no link is not a project chore) */
const woken = (quest: Achievement, wokenAt: string): Achievement =>
  quest.project ? { ...quest, project: { ...quest.project, wokenAt } } : quest;

// ---- Waking -------------------------------------------------------------------------------------------------------

/** The floor with the instant it woke: kept as it was when it had woken already */
const stampedAwake = (floor: ProjectFloor, now: Date): ProjectFloor => ({ ...floor, wokenAt: floor.wokenAt ?? now.toISOString() });

/**
 * The floor woken at `now` and its chores with the instant on their link. A floor already woken comes back as it is,
 * its quests unchanged (copies all the same). The quests are the floor's own, out of those given.
 */
export function wakeFloor(
  project: ProjectRecord,
  floorKey: string,
  quests: readonly Achievement[],
  now: Date
): { project: ProjectRecord; quests: Achievement[] } {
  const base = copyOf(project);
  const floor = floorOf(base, floorKey);
  if (!floor) return { project: base, quests: [] };
  const isAsleep = !floor.wokenAt;
  const awake = stampedAwake(floor, now);
  const own = questsOfFloor(floor, quests).map(copyOf);
  return {
    project: withFloor(base, awake),
    quests: isAsleep ? own.map((quest) => woken(quest, awake.wokenAt as string)) : own,
  };
}

/** Whether the floor is awake now and was asleep in `before` */
const isNewlyWoken = (before: ProjectRecord, floor: ProjectFloor): boolean => {
  const wasAwake = Boolean(floorOf(before, floor.floorKey)?.wokenAt);
  return Boolean(floor.wokenAt) && !wasAwake;
};

/** The chores of every floor that woke between the two records, carrying the instant their floor woke */
export function questsWokenBy(before: ProjectRecord, after: ProjectRecord, quests: readonly Achievement[]): Achievement[] {
  return after.floors
    .filter((floor) => isNewlyWoken(before, floor))
    .flatMap((floor) => questsOfFloor(floor, quests).map((quest) => woken(copyOf(quest), floor.wokenAt as string)));
}

// ---- Clearing -----------------------------------------------------------------------------------------------------

/** Whether the entry paid its rewards: a claim held for approval, or turned down, did not */
export const isPaidEntry = (entry: QuestLogEntry): boolean => entry.rewardsApplied === true;

/** The paid entries for the chores the floor still has */
const workOn = (floor: ProjectFloor, quests: readonly Achievement[], entries: readonly QuestLogEntry[]): QuestLogEntry[] => {
  const ids = new Set(questsOfFloor(floor, quests).map((quest) => String(quest.id)));
  return entries.filter((entry) => isPaidEntry(entry) && ids.has(String(entry.questId)));
};

/** Every chore the floor still has was paid; a deleted chore is not asked for, so an emptied floor is cleared */
export function isFloorCleared(floor: ProjectFloor, quests: readonly Achievement[], paid: readonly QuestLogEntry[]): boolean {
  const paidIds = new Set(workOn(floor, quests, paid).map((entry) => String(entry.questId)));
  return questsOfFloor(floor, quests).every((quest) => paidIds.has(String(quest.id)));
}

/** The local day the hero claimed it: the log's own day, or the claim's time read in local time */
const dayOfEntry = (entry: QuestLogEntry): string => {
  const hasDay = /^\d{4}-\d{2}-\d{2}$/.test(entry.dayKey ?? "");
  return hasDay ? entry.dayKey : dateKey(new Date(entry.completedAt));
};

const byClaim = (a: QuestLogEntry, b: QuestLogEntry): number => Date.parse(a.completedAt) - Date.parse(b.completedAt);

const isWorthPaying = (grant: FloorBonus): boolean => grant.xp > 0 || grant.gp > 0;

/** The grants worth paying: a floor cleared late (x1) has no bonus to hand out, and no empty reward line is written */
const payable = (grants: Record<string, FloorBonus>): Record<string, FloorBonus> =>
  Object.fromEntries(Object.entries(grants).filter(([, grant]) => isWorthPaying(grant)));

interface Bonus {
  multiplier: number;
  grants: Record<string, FloorBonus>;
}

/**
 * What clearing the floor earns: the multiplier of the day its last chore was claimed and the pool above x1 of the
 * chores' own XP and GP, split among the heroes paid for them. AP never grows. A floor with no chores left earned
 * nothing, so it is stamped x1 whatever its window says.
 */
const bonusOf = (floor: ProjectFloor, quests: readonly Achievement[], paid: readonly QuestLogEntry[]): Bonus => {
  const work = workOn(floor, quests, paid).sort(byClaim);
  const last = work[work.length - 1];
  const live = questsOfFloor(floor, quests);
  const multiplier = last ? floorMultiplier(floor.window, dayOfEntry(last)) : 1;
  const chores = live.map((quest) => ({ xp: Number(quest.xp) || 0, gp: Number(quest.gp) || 0 }));
  const pool = floorBonusPool(chores, multiplier);
  const split = splitFloorBonus(pool, work.map((entry) => entry.userId), last?.userId ?? "");
  return { multiplier, grants: payable(split) };
};

export interface FloorSettlement {
  project: ProjectRecord;
  /** The bonus each hero is paid, XP and GP (AP is never multiplied); a hero with nothing to be paid is not listed */
  grants: Record<string, { xp: number; gp: number }>;
  /** The floor that ends up woken and open: the highest one woken (past any floor with no chores left) */
  wake?: string;
  /** The roof was settled: the project is cleared and its reward earned */
  finished: boolean;
}

const settledFloor = (floor: ProjectFloor, multiplier: number, now: Date): ProjectFloor => {
  const stamp = now.toISOString();
  return { ...floor, multiplier, clearedAt: stamp, bonusPaidAt: stamp };
};

const finishedProject = (project: ProjectRecord, now: Date): ProjectRecord => {
  const stamp = now.toISOString();
  return { ...project, status: "cleared", clearedAt: stamp, reward: { ...project.reward, earnedAt: stamp } };
};

/** What came of settling: the record, and the floor left open above (none when the project finished) */
interface Climb {
  project: ProjectRecord;
  wake?: string;
  finished: boolean;
}

/**
 * After `below` was settled: the roof finishes the project; any other floor wakes the one above it. A floor above with no
 * chores left is settled on the spot (nothing to pay), and one already settled (cleared out of order) is passed over as
 * it is; the climb goes on from either.
 */
const climb = (project: ProjectRecord, below: ProjectFloor, quests: readonly Achievement[], paid: readonly QuestLogEntry[], now: Date): Climb => {
  const isRoof = below.phaseId === ROOF_PHASE_ID;
  if (isRoof) return { project: finishedProject(project, now), finished: true };
  const above = project.floors[project.floors.findIndex((floor) => floor.floorKey === below.floorKey) + 1];
  if (!above) return { project, finished: false };
  const isSettled = Boolean(above.clearedAt);
  if (isSettled) return climb(project, above, quests, paid, now);
  const awake = stampedAwake(above, now);
  const hasNoChores = questsOfFloor(above, quests).length === 0;
  if (!hasNoChores) return { project: withFloor(project, awake), wake: above.floorKey, finished: false };
  const settled = settledFloor(awake, bonusOf(above, quests, paid).multiplier, now);
  return climb(withFloor(project, settled), settled, quests, paid, now);
};

/**
 * The floor settled at `now`: its multiplier and bonus stamped, the bonus split into grants, the floor above woken (and
 * the roof's clear finishing the project). Null when the floor is not cleared, or was settled before (a second approval,
 * a second phone): the bonus is paid once and the next floor woken once. The record given is not touched.
 */
export function settleFloor(
  project: ProjectRecord,
  floorKey: string,
  quests: readonly Achievement[],
  paid: readonly QuestLogEntry[],
  now: Date
): FloorSettlement | null {
  const base = copyOf(project);
  const floor = floorOf(base, floorKey);
  if (!floor) return null;
  const isSettled = Boolean(floor.clearedAt);
  const canSettle = !isSettled && isFloorCleared(floor, quests, paid);
  if (!canSettle) return null;
  const bonus = bonusOf(floor, quests, paid);
  const settled = settledFloor(floor, bonus.multiplier, now);
  return { grants: bonus.grants, ...climb(withFloor(base, settled), settled, quests, paid, now) };
}

/** One floor settled, and what its own bonus handed out */
export interface SettledFloor {
  floorKey: string;
  grants: Record<string, FloorBonus>;
}

/** Every floor a settling pass settled, lowest first; the rest is the pass as a whole (see FloorSettlement) */
export interface ReadySettlement extends FloorSettlement {
  floors: SettledFloor[];
}

/** A floor that woke, was not settled, and reads cleared */
const isReadyToSettle = (floor: ProjectFloor, quests: readonly Achievement[], paid: readonly QuestLogEntry[]): boolean => {
  const isOpen = Boolean(floor.wokenAt) && !floor.clearedAt;
  return isOpen && isFloorCleared(floor, quests, paid);
};

/** The grants of all the floors in one, a hero's shares added up (for saying what a pass handed out, not for paying it) */
const totalGrants = (settled: readonly SettledFloor[]): Record<string, FloorBonus> => {
  const total: Record<string, FloorBonus> = {};
  for (const { grants } of settled) {
    for (const [heroId, grant] of Object.entries(grants)) {
      const had = total[heroId] ?? { xp: 0, gp: 0 };
      total[heroId] = { xp: had.xp + grant.xp, gp: had.gp + grant.gp };
    }
  }
  return total;
};

/**
 * Every floor of a running project that woke, was not settled and reads cleared, settled at `now`, lowest first, each
 * climbing as settleFloor does (so a floor the pass wakes that is already cleared is settled in the same pass). This is
 * what a payment, an arrival and a board refresh ask: a floor whose settling failed earlier, or that cleared because the
 * Game Master deleted its last open chore, is settled the next time anything asks. Null when there is nothing to settle
 * (also for a project that is not running). `floors` has each floor settled with its own grants (the bonus is paid per
 * floor); `wake` and `finished` are those of the last one. The record given is not touched.
 */
export function settleReady(
  project: ProjectRecord,
  quests: readonly Achievement[],
  paid: readonly QuestLogEntry[],
  now: Date
): ReadySettlement | null {
  const isRunning = project.status === "active";
  if (!isRunning) return null;
  const readyIn = (record: ProjectRecord): ProjectFloor | undefined => record.floors.find((floor) => isReadyToSettle(floor, quests, paid));
  let current = project;
  let last: FloorSettlement | null = null;
  const floors: SettledFloor[] = [];
  for (let ready = readyIn(current); ready; ready = readyIn(current)) {
    const settlement = settleFloor(current, ready.floorKey, quests, paid, now);
    if (!settlement) break;
    floors.push({ floorKey: ready.floorKey, grants: settlement.grants });
    current = settlement.project;
    last = settlement;
  }
  if (!last) return null;
  return { project: current, grants: totalGrants(floors), ...(last.wake ? { wake: last.wake } : {}), finished: last.finished, floors };
}

// ---- Extending ----------------------------------------------------------------------------------------------------

/** The quest on a new window: it opens with it and falls due on its last day */
const rewindowed = (quest: Achievement, window: PhaseWindow): Achievement => {
  const next = copyOf(quest);
  if (!next.project) return next;
  return { ...next, startsOn: projectStartsOn(window.opensOn), project: { ...next.project, dueOn: window.dueOn } };
};

/**
 * The roof's window after the end moved: the last phase's new one. With the last phase cleared that window stays in the
 * past, so the roof gets its own, from today to the new end.
 */
const roofWindow = (lastPhase: ProjectFloor | undefined, spread: ReadonlyMap<string, PhaseWindow>, today: string, newEndOn: string): PhaseWindow => {
  const phaseId = lastPhase?.phaseId ?? ROOF_PHASE_ID;
  const respread = lastPhase?.clearedAt ? undefined : spread.get(phaseId);
  return respread ?? { phaseId, opensOn: today, dueOn: newEndOn };
};

/** Whether the text is a real calendar day written YYYY-MM-DD (2027-02-30 and 2027-4-8 are not) */
const isRealDay = (text: string): boolean => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!parts) return false;
  const [year, month, day] = parts.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

/** extendWindows reads a day it cannot parse as today, so the dates are checked here, before any window is written */
const assertRealDay = (text: string, what: string): void => {
  if (!isRealDay(text)) throw new RangeError(`${what} must be a real day written YYYY-MM-DD, not "${text}"`);
};

/**
 * The project and its open chores after the end moved to `newEndOn`: the cleared floors keep their windows, bonuses and
 * quests; the others are spread again from `today` by the phases' shares (projectSchedule.extendWindows, which refuses an
 * end before today or too near for the floors left), the roof taking the last phase's window. Both dates must be real
 * days written YYYY-MM-DD, or it throws a RangeError. The quests returned are those that moved: their `startsOn` and
 * `project.dueOn` follow their floor's window.
 */
export function rescheduleFloors(
  project: ProjectRecord,
  shares: Readonly<Record<string, number>>,
  quests: readonly Achievement[],
  today: string,
  newEndOn: string
): { project: ProjectRecord; quests: Achievement[] } {
  assertRealDay(today, "Today");
  assertRealDay(newEndOn, "The new end");
  const base = copyOf(project);
  const phases = base.floors.filter((floor) => floor.phaseId !== ROOF_PHASE_ID);
  const clearedIds = new Set(phases.filter((floor) => floor.clearedAt).map((floor) => floor.phaseId));
  const windows = extendWindows(phases.map((floor) => floor.window), shares, clearedIds, today, newEndOn);
  const spread = new Map(windows.map((window) => [window.phaseId, window]));
  const roof = roofWindow(phases[phases.length - 1], spread, today, newEndOn);
  const floors = base.floors.map((floor) => {
    if (floor.clearedAt) return floor;
    const window = floor.phaseId === ROOF_PHASE_ID ? roof : spread.get(floor.phaseId) ?? floor.window;
    return { ...floor, window: { ...window } };
  });
  const moved = floors.filter((floor) => !floor.clearedAt).flatMap((floor) => questsOfFloor(floor, quests).map((quest) => rewindowed(quest, floor.window)));
  return { project: { ...base, endOn: newEndOn, floors }, quests: moved };
}

// ---- Leaving, and the reward ---------------------------------------------------------------------------------------

/** The ids of the project's quests that nobody was paid for: what abandoning the project takes off the board */
export function openQuestIds(project: ProjectRecord, quests: readonly Achievement[], entries: readonly QuestLogEntry[]): string[] {
  const own = new Set(project.floors.flatMap((floor) => floor.questIds));
  const paidIds = new Set(entries.filter(isPaidEntry).map((entry) => String(entry.questId)));
  const isOpen = (id: string): boolean => own.has(id) && !paidIds.has(id);
  return quests.map((quest) => String(quest.id)).filter(isOpen);
}

/** Negative, zero or positive by plain character order (the stamps are ISO text, which sorts as time does) */
const compareText = (a: string, b: string): number => Number(a > b) - Number(a < b);

/** The cleared project that was cleared last (a tie goes to the later id), optionally only among those `wants` */
export function newestCleared(records: readonly ProjectRecord[], wants: (record: ProjectRecord) => boolean = () => true): ProjectRecord | null {
  const isWanted = (record: ProjectRecord): boolean => record.status === "cleared" && wants(record);
  const latestFirst = records.filter(isWanted).sort((a, b) => compareText(b.clearedAt ?? "", a.clearedAt ?? "") || compareText(b.id, a.id));
  return latestFirst[0] ?? null;
}

/** The record with its reward given at `now` */
export function withRewardGiven(record: ProjectRecord, now: Date): ProjectRecord {
  const next = copyOf(record);
  next.reward.givenAt = now.toISOString();
  return next;
}

/** Whether the hero is already among those who have seen the reward's reveal ("reward") or the credits ("credits") */
export const hasSeen = (record: ProjectRecord, heroId: string, what: "reward" | "credits"): boolean =>
  (what === "reward" ? record.reward.seenBy : record.creditsSeenBy).includes(heroId);

/** The record with the hero among those who have seen the reward's reveal ("reward") or the credits ("credits"), once */
export function withSeen(record: ProjectRecord, heroId: string, what: "reward" | "credits"): ProjectRecord {
  const next = copyOf(record);
  const seen = what === "reward" ? next.reward.seenBy : next.creditsSeenBy;
  if (!seen.includes(heroId)) seen.push(heroId);
  return next;
}
