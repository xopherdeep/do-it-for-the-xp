/**
 * A hero's age group for the family server: child (under 13), teen (13 to 17) or adult. It comes from the birthday
 * when the profile has a readable one, a Game Master (isAdult) is an adult, and otherwise the Game Master picks in
 * the family card; until they do, the hero counts as a child. The server only stores it: part 2 enforces party rules.
 */
import { heroAgeOf } from "@/lib/services/core/packs/heroAge";

export type AgeGroup = "child" | "teen" | "adult";

export const AGE_GROUPS: AgeGroup[] = ["child", "teen", "adult"];

export const TEEN_FROM_AGE = 13;
export const ADULT_FROM_AGE = 18;

export interface AgeProfile {
  isAdult?: unknown;
  birthday?: string;
}

const isAgeGroup = (value: unknown): value is AgeGroup => AGE_GROUPS.includes(value as AgeGroup);

/** The age in whole years from a readable birthday that is not in the future, else null */
const knownAge = (profile: AgeProfile, today: Date): number | null => {
  const age = heroAgeOf(profile, today);
  const unusable = age === null || age < 0;
  return unusable ? null : age;
};

export const ageGroupOf = (profile: AgeProfile, picked?: AgeGroup, today: Date = new Date()): AgeGroup => {
  if (profile.isAdult === true) return "adult";
  const age = knownAge(profile, today);
  if (age !== null) {
    if (age >= ADULT_FROM_AGE) return "adult";
    return age >= TEEN_FROM_AGE ? "teen" : "child";
  }
  return isAgeGroup(picked) ? picked : "child";
};

/** A hero the Game Master has to pick for: not an adult and no readable birthday */
export const needsAgePick = (profile: AgeProfile, today: Date = new Date()): boolean =>
  profile.isAdult !== true && knownAge(profile, today) === null;
