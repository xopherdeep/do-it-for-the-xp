import type { PurchaseLogEntry } from "@/lib/databases/PurchaseLogDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { creditLine } from "@/lib/services/creations/creations";
import type { CreationRow } from "@/lib/services/creations/creations";
import { rewardLineOf } from "@/lib/services/quests/approvalFlow";
import { withHuntBonus } from "@/lib/services/quests/huntBonus";

/**
 * The History tab of the Approvals screen: one line per reviewed quest, reviewed shop purchase or reviewed kid's
 * creation, newest first. Pure: the screen reads the logs and maps them here.
 */

/** How many reviewed things the History tab lists */
export const HISTORY_LIMIT = 20;

export interface HistoryRow {
  key: string;
  title: string;
  userId: string;
  /** When the hero finished the quest, bought the item, or (a creation) the Game Master reviewed it */
  at: string;
  /** Approved or delivered (true) versus rejected, refunded or sent back (false) */
  good: boolean;
  detail: string;
  note?: string;
  badge: { label: string; color: string };
  /** A quest that asked for a photo: its thumbnail shows while the device still holds it (7 days) */
  photoEntry?: QuestLogEntry;
}

const statusBadge = (status: QuestLogEntry["status"]) => {
  const isApproved = status === "approved";
  if (isApproved) return { label: "Approved", color: "success" };
  const isRejected = status === "rejected";
  if (isRejected) return { label: "Rejected", color: "danger" };
  return { label: "Pending", color: "warning" };
};

const purchaseBadge = (status: PurchaseLogEntry["status"]) => {
  const isFulfilled = status === "fulfilled";
  if (isFulfilled) return { label: "Delivered", color: "success" };
  const isRefunded = status === "refunded";
  if (isRefunded) return { label: "Refunded", color: "danger" };
  return { label: "Pending", color: "warning" };
};

export const questHistoryRow = (entry: QuestLogEntry): HistoryRow => ({
  key: `quest:${entry.id}`,
  title: entry.questName,
  userId: entry.userId,
  at: entry.completedAt,
  good: entry.status === "approved",
  detail: entry.status === "approved" ? rewardLineOf(withHuntBonus(entry)) : "",
  note: entry.note,
  badge: statusBadge(entry.status),
  photoEntry: entry.requiresPhoto ? entry : undefined,
});

export const purchaseHistoryRow = (entry: PurchaseLogEntry): HistoryRow => ({
  key: `purchase:${entry.id}`,
  title: entry.itemName,
  userId: entry.userId,
  at: entry.createdAt,
  good: entry.status === "fulfilled",
  detail: entry.status === "fulfilled" ? `Delivered · paid ${entry.price} GP` : `Refunded · ${entry.price} GP given back`,
  note: entry.note,
  badge: purchaseBadge(entry.status),
});

/** A reviewed creation: in the game, or sent back with the note; dated by the review, not by when the kid sent it */
export const creationHistoryRow = (row: CreationRow, nickOf: (id: string) => string): HistoryRow => {
  const record = row.beast ?? row.quest;
  const isApproved = row.state === "approved";
  return {
    key: row.key,
    title: row.name,
    userId: row.by,
    at: record?.proposal?.reviewedOn ?? row.on,
    good: isApproved,
    detail: [row.kind === "beast" ? "Beast" : "Quest", creditLine(record ?? {}, row.kind, nickOf)].filter(Boolean).join(" · "),
    note: row.note,
    badge: isApproved ? { label: "Approved", color: "success" } : { label: "Sent back", color: "danger" },
  };
};

/** Every list together, newest first, cut to the limit */
export const latestHistory = (...lists: HistoryRow[][]): HistoryRow[] =>
  lists
    .flat()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, HISTORY_LIMIT);
