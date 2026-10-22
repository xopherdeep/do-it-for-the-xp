/**
 * The records and turn routes of the family server (`xp-family/v1`, section 2 and 3 of the family sync spec), through
 * `townHallFetch`, with the parent's auth or a kid phone's hero key. Written like `familyServer.ts`: the wire is snake_case
 * and the app is camelCase, and this file is the only place that converts. A record's `body` is the record as a JSON
 * string: the caller stringifies it going out and parses it coming in, and this file passes it through untouched.
 * A failure rejects with the Town Hall's `TownHallError`; `familyProblem` reads it (a family that is not Pro gets
 * `pro-required` from every route here).
 */
import { townHallFetch, TownHallError, type TownHallAuth } from "@/lib/services/townhall/townHallClient";

const BASE = "xp-family/v1";

/** Most records one put may carry */
export const MAX_RECORD_BATCH = 50;
/** Most bytes one put may carry in all */
export const MAX_BATCH_BYTES = 1_000_000;
/** Most bytes one record's body may be (512 KB) */
export const MAX_RECORD_BYTES = 524_288;

export interface WireRecord {
  store: string;
  key: string;
  /** The hero a hero-scope record belongs to; null for a family record */
  heroId: string | null;
  deleted: boolean;
  /** The record as a JSON string; left out (or empty) for a tombstone */
  body?: string;
}

export interface ReceivedRecord extends WireRecord {
  /** The family's change number for this write */
  seq: number;
  /** The device that wrote it */
  deviceId: string;
  /** Server time of the write */
  savedAt: string;
}

export interface PutResult {
  accepted: { store: string; key: string; seq: number }[];
  refused: { store: string; key: string; code: string; message: string }[];
}

export type PlayAnswer = { answer: "granted" } | { answer: "busy"; device: { label: string; lastSeenAt: string | null } };

type Wire = Record<string, unknown>;

const heroPath = (heroId: string): string => `${BASE}/heroes/${encodeURIComponent(heroId)}`;

const textOf = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** The site's tinyint may come through as `true`, `1` or `"1"`: all of them are a tombstone */
const isTombstone = (value: unknown): boolean => value === true || value === 1 || value === "1";

const recordToWire = (r: WireRecord): Wire => ({ store: r.store, key: r.key, hero_id: r.heroId, deleted: r.deleted, body: r.body });

const recordFromWire = (raw: unknown): ReceivedRecord => {
  const r = raw as Wire;
  return {
    seq: Number(r.seq),
    store: textOf(r.store),
    key: textOf(r.key),
    heroId: textOf(r.hero_id) || null,
    deleted: isTombstone(r.deleted),
    body: typeof r.body === "string" ? r.body : undefined,
    deviceId: textOf(r.device_id),
    savedAt: textOf(r.saved_at),
  };
};

/** Writes up to `MAX_RECORD_BATCH` records; the answer says per record whether it was kept (with its number) or refused */
export const putRecords = async (auth: TownHallAuth, deviceId: string, records: WireRecord[]): Promise<PutResult> => {
  const { data } = await townHallFetch<Wire>(`${BASE}/records`, { auth, method: "PUT", body: { device_id: deviceId, records: records.map(recordToWire) } });
  const accepted = listOf(data.accepted).map((raw) => {
    const a = raw as Wire;
    return { store: textOf(a.store), key: textOf(a.key), seq: Number(a.seq) };
  });
  const refused = listOf(data.refused).map((raw) => {
    const r = raw as Wire;
    return { store: textOf(r.store), key: textOf(r.key), code: textOf(r.code), message: textOf(r.message) };
  });
  return { accepted, refused };
};

/** Records after the number `since` that the caller may read, oldest first */
export const fetchRecords = async (auth: TownHallAuth, since: number, limit = 100): Promise<ReceivedRecord[]> => {
  const { data } = await townHallFetch<unknown[]>(`${BASE}/records`, { auth, query: { since, limit } });
  return listOf(data).map(recordFromWire);
};

/**
 * Takes the hero's turn, or says who holds it. `force` takes it over from the device that holds it.
 * An answer this app does not know is a failure, never a grant: a grant lets this device write the hero's records.
 */
export const playHero = async (auth: TownHallAuth, heroId: string, deviceId: string, label: string, force = false): Promise<PlayAnswer> => {
  const { data } = await townHallFetch<Wire>(`${heroPath(heroId)}/play`, { auth, method: "POST", body: { device_id: deviceId, label, force } });
  const isGranted = data.answer === "granted";
  if (isGranted) return { answer: "granted" };
  const isBusy = data.answer === "busy";
  if (isBusy) {
    const device = (data.device && typeof data.device === "object" ? data.device : {}) as Wire;
    const lastSeen = device.last_seen_at;
    return { answer: "busy", device: { label: textOf(device.label), lastSeenAt: typeof lastSeen === "string" ? lastSeen : null } };
  }
  throw new TownHallError("server", "The family server answered play with something this app does not know");
};

/** Gives the turn back if this device holds it; otherwise the site does nothing */
export const restHero = async (auth: TownHallAuth, heroId: string, deviceId: string): Promise<void> => {
  await townHallFetch(`${heroPath(heroId)}/rest`, { auth, method: "POST", body: { device_id: deviceId } });
};
