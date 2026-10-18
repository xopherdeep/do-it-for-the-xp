import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";
import type { AgeGroup } from "@/lib/services/multiplayer/ageGroup";
import type { QueuedEvent } from "@/lib/services/multiplayer/eventOutbox";

/**
 * What this device keeps for the family server: the events waiting to be sent, how far it has read the server's events,
 * the rewards it has paid, the last card and sheet it sent per hero, the hero-phone claims it took, and the Game Master's
 * age-group picks.
 *
 * This database is never added to BACKUP_STORES: a backup must not carry a queue (a restore would resend old events)
 * and the numbers belong to this device.
 */
export const familyEventsStorage = new Storage({
  name: "__xp_family_events",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

/** Where this device stands with the family's home: unknown until the server has answered */
export type HomeStatus = "home" | "home-elsewhere" | "other-family" | "unknown";

const HOME_STATUSES: HomeStatus[] = ["home", "home-elsewhere", "other-family", "unknown"];

export interface FamilyEventsState {
  outbox: QueuedEvent[];
  /** The newest event number this device has handled */
  lastSeq: number;
  /** Server rewards already paid; entries older than 90 days are dropped, because the server no longer holds them */
  paidRewards: { id: string; at: string }[];
  /** heroId -> the JSON (cardKey) of the last card sent */
  lastCards: Record<string, string>;
  /** heroId -> the age group the Game Master picked */
  ageGroupPicks: Record<string, AgeGroup>;
  home: HomeStatus;
  /** Claims taken from hero phones (the `quest.claimed` event ids), so each is logged once; dropped after 90 days */
  takenClaims: { id: string; at: string }[];
  /** heroId -> the sheetKey of the last `hero.sheet` sent for the hero's phones */
  lastSheets: Record<string, string>;
}

const emptyFamilyEvents = (): FamilyEventsState => ({
  outbox: [],
  lastSeq: 0,
  paidRewards: [],
  lastCards: {},
  ageGroupPicks: {},
  home: "unknown",
  takenClaims: [],
  lastSheets: {},
});

/** A state with nothing in it, frozen all the way down: ask the database for one to edit */
export const EMPTY_FAMILY_EVENTS: FamilyEventsState = (() => {
  const empty = emptyFamilyEvents();
  Object.freeze(empty.outbox);
  Object.freeze(empty.paidRewards);
  Object.freeze(empty.lastCards);
  Object.freeze(empty.ageGroupPicks);
  Object.freeze(empty.takenClaims);
  Object.freeze(empty.lastSheets);
  return Object.freeze(empty);
})();

const isRecord = (value: unknown): value is Record<string, unknown> => {
  const isObject = !!value && typeof value === "object";
  return isObject && !Array.isArray(value);
};

const listOr = <T>(value: unknown, fallback: T[]): T[] => (Array.isArray(value) ? (value as T[]) : fallback);

const recordOr = <T>(value: unknown, fallback: Record<string, T>): Record<string, T> => (isRecord(value) ? (value as Record<string, T>) : fallback);

/** The stored value read as a state: what is missing or the wrong shape is empty, so an older save still loads */
const readState = (stored: unknown): FamilyEventsState => {
  const empty = emptyFamilyEvents();
  const saved: Record<string, unknown> = isRecord(stored) ? stored : {};
  return {
    outbox: listOr<QueuedEvent>(saved.outbox, empty.outbox),
    lastSeq: typeof saved.lastSeq === "number" ? saved.lastSeq : empty.lastSeq,
    paidRewards: listOr<FamilyEventsState["paidRewards"][number]>(saved.paidRewards, empty.paidRewards),
    lastCards: recordOr<string>(saved.lastCards, empty.lastCards),
    ageGroupPicks: recordOr<AgeGroup>(saved.ageGroupPicks, empty.ageGroupPicks),
    home: HOME_STATUSES.includes(saved.home as HomeStatus) ? (saved.home as HomeStatus) : empty.home,
    takenClaims: listOr<FamilyEventsState["takenClaims"][number]>(saved.takenClaims, empty.takenClaims),
    lastSheets: recordOr<string>(saved.lastSheets, empty.lastSheets),
  };
};

const RECORD_KEY = "state";

export class FamilyEventsDb extends DbStorageApi {
  public async getState(): Promise<FamilyEventsState> {
    return readState(await this.get(RECORD_KEY));
  }

  public async saveState(state: FamilyEventsState): Promise<void> {
    await this.set(RECORD_KEY, state);
  }
}

let instance: FamilyEventsDb | null = null;
export const getFamilyEventsDb = (): FamilyEventsDb => {
  if (!instance) instance = new FamilyEventsDb(familyEventsStorage);
  return instance;
};

export default FamilyEventsDb;
