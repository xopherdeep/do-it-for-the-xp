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

export const setupPlan = (
  answers: SetupAnswers,
  shopsNow: ReadonlyMap<string, unknown> = new Map(),
  now: Date = new Date(),
  newId: () => string = uuidv4
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
  const quests = picked.map(({ beast, band, heroIds }) => choreQuest(beast, band, heroIds));
  const asEntries = (records: readonly { id?: unknown }[]): BackupEntry[] =>
    records.map((record) => ({ key: String(record.id), value: record }));

  const stores: Record<string, BackupEntry[]> = {
    __profiles: newProfiles.map((profile) => ({ key: String(profile.id), value: profile })),
    __achievementCategories: asEntries(STARTER_CATEGORIES),
    __beasts: asEntries(picked.map(({ beast }) => plainBeast(beast))),
    __achievements: asEntries(quests),
  };
  if (answers.extras) {
    const world = buildStarterWorld(now).stores;
    for (const name of EXTRA_STORES) {
      stores[name] = name === "__shops" ? world[name].filter((e) => !shopsNow.has(e.key)) : world[name];
    }
  }
  return { newProfiles, profileIds: Object.fromEntries(profileIdOf), backup: { version: BACKUP_VERSION, exportedAt: now.toISOString(), stores } };
};
