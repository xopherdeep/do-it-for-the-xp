/**
 * Wake on entry (owner 2026-10-18, "set world, wake on arrival"): the first time a hero of the family walks into a
 * shipped temple (TempleGrounds, never the region page), the temple's sleeping monster beasts wake for that hero, the
 * way the Temple Quests tab wakes them (wakeTempleQuests.ts: planWake, a Solo Mission for the hero starting this
 * Monday, the library's beast adopted). Until then the Beast Log stays quiet.
 *
 * Floor by floor (owner 2026-10-19): a temple can be a tall dungeon, so walking in wakes only the entrance floor's
 * beasts, and every other floor wakes the first time the hero arrives on it (by stairs, a pit, a teleport, or a reload
 * that resumes there); the screen then says how many stirred. A one-floor temple wakes every monster room on entry, as
 * before. Each floor wakes once: a floor with no monster room wakes nothing and is still remembered.
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
 * The wake is remembered per hero per temple floor on the hero's questEffects (`templesWokenAt`, written with
 * setQuestEffects, which every questEffects writer keeps; the key is the temple and the floor, "wind-temple@2F"), so
 * walking in again wakes nothing new and a quest the Game Master deleted is not made again. A wake remembered by the
 * temple alone (made before floors) is the entrance floor's, and no other floor's. The plan is pure;
 * `commitEntryWake` writes only through the writers it is handed. A hero's wakes take turns (they all write the one
 * questEffects), so walking in and taking the stairs at once cannot make one forget the other.
 *
 * A layout refresh (owner 2026-10-23, "wake only the new beasts"): when a shipped temple's layout is replaced
 * (importAllTemples), each hero's woken floors of the OLD layout are swapped for the beasts those floors held
 * (`templesWokenBeasts`, rememberWokenBeasts). The next arrival on a floor wakes only the beasts that list does not hold,
 * so a room that is new wakes while a beast the old layout woke (its quest deleted since, or moved to another floor) is
 * never made again. A save no refresh has touched has no such list and wakes as it always did.
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
  wakeSlugOf,
  type WakeSkip,
  type WakeWriters,
} from "@/lib/services/temples/wakeTempleQuests";
import debug from "@/lib/utils/debug";

// ---------------------------------------------------------------------------------------------------------------------
// Remembering a wake
// ---------------------------------------------------------------------------------------------------------------------

/** The questEffects field that remembers where a hero was woken (HeroQuestEffects.templesWokenAt). */
export const WOKEN_TEMPLES_FIELD = "templesWokenAt";

/** What the field holds one floor under: the temple and the floor, "wind-temple@2F". A temple id alone is an older wake. */
export const wakeKey = (templeId: string, floor: string): string => `${templeId}@${floor}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** The wakes a hero has, by key (a temple and floor, or an older temple alone); a stored field that is not a record, or an entry that is not a time, reads as none (a profile is family data). */
const wokenTemplesOf = (effects: HeroQuestEffects | null | undefined): Record<string, string> => {
  const woken: unknown = isRecord(effects) ? effects.templesWokenAt : undefined;
  const kept: Record<string, string> = {};
  if (!isRecord(woken)) return kept;
  for (const [templeId, at] of Object.entries(woken)) {
    const isStoredTime = typeof at === "string";
    if (isStoredTime) kept[templeId] = at;
  }
  return kept;
};

/**
 * True when the temple's floor already woke for the hero whose questEffects these are. A wake remembered by the temple
 * alone (before floors) counts for the entrance floor only.
 */
export const wasWokenFor = (effects: HeroQuestEffects | null | undefined, templeId: string, floor: string, entranceFloor: string): boolean => {
  const woken = wokenTemplesOf(effects);
  const isFloorWoken = typeof woken[wakeKey(templeId, floor)] === "string";
  const isOlderWake = floor === entranceFloor && typeof woken[templeId] === "string";
  return isFloorWoken || isOlderWake;
};

/** The hero's questEffects with the temple's floor remembered as woken at `now`; every other effect is kept, nothing is changed in place. */
export const rememberWake = (effects: HeroQuestEffects | null | undefined, templeId: string, floor: string, now: Date): HeroQuestEffects => ({
  ...(isRecord(effects) ? effects : {}),
  templesWokenAt: { ...wokenTemplesOf(effects), [wakeKey(templeId, floor)]: now.toISOString() },
});

// ---------------------------------------------------------------------------------------------------------------------
// Floors
// ---------------------------------------------------------------------------------------------------------------------

/** A layout as the temple record holds it: the planners read the maze and rooms, the record keeps its entrance. */
export type PlayedLayout = QuestLayout & { entrance?: number[] };

/** The floors a layout draws, in the order its maze holds them: a maze drawn as one grid is "1F", a layout with no maze has none. */
export const floorsOfLayout = (layout: QuestLayout | null | undefined): string[] => {
  const maze = layout?.maze;
  if (!maze) return [];
  return Array.isArray(maze) ? ["1F"] : Object.keys(maze);
};

/**
 * The floor walking into the temple puts the hero on: the one an entrance of [floorIndex, row, col] counts to (an index
 * into the maze's floors as it draws them, as the engine starts a hero), else the temple's first floor. "1F" for a
 * layout that names none.
 */
export const entranceFloorOf = (layout: PlayedLayout | null | undefined): string => {
  const floors = floorsOfLayout(layout);
  const entrance = layout?.entrance ?? [];
  const isOnAFloor = entrance.length === 3;
  const named = isOnAFloor ? floors[entrance[0]] : undefined;
  return named || floors[0] || "1F";
};

// ---------------------------------------------------------------------------------------------------------------------
// A layout refresh
// ---------------------------------------------------------------------------------------------------------------------

/** The questEffects field that remembers the beasts a replaced layout woke (HeroQuestEffects.templesWokenBeasts). */
export const WOKEN_BEASTS_FIELD = "templesWokenBeasts";

/** Every temple's remembered beasts (slugs); a stored field that is not a record, or a temple's entry that is not a list, reads as none, and anything in a list that is not a slug is dropped (a profile is family data). */
const beastMemoryOf = (effects: HeroQuestEffects | null | undefined): Record<string, string[]> => {
  const remembered: unknown = isRecord(effects) ? effects.templesWokenBeasts : undefined;
  const kept: Record<string, string[]> = {};
  if (!isRecord(remembered)) return kept;
  for (const [templeId, slugs] of Object.entries(remembered)) {
    if (Array.isArray(slugs)) kept[templeId] = slugs.filter((slug): slug is string => typeof slug === "string");
  }
  return kept;
};

/** The beasts (slugs, the part of a `tq-<temple>-<slug>` id after the temple) the temple's replaced layouts woke for the hero whose questEffects these are. */
export const wokenBeastsOf = (effects: HeroQuestEffects | null | undefined, templeId: string): string[] => {
  const slugs = beastMemoryOf(effects)[templeId];
  return Array.isArray(slugs) ? slugs : [];
};

/**
 * The hero's questEffects as a refresh of the temple's layout leaves them: the beasts that the floors woken under `oldLayout`
 * held are added to the temple's remembered beasts, and the temple's woken floors are forgotten (the next arrival on any
 * floor of the new layout wakes what is not remembered). A wake remembered by the temple alone was the old layout's entrance
 * floor's. Other temples' wakes and memory and every other effect are kept, and nothing is changed in place. Null when the
 * hero has no floor of the temple woken: there is nothing to carry over and nothing to write.
 */
export const rememberWokenBeasts = (effects: HeroQuestEffects | null | undefined, templeId: string, oldLayout: PlayedLayout | null | undefined): HeroQuestEffects | null => {
  const woken = wokenTemplesOf(effects);
  const floorPrefix = `${templeId}@`;
  const isThisTemples = (key: string) => key === templeId || key.startsWith(floorPrefix);
  const hasNoWokenFloor = !Object.keys(woken).some(isThisTemples);
  if (hasNoWokenFloor) return null;

  const entranceFloor = entranceFloorOf(oldLayout);
  const wokenFloors = new Set(Object.keys(woken).filter(isThisTemples).map((key) => (key === templeId ? entranceFloor : key.slice(floorPrefix.length))));
  const held = monsterTemplateCells(oldLayout)
    .filter((cell) => wokenFloors.has(cell.floor))
    .map((cell) => wakeSlugOf(String(cell.room.content?.quest?.beastId)));

  const memory = beastMemoryOf(effects);
  const slugs = [...new Set([...wokenBeastsOf(effects, templeId), ...held])].sort();
  const hasBeasts = slugs.length > 0;
  if (hasBeasts) memory[templeId] = slugs;

  const next: HeroQuestEffects = {
    ...(isRecord(effects) ? effects : {}),
    templesWokenAt: Object.fromEntries(Object.entries(woken).filter(([key]) => !isThisTemples(key))),
  };
  if (Object.keys(memory).length > 0) next[WOKEN_BEASTS_FIELD] = memory;
  else delete next[WOKEN_BEASTS_FIELD];
  return next;
};

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

export type EntryWakeSkipReason = "notShipped" | "noHero" | "gameMaster" | "alreadyWoken" | "noLayout" | "noFloor";

/** What entryWakeSkip reads: the temple, the hero and, once the layout is known, the floor and its entrance floor. */
export interface EntryWakeSkipInput {
  templeId: string;
  isShipped: boolean;
  hero: EntryHero | null | undefined;
  floor?: string;
  entranceFloor?: string;
}

/**
 * Why walking in wakes nothing, before anything is read; null when the wake goes ahead. Whether the floor already woke
 * is told only once the floor and the temple's entrance floor are known (the entrance floor is in the layout, so a
 * caller that has not read it yet leaves both out and gets who and where alone).
 */
export function entryWakeSkip(input: EntryWakeSkipInput): EntryWakeSkipReason | null {
  if (!input.isShipped) return "notShipped";
  const hasNoHero = !input.hero?.id;
  if (hasNoHero) return "noHero";
  const isGameMaster = input.hero?.isAdult === true;
  if (isGameMaster) return "gameMaster";
  const { floor, entranceFloor } = input;
  const isFloorKnown = floor !== undefined && entranceFloor !== undefined;
  const isAlreadyWoken = isFloorKnown && wasWokenFor(input.hero?.questEffects, input.templeId, floor, entranceFloor);
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
  layout: PlayedLayout | null | undefined;
  /** The floor the hero is waking: the entrance floor on walking in, any other the first time they arrive on it */
  floor: string;
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
  /** The floor the plan is for */
  floor: string;
  /** The quests to make for the hero (planWake) */
  quests: Achievement[];
  /** Quests a temple woke for other heroes, each with this hero added to its assignees */
  joined: Achievement[];
  /** The library beasts to adopt first */
  beasts: Beast[];
  /** The templates planWake left as they are, and why ("uses your quest", "already woken") */
  skipped: WakeSkip[];
  /** The hero's questEffects with this floor remembered; null when the plan skips */
  effects: HeroQuestEffects | null;
}

const nothingPlanned = (skip: EntryWakeSkipReason, floor: string): EntryWakePlan => ({
  skip,
  floor,
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
 * What the hero's first arrival on a floor of a temple wakes (see the top of this file). Every monster room's template
 * on that floor is read once per beast, in the maze's reading order: left alone when the room holds a live pick or the
 * hero already has the beast's quest, shared when a temple already woke it for someone else, else woken for the hero
 * through planWake. A beast a replaced layout already woke for the hero (wokenBeastsOf) is left alone whatever its floor,
 * and its quest, if the Game Master deleted it since, is not made again. A floor the layout does not draw wakes nothing
 * and is not remembered.
 */
export function wakeOnEntryPlan(input: EntryWakeInput): EntryWakePlan {
  const layout = input.layout;
  const { floor } = input;
  const early = entryWakeSkip({ ...input, floor, entranceFloor: entranceFloorOf(layout) });
  if (early) return nothingPlanned(early, floor);
  const hasNoLayout = !layout?.maze || !layout?.rooms;
  if (hasNoLayout) return nothingPlanned("noLayout", floor);
  const isFloorMissing = !floorsOfLayout(layout).includes(floor);
  if (isFloorMissing) return nothingPlanned("noFloor", floor);

  const heroId = String(input.hero?.id);
  const rememberedBeasts = new Set(wokenBeastsOf(input.hero?.questEffects, input.templeId));
  const live = input.quests.filter((quest) => !quest.draft);
  const toWake: RoomQuestTemplate[] = [];
  const joined = new Map<string, Achievement>();
  const seen = new Set<string>();

  for (const cell of monsterTemplateCells(layout).filter((onFloor) => onFloor.floor === floor)) {
    const isHeldByPick = headlineQuest(cell.room, live) !== undefined;
    if (isHeldByPick) continue;
    const template = cell.room.content?.quest as RoomQuestTemplate;
    const beastId = String(template.beastId);
    const isWokenByOldLayout = rememberedBeasts.has(wakeSlugOf(beastId));
    if (isWokenByOldLayout) continue;
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
    floor,
    quests: wake?.quests ?? [],
    joined: [...joined.values()],
    beasts: wake?.beasts ?? [],
    skipped: wake?.skipped ?? [],
    effects: rememberWake(input.hero?.questEffects, input.templeId, floor, input.now),
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
  /** The floor that was woken */
  floor: string;
  /** How many beasts stirred: the quests made plus the quests the hero joined */
  stirred: number;
  /** The wake was remembered on the hero's questEffects */
  remembered: boolean;
  /** A quest was made or joined (`stirred` is above 0): the run reads the hero's board again */
  changed: boolean;
}

/**
 * Writes a plan: the beasts and the new quests (commitWake: beasts first), then the quests the hero joins, and last
 * the floor's wake remembered. A plan that skipped writes nothing. A write that fails stops the rest and throws, and the wake
 * is not remembered, so the next walk in tries again (a quest written meanwhile is then the hero's, or shared).
 */
export async function commitEntryWake(plan: EntryWakePlan, heroId: string, writers: EntryWakeWriters): Promise<EntryWakeDone> {
  const done: EntryWakeDone = { woken: [], joined: [], adopted: [], floor: plan.floor, stirred: 0, remembered: false, changed: false };
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
  done.stirred = done.woken.length + done.joined.length;
  done.changed = done.stirred > 0;
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

/** What a layout refresh reads and writes of the family's heroes: each hero with the questEffects they hold, and the writer for them. */
export interface HeroEffectsStore {
  heroes: () => Promise<readonly EntryHero[]>;
  saveEffects: (heroId: string, effects: HeroQuestEffects) => unknown;
}

/** The user store's heroes and its setQuestEffects. A refresh runs as the app starts, so profiles that have not loaded yet are loaded first. */
export function familyHeroEffects(): HeroEffectsStore {
  const userStore = useUserStore();
  const rosterOf = () => (Object.values(userStore.users ?? {}) as EntryHero[]).filter((hero) => hero?.id);
  return {
    heroes: async () => {
      const hasNoHeroesLoaded = rosterOf().length === 0;
      if (hasNoHeroesLoaded) await userStore.loadUsers();
      return rosterOf();
    },
    saveEffects: (heroId, effects) => userStore.setQuestEffects(heroId, effects),
  };
}

/**
 * Carries every hero's wake of a temple from the layout being replaced to the one that replaces it (rememberWokenBeasts):
 * writes only the heroes who had a floor of it woken, one at a time, and a hero whose write fails is warned about and
 * does not keep the others from theirs. Returns the ids of the heroes written. Call it before the old layout is gone.
 */
export async function rememberWokenBeastsForHeroes(templeId: string, oldLayout: PlayedLayout | null | undefined, store: HeroEffectsStore): Promise<string[]> {
  const written: string[] = [];
  for (const hero of await store.heroes()) {
    const effects = rememberWokenBeasts(hero.questEffects, templeId, oldLayout);
    if (!effects) continue;
    try {
      await store.saveEffects(String(hero.id), effects);
      written.push(String(hero.id));
    } catch (error) {
      debug.warn(`[wakeOnEntry] could not carry ${hero.id}'s woken ${templeId} beasts to its new layout`, error);
    }
  }
  return written;
}

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
    const storedLayout = record?.dungeonLayout;
    if (storedLayout) return storedLayout;
  } catch (error) {
    debug.warn(`[wakeOnEntry] could not read ${templeId} from the TempleDb; reading the shipped layout`, error);
  }
  return shippedLayoutOf(templeId);
}

export interface EntryWakeDeps extends FamilyWakeStores {
  readLayout: (templeId: string) => Promise<PlayedLayout | null>;
}

const entryWakeDeps = (): EntryWakeDeps => ({ ...familyWakeStores(), readLayout: playedLayoutOf });

/** Wakes under way, by hero, temple and floor: a second ask for the same floor while one is writing shares it instead of planning twice. */
const underWay = new Map<string, Promise<EntryWakeDone | null>>();

/** Where each hero's last wake stands, by hero: the next wake starts when it settles (won or lost). */
const turns = new Map<string, Promise<void>>();

const runEntryWake = async (
  templeId: string,
  heroId: string,
  deps: EntryWakeDeps | undefined,
  now: Date,
  floor: string | undefined
): Promise<EntryWakeDone | null> => {
  const stores = deps ?? entryWakeDeps();
  // The hero is read when the wake's turn comes: an earlier wake has remembered its floor on them by then
  const profile = stores.hero(heroId);
  const hero: EntryHero | undefined = profile ? { ...profile, id: heroId } : undefined;
  const early = entryWakeSkip({ templeId, isShipped: true, hero });
  if (early) return null;

  // The entrance floor is in the layout, so it is read before the board and the bestiary: a floor already woken reads no more
  const layout = await stores.readLayout(templeId);
  const entranceFloor = entranceFloorOf(layout);
  const wakeFloor = floor ?? entranceFloor;
  const isAlreadyWoken = entryWakeSkip({ templeId, isShipped: true, hero, floor: wakeFloor, entranceFloor }) === "alreadyWoken";
  if (isAlreadyWoken) return null;

  const [quests, beasts] = await Promise.all([stores.readQuests(), stores.readBeasts()]);
  const plan = wakeOnEntryPlan({ templeId, isShipped: true, layout, floor: wakeFloor, hero, quests, beasts, now });
  return commitEntryWake(plan, heroId, { ...stores.writers, saveEffects: stores.saveEffects });
};

/**
 * The hero walked into a temple (TempleGrounds, once the temple's saved layout was read), or arrived on one of its
 * floors: wake that floor for them if it has not woken before. `floor` is the floor arrived on; without it the
 * temple's entrance floor wakes (walking in). Resolves to what was written, or null when nothing was planned (not a
 * shipped temple, not a hero of the family, a Game Master, the floor already woken). Throws when a write fails.
 * A hero's wakes take turns, in the order they were asked.
 */
export function wakeTempleOnEntry(
  templeId: string,
  heroId: string,
  deps?: EntryWakeDeps,
  now: Date = new Date(),
  floor?: string
): Promise<EntryWakeDone | null> {
  const isShipped = isShippedTemple(templeId);
  if (!isShipped) return Promise.resolve(null);
  const hero = String(heroId);
  const key = `${hero}:${templeId}:${floor ?? ""}`;
  const running = underWay.get(key);
  if (running) return running;

  const started = (turns.get(hero) ?? Promise.resolve()).then(() => runEntryWake(templeId, hero, deps, now, floor));
  // The next wake waits for this one to settle, whether it wrote or threw
  const settled = started.then(
    () => undefined,
    () => undefined
  );
  turns.set(hero, settled);
  const finished = started.finally(() => {
    underWay.delete(key);
    // A later wake for this hero has already taken the turn: leave its turn in place
    const isLastTurn = turns.get(hero) === settled;
    if (isLastTurn) turns.delete(hero);
  });
  underWay.set(key, finished);
  return finished;
}
