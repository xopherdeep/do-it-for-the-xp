import {
  BACKUP_DUE_DAYS,
  backupAgeLabel,
  daysSinceBackup,
  isBackupDue,
  lastBackupAt,
  recordBackup,
  snoozeBackupNudge,
} from "@/lib/services/core/backupReminder";

const DAY = 24 * 60 * 60 * 1000;
const at = (offsetDays: number, from = new Date("2026-10-17T12:00:00Z")) => new Date(from.getTime() + offsetDays * DAY);

describe("backup reminder", () => {
  beforeEach(() => localStorage.clear());

  it("does not nudge a device with no family yet", () => {
    expect(isBackupDue(false)).toBe(false);
  });

  it("nudges when there was never a backup", () => {
    expect(lastBackupAt()).toBeNull();
    expect(isBackupDue(true)).toBe(true);
    expect(backupAgeLabel(null)).toBe("No backup yet");
  });

  it("stays quiet for a week after a backup, then asks again", () => {
    const now = new Date("2026-10-17T12:00:00Z");
    recordBackup(now);
    expect(isBackupDue(true, at(BACKUP_DUE_DAYS - 1, now))).toBe(false);
    expect(isBackupDue(true, at(BACKUP_DUE_DAYS, now))).toBe(true);
    expect(daysSinceBackup(lastBackupAt(), at(3, now))).toBe(3);
  });

  it("Later holds the nudge back for a few days", () => {
    const now = new Date("2026-10-17T12:00:00Z");
    snoozeBackupNudge(now);
    expect(isBackupDue(true, at(1, now))).toBe(false);
    expect(isBackupDue(true, at(4, now))).toBe(true);
  });

  it("words the age", () => {
    const now = new Date("2026-10-17T12:00:00Z");
    expect(backupAgeLabel(now, now)).toBe("Last backup: today");
    expect(backupAgeLabel(at(-1, now), now)).toBe("Last backup: 1 day ago");
    expect(backupAgeLabel(at(-9, now), now)).toBe("Last backup: 9 days ago");
  });
});
