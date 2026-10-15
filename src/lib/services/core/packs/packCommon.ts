/**
 * What the quest packs (Moving House, Home chores) share: how a hero plays, local dates, the Fibonacci rewards, the
 * strike clock and the backup file a pack is loaded from. Pure: no storage, no Vue.
 */
import { format } from "date-fns";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { BACKUP_VERSION } from "@/lib/services/core/BackupService";
import { heroAgeOf, parseLocalDate } from "./heroAge";
import type { BackupEntry, BackupFile } from "@/lib/services/core/BackupService";

/** How a hero plays: the little one (about 6), the kid (about 12), the grown-up; "out" sits the pack out. */
export type PackBand = "little" | "kid" | "grownup";
export type PackRole = PackBand | "out";

export const PACK_BANDS: readonly { id: PackRole; label: string }[] = [
  { id: "little", label: "Little" },
  { id: "kid", label: "Kid" },
  { id: "grownup", label: "Grown-up" },
  { id: "out", label: "Sitting out" },
];

export interface PackHero {
  id: string;
  name: string;
  band: PackRole;
}

/** A beast a pack adds; `attackCooldown` is the minutes a hero gets per checklist step */
export interface PackBeast extends Beast {
  attackCooldown: number;
}

export { parseLocalDate };

export const dateKey = (date: Date): string => format(date, "yyyy-MM-dd");

/** A hero's band from their profile: an adult is a grown-up; a child of 8 or younger is little, any older one a kid. */
export const heroBandFor = (profile: { isAdult?: unknown; birthday?: unknown }, today: Date = new Date()): PackBand => {
  const isAdult = profile.isAdult === true;
  if (isAdult) return "grownup";
  const age = heroAgeOf(profile, today);
  const hasNoBirthday = age === null;
  if (hasNoBirthday) return "kid";
  return age <= 8 ? "little" : "kid";
};

/** The Fibonacci scale's rewards, as the quest form sets them: d x 100 XP, d x 10 GP, d AP */
export const rewardsFor = (difficulty: number) => ({ xp: difficulty * 100, gp: difficulty * 10, ap: difficulty });

/** Minutes per checklist step, to a tenth: the quest's minutes spread over its steps */
export const cooldownOf = (minutes: number, steps: number): number => Math.round((minutes / Math.max(1, steps)) * 10) / 10;

export const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? "" : "s"}`;

export const packEntries = (records: readonly { id?: unknown }[]): BackupEntry[] =>
  records.map((record) => ({ key: String(record.id), value: record }));

/** A backup file for a merge restore that names only the stores a pack writes to */
export const packBackup = (
  stores: { categories: readonly { id?: unknown }[]; beasts: readonly { id?: unknown }[]; quests: readonly { id?: unknown }[] },
  now: Date = new Date()
): BackupFile => ({
  version: BACKUP_VERSION,
  exportedAt: now.toISOString(),
  stores: {
    __achievementCategories: packEntries(stores.categories),
    __beasts: packEntries(stores.beasts),
    __achievements: packEntries(stores.quests),
  },
});
