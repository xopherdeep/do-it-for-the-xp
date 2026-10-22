import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";
import type { ClaimSettled, ClaimSettledStatus } from "@/lib/services/multiplayer/familyEvents";

/**
 * What this device keeps for Family Sync: the records waiting to be sent, how far it has read the site's records, whether
 * the first push and pull are done, the turn it believes it holds for each hero, and the Game Master's verdicts.
 *
 * Never added to BACKUP_STORES: a restored queue would resend old records, and the turns belong to this device.
 */
export const syncStorage = new Storage({
  name: "__xp_sync",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

/**
 * One changed record waiting to be sent: the store and key, because the value is read at send time, and the hero the record
 * belongs to, because a removed record has no value left to name its hero from (null for a family record)
 */
export interface OutboxItem {
  store: string;
  key: string;
  heroId: string | null;
  queuedAt: string;
}

/** A hero's turn as this device believes it, for a restart; the site is asked again on the next sign-in */
export type StoredTurn = "held" | "resting";

const STORED_TURNS: StoredTurn[] = ["held", "resting"];

/** A `claim.settled` this device has taken for a hero whose log entry it has not paid yet, with the site's number for it */
export type PendingVerdict = ClaimSettled & { heroId: string; seq: number };

export interface SyncState {
  outbox: OutboxItem[];
  /** The newest record number this device has applied */
  lastSeq: number;
  firstPushDone: boolean;
  firstPullDone: boolean;
  /** heroId -> the turn this device believes it has */
  turns: Record<string, StoredTurn>;
  /** questLog entry id -> the verdict this Game Master device sent for an entry it does not own, until the mirror arrives */
  verdictsSent: Record<string, { approved: boolean; at: string }>;
  /** claimId -> a verdict that came before its quest log entry did, kept until it can be applied */
  pendingVerdicts: Record<string, PendingVerdict>;
}

export const emptySyncState = (): SyncState => ({
  outbox: [],
  lastSeq: 0,
  firstPushDone: false,
  firstPullDone: false,
  turns: {},
  verdictsSent: {},
  pendingVerdicts: {},
});

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/** A stored outbox item read back, or null when it is not one; an item saved before it named a hero, or with a bad one, has none */
const readOutboxItem = (value: unknown): OutboxItem | null => {
  if (!isRecord(value)) return null;
  const hasFields = typeof value.store === "string" && typeof value.key === "string" && typeof value.queuedAt === "string";
  if (!hasFields) return null;
  const heroId = typeof value.heroId === "string" ? value.heroId : null;
  return { store: value.store as string, key: value.key as string, heroId, queuedAt: value.queuedAt as string };
};

const isItem = (item: OutboxItem | null): item is OutboxItem => item !== null;

const isStoredTurn = (value: unknown): value is StoredTurn => STORED_TURNS.includes(value as StoredTurn);

const isSentVerdict = (value: unknown): value is SyncState["verdictsSent"][string] =>
  isRecord(value) && typeof value.approved === "boolean" && typeof value.at === "string";

const SETTLED_STATUSES: ClaimSettledStatus[] = ["pending", "approved", "rejected"];

const isPendingVerdict = (value: unknown): value is PendingVerdict => {
  if (!isRecord(value)) return false;
  const hasIds = typeof value.claimId === "string" && typeof value.questId === "string" && typeof value.heroId === "string";
  const hasWords = SETTLED_STATUSES.includes(value.status as ClaimSettledStatus) && typeof value.note === "string";
  const hasNumbers = [value.xp, value.gp, value.ap, value.seq].every((n) => typeof n === "number");
  return hasIds && hasWords && hasNumbers;
};

/** The entries of a stored map that pass the check; a map of the wrong shape has none */
const entriesWhere = <T>(value: unknown, isEntry: (entry: unknown) => entry is T): Record<string, T> => {
  if (!isRecord(value)) return {};
  const kept: Record<string, T> = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (isEntry(entry)) kept[key] = entry;
  });
  return kept;
};

/** A stored state read back: what is missing or the wrong shape is empty, so an older save still loads */
export const readSyncState = (stored: unknown): SyncState => {
  const saved: Record<string, unknown> = isRecord(stored) ? stored : {};
  const empty = emptySyncState();
  return {
    outbox: Array.isArray(saved.outbox) ? saved.outbox.map(readOutboxItem).filter(isItem) : empty.outbox,
    lastSeq: typeof saved.lastSeq === "number" ? saved.lastSeq : empty.lastSeq,
    firstPushDone: typeof saved.firstPushDone === "boolean" ? saved.firstPushDone : empty.firstPushDone,
    firstPullDone: typeof saved.firstPullDone === "boolean" ? saved.firstPullDone : empty.firstPullDone,
    turns: entriesWhere(saved.turns, isStoredTurn),
    verdictsSent: entriesWhere(saved.verdictsSent, isSentVerdict),
    pendingVerdicts: entriesWhere(saved.pendingVerdicts, isPendingVerdict),
  };
};

const RECORD_KEY = "state";

export class SyncDb extends DbStorageApi {
  public async getState(): Promise<SyncState> {
    return readSyncState(await this.get(RECORD_KEY));
  }

  public async saveState(state: SyncState): Promise<void> {
    await this.set(RECORD_KEY, state);
  }

  /** Family Sync was turned off or the device left the family: the queue, the numbers and the turns go with it */
  public async clearState(): Promise<void> {
    await this.remove(RECORD_KEY);
  }
}

let instance: SyncDb | null = null;
export const getSyncDb = (): SyncDb => {
  if (!instance) instance = new SyncDb(syncStorage);
  return instance;
};

export default SyncDb;
