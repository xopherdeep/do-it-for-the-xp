/**
 * When the family last backed up, and whether it is time to ask again. Everything lives on one phone, so a Game Master
 * is nudged to back up once a week; "Later" holds the nudge back for a few days. Pure rules plus two tiny storage keys.
 */

const LAST_KEY = "xp.lastBackupAt";
const SNOOZE_KEY = "xp.backupNudgeUntil";

/** A backup older than this is due again */
export const BACKUP_DUE_DAYS = 7;
/** "Later" quiets the nudge for this long */
export const BACKUP_SNOOZE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    // chemx-allow: best-effort storage may be blocked, so the nudge simply has no memory
    return null;
  }
};

const write = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // chemx-allow: best-effort storage may be blocked, so the nudge simply has no memory
  }
};

const asTime = (value: string | null): number | null => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : null;
};

/** The moment of the last backup, or null when there never was one */
export const lastBackupAt = (): Date | null => {
  const time = asTime(read(LAST_KEY));
  return time === null ? null : new Date(time);
};

export const recordBackup = (now: Date = new Date()): void => write(LAST_KEY, now.toISOString());

export const snoozeBackupNudge = (now: Date = new Date()): void =>
  write(SNOOZE_KEY, new Date(now.getTime() + BACKUP_SNOOZE_DAYS * DAY_MS).toISOString());

/** Whole days since the backup, or null when there never was one */
export const daysSinceBackup = (last: Date | null, now: Date = new Date()): number | null =>
  last ? Math.max(0, Math.floor((now.getTime() - last.getTime()) / DAY_MS)) : null;

/** Whether to nudge: a family exists, the last backup is old (or missing) and "Later" was not tapped lately */
export const isBackupDue = (hasFamily: boolean, now: Date = new Date()): boolean => {
  if (!hasFamily) return false;
  const snoozedUntil = asTime(read(SNOOZE_KEY));
  const isSnoozed = snoozedUntil !== null && snoozedUntil > now.getTime();
  if (isSnoozed) return false;
  const days = daysSinceBackup(lastBackupAt(), now);
  return days === null || days >= BACKUP_DUE_DAYS;
};

/** The sentence under "Back up everything" and in the nudge */
export const backupAgeLabel = (last: Date | null, now: Date = new Date()): string => {
  const days = daysSinceBackup(last, now);
  const hasNever = days === null;
  if (hasNever) return "No backup yet";
  const isToday = days === 0;
  if (isToday) return "Last backup: today";
  return `Last backup: ${days} ${days === 1 ? "day" : "days"} ago`;
};
