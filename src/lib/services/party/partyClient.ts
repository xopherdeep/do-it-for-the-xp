/**
 * The calls to the party routes (`xp-party/v1` in the xophz-compass-xp plugin), through `townHallFetch`, with the
 * parent's auth. The site answers in camelCase and reads snake_case, so this file is the one place that converts. A
 * failure rejects with the Town Hall's `TownHallError`; `partyProblem` reads it as an outcome.
 */
import { townHallFetch, TownHallError, type TownHallAuth } from "@/lib/services/townhall/townHallClient";
import { familyProblem, type FamilyProblem } from "@/lib/services/multiplayer/familyServer";
import type { PartyHeroCard } from "./partyRules";
import type { RaidWindow } from "./raidRules";
import {
  eventsOf,
  partiesOf,
  partyFromWire,
  raidFromWire,
  requestFromWire,
  requestsOf,
  type WireEvent,
  type WireParty,
  type WireRaid,
  type WireRef,
  type WireRequest,
} from "./partyWire";

const BASE = "xp-party/v1";

type Wire = Record<string, unknown>;

const textOf = (value: unknown): string => {
  const isText = typeof value === "string";
  return isText ? value : "";
};

const numberOf = (value: unknown): number => {
  const isNumber = typeof value === "number" && Number.isFinite(value);
  return isNumber ? value : 0;
};

const recordOf = (value: unknown): Wire => {
  const isObject = typeof value === "object" && value !== null;
  return isObject ? (value as Wire) : {};
};

/** The raid in an answer; a made-up empty one when the site sent none, so the caller never meets undefined */
const raidOrEmpty = (value: unknown): WireRaid =>
  raidFromWire(value) ?? { id: "", beastId: "", window: "standard", maxHp: 0, memberCount: 0, startedAt: "", endsAt: "", hp: 0, status: "active", top: null, last: null, strikes: [] };

export interface NewParty {
  name: string;
  emblem: string;
  inviteRule: "leader" | "members";
  leader: PartyHeroCard;
}

export interface StrikeToSend {
  key: string;
  heroId: string;
  damage: number;
  day: string;
  at: string;
}

export interface StrikeVerdict {
  accepted: boolean;
  damage: number;
  reason: string;
  raid: WireRaid;
}

export interface MyParties {
  parties: WireParty[];
  incoming: WireRequest[];
  outgoing: WireRequest[];
}

export interface PartyFeed {
  party: WireParty;
  events: WireEvent[];
  seq: number;
}

/** A parent forms a party led by one of its heroes; the answer carries the code to share */
export const formParty = async (auth: TownHallAuth, party: NewParty): Promise<{ party: WireParty; code: string }> => {
  const { name, emblem, inviteRule, leader } = party;
  const { data } = await townHallFetch<Wire>(`${BASE}/parties`, {
    auth,
    method: "POST",
    body: { name, emblem, invite_rule: inviteRule, leader },
  });
  return { party: partyFromWire(data.party), code: textOf(data.code) };
};

/** Asks for a hero to join the party that holds a code (the site reads it with spaces and dashes) */
export const joinByCode = async (auth: TownHallAuth, code: string, card: PartyHeroCard): Promise<WireRequest> => {
  const { data } = await townHallFetch<Wire>(`${BASE}/parties/join`, { auth, method: "POST", body: { code, card } });
  const request = requestFromWire(data.request);
  if (!request) throw new TownHallError("server", "The site answered without the request", 200);
  return request;
};

export const resolveRequest = async (auth: TownHallAuth, partyId: string, requestId: string, decision: "approve" | "decline"): Promise<void> => {
  await townHallFetch(`${BASE}/parties/${encodeURIComponent(partyId)}/requests/${encodeURIComponent(requestId)}`, {
    auth,
    method: "POST",
    body: { decision },
  });
};

/** A hero leaves, or its family takes it out; the answer says whether that ended the party */
export const leaveParty = async (auth: TownHallAuth, partyId: string, familyId: string, heroId: string): Promise<{ disbanded: boolean }> => {
  const path = `${BASE}/parties/${encodeURIComponent(partyId)}/members/${encodeURIComponent(familyId)}/${encodeURIComponent(heroId)}`;
  const { data } = await townHallFetch<Wire>(path, { auth, method: "DELETE" });
  return { disbanded: data.disbanded === true };
};

export const rotateCode = async (auth: TownHallAuth, partyId: string): Promise<string> => {
  const { data } = await townHallFetch<Wire>(`${BASE}/parties/${encodeURIComponent(partyId)}/code/rotate`, { auth, method: "POST" });
  return textOf(data.code);
};

export const blockCode = async (auth: TownHallAuth, code: string): Promise<void> => {
  await townHallFetch(`${BASE}/codes/${encodeURIComponent(code)}/block`, { auth, method: "POST" });
};

/** The parties this family is in and the open join requests, both ways */
export const myParties = async (auth: TownHallAuth): Promise<MyParties> => {
  const { data } = await townHallFetch<Wire>(`${BASE}/parties/mine`, { auth });
  const requests = recordOf(data.requests);
  return { parties: partiesOf(data.parties), incoming: requestsOf(requests.incoming), outgoing: requestsOf(requests.outgoing) };
};

/** One party now, and its events after a number */
export const readFeed = async (auth: TownHallAuth, partyId: string, since: number, limit?: number): Promise<PartyFeed> => {
  const { data } = await townHallFetch<Wire>(`${BASE}/parties/${encodeURIComponent(partyId)}/feed`, { auth, query: { since, limit } });
  return { party: partyFromWire(data.party), events: eventsOf(data.events), seq: numberOf(data.seq) };
};

export const startPartyRaid = async (auth: TownHallAuth, partyId: string, beastId: string, window: RaidWindow): Promise<WireRaid> => {
  const { data } = await townHallFetch<Wire>(`${BASE}/parties/${encodeURIComponent(partyId)}/raids`, {
    auth,
    method: "POST",
    body: { beast_id: beastId, window },
  });
  return raidOrEmpty(data.raid);
};

/** Sends one strike; a resend of the same key is answered as not accepted ("duplicate"), never counted twice */
export const sendStrike = async (auth: TownHallAuth, raidId: string, strike: StrikeToSend): Promise<StrikeVerdict> => {
  const { key, heroId, damage, day, at } = strike;
  const { data } = await townHallFetch<Wire>(`${BASE}/raids/${encodeURIComponent(raidId)}/strikes`, {
    auth,
    method: "POST",
    body: { key, hero_id: heroId, damage, day, at },
  });
  return {
    accepted: data.accepted === true,
    damage: numberOf(data.damage),
    reason: textOf(data.reason),
    raid: raidOrEmpty(data.raid),
  };
};

export const withdrawStrike = async (auth: TownHallAuth, raidId: string, key: string): Promise<void> => {
  await townHallFetch(`${BASE}/raids/${encodeURIComponent(raidId)}/strikes/${encodeURIComponent(key)}`, { auth, method: "DELETE" });
};

/** Sends one of the fixed words, to the whole party or to one member */
export const sendPreset = async (auth: TownHallAuth, partyId: string, heroId: string, preset: string, to?: WireRef): Promise<void> => {
  const target = to ? { to_family: to.familyId, to_hero: to.heroId } : {};
  await townHallFetch(`${BASE}/parties/${encodeURIComponent(partyId)}/presets`, {
    auth,
    method: "POST",
    body: { hero_id: heroId, preset, ...target },
  });
};

/** What a refused call means for the app */
export type PartyProblem =
  | FamilyProblem
  | "code-unknown"
  | "blocked"
  | "already-member"
  | "request-pending"
  | "forbidden"
  | "raid-running"
  | "too-small"
  | "stale"
  | "gone"
  | "busy";

const PROBLEM_BY_SITE_CODE: Record<string, PartyProblem> = {
  xp_party_pro_required: "pro-required",
  xp_party_code_unknown: "code-unknown",
  xp_party_blocked: "blocked",
  xp_party_already_member: "already-member",
  xp_party_request_pending: "request-pending",
  xp_party_not_member: "not-member",
  xp_party_forbidden: "forbidden",
  xp_party_raid_running: "raid-running",
  xp_party_too_small: "too-small",
  xp_party_strike_stale: "stale",
  xp_party_not_found: "gone",
  xp_party_raid_not_found: "gone",
  xp_party_request_gone: "gone",
  xp_party_strike_not_found: "gone",
  xp_party_busy: "busy",
};

/** What a failed call means: the party routes' own refusals first, then the family routes' problems */
export const partyProblem = (e: unknown): PartyProblem => {
  const siteCode = e instanceof TownHallError ? e.siteCode : undefined;
  const named = siteCode ? PROBLEM_BY_SITE_CODE[siteCode] : undefined;
  return named ?? familyProblem(e);
};
