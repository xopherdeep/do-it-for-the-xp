/**
 * The setup wizard's planner: the answers a parent gave (who plays, which rooms, which chores) become one merge
 * backup, shaped like quickStartPlan's, plus the profiles it creates. Pure, so the wizard screens stay thin and the
 * plan is tested without storage. Quest and beast ids come from the library, so running a plan twice updates the
 * same records instead of piling up copies.
 */
import { v4 as uuidv4 } from "uuid";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { StoredProfile } from "@/lib/utils/User/user";
import { browseLibrary } from "@/lib/services/bestiary/librarySuggest";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import type { LibraryBeast } from "@/lib/services/core/beastLibrary";
import { BACKUP_VERSION } from "@/lib/services/core/BackupService";
import type { BackupEntry, BackupFile } from "@/lib/services/core/BackupService";
import { buildStarterWorld, STARTER_CATEGORIES } from "@/lib/services/core/StarterWorld";
import { plainBeast, questFromSeed } from "@/lib/services/core/packs/packSeeds";
import { quickStartGameMaster, quickStartHero } from "@/lib/services/core/packs/quickStart";
import type { QuickStartGameMaster } from "@/lib/services/core/packs/quickStart";

export type AgeBand = "little" | "kid" | "teen";

export interface SetupHero {
  id: string;
  name: string;
  age: number | null;
  /** Already a profile on this device: no new profile is made for them */
  existing: boolean;
  isParent: boolean;
}

export interface SetupAnswers {
  heroes: SetupHero[];
  rooms: string[];
  /** Hero id -> library beast ids */
  chores: Record<string, string[]>;
  /** Also seed the starter abilities, accessories, shops and house rules */
  extras: boolean;
  /** Only when a new parent hero must be created */
  gameMaster?: QuickStartGameMaster;
}

export interface SetupPlan {
  backup: BackupFile;
  newProfiles: StoredProfile[];
  /** Every wizard hero id -> the id its profile has or will have (existing heroes map to themselves) */
  profileIds: Record<string, string>;
}

export const bandForAge = (age: number): AgeBand => {
  if (age <= 7) return "little";
  if (age <= 12) return "kid";
  return "teen";
};

/** A parent does the grown-up chores whatever the age; nobody typed an age, so they are a kid */
export const bandOf = (hero: SetupHero): AgeBand => {
  if (hero.isParent) return "teen";
  if (hero.age === null) return "kid";
  return bandForAge(hero.age);
};

const ROOM_CATEGORIES: Record<string, string> = {
  bedroom: "cat-chamber",
  laundry: "cat-chamber",
  living: "cat-chamber",
  kitchen: "cat-mess-hall",
  yard: "cat-grounds",
  school: "cat-tower",
  bathroom: "cat-upkeep",
  pets: "cat-upkeep",
  self: "cat-health",
  family: "cat-family",
};

/** The starter category a room's quests file under; an unknown room goes to Hero Upkeep */
export const categoryForRoom = (room: string): string => ROOM_CATEGORIES[room] ?? "cat-upkeep";

/** The chore beasts of this age band in these rooms, in library order */
export const suggestedChores = (band: AgeBand, rooms: readonly string[]): LibraryBeast[] =>
  rooms.flatMap((room) => browseLibrary({ room, age: band, classic: false }) as LibraryBeast[]);

const DIFFICULTY_BY_BAND: Record<AgeBand, 1 | 2 | 3> = { little: 1, kid: 2, teen: 3 };

/** A weekly quest for a chore beast, each assigned hero's own to do (Solo, like assignQuests) */
export const choreQuest = (beast: LibraryBeast, band: AgeBand, heroIds: readonly string[]): Achievement => ({
  ...questFromSeed({
    id: `quest-${beast.slug}`,
    name: beast.chore,
    categoryId: categoryForRoom(beast.room),
    beastId: beast.id,
    schedule: "weekly",
    difficulty: DIFFICULTY_BY_BAND[band],
  }),
  type: "individual",
  assignee: [...heroIds],
});

const BAND_ORDER: AgeBand[] = ["little", "kid", "teen"];

const EXTRA_STORES = ["__abilities", "__accessories", "__shops", "__dosDonts"] as const;

const STORED_BY_STORE = {
  __abilities: (stored: SetupStored) => stored.abilities,
  __accessories: (stored: SetupStored) => stored.accessories,
  __dosDonts: (stored: SetupStored) => stored.dosDonts,
};

/** What the game already holds, by id: the plan only ever adds to it */
export interface SetupStored {
  /** Stored quests by id (a re-run keeps them and only adds heroes to their assignees) */
  achievements?: ReadonlyMap<string, unknown>;
  beasts?: ReadonlySet<string>;
  abilities?: ReadonlySet<string>;
  accessories?: ReadonlySet<string>;
  dosDonts?: ReadonlySet<string>;
}

export interface SetupKept {
  chores: number;
  beasts: number;
}

/** The ticked chores and beasts that are already in the game and stay as they are */
export const keptCounts = (answers: Pick<SetupAnswers, "heroes" | "chores">, stored: SetupStored = {}): SetupKept => {
  const ids = new Set(answers.heroes.flatMap((hero) => answers.chores[hero.id] ?? []));
  const beasts = BEAST_LIBRARY.filter((beast) => ids.has(beast.id));
  return {
    chores: beasts.filter((beast) => stored.achievements?.has(`quest-${beast.slug}`)).length,
    beasts: beasts.filter((beast) => stored.beasts?.has(String(beast.id))).length,
  };
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The summary's reassurance line, or null when nothing is kept */
export const keptLine = ({ chores, beasts }: SetupKept): string | null => {
  const parts = [chores && plural(chores, "chore", "chores"), beasts && plural(beasts, "beast", "beasts")].filter(Boolean);
  if (!parts.length) return null;
  const isOne = parts.length === 1 && (chores === 1 || beasts === 1);
  return `${parts.join(" and ")} ${isOne ? "is" : "are"} already in your game and stay as they are`;
};

/** A stored quest with the new heroes added to its assignees, or null when it needs no change (or lists no assignees) */
const withAssignees = (stored: unknown, heroIds: readonly string[]): Achievement | null => {
  const quest = stored as Achievement;
  if (!Array.isArray(quest.assignee)) return null;
  const added = heroIds.filter((id) => !quest.assignee.includes(id));
  return added.length ? { ...quest, assignee: [...quest.assignee, ...added] } : null;
};

export const setupPlan = (
  answers: SetupAnswers,
  shopsNow: ReadonlyMap<string, unknown> = new Map(),
  now: Date = new Date(),
  newId: () => string = uuidv4,
  stored: SetupStored = {}
): SetupPlan => {
  const newProfiles: StoredProfile[] = [];
  // Wizard hero id -> the profile id the quests assign (a new hero gets a fresh one)
  const profileIdOf = new Map<string, string>();
  let kidIndex = 0;
  for (const hero of answers.heroes) {
    if (hero.existing) {
      profileIdOf.set(hero.id, hero.id);
      continue;
    }
    const id = newId();
    // A new parent with no Game Master form becomes a plain hero profile
    const gm = hero.isParent ? answers.gameMaster : undefined;
    const profile = gm
      ? quickStartGameMaster(gm, id)
      : quickStartHero(hero.name, kidIndex++, id);
    newProfiles.push(profile);
    profileIdOf.set(hero.id, id);
  }

  // One quest per beast, however many heroes ticked it; its band is the youngest ticker's
  const tickers = new Map<string, { beast: LibraryBeast; band: AgeBand; heroIds: string[] }>();
  for (const hero of answers.heroes) {
    for (const beastId of new Set(answers.chores[hero.id] ?? [])) {
      const beast = BEAST_LIBRARY.find((entry) => entry.id === beastId);
      if (!beast) continue;
      const entry = tickers.get(beastId) ?? { beast, band: bandOf(hero), heroIds: [] };
      const isYounger = BAND_ORDER.indexOf(bandOf(hero)) < BAND_ORDER.indexOf(entry.band);
      if (isYounger) entry.band = bandOf(hero);
      entry.heroIds.push(profileIdOf.get(hero.id) as string);
      tickers.set(beastId, entry);
    }
  }
  const picked = Array.from(tickers.values());
  // Add-only: a stored quest keeps everything the family tuned and only gains the new heroes
  const quests = picked.flatMap(({ beast, band, heroIds }): Achievement[] => {
    const fresh = choreQuest(beast, band, heroIds);
    const old = stored.achievements?.get(fresh.id);
    if (old === undefined) return [fresh];
    const merged = withAssignees(old, heroIds);
    return merged ? [merged] : [];
  });
  const isNew = (known: ReadonlySet<string> | undefined) => (record: { id?: unknown }) => !known?.has(String(record.id));
  const asEntries = (records: readonly { id?: unknown }[]): BackupEntry[] =>
    records.map((record) => ({ key: String(record.id), value: record }));

  const stores: Record<string, BackupEntry[]> = {
    __profiles: newProfiles.map((profile) => ({ key: String(profile.id), value: profile })),
    __achievementCategories: asEntries(STARTER_CATEGORIES),
    __beasts: asEntries(picked.map(({ beast }) => plainBeast(beast)).filter(isNew(stored.beasts))),
    __achievements: asEntries(quests),
  };
  if (answers.extras) {
    const world = buildStarterWorld(now).stores;
    for (const name of EXTRA_STORES) {
      const known = name === "__shops" ? new Set(shopsNow.keys()) : STORED_BY_STORE[name](stored);
      stores[name] = world[name].filter((entry) => !known?.has(entry.key));
    }
  }
  return { newProfiles, profileIds: Object.fromEntries(profileIdOf), backup: { version: BACKUP_VERSION, exportedAt: now.toISOString(), stores } };
};
