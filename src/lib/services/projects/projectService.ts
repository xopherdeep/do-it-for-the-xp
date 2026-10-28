/**
 * Project Towers service: what the family does with a project, committed to the databases. The rules are
 * projectProgress.ts (pure); this reads the records, asks them, and writes what they answer, in an order that leaves a
 * crash with something to retry rather than a bonus paid twice: a settled floor wakes its quests first, then saves the
 * record (from then on it is settled), then pays. Calls take turns, so two payments landing together settle a floor once.
 *
 * Settling is not tied to the floor of the chore just paid: every settling asks for ALL the running project's floors that
 * woke, were not settled and read cleared (settleReadyFloors). So a floor whose settling failed once, or that cleared
 * because the Game Master deleted its last open chore, is settled the next time anything asks: a payment on any floor, an
 * arrival at the tower, a board refresh.
 *
 * QuestCompletionService calls `onQuestPaid` (or `onEntryPaid`, when it only has the log entry) after a project chore is
 * paid, and wraps the call so a failure here never holds up the payment. The temple screen calls `onFloorReached` when a
 * hero arrives on a floor (the floor wakes for the whole family), `readTower` for the clock and the stairs' lock, and
 * `markFloorSeen` once it has told a hero a floor was cleared.
 */
import AchievementDb, { achievementStorage, type Achievement } from "@/lib/databases/AchievementDb";
import { getProjectDb, type ProjectDb } from "@/lib/databases/ProjectDb";
import { getQuestLogDb, type QuestLogDb } from "@/lib/databases/QuestLogDb";
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { getTempleProgressDb, type TempleProgressDb } from "@/lib/databases/TempleProgressDb";
import { projectTypeOf } from "@/lib/services/core/packs/projects";
import { applyQuestRewards } from "@/lib/services/quests/QuestCompletionService";
import debug from "@/lib/utils/debug";
import { phaseNameOf } from "./floorClock";
import {
  hasSeen,
  newestCleared,
  openQuestIds,
  questsWokenBy,
  rescheduleFloors,
  settleReady,
  wakeOnArrival,
  withRewardGiven,
  withSeen,
  type ArrivalWake,
  type ReadySettlement,
  type SettledFloor,
} from "./projectProgress";
import { freshProjectId, isProjectQuestId } from "./projectIds";
import type { ProjectTowerInput } from "./projectQuests";
import { newProjectRecord, type ProjectRecord } from "./projectRecord";
import { buildProjectTower } from "./projectTower";
import { clearedFloorKeys, withFloorSeen } from "./towerView";

/** The databases the service reads and writes; the specs hand it ones over in-memory storage */
export interface ProjectStores {
  projects: Pick<ProjectDb, "getActive" | "getAll" | "save">;
  quests: Pick<AchievementDb, "getTasks" | "get" | "set" | "remove">;
  log: Pick<QuestLogDb, "getEntries">;
  temples: Pick<TempleDb, "setTemple" | "remove">;
  /** The heroes' saved walks through a tower */
  progress: Pick<TempleProgressDb, "getProgressForTemple" | "clearProgress">;
  /** The temple engine, which holds a run in memory after the screen is gone */
  engine: { forgetTempleRun(templeId: string): void | Promise<void> };
}

let live: ProjectStores | null = null;

const liveStores = (): ProjectStores => {
  if (!live) {
    live = {
      projects: getProjectDb(),
      quests: new AchievementDb(achievementStorage),
      log: getQuestLogDb(),
      temples: new TempleDb(templeStorage),
      progress: getTempleProgressDb(),
      // Loaded when it is needed: the engine is a heavy module, and only starting and abandoning a project reach for it
      engine: {
        forgetTempleRun: async (templeId) => {
          const { TempleSystem } = await import("@/lib/engine/core/dungeons/TempleSystem");
          TempleSystem.getInstance().forgetTempleRun(templeId);
        },
      },
    };
  }
  return live;
};

/** Calls take turns: a call reads the records, so one that starts before the last has written would read them stale */
let turn: Promise<unknown> = Promise.resolve();

const inTurn = <T>(task: () => Promise<T>): Promise<T> => {
  const run = turn.then(task);
  turn = run.catch(() => undefined);
  return run;
};

/** What the wallet's history calls a floor: the phase's name ("Deep Clean"), the roof's, or the floor's key if the type is gone */
const floorNameOf = (project: ProjectRecord, floorKey: string): string => {
  const floor = project.floors.find((each) => each.floorKey === floorKey);
  return floor ? phaseNameOf(project.typeId, floor) : floorKey;
};

/** One floor's bonus into each hero's pocket: XP and GP only (AP is never multiplied); one hero failing does not hold up the rest */
const payFloor = (project: ProjectRecord, floor: SettledFloor, at: string): void => {
  const source = `project:${project.id}:${floor.floorKey}`;
  const label = `Floor bonus: ${floorNameOf(project, floor.floorKey)}`;
  for (const [heroId, grant] of Object.entries(floor.grants)) {
    try {
      applyQuestRewards(heroId, { xp: grant.xp, gp: grant.gp, ap: 0 }, source, at, label);
    } catch (error) {
      debug.warn(`The floor bonus for ${heroId} could not be paid`, error);
    }
  }
};

/** The active run, when it is the one the quest belongs to (a quest of a project that was left or cleared settles nothing) */
const runningProject = async (projectId: string, stores: ProjectStores): Promise<ProjectRecord | null> => {
  const project = await stores.projects.getActive();
  return project?.id === projectId ? project : null;
};

/** Settles whatever the running project has ready, and commits it: quests woken, record saved, then the bonuses paid */
const settleAndCommit = async (project: ProjectRecord, at: string, now: Date, stores: ProjectStores): Promise<ReadySettlement | null> => {
  const [quests, entries] = await Promise.all([stores.quests.getTasks(), stores.log.getEntries()]);
  const settlement = settleReady(project, quests, entries, now);
  if (!settlement) return null;
  for (const woken of questsWokenBy(project, settlement.project, quests)) await stores.quests.set(String(woken.id), woken);
  await stores.projects.save(settlement.project);
  for (const floor of settlement.floors) payFloor(project, floor, at);
  return settlement;
};

const settleAfterPayment = async (quest: Achievement, at: string, stores: ProjectStores): Promise<ReadySettlement | null> => {
  const link = quest.project;
  if (!link) return null;
  const project = await runningProject(link.projectId, stores);
  return project ? settleAndCommit(project, at, new Date(), stores) : null;
};

/**
 * A project chore was paid (`at` is when the hero finished it): every floor of its project that is ready is settled, the
 * chore's own among them. A floor's bonus is paid to the heroes who worked it, the next floor's chores wake onto the
 * board, and the roof finishes the project. Null when the quest is no chore of the running project, or no floor is ready.
 */
export function onQuestPaid(quest: Achievement, at: string, stores: ProjectStores = liveStores()): Promise<ReadySettlement | null> {
  return inTurn(() => settleAfterPayment(quest, at, stores));
}

/**
 * The same for a payment that only has the log entry (an approval): the chore is read by its id, and only a project chore
 * is. A chore deleted since it was claimed cannot say which project it was in, so the running one is asked what is ready.
 */
export async function onEntryPaid(questId: string, at: string, stores: ProjectStores = liveStores()): Promise<ReadySettlement | null> {
  if (!isProjectQuestId(questId)) return null;
  const quest = (await stores.quests.get(String(questId))) as Achievement | null;
  return quest ? onQuestPaid(quest, at, stores) : settleReadyFloors(new Date(), stores);
}

/**
 * Settles every floor of the running project that woke, was not settled and reads cleared, lowest first (see
 * projectProgress.settleReady), and commits it. Safe to ask any time and as often as wanted: a floor is settled once.
 * Null when there is nothing to settle or no project is running.
 */
export function settleReadyFloors(now: Date = new Date(), stores: ProjectStores = liveStores()): Promise<ReadySettlement | null> {
  return inTurn(async () => {
    const project = await stores.projects.getActive();
    return project ? settleAndCommit(project, now.toISOString(), now, stores) : null;
  });
}

/** What reaching a floor did: the chores that woke with it, and the floors that were ready and got settled */
export interface FloorArrival {
  woken: Achievement[];
  settled: ReadySettlement | null;
}

/** An arrival's wake, committed the way a settling's is: the quests first, then the record */
const commitArrival = async (arrival: ArrivalWake, stores: ProjectStores): Promise<void> => {
  for (const quest of arrival.quests) await stores.quests.set(String(quest.id), quest);
  await stores.projects.save(arrival.project);
};

/**
 * A hero reached the floor of the running project (walking in, stairs, a pit, a teleport): the floor wakes for the whole
 * family if it was asleep, and whatever is ready to settle is settled (a floor emptied by deleted chores settles here,
 * and its climb goes on). Waking twice changes nothing. Null when no project is running.
 */
export function onFloorReached(floorKey: string, now: Date = new Date(), stores: ProjectStores = liveStores()): Promise<FloorArrival | null> {
  return inTurn(async () => {
    const project = await stores.projects.getActive();
    if (!project) return null;
    const arrival = wakeOnArrival(project, floorKey, await stores.quests.getTasks(), now);
    if (arrival) await commitArrival(arrival, stores);
    const settled = await settleAndCommit(arrival?.project ?? project, now.toISOString(), now, stores);
    return { woken: arrival?.quests ?? [], settled };
  });
}

/** The running project as the temple and the town read it: the record, and the floors whose chores were all paid */
export interface TowerSnapshot {
  project: ProjectRecord;
  cleared: string[];
}

/** The running project and which of its floors read cleared (settled or not yet); null when none is running */
export function readTower(stores: ProjectStores = liveStores()): Promise<TowerSnapshot | null> {
  return inTurn(async () => {
    const project = await stores.projects.getActive();
    if (!project) return null;
    const [quests, entries] = await Promise.all([stores.quests.getTasks(), stores.log.getEntries()]);
    return { project, cleared: clearedFloorKeys(project, quests, entries) };
  });
}

/** The hero was shown the "Floor cleared!" of this floor of the running project; once is enough. Quiet when none is running. */
export function markFloorSeen(heroId: string, floorKey: string, stores: ProjectStores = liveStores()): Promise<void> {
  return inTurn(async () => {
    const project = await stores.projects.getActive();
    if (!project) return;
    const told = withFloorSeen(project, floorKey, heroId);
    const hasNewMark = told !== project;
    if (hasNewMark) await stores.projects.save(told);
  });
}

/** One hero's saved walk could not be forgotten: said, never thrown (the worst it leaves is a hero resuming in the old tower) */
const warnIfFailed = (result: PromiseSettledResult<unknown>, heroId: string, templeId: string): void => {
  const didFail = result.status === "rejected";
  if (didFail) debug.warn(`[Projects] could not forget ${heroId}'s walk through ${templeId}`, result.reason);
};

/**
 * A tower about to be raised, or taken down, must not be walked from an old run: every hero's saved walk through the
 * temple is cleared, and the run the temple engine still holds in memory is dropped (it would otherwise be saved over the
 * cleared walk on the next visit). A failure is said and never stops the project from starting or being abandoned.
 */
const forgetRuns = async (templeId: string, stores: ProjectStores): Promise<void> => {
  try {
    const walks = await stores.progress.getProgressForTemple(templeId);
    const cleared = await Promise.allSettled(walks.map((walk) => stores.progress.clearProgress(walk.userId, templeId)));
    cleared.forEach((result, index) => warnIfFailed(result, walks[index].userId, templeId));
    await stores.engine.forgetTempleRun(templeId);
  } catch (error) {
    debug.warn(`[Projects] could not forget the runs in ${templeId}`, error);
  }
};

/**
 * Builds the tower for the input and saves its temple, its quests and the project record (what is already in the
 * databases stays: the temple is replaced under its own id, the quests are added). One project runs at a time. The input
 * carries the heroes, which decide whose big chores wait for the Game Master. A run never takes the id of an earlier one
 * (an abandoned run started the same day has it): the new tower is built under a fresh id, and the heroes' old walks in
 * the type's tower are forgotten.
 */
export function startProject(input: ProjectTowerInput, rewardText: string, stores: ProjectStores = liveStores()): Promise<ProjectRecord> {
  return inTurn(async () => {
    const running = await stores.projects.getActive();
    if (running) throw new Error(`The project ${running.id} is already running`);
    const held = (await stores.projects.getAll()).map((each) => each.id);
    const fresh = { ...input, projectId: freshProjectId(input.projectId, held) };
    const tower = buildProjectTower(fresh);
    const record = newProjectRecord(tower, fresh, rewardText);
    await stores.temples.setTemple(tower.record);
    for (const quest of tower.quests) await stores.quests.set(String(quest.id), quest);
    await stores.projects.save(record);
    await forgetRuns(tower.record.id, stores);
    return record;
  });
}

/**
 * Moves the end of the running project to `newEndOn`: the floors not cleared are spread again from `today` to it, and
 * their quests follow (see rescheduleFloors). Throws for an end before today or too near for the floors left, and when
 * no project is running; nothing is written then.
 */
export function extendProject(newEndOn: string, today: string, stores: ProjectStores = liveStores()): Promise<ProjectRecord> {
  return inTurn(async () => {
    const project = await stores.projects.getActive();
    if (!project) throw new Error("No project is running");
    const phases = projectTypeOf(project.typeId)?.phases ?? [];
    const shares = Object.fromEntries(phases.map((phase) => [phase.id, phase.share]));
    const moved = rescheduleFloors(project, shares, await stores.quests.getTasks(), today, newEndOn);
    for (const quest of moved.quests) await stores.quests.set(String(quest.id), quest);
    await stores.projects.save(moved.project);
    return moved.project;
  });
}

/**
 * Gives up the running project: it is marked abandoned (no trophy), and its chores nobody was paid for and its temple
 * leave the game. A chore that was paid stays, with its record and log entry. Quiet when no project is running.
 */
export function abandonProject(stores: ProjectStores = liveStores()): Promise<void> {
  return inTurn(async () => {
    const project = await stores.projects.getActive();
    if (!project) return;
    const [quests, entries] = await Promise.all([stores.quests.getTasks(), stores.log.getEntries()]);
    const open = openQuestIds(project, quests, entries);
    // The record goes first: a run left half taken apart must not stay active, to be settled over chores that are gone
    await stores.projects.save({ ...project, status: "abandoned" });
    for (const id of open) await stores.quests.remove(id);
    await stores.temples.remove(project.templeId);
    await forgetRuns(project.templeId, stores);
  });
}

/** The reward was handed over: stamps the newest cleared project whose reward was earned and not given yet */
export function markRewardGiven(stores: ProjectStores = liveStores()): Promise<void> {
  return inTurn(async () => {
    const isToGive = (record: ProjectRecord): boolean => Boolean(record.reward.earnedAt) && !record.reward.givenAt;
    const record = newestCleared(await stores.projects.getAll(), isToGive);
    if (record) await stores.projects.save(withRewardGiven(record, new Date()));
  });
}

/** The hero has seen the reward's reveal or the credits of the newest cleared project; once is enough */
export function markSeen(heroId: string, what: "reward" | "credits", stores: ProjectStores = liveStores()): Promise<void> {
  return inTurn(async () => {
    const record = newestCleared(await stores.projects.getAll());
    if (!record) return;
    if (!hasSeen(record, heroId, what)) await stores.projects.save(withSeen(record, heroId, what));
  });
}
