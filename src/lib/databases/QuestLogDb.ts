import { v4 as uuidv4 } from "uuid";
import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";

/**
 * Quest Log: one record per time a hero completes (claims or defeats) a quest.
 * This is the only place "done" is recorded; Achievement records stay pure definitions.
 */
export const questLogStorage = new Storage({
  name: "__questLog",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export type QuestLogStatus = "pending" | "approved" | "rejected";
export type QuestLogSource = "claim" | "battle" | "gm";

export interface QuestRewards {
  xp: number;
  gp: number;
  ap: number;
}

export interface QuestLogEntry {
  id: string;
  questId: string;
  questName: string;
  userId: string;
  /** ISO timestamp of when the hero finished the quest */
  completedAt: string;
  /** Local calendar day (YYYY-MM-DD) of completion, used by schedule checks */
  dayKey: string;
  status: QuestLogStatus;
  source: QuestLogSource;
  rewards: QuestRewards;
  /** True once XP/GP/AP have been credited to the hero's profile */
  rewardsApplied: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  note?: string;
}

export type NewQuestLogEntry = Pick<QuestLogEntry, "questId" | "questName" | "userId" | "status" | "source" | "rewards"> &
  Partial<Pick<QuestLogEntry, "rewardsApplied" | "note" | "completedAt">>;

/** Local calendar day key, e.g. 2026-10-08 (not UTC, so late-night chores count for the right day). */
export const toDayKey = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export class QuestLogDb extends DbStorageApi {
  public async logCompletion(input: NewQuestLogEntry): Promise<QuestLogEntry> {
    const completedAt = input.completedAt || new Date().toISOString();
    const entry: QuestLogEntry = {
      id: uuidv4(),
      questId: input.questId,
      questName: input.questName,
      userId: input.userId,
      completedAt,
      dayKey: toDayKey(new Date(completedAt)),
      status: input.status,
      source: input.source,
      rewards: { xp: input.rewards.xp || 0, gp: input.rewards.gp || 0, ap: input.rewards.ap || 0 },
      rewardsApplied: input.rewardsApplied ?? false,
      note: input.note,
    };
    await this.set(entry.id, entry);
    return entry;
  }

  public async getEntries(): Promise<QuestLogEntry[]> {
    const entries = (await this.getAll()) as QuestLogEntry[];
    return entries.filter(Boolean).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }

  public async getEntriesForUser(userId: string): Promise<QuestLogEntry[]> {
    return (await this.getEntries()).filter((entry) => entry.userId === userId);
  }

  public async getPending(): Promise<QuestLogEntry[]> {
    return (await this.getEntries()).filter((entry) => entry.status === "pending");
  }

  public async updateEntry(id: string, patch: Partial<QuestLogEntry>): Promise<QuestLogEntry | null> {
    const existing = (await this.get(id)) as QuestLogEntry | null;
    if (!existing) return null;
    const updated = { ...existing, ...patch, id };
    await this.set(id, updated);
    return updated;
  }
}

let questLogDb: QuestLogDb | null = null;

export const getQuestLogDb = (): QuestLogDb => {
  if (!questLogDb) questLogDb = new QuestLogDb(questLogStorage);
  return questLogDb;
};

export default QuestLogDb;
