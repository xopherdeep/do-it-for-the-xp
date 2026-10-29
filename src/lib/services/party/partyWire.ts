/**
 * What the party routes answer, as the app reads it. The site (xophz-compass-xp, Party_Rest) answers in camelCase, and
 * what comes back may name heroes of OTHER families, so nothing is taken on trust: every piece is checked and a wrong
 * or missing one falls back to a plain default. Pure: no network, no stores.
 */
import type { PartyHeroCard } from "./partyRules";
import type { RaidWindow } from "./raidRules";

/** A hero of any family: hero ids are only unique inside one family */
export interface WireRef {
  familyId: string;
  heroId: string;
}

export interface WireMember extends WireRef {
  card: PartyHeroCard;
  role: "leader" | "member";
  joinedAt: string;
}

export interface WireStrike extends WireRef {
  key: string;
  damage: number;
  day: string;
  at: string;
}

export interface WireRaid {
  id: string;
  beastId: string;
  window: RaidWindow;
  maxHp: number;
  memberCount: number;
  startedAt: string;
  endsAt: string;
  hp: number;
  status: "active" | "defeated" | "retreated";
  top: WireRef | null;
  last: WireRef | null;
  strikes: WireStrike[];
}

export interface WireParty {
  id: string;
  name: string;
  emblem: string;
  inviteRule: "leader" | "members";
  leader: WireRef;
  members: WireMember[];
  raid: WireRaid | null;
  seq: number;
  /** Only the leader, or a member when invites are open to members, is told the code */
  code?: string;
}

export interface WireRequest extends WireRef {
  id: string;
  partyId: string;
  partyName: string;
  card: PartyHeroCard;
  createdAt: string;
}

export interface WireEvent {
  seq: number;
  kind: string;
  familyId: string | null;
  heroId: string | null;
  data: Record<string, unknown>;
  at: string;
}

type Wire = Record<string, unknown>;

const isRecord = (value: unknown): value is Wire => {
  const isObject = typeof value === "object" && value !== null;
  return isObject && !Array.isArray(value);
};

const rec = (value: unknown): Wire => (isRecord(value) ? value : {});

const text = (value: unknown, fallback = ""): string => {
  const isText = typeof value === "string";
  return isText ? value : fallback;
};

const count = (value: unknown, fallback = 0): number => {
  const isCount = typeof value === "number" && Number.isFinite(value);
  return isCount ? value : fallback;
};

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => {
  const isAllowed = allowed.includes(value as T);
  return isAllowed ? (value as T) : fallback;
};

const refOf = (value: unknown): WireRef | null => {
  const source = rec(value);
  const hasIds = typeof source.familyId === "string" && typeof source.heroId === "string";
  return hasIds ? { familyId: text(source.familyId), heroId: text(source.heroId) } : null;
};

const cardOf = (value: unknown): PartyHeroCard => {
  const source = rec(value);
  const look = isRecord(source.look) ? (source.look as PartyHeroCard["look"]) : null;
  return {
    heroId: text(source.heroId),
    nickname: text(source.nickname, "Hero"),
    level: Math.max(1, count(source.level, 1)),
    jobClass: text(source.jobClass),
    look,
  };
};

const memberOf = (value: unknown): WireMember | null => {
  const source = rec(value);
  const ref = refOf(source);
  if (!ref) return null;
  return { ...ref, card: cardOf(source.card), role: pick(source.role, ["leader", "member"], "member"), joinedAt: text(source.joinedAt) };
};

const strikeOf = (value: unknown): WireStrike | null => {
  const source = rec(value);
  const ref = refOf(source);
  const hasKey = typeof source.key === "string" && source.key !== "";
  const isComplete = ref !== null && hasKey;
  if (!isComplete) return null;
  return { ...ref, key: text(source.key), damage: count(source.damage), day: text(source.day), at: text(source.at) };
};

const present = <T>(items: (T | null)[]): T[] => items.filter((item): item is T => item !== null);

export const raidFromWire = (value: unknown): WireRaid | null => {
  const source = rec(value);
  const hasId = typeof source.id === "string" && source.id !== "";
  if (!hasId) return null;
  return {
    id: text(source.id),
    beastId: text(source.beastId),
    window: pick(source.window, ["quick", "standard", "epic"], "standard"),
    maxHp: count(source.maxHp),
    memberCount: count(source.memberCount),
    startedAt: text(source.startedAt),
    endsAt: text(source.endsAt),
    hp: count(source.hp),
    status: pick(source.status, ["active", "defeated", "retreated"], "active"),
    top: refOf(source.top),
    last: refOf(source.last),
    strikes: present(list(source.strikes).map(strikeOf)),
  };
};

export const partyFromWire = (value: unknown): WireParty => {
  const source = rec(value);
  const code = typeof source.code === "string" ? { code: text(source.code) } : {};
  return {
    id: text(source.id),
    name: text(source.name),
    emblem: text(source.emblem),
    inviteRule: pick(source.inviteRule, ["leader", "members"], "leader"),
    leader: refOf(source.leader) ?? { familyId: "", heroId: "" },
    members: present(list(source.members).map(memberOf)),
    raid: raidFromWire(source.raid),
    seq: count(source.seq),
    ...code,
  };
};

export const requestFromWire = (value: unknown): WireRequest | null => {
  const source = rec(value);
  const ref = refOf(source);
  const hasId = typeof source.id === "string" && source.id !== "";
  const isComplete = ref !== null && hasId;
  if (!isComplete) return null;
  return {
    ...ref,
    id: text(source.id),
    partyId: text(source.partyId),
    partyName: text(source.partyName),
    card: cardOf(source.card),
    createdAt: text(source.createdAt),
  };
};

export const eventFromWire = (value: unknown): WireEvent | null => {
  const source = rec(value);
  const hasSeq = typeof source.seq === "number" && Number.isFinite(source.seq);
  if (!hasSeq) return null;
  return {
    seq: count(source.seq),
    kind: text(source.kind),
    familyId: typeof source.familyId === "string" ? source.familyId : null,
    heroId: typeof source.heroId === "string" ? source.heroId : null,
    data: rec(source.data),
    at: text(source.at),
  };
};

export const partiesOf = (value: unknown): WireParty[] => list(value).map(partyFromWire);
export const requestsOf = (value: unknown): WireRequest[] => present(list(value).map(requestFromWire));
export const eventsOf = (value: unknown): WireEvent[] => present(list(value).map(eventFromWire));
