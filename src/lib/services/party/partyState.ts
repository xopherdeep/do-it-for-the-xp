/**
 * What the party store keeps on the device, and how a saved copy is made safe to use. A record saved by an older build,
 * a half-written one or a hand-edited backup must never put a wrong shape into the store, so every field is checked and
 * whatever is wrong falls back to its default. Pure: no storage, no Vue.
 */
import type { HeroPartyMode } from "./partyRules";
import type { Raid, RaidWindow, Strike } from "./raidRules";

/** A strike waiting to reach the site (a chore finished offline, or before the site answered) */
export interface QueuedStrike {
  raidId: string;
  key: string;
  heroId: string;
  damage: number;
  day: string;
  /** ISO */
  at: string;
}

export interface PartyState {
  heroModes: Record<string, HeroPartyMode>;
  approvedParties: Record<string, string[]>;
  raids: Raid[];
  /** One key per reward paid: "raid:{raidId}:{heroId}" */
  paid: string[];
  defaultWindow: RaidWindow;
  /** Strikes for raids with other families that the site has not taken yet */
  outbox: QueuedStrike[];
}

const MODES: readonly string[] = ["open", "ask", "home"];
const WINDOWS: readonly string[] = ["quick", "standard", "epic"];

export const emptyPartyState = (): PartyState => ({
  heroModes: {},
  approvedParties: {},
  raids: [],
  paid: [],
  defaultWindow: "standard",
  outbox: [],
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
  const isObject = typeof value === "object" && value !== null;
  return isObject && !Array.isArray(value);
};

const isText = (value: unknown): value is string => typeof value === "string";

const isCount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const textsOf = (value: unknown): string[] => {
  const list = Array.isArray(value) ? value : [];
  return list.filter(isText);
};

const cleanModes = (value: unknown): Record<string, HeroPartyMode> => {
  const source = isRecord(value) ? value : {};
  const kept = Object.entries(source).filter(([, mode]) => MODES.includes(String(mode)));
  return Object.fromEntries(kept) as Record<string, HeroPartyMode>;
};

const cleanApproved = (value: unknown): Record<string, string[]> => {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(Object.entries(source).map(([heroId, parties]) => [heroId, textsOf(parties)]));
};

const cleanStrike = (value: unknown): Strike | null => {
  const source = isRecord(value) ? value : {};
  const hasText = isText(source.key) && isText(source.heroId) && isText(source.at);
  const hasDamage = isCount(source.damage);
  const isStrike = hasText && hasDamage;
  return isStrike ? (source as unknown as Strike) : null;
};

const cleanRaid = (value: unknown): Raid | null => {
  const source = isRecord(value) ? value : {};
  const hasIdentity = isText(source.id) && isText(source.partyId) && isText(source.beastId);
  const hasWindow = WINDOWS.includes(String(source.window));
  const hasTimes = isText(source.startedAt) && isCount(source.maxHp);
  const isRaid = hasIdentity && hasWindow && hasTimes;
  if (!isRaid) return null;
  const strikes = (Array.isArray(source.strikes) ? source.strikes : []).map(cleanStrike);
  return {
    ...(source as unknown as Raid),
    memberIds: textsOf(source.memberIds),
    strikes: strikes.filter((strike): strike is Strike => strike !== null),
  };
};

const cleanQueued = (value: unknown): QueuedStrike | null => {
  const source = isRecord(value) ? value : {};
  const hasText = isText(source.raidId) && isText(source.key) && isText(source.heroId) && isText(source.day) && isText(source.at);
  const isQueued = hasText && isCount(source.damage);
  return isQueued ? (source as unknown as QueuedStrike) : null;
};

/** A saved record turned into a state the store can use; anything missing or malformed takes its default */
export const cleanPartyState = (saved: unknown): PartyState => {
  const defaults = emptyPartyState();
  const source = isRecord(saved) ? saved : {};
  const raids = (Array.isArray(source.raids) ? source.raids : []).map(cleanRaid);
  const hasWindow = WINDOWS.includes(String(source.defaultWindow));
  return {
    heroModes: cleanModes(source.heroModes),
    approvedParties: cleanApproved(source.approvedParties),
    raids: raids.filter((raid): raid is Raid => raid !== null),
    paid: textsOf(source.paid),
    defaultWindow: hasWindow ? (source.defaultWindow as RaidWindow) : defaults.defaultWindow,
    outbox: (Array.isArray(source.outbox) ? source.outbox : []).map(cleanQueued).filter((item): item is QueuedStrike => item !== null),
  };
};
