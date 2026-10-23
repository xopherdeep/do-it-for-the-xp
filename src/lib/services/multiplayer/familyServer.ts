/**
 * The calls to the family server (`xp-family/v1` in the xophz-compass-xp plugin), through `townHallFetch`, with the
 * parent's auth or a kid phone's hero key. The wire is snake_case and the app is camelCase: this file is the only place
 * that converts. A failure rejects with the Town Hall's `TownHallError`; `familyProblem` reads it as an outcome.
 */
import { DEFAULT_LOOK, isHeroLook } from "@/lib/hero-look/types";
import { townHallFetch, TownHallError, type TownHallAuth } from "@/lib/services/townhall/townHallClient";
import { AGE_GROUPS, type AgeGroup } from "./ageGroup";
import type { FamilyEvent, FamilyEventKind } from "./familyEvents";
import type { HeroCard } from "./heroCard";

const BASE = "xp-family/v1";

/** The server's answer to binding. `taken` is not here: it arrives as a 403 (`xp_family_taken`). */
export type BindAnswer = "created" | "home" | "home-elsewhere" | "other-family";

export interface ServerHero {
  heroId: string;
  nickname: string;
  /** Only a parent's call returns it */
  ageGroup?: AgeGroup;
  card: HeroCard | null;
}

export interface LinkCode {
  code: string;
  /** ISO time */
  expiresAt: string;
}

export interface HeroPhone {
  id: number;
  heroId: string;
  label: string;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface Claimed {
  key: string;
  familyId: string;
  heroId: string;
  card: HeroCard | null;
}

export interface SendResult {
  accepted: string[];
  duplicate: string[];
  rejected: { id: string; code: string; message: string }[];
}

export interface ReceivedEvent extends FamilyEvent {
  seq: number;
  scope: "public" | "family";
  receivedAt: string;
}

export type FamilyProblem =
  | "offline"
  | "not-member"
  | "taken"
  | "moved"
  | "code-invalid"
  | "key-revoked"
  | "pro-required"
  | "unlinked"
  | "rate-limited"
  | "invalid"
  | "server";

type Wire = Record<string, unknown>;

const heroPath = (heroId: string): string => `${BASE}/heroes/${encodeURIComponent(heroId)}`;

const textOf = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const idsOf = (value: unknown): string[] => listOf(value).filter((id): id is string => typeof id === "string");

/** A card as the server keeps it (the data of the newest `hero.card`); the hero id comes from the row around it. */
const cardFromWire = (heroId: string, raw: unknown): HeroCard | null => {
  const isCard = !!raw && typeof raw === "object";
  if (!isCard) return null;
  const card = raw as Wire;
  const level = Number(card.level);
  return {
    heroId,
    nickname: textOf(card.nickname),
    look: isHeroLook(card.look) ? card.look : DEFAULT_LOOK,
    jobClass: textOf(card.jobClass),
    level: Number.isFinite(level) && level >= 1 ? level : 1,
    updatedAt: textOf(card.updated_at ?? card.updatedAt),
  };
};

const ageGroupFromWire = (value: unknown): AgeGroup | undefined => AGE_GROUPS.find((group) => group === value);

const heroFromWire = (raw: unknown): ServerHero => {
  const hero = raw as Wire;
  const heroId = textOf(hero.hero_id);
  return { heroId, nickname: textOf(hero.nickname), ageGroup: ageGroupFromWire(hero.age_group), card: cardFromWire(heroId, hero.card) };
};

const phoneFromWire = (raw: unknown): HeroPhone => {
  const phone = raw as Wire;
  const lastSeen = phone.last_seen_at;
  return {
    id: Number(phone.id),
    heroId: textOf(phone.hero_id),
    label: textOf(phone.label),
    createdAt: textOf(phone.created_at),
    lastSeenAt: typeof lastSeen === "string" ? lastSeen : null,
  };
};

const eventToWire = (e: FamilyEvent): Wire => ({ id: e.id, hero_id: e.heroId, device_id: e.deviceId, kind: e.kind, at: e.at, data: e.data });

const eventFromWire = (raw: unknown): ReceivedEvent => {
  const e = raw as Wire;
  return {
    seq: Number(e.seq),
    id: textOf(e.id),
    heroId: textOf(e.hero_id),
    deviceId: textOf(e.device_id),
    kind: textOf(e.kind) as FamilyEventKind,
    scope: e.scope === "family" ? "family" : "public",
    at: textOf(e.at),
    receivedAt: textOf(e.received_at),
    data: (e.data && typeof e.data === "object" ? e.data : {}) as Record<string, unknown>,
  };
};

/** Ties the family to the account on this device, or says where it stands (see the spec, section 4) */
export const bindFamily = async (auth: TownHallAuth, familyId: string, deviceId: string): Promise<BindAnswer> => {
  const { data } = await townHallFetch<{ answer: BindAnswer }>(`${BASE}/family`, { auth, method: "POST", body: { family_id: familyId, device_id: deviceId } });
  return data.answer;
};

/** Makes this device the family's home; the old home's next send gets `xp_family_moved` */
export const moveHome = async (auth: TownHallAuth, familyId: string, deviceId: string): Promise<void> => {
  await townHallFetch(`${BASE}/family/move`, { auth, method: "POST", body: { family_id: familyId, device_id: deviceId } });
};

export const getFamily = async (auth: TownHallAuth): Promise<{ familyId: string; heroes: ServerHero[] }> => {
  const { data } = await townHallFetch<Wire>(`${BASE}/family`, { auth });
  return { familyId: textOf(data.family_id), heroes: listOf(data.heroes).map(heroFromWire) };
};

export const saveHero = async (auth: TownHallAuth, heroId: string, nickname: string, ageGroup: AgeGroup): Promise<void> => {
  await townHallFetch(heroPath(heroId), { auth, method: "POST", body: { nickname, age_group: ageGroup } });
};

export const removeHero = async (auth: TownHallAuth, heroId: string): Promise<void> => {
  await townHallFetch(heroPath(heroId), { auth, method: "DELETE" });
};

export const makeLinkCode = async (auth: TownHallAuth, heroId: string): Promise<LinkCode> => {
  const { data } = await townHallFetch<Wire>(`${heroPath(heroId)}/link-codes`, { auth, method: "POST" });
  return { code: textOf(data.code), expiresAt: textOf(data.expires_at) };
};

/** Trades a link code for a hero key. Anyone may ask, so there is no auth. */
export const claimDevice = async (code: string, deviceId: string, label: string): Promise<Claimed> => {
  const { data } = await townHallFetch<Wire>(`${BASE}/devices/claim`, {
    auth: { kind: "none" },
    method: "POST",
    body: { code, device_id: deviceId, label },
  });
  const heroId = textOf(data.hero_id);
  return { key: textOf(data.key), familyId: textOf(data.family_id), heroId, card: cardFromWire(heroId, data.card) };
};

export const listPhones = async (auth: TownHallAuth): Promise<HeroPhone[]> => {
  const { data } = await townHallFetch<unknown[]>(`${BASE}/devices`, { auth });
  return listOf(data).map(phoneFromWire);
};

export const removePhone = async (auth: TownHallAuth, id: number): Promise<void> => {
  await townHallFetch(`${BASE}/devices/${id}`, { auth, method: "DELETE" });
};

export const sendEvents = async (auth: TownHallAuth, events: FamilyEvent[]): Promise<SendResult> => {
  const { data } = await townHallFetch<Wire>(`${BASE}/events`, { auth, method: "POST", body: { events: events.map(eventToWire) } });
  const rejected = listOf(data.rejected).map((raw) => {
    const r = raw as Wire;
    return { id: textOf(r.id), code: textOf(r.code), message: textOf(r.message) };
  });
  return { accepted: idsOf(data.accepted), duplicate: idsOf(data.duplicate), rejected };
};

/** Events after the number `since`, oldest first */
export const fetchEvents = async (auth: TownHallAuth, since: number, limit = 100): Promise<ReceivedEvent[]> => {
  const { data } = await townHallFetch<unknown[]>(`${BASE}/events`, { auth, query: { since, limit } });
  return listOf(data).map(eventFromWire);
};

const PROBLEM_BY_SITE_CODE: Record<string, FamilyProblem> = {
  xp_family_not_member: "not-member",
  xp_family_taken: "taken",
  xp_family_moved: "moved",
  xp_family_code_invalid: "code-invalid",
  xp_family_key_revoked: "key-revoked",
  xp_family_pro_required: "pro-required",
};

const PROBLEM_BY_STATUS: Record<number, FamilyProblem> = { 400: "invalid", 401: "unlinked", 429: "rate-limited" };

/** What a failed call means for the app (the table in the spec, section 10) */
export const familyProblem = (e: unknown): FamilyProblem => {
  const isKnownError = e instanceof TownHallError;
  if (!isKnownError) return "server";
  const isOffline = e.code === "offline";
  if (isOffline) return "offline";
  const named = e.siteCode ? PROBLEM_BY_SITE_CODE[e.siteCode] : undefined;
  return named ?? PROBLEM_BY_STATUS[e.status ?? 0] ?? "server";
};

/** The wait a 429 asked for, in milliseconds; undefined when the failure carries none */
export const retryAfterMs = (e: unknown): number | undefined => {
  const seconds = e instanceof TownHallError ? e.retryAfterSec : undefined;
  return seconds === undefined ? undefined : seconds * 1000;
};
