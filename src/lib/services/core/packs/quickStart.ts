/**
 * Quick start: the parent types the kids' names, taps once, and the family can play tonight.
 *
 * It writes one merge backup (BackupService) holding a hero profile per name and the Quick start pack
 * (catalog/quickStart.ts) with every quest assigned to those heroes, so it is all or nothing like any pack load.
 * It only runs on a device with no profiles at all: that first run is the one moment nobody can be signed in as a
 * Game Master yet, so the usual Game Master check is replaced by "there is nobody here to protect".
 *
 * Nobody is made Game Master: the parent adds their own profile (with its PIN) when they come to customize, and
 * until then the device behaves like any install with no Game Master (gm.guard.ts, "no-game-master").
 */
import { BACKUP_STORES, BACKUP_VERSION, BackupService } from "@/lib/services/core/BackupService";
import type { BackupEntry, BackupFile, RestoreResult } from "@/lib/services/core/BackupService";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { StoredProfile } from "@/lib/utils/User/user";
import User from "@/lib/utils/User/user";
import Stats from "@/lib/utils/User/stats";
import { useUserStore } from "@/lib/store/stores/user";
import { v4 as uuidv4 } from "uuid";
import { QUICK_START_PACK } from "./catalog/quickStart";
import { packToBackup } from "./packService";
import type { PackStorage } from "./packService";

/** Enough rows for a big family without the form scrolling forever */
export const QUICK_START_MAX_HEROES = 6;
export const QUICK_START_NAME_LENGTH = 24;

/** Each hero gets a different starting class and picture, so the file select doesn't show the same hero twice */
const STARTER_CLASSES = ["Warrior", "Mage", "Thief", "Monk"];

export class QuickStartError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuickStartError";
  }
}

/** The names to make heroes for: trimmed, blanks dropped, the same name typed twice kept once, at most six */
export const heroNames = (names: readonly string[]): string[] => {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const raw of names) {
    const name = String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, QUICK_START_NAME_LENGTH).trim();
    const key = name.toLowerCase();
    const isSkipped = !name || seen.has(key);
    if (isSkipped) continue;
    seen.add(key);
    kept.push(name);
  }
  return kept.slice(0, QUICK_START_MAX_HEROES);
};

/** A new hero as the profile form would save it, with only a name typed in */
export const quickStartHero = (name: string, index: number, id: string = uuidv4()): StoredProfile => {
  const hero = new User({
    id,
    name: { full: name },
    avatar: `${String(index + 1).padStart(3, "0")}-gamer`,
    favoriteFood: "",
    favoriteThing: "",
    jobClass: STARTER_CLASSES[index % STARTER_CLASSES.length],
    isAdult: false,
    stats: new Stats(),
  });
  // Plain data, the way a backup file carries it
  return JSON.parse(JSON.stringify(hero));
};

/** The pack's quests, each one every hero's own to do (Solo: one hero's clear never closes it for the others) */
export const assignQuests = (quests: readonly Achievement[], heroIds: readonly string[]): Achievement[] =>
  quests.map((quest) => ({ ...quest, type: "individual", assignee: [...heroIds] }));

export interface QuickStartPlan {
  backup: BackupFile;
  heroes: StoredProfile[];
}

/** The backup that seeds the heroes and the pack; pure, so the shape is tested without storage */
export const quickStartPlan = (
  names: readonly string[],
  shopsNow: ReadonlyMap<string, unknown> = new Map(),
  now: Date = new Date(),
  newId: () => string = uuidv4
): QuickStartPlan => {
  const kept = heroNames(names);
  const hasNoHeroes = !kept.length;
  if (hasNoHeroes) throw new QuickStartError("Name at least one hero to start.");
  const heroes = kept.map((name, index) => quickStartHero(name, index, newId()));
  const heroIds = heroes.map((hero) => String(hero.id));
  const pack = {
    ...QUICK_START_PACK,
    content: { ...QUICK_START_PACK.content, quests: assignQuests(QUICK_START_PACK.content.quests ?? [], heroIds) },
  };
  const backup = packToBackup(pack, shopsNow, now);
  const profiles: BackupEntry[] = heroes.map((hero) => ({ key: String(hero.id), value: hero }));
  return {
    heroes,
    backup: { version: BACKUP_VERSION, exportedAt: now.toISOString(), stores: { __profiles: profiles, ...backup.stores } },
  };
};

export interface QuickStartDeps {
  storage: (name: "__profiles" | "__shops") => PackStorage;
  /** A merge restore of the plan's backup */
  restore: (file: BackupFile) => Promise<RestoreResult>;
}

const storageOf = (name: string): PackStorage => {
  const def = BACKUP_STORES.find((store) => store.name === name);
  if (!def) throw new Error(`Unknown store ${name}`);
  return def.storage as unknown as PackStorage;
};

// The first-run check below stands in for the Game Master check, which nobody can pass before a profile exists
const firstRunService = new BackupService(BACKUP_STORES, () => useUserStore().loadUsers(), () => true);

const defaultDeps: QuickStartDeps = {
  storage: storageOf,
  restore: (file) => firstRunService.restoreBackup(file, { mode: "merge" }),
};

const readAll = async (storage: PackStorage): Promise<Map<string, unknown>> => {
  const records = new Map<string, unknown>();
  await storage.create();
  await storage.forEach((value, key) => {
    // Block body on purpose: forEach stops as soon as the callback returns anything but undefined
    const isStored = value !== undefined;
    if (isStored) records.set(key, value);
  });
  return records;
};

/** Seeds the heroes and the Quick start pack. Refused once any profile exists, so it can never touch a family's game */
export const runQuickStart = async (names: readonly string[], deps: QuickStartDeps = defaultDeps): Promise<StoredProfile[]> => {
  const profiles = await readAll(deps.storage("__profiles"));
  const hasProfiles = profiles.size > 0;
  if (hasProfiles) throw new QuickStartError("Quick start is only for a new game. Add heroes from Settings > Family instead.");
  const plan = quickStartPlan(names, await readAll(deps.storage("__shops")));
  await deps.restore(plan.backup);
  return plan.heroes;
};
