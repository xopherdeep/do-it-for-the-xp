/**
 * Wake on entry (owner 2026-10-18, "set world, wake on arrival"): the first time a hero of the family walks into a
 * shipped temple (TempleGrounds, never the region page), the temple's sleeping monster beasts wake for that hero, the
 * way the Temple Quests tab wakes them (wakeTempleQuests.ts: planWake, a Solo Mission for the hero starting this
 * Monday, the library's beast adopted). Until then the Beast Log stays quiet.
 *
 * - A room whose Game Master's pick is a live quest has nothing to wake (as the tab reads it).
 * - A beast whose quest is already the hero's (theirs, or an Open Bounty) is left as it is.
 * - A beast a temple already woke for other heroes (a `tq-` quest) takes this hero in: the hero is added to that
 *   quest's assignees instead of a second quest. Temple room quests are per hero (each fights their own) and shared in
 *   the party (one quest record, one room).
 * - A beast the family's own quest uses, made for someone else, is the Game Master's: it is never joined and never
 *   given a second quest (planWake's "uses your quest").
 * - Miniboss and boss rooms never wake by themselves; a Game Master's profile never wakes anything.
 *
 * The wake is remembered per hero per temple on the hero's questEffects (`templesWokenAt`, written with
 * setQuestEffects, which every questEffects writer keeps), so walking in again wakes nothing new and a quest the Game
 * Master deleted is not made again. The plan is pure; `commitEntryWake` writes only through the writers it is handed.
 */
import AchievementDb, { achievementStorage, type Achievement } from "@/lib/databases/AchievementDb";
import BestiaryDb, { beastStorage, type Beast } from "@/lib/databases/BestiaryDb";
import templeDb, { templeStorage } from "@/lib/databases/TempleDb";
import type { RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import shippedTemples from "@/lib/engine/temples";
import { useUserStore } from "@/lib/store/stores/user";
import { headlineQuest, questBeastId } from "@/lib/services/temples/questRooms";
import type { QuestLayout } from "@/lib/services/temples/templeQuestRows";
import {
  commitWake,
  isWokenQuest,
  monsterTemplateCells,
  planWake,
  wakeQuestId,
  type WakeSkip,
  type WakeWriters,
} from "@/lib/services/temples/wakeTempleQuests";
import debug from "@/lib/utils/debug";

// ---------------------------------------------------------------------------------------------------------------------
// Remembering a wake
// ---------------------------------------------------------------------------------------------------------------------

/** The questEffects field that remembers where a hero was woken (HeroQuestEffects.templesWokenAt). */
export const WOKEN_TEMPLES_FIELD = "templesWokenAt";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** The temples a hero was woken in; a stored field that is not a record, or an entry that is not a time, reads as none (a profile is family data). */
const wokenTemplesOf = (effects: HeroQuestEffects | null | undefined): Record<string, string> => {
  const woken: unknown = isRecord(effects) ? effects.templesWokenAt : undefined;
  const kept: Record<string, string> = {};
  if (!isRecord(woken)) return kept;
  for (const [templeId, at] of Object.entries(woken)) {
    if (typeof at === "string") kept[templeId] = at;
  }
  return kept;
};

/** True when the temple already woke for the hero whose questEffects these are. */
export const wasWokenFor = (effects: HeroQuestEffects | null | undefined, templeId: string): boolean =>
  typeof wokenTemplesOf(effects)[templeId] === "string";

/** The hero's questEffects with the temple remembered as woken at `now`; every other effect is kept, nothing is changed in place. */
export const rememberWake = (effects: HeroQuestEffects | null | undefined, templeId: string, now: Date): HeroQuestEffects => ({
  ...(isRecord(effects) ? effects : {}),
  templesWokenAt: { ...wokenTemplesOf(effects), [templeId]: now.toISOString() },
});

// ---------------------------------------------------------------------------------------------------------------------
// Who and where
// ---------------------------------------------------------------------------------------------------------------------

/** True for one of the nine temples shipped in code (a generated or hand-built temple has no templates to wake). */
export const isShippedTemple = (templeId: string): boolean =>
  Object.prototype.hasOwnProperty.call(shippedTemples, templeId);

/** The part of a hero's profile the wake reads. */
export interface HeroProfile {
  /** A Game Master: never woken by walking in (the Temple Quests tab wakes for them when they want it) */
  isAdult?: boolean;
  questEffects?: HeroQuestEffects;
}

/** A hero of the family as the planner reads them. */
export interface EntryHero extends HeroProfile {
  id: string;
}

export type EntryWakeSkipReason = "notShipped" | "noHero" | "gameMaster" | "alreadyWoken" | "noLayout";

/** Why walking in wakes nothing, before anything is read; null when the wake goes ahead. */
export function entryWakeSkip(input: {
  templeId: string;
  isShipped: boolean;
  hero: EntryHero | null | undefined;
}): EntryWakeSkipReason | null {
  if (!input.isShipped) return "notShipped";
  const hasNoHero = !input.hero?.id;
  if (hasNoHero) return "noHero";
  const isGameMaster = input.hero?.isAdult === true;
  if (isGameMaster) return "gameMaster";
  const isAlreadyWoken = wasWokenFor(input.hero?.questEffects, input.templeId);
  if (isAlreadyWoken) return "alreadyWoken";
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------------------------------------------------

export interface EntryWakeInput {
  templeId: string;
  isShipped: boolean;
  /** The layout the temple is played with: the family's record, else the copy shipped in code */
  layout: QuestLayout | null | undefined;
  hero: EntryHero | null | undefined;
  /** Every quest record the family has, drafts too: a draft holds its id */
  quests: readonly Achievement[];
  /** The family's bestiary */
  beasts: readonly Beast[];
  now: Date;
}

export interface EntryWakePlan {
  /** Why nothing happens (and nothing is remembered); null when the wake goes ahead */
  skip: EntryWakeSkipReason | null;
  /** The quests to make for the hero (planWake) */
  quests: Achievement[];
  /** Quests a temple woke for other heroes, each with this hero added to its assignees */
  joined: Achievement[];
  /** The library beasts to adopt first */
  beasts: Beast[];
  /** The templates planWake left as they are, and why ("uses your quest", "already woken") */
  skipped: WakeSkip[];
  /** The hero's questEffects with this temple remembered; null when the plan skips */
  effects: HeroQuestEffects | null;
}

const nothingPlanned = (skip: EntryWakeSkipReason): EntryWakePlan => ({
  skip,
  quests: [],
  joined: [],
  beasts: [],
  skipped: [],
  effects: null,
});

/** QuestEngine.isVisibleToUser: an Open Bounty is for everyone, any other quest for its assignees. */
const isVisibleToHero = (quest: Achievement, heroId: string): boolean =>
  quest.type === "asNeeded" || (quest.assignee ?? []).map(String).includes(heroId);

/** The quest a temple woke for this beast that the hero can share: this temple's own first, else another temple's. */
const sharedWokenQuest = (live: readonly Achievement[], templeId: string, beastId: string): Achievement | undefined => {
  const woken = live.filter((quest) => isWokenQuest(quest) && questBeastId(quest) === beastId);
  const ownId = wakeQuestId(templeId, beastId);
  return woken.find((quest) => String(quest.id) === ownId) ?? woken[0];
};

/**
 * What the hero's first walk into a temple wakes (see the top of this file). Every monster room's template is read
 * once per beast, in the maze's reading order: left alone when the room holds a live pick or the hero already has the
 * beast's quest, shared when a temple already woke it for someone else, else woken for the hero through planWake.
 */
export function wakeOnEntryPlan(input: EntryWakeInput): EntryWakePlan {
  const early = entryWakeSkip(input);
  if (early) return nothingPlanned(early);
  const layout = input.layout;
  const hasNoLayout = !layout?.maze || !layout?.rooms;
  if (hasNoLayout) return nothingPlanned("noLayout");

  const heroId = String(input.hero?.id);
  const live = input.quests.filter((quest) => !quest.draft);
  const toWake: RoomQuestTemplate[] = [];
  const joined = new Map<string, Achievement>();
  const seen = new Set<string>();

  for (const cell of monsterTemplateCells(layout)) {
    const isHeldByPick = headlineQuest(cell.room, live) !== undefined;
    if (isHeldByPick) continue;
    const template = cell.room.content?.quest as RoomQuestTemplate;
    const beastId = String(template.beastId);
    const isSeen = seen.has(beastId);
    if (isSeen) continue;
    seen.add(beastId);

    const isAlreadyTheirs = live.some((quest) => questBeastId(quest) === beastId && isVisibleToHero(quest, heroId));
    if (isAlreadyTheirs) continue;
    const shared = sharedWokenQuest(live, input.templeId, beastId);
    if (shared) {
      joined.set(String(shared.id), { ...shared, assignee: [...(shared.assignee ?? []), heroId] });
      continue;
    }
    toWake.push(template);
  }

  const hasTemplates = toWake.length > 0;
  const wake = hasTemplates
    ? planWake({ templeId: input.templeId, templates: toWake, heroIds: [heroId], quests: input.quests, beasts: input.beasts, now: input.now })
    : null;
  return {
    skip: null,
    quests: wake?.quests ?? [],
    joined: [...joined.values()],
    beasts: wake?.beasts ?? [],
    skipped: wake?.skipped ?? [],
    effects: rememberWake(input.hero?.questEffects, input.templeId, input.now),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The writes
// ---------------------------------------------------------------------------------------------------------------------

/** The places a wake on entry writes: the normal DBs (commitWake's two) and the hero's questEffects. */
export interface EntryWakeWriters extends WakeWriters {
  saveEffects: (heroId: string, effects: HeroQuestEffects) => unknown;
}

export interface EntryWakeDone {
  woken: Achievement[];
  joined: Achievement[];
  adopted: Beast[];
  /** The wake was remembered on the hero's questEffects */
  remembered: boolean;
  /** A quest was made or joined: the run reads the hero's board again */
  changed: boolean;
}

/**
 * Writes a plan: the beasts and the new quests (commitWake: beasts first), then the quests the hero joins, and last
 * the wake remembered. A plan that skipped writes nothing. A write that fails stops the rest and throws, and the wake
 * is not remembered, so the next walk in tries again (a quest written meanwhile is then the hero's, or shared).
 */
export async function commitEntryWake(plan: EntryWakePlan, heroId: string, writers: EntryWakeWriters): Promise<EntryWakeDone> {
  const done: EntryWakeDone = { woken: [], joined: [], adopted: [], remembered: false, changed: false };
  const effects = plan.effects;
  const isSkipped = Boolean(plan.skip) || !effects;
  if (isSkipped) return done;

  const made = await commitWake({ quests: plan.quests, beasts: plan.beasts, skipped: plan.skipped, problem: null }, writers);
  done.woken = made.woken;
  done.adopted = made.adopted;
  for (const quest of plan.joined) {
    await writers.saveQuest(quest);
    done.joined.push(quest);
  }
  await writers.saveEffects(heroId, effects);
  done.remembered = true;
  done.changed = done.woken.length + done.joined.length > 0;
  return done;
}

// ---------------------------------------------------------------------------------------------------------------------
// The family's stores
// ---------------------------------------------------------------------------------------------------------------------

/** What a temple wake reads and writes in the family's game (Quick Start's and the temple page's). */
export interface FamilyWakeStores {
  readQuests: () => Promise<Achievement[]>;
  readBeasts: () => Promise<Beast[]>;
  writers: WakeWriters;
  /** The hero's profile in the user store, or undefined when the store does not have them */
  hero: (heroId: string) => HeroProfile | undefined;
  saveEffects: (heroId: string, effects: HeroQuestEffects) => unknown;
}

/** The normal DBs (AchievementDb.setTask, BestiaryDb.setBeast) and the user store's setQuestEffects. */
export function familyWakeStores(): FamilyWakeStores {
  const achievementDb = new AchievementDb(achievementStorage);
  const bestiaryDb = new BestiaryDb(beastStorage);
  const userStore = useUserStore();
  return {
    readQuests: () => achievementDb.getTasks(),
    readBeasts: async () => (await bestiaryDb.getBeasts()) as Beast[],
    writers: {
      saveBeast: (beast) => bestiaryDb.setBeast(beast),
      saveQuest: (quest) => achievementDb.setTask(quest),
    },
    hero: (heroId) => userStore.getUserById(heroId),
    saveEffects: (heroId, effects) => userStore.setQuestEffects(heroId, effects),
  };
}

/** A layout as the temple record holds it: the planners read the maze and rooms, the record keeps its entrance. */
export type PlayedLayout = QuestLayout & { entrance?: number[] };

/** The layout shipped in code for a temple, or null for one that is not shipped. */
export function shippedLayoutOf(templeId: string): PlayedLayout | null {
  const isShipped = isShippedTemple(templeId);
  if (!isShipped) return null;
  const shipped = (shippedTemples as unknown as Record<string, PlayedLayout>)[templeId];
  return { entrance: shipped.entrance, maze: shipped.maze, rooms: shipped.rooms };
}

/** The layout the temple is played with: the family's record in the TempleDb (as templeFreshness reads it), else the shipped copy. */
export async function playedLayoutOf(templeId: string): Promise<PlayedLayout | null> {
  try {
    // The storage has to be created before it is read
    await templeStorage.create();
    const record = await templeDb.getTempleById(templeId);
    if (record?.dungeonLayout) return record.dungeonLayout;
  } catch (error) {
    debug.warn(`[wakeOnEntry] could not read ${templeId} from the TempleDb; reading the shipped layout`, error);
  }
  return shippedLayoutOf(templeId);
}

export interface EntryWakeDeps extends FamilyWakeStores {
  readLayout: (templeId: string) => Promise<QuestLayout | null>;
}

const entryWakeDeps = (): EntryWakeDeps => ({ ...familyWakeStores(), readLayout: playedLayoutOf });

/** Walks in under way, by hero and temple: a second mount while one is writing shares it instead of planning twice. */
const underWay = new Map<string, Promise<EntryWakeDone | null>>();

const runEntryWake = async (templeId: string, heroId: string, deps: EntryWakeDeps | undefined, now: Date): Promise<EntryWakeDone | null> => {
  const stores = deps ?? entryWakeDeps();
  const profile = stores.hero(heroId);
  const hero: EntryHero | undefined = profile ? { ...profile, id: heroId } : undefined;
  const early = entryWakeSkip({ templeId, isShipped: true, hero });
  if (early) return null;

  const [layout, quests, beasts] = await Promise.all([stores.readLayout(templeId), stores.readQuests(), stores.readBeasts()]);
  const plan = wakeOnEntryPlan({ templeId, isShipped: true, layout, hero, quests, beasts, now });
  return commitEntryWake(plan, heroId, { ...stores.writers, saveEffects: stores.saveEffects });
};

/**
 * The hero walked into a temple (TempleGrounds, once the temple's saved layout was read): wake it for them if this is
 * their first time in a shipped temple. Resolves to what was written, or null when nothing was even read (not a
 * shipped temple, not a hero of the family, a Game Master, already woken there). Throws when a write fails.
 */
export function wakeTempleOnEntry(templeId: string, heroId: string, deps?: EntryWakeDeps, now: Date = new Date()): Promise<EntryWakeDone | null> {
  const isShipped = isShippedTemple(templeId);
  if (!isShipped) return Promise.resolve(null);
  const key = `${heroId}:${templeId}`;
  const running = underWay.get(key);
  if (running) return running;
  const started = runEntryWake(templeId, String(heroId), deps, now).finally(() => {
    underWay.delete(key);
  });
  underWay.set(key, started);
  return started;
}
