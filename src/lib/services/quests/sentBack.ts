import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { getEffectiveWindow, type HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";

/**
 * A chore the Game Master sent back. Pure: no storage, no Vue.
 *
 * A rejected claim keeps its note, who reviewed it and when on its quest log entry (status "rejected", `note`,
 * `reviewedBy`, `reviewedAt`), and a rejected entry never counts toward the chore's allowance, so the chore opens again
 * at once. The hero's own side reads that here: the chore is "sent back" while the hero's MOST RECENT claim of it in
 * the current window was rejected and the chore is still open. A new claim (pending) or an approval ends it.
 */

/** The shape the screens carry: the Game Master's note, empty when none was typed */
export interface SentBack {
  note: string;
}

/** The hero's latest claim of the quest inside the window, or null */
const latestClaimIn = (
  entries: readonly QuestLogEntry[],
  questId: string,
  heroId: string,
  start: Date,
  end: Date
): QuestLogEntry | null => {
  let latest: QuestLogEntry | null = null;
  for (const entry of entries) {
    const isOtherClaim = String(entry.questId) !== questId || String(entry.userId) !== heroId;
    if (isOtherClaim) continue;
    const completedAt = new Date(entry.completedAt);
    const isOutsideWindow = !(completedAt >= start && completedAt < end);
    if (isOutsideWindow) continue;
    const isNewer = !latest || completedAt > new Date(latest.completedAt);
    if (isNewer) latest = entry;
  }
  return latest;
};

/** Quest id -> the sent-back record, for every open chore on the board whose latest claim of the window was rejected */
export const sentBackFor = (
  entries: readonly QuestLogEntry[],
  board: readonly QuestBoardItem[],
  heroId: string,
  now: Date,
  effects?: HeroQuestEffects
): Record<string, SentBack> => {
  const sentBack: Record<string, SentBack> = {};
  for (const item of board) {
    const isSettled = item.status !== "open" || item.pending;
    if (isSettled) continue;
    const window = getEffectiveWindow(item.quest, effects, now);
    if (!window) continue;
    const questId = String(item.quest.id);
    const latest = latestClaimIn(entries, questId, String(heroId), window.start, window.end);
    const isSentBack = latest?.status === "rejected";
    if (isSentBack) sentBack[questId] = { note: String(latest?.note ?? "").trim() };
  }
  return sentBack;
};

/** "Sent back: Wipe the sides too", or "Sent back" when the Game Master left no note */
export const sentBackLine = (sentBack: SentBack): string =>
  sentBack.note ? `Sent back: ${sentBack.note}` : "Sent back";
