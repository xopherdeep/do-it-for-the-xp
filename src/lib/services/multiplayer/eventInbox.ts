/**
 * Event inbox: downloading events, extracting and paying server rewards once (MP18).
 * Manages event sequences, reward receipts, and trimming 90-day-old paid records.
 */
import type { ReceivedEvent } from "./familyServer";

export interface RewardToPay {
  id: string;
  heroId: string;
  xp: number;
  ap: number;
  reason: string;
}

export interface PaidRewardRecord {
  id: string;
  at: string;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/** Extracts unpaid reward.granted events from a received batch */
export const rewardsToPay = (
  events: ReceivedEvent[],
  paid: { id: string }[]
): RewardToPay[] => {
  const paidSet = new Set(paid.map((record) => record.id));
  const unpaid: RewardToPay[] = [];

  for (const event of events) {
    const isRewardKind = event.kind === "reward.granted";
    const isAlreadyPaid = paidSet.has(event.id);
    const shouldPay = isRewardKind && !isAlreadyPaid;

    if (shouldPay) {
      const xpVal = typeof event.data?.xp === "number" ? event.data.xp : 0;
      const apVal = typeof event.data?.ap === "number" ? event.data.ap : 0;
      const reasonVal = typeof event.data?.reason === "string" ? event.data.reason : "";

      paidSet.add(event.id);
      unpaid.push({
        id: event.id,
        heroId: event.heroId,
        xp: xpVal,
        ap: apVal,
        reason: reasonVal,
      });
    }
  }

  return unpaid;
};

/** Calculates the newest sequence number handled */
export const newestSeq = (events: ReceivedEvent[], lastSeq: number): number => {
  let highest = lastSeq;
  for (const event of events) {
    const isNewer = event.seq > highest;
    if (isNewer) {
      highest = event.seq;
    }
  }
  return highest;
};

/** Adds new paid reward records with the current timestamp */
export const markPaid = (
  paid: PaidRewardRecord[],
  ids: string[],
  now: Date
): PaidRewardRecord[] => {
  const existingSet = new Set(paid.map((record) => record.id));
  const timestamp = now.toISOString();
  const additions: PaidRewardRecord[] = [];

  for (const id of ids) {
    const isPresent = existingSet.has(id);
    if (!isPresent) {
      existingSet.add(id);
      additions.push({ id, at: timestamp });
    }
  }

  return [...paid, ...additions];
};

/** Trims paid records older than 90 days */
export const trimPaid = (paid: PaidRewardRecord[], now: Date): PaidRewardRecord[] => {
  const cutoff = now.getTime() - NINETY_DAYS_MS;
  return paid.filter((record) => {
    const entryTime = new Date(record.at).getTime();
    const isRecent = entryTime >= cutoff;
    return isRecent;
  });
};
