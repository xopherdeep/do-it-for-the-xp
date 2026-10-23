import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { approversFor, type Roster } from "@/lib/services/quests/approvalRouting";
import { announceClaimTo } from "@/lib/services/quests/verdictNotices";
import { refreshWaitingClaims } from "@/lib/services/quests/waitingClaims";
import { readRawRecord } from "@/lib/services/sync/recordApply";
import { onRecordsLanded, type RecordsLanded } from "@/lib/services/sync/recordSignals";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

/**
 * A held claim another device logged lands on a Game Master device (family sync spec, section 6): the claim's notice is
 * written by the device that logged it, in the feeds it may write, so a claim made on a kid phone would reach no Game
 * Master's feed. The family device tells the Game Masters it plays (their feeds are its to write; another device's are
 * not) once per entry, and reads the waiting count again whenever quest log entries land.
 */
export interface LandedClaimsContext {
  /** A Game Master's device in the synced family */
  isFamilyDevice(): boolean;
  /** Whether this device holds the hero's turn */
  holds(heroId: string): boolean;
}

const QUEST_LOG = "__questLog";

/** A quest log entry still waiting on a Game Master; null for anything else */
const heldClaimOf = (value: unknown): QuestLogEntry | null => {
  const entry = value as QuestLogEntry | null;
  const isHeldClaim = entry?.status === "pending" && typeof entry.userId === "string" && typeof entry.id === "string";
  return isHeldClaim ? entry : null;
};

const nameOf = (heroId: string, users: Roster): string => {
  const hero = users[heroId] as { name?: { nick?: string; first?: string } } | undefined;
  return hero?.name?.nick || hero?.name?.first || "A hero";
};

/** Starts listening; answers how to stop */
export const listenForLandedClaims = (ctx: LandedClaimsContext): (() => void) => {
  /** Entries already announced here, so a claim rewritten on its way is told once */
  const announced = new Set<string>();

  const onLanded = async ({ store, keys }: RecordsLanded): Promise<void> => {
    const isClaimsHere = store === QUEST_LOG && ctx.isFamilyDevice();
    if (!isClaimsHere) return;
    const users = useUserStore().users as Roster;
    for (const key of keys) {
      const entry = heldClaimOf(await readRawRecord(QUEST_LOG, key));
      const isNew = entry !== null && !announced.has(entry.id);
      if (!isNew) continue;
      announced.add(entry.id);
      const gmIds = approversFor(entry.userId, users).filter((gmId) => ctx.holds(gmId));
      announceClaimTo(gmIds, entry, nameOf(entry.userId, users));
    }
    await refreshWaitingClaims();
  };

  return onRecordsLanded((landed) => {
    onLanded(landed).catch((error) => debug.warn("sync: could not announce the landed claims", error));
  });
};
