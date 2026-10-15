/**
 * A hero's age from the profile's birthday. Pure and light (date-fns only), so the packs (packCommon) and the copy
 * voices (services/copy/voices.ts) read the same age without pulling in the stores.
 */
import { startOfDay } from "date-fns";

/** Local midnight of a "YYYY-MM-DD" date; an unreadable one is today */
export const parseLocalDate = (text: string | undefined): Date => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(text ?? ""));
  if (!parts) return startOfDay(new Date());
  return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
};

/**
 * A hero's age in whole years today, from the profile's birthday ("YYYY-MM-DD" or any date text), or null when there is
 * no readable birthday. A bare date is read as a local day, so the age does not shift with the time zone.
 */
export const heroAgeOf = (profile: { birthday?: unknown }, today: Date = new Date()): number | null => {
  const text = String(profile.birthday ?? "");
  const born = /^\d{4}-\d{2}-\d{2}$/.test(text) ? parseLocalDate(text) : new Date(text);
  if (Number.isNaN(born.getTime())) return null;
  let age = today.getFullYear() - born.getFullYear();
  const hadBirthday = today.getMonth() > born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() >= born.getDate());
  if (!hadBirthday) age -= 1;
  return age;
};
