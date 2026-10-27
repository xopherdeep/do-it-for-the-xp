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
 * paid, and wraps the call so a failure here never holds up the payment.
 */
import AchievementDb, { achievementStorage, type Achievement } from "@/lib/databases/AchievementDb";
import { getProjectDb, type ProjectDb } from "@/lib/databases/ProjectDb";
import { getQuestLogDb, type QuestLogDb } from "@/lib/databases/QuestLogDb";
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { projectTypeOf } from "@/lib/services/core/packs/projects";
import { applyQuestRewards } from "@/lib/services/quests/QuestCompletionService";
import debug from "@/lib/utils/debug";
import {
  hasSeen,
  newestCleared,
  openQuestIds,
  questsWokenBy,
  rescheduleFloors,
  settleReady,
  withRewardGiven,
  withSeen,
  type ReadySettlement,
  type SettledFloor,
} from "./projectProgress";
import { isProjectQuestId } from "./projectIds";
import type { ProjectTowerInput } from "./projectQuests";
import { newProjectRecord, type ProjectRecord } from "./projectRecord";
import { ROOF_PHASE_ID } from "./projectSchedule";
import { buildProjectTower } from "./projectTower";

/** The databases the service reads and writes; the specs hand it ones over in-memory storage */
export interface ProjectStores {
  projects: Pick<ProjectDb, "getActive" | "getAll" | "save">;
  quests: Pick<AchievementDb, "getTasks" | "get" | "set" | "remove">;
  log: Pick<QuestLogDb, "getEntries">;
  temples: Pick<TempleDb, "setTemple" | "remove">;
}

let live: ProjectStores | null = null;

const liveStores = (): ProjectStores => {
  if (!live) {
    live = {
      projects: getProjectDb(),
      quests: new AchievementDb(achievementStorage),
      log: getQuestLogDb(),
      temples: new TempleDb(templeStorage),
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

/** The roof is no phase, so it has no phase name to give its bonus line */
const ROOF_NAME = "The Roof";

/** What the wallet's history calls a floor: the phase's name ("Deep Clean"), the roof's, or the floor's key if the type is gone */
const floorNameOf = (project: ProjectRecord, floorKey: string): string => {
  const floor = project.floors.find((each) => each.floorKey === floorKey);
  if (floor?.phaseId === ROOF_PHASE_ID) return ROOF_NAME;
  const phase = projectTypeOf(project.typeId)?.phases.find((each) => each.id === floor?.phaseId);
  return phase?.name ?? floorKey;
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

/**
 * Builds the tower for the input and saves its temple, its quests and the project record (what is already in the
 * databases stays: the temple is replaced under its own id, the quests are added). One project runs at a time. The input
 * carries the heroes, which decide whose big chores wait for the Game Master.
 */
export function startProject(input: ProjectTowerInput, rewardText: string, stores: ProjectStores = liveStores()): Promise<ProjectRecord> {
  return inTurn(async () => {
    const running = await stores.projects.getActive();
    if (running) throw new Error(`The project ${running.id} is already running`);
    const tower = buildProjectTower(input);
    const record = newProjectRecord(tower, input, rewardText);
    await stores.temples.setTemple(tower.record);
    for (const quest of tower.quests) await stores.quests.set(String(quest.id), quest);
    await stores.projects.save(record);
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
