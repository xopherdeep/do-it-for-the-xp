/**
 * The hero's phone side of two-phone play (FAMILY_EVENTS.md), as pure functions over what the phone keeps: the claims
 * the hero made here, the newest sheet the family device sent, and how far the phone has read the server's events.
 *
 * The family device is the only one that pays, so the phone never changes a number itself. A claim is an event with its
 * own id: it waits in the phone's send queue while offline, the server dedupes it by id, and the family device takes it
 * once. The phone learns what happened from `claim.settled` (taken and held, paid, or turned away) and the Game Master's
 * verdict from a later `claim.settled`. Nothing a phone does can overwrite the family device's game, and nothing is lost
 * while a phone is offline: the claim stays queued, then sent, until the family device answers it.
 */
import type { QueuedEvent } from "./eventOutbox";
import type { ReceivedEvent } from "./familyServer";
import { sheetFromEvent, type HeroSheet, type SheetQuest } from "./heroSheet";

/**
 * `waiting`: made on this phone, not answered yet (still queued here, or on the server for the family device to take).
 * `pending`: the family device took it and holds it for a Game Master. `approved`: paid. `rejected`: turned away, by a
 * Game Master or because the quest was closed by the time the family device saw it. `refused`: the site would not take it.
 */
export type PhoneClaimStatus = "waiting" | "pending" | "approved" | "rejected" | "refused";

export interface PhoneClaim {
  /** The `quest.claimed` event id */
  id: string;
  questId: string;
  questName: string;
  /** ISO time on the phone */
  at: string;
  status: PhoneClaimStatus;
  note: string;
  paid: { xp: number; gp: number; ap: number };
  /** The server's number of the `claim.settled` that last changed it; 0 until one did */
  settledSeq: number;
}

export interface HeroPhoneState {
  outbox: QueuedEvent[];
  lastSeq: number;
  sheet: HeroSheet | null;
  claims: PhoneClaim[];
}

/** Settled claims kept for the list, newest first */
export const MAX_SETTLED_CLAIMS = 30;

export const emptyPhoneState = (): HeroPhoneState => ({ outbox: [], lastSeq: 0, sheet: null, claims: [] });

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

const STATUSES: PhoneClaimStatus[] = ["waiting", "pending", "approved", "rejected", "refused"];

/** A stored state read back: what is missing or the wrong shape is empty, so an older save still loads */
export const readPhoneState = (stored: unknown): HeroPhoneState => {
  const saved = isRecord(stored) ? stored : {};
  const claims = Array.isArray(saved.claims)
    ? (saved.claims as unknown[]).filter((c): c is PhoneClaim => isRecord(c) && typeof c.id === "string" && STATUSES.includes(c.status as PhoneClaimStatus))
    : [];
  return {
    outbox: Array.isArray(saved.outbox) ? (saved.outbox as QueuedEvent[]) : [],
    lastSeq: typeof saved.lastSeq === "number" ? saved.lastSeq : 0,
    sheet: isRecord(saved.sheet) ? (saved.sheet as unknown as HeroSheet) : null,
    claims,
  };
};

/** A claim the hero just made, at the top of the list */
export const addClaim = (state: HeroPhoneState, claimId: string, quest: SheetQuest, at: string): HeroPhoneState => {
  const isKnown = state.claims.some((claim) => claim.id === claimId);
  if (isKnown) return state;
  const claim: PhoneClaim = {
    id: claimId,
    questId: quest.questId,
    questName: quest.name,
    at,
    status: "waiting",
    note: "",
    paid: { xp: 0, gp: 0, ap: 0 },
    settledSeq: 0,
  };
  return { ...state, claims: [claim, ...state.claims] };
};

/** The order a claim moves in: an answer never moves it back (an old `pending` after the verdict changes nothing) */
const RANK: Record<PhoneClaimStatus, number> = { waiting: 0, refused: 1, pending: 1, approved: 2, rejected: 2 };

const settledStatusOf = (value: unknown): PhoneClaimStatus | null =>
  value === "pending" || value === "approved" || value === "rejected" ? value : null;

const wholeOf = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
};

const settleClaim = (claim: PhoneClaim, e: ReceivedEvent): PhoneClaim => {
  const status = settledStatusOf(e.data?.status);
  const isForward = status !== null && RANK[status] > RANK[claim.status];
  if (!isForward) return claim;
  const note = typeof e.data?.note === "string" ? e.data.note : "";
  return { ...claim, status, note, paid: { xp: wholeOf(e.data?.xp), gp: wholeOf(e.data?.gp), ap: wholeOf(e.data?.ap) }, settledSeq: e.seq };
};

/**
 * Reads a batch of the server's events for this hero: the newest `hero.sheet` wins (by the server's number), and a
 * `claim.settled` moves the claim it names forward. Events about another hero, or claims this phone did not make,
 * change nothing.
 */
export const applyReceived = (state: HeroPhoneState, events: ReceivedEvent[], heroId: string): HeroPhoneState => {
  let sheet = state.sheet;
  let claims = state.claims;
  let lastSeq = state.lastSeq;
  for (const e of events) {
    lastSeq = Math.max(lastSeq, e.seq);
    const isMine = e.heroId === heroId;
    if (!isMine) continue;
    const received = sheetFromEvent(e);
    const isNewerSheet = received !== null && (sheet === null || received.seq > sheet.seq);
    if (isNewerSheet) sheet = received;
    const isSettled = e.kind === "claim.settled";
    if (isSettled) claims = claims.map((claim) => (claim.id === e.data?.claimId ? settleClaim(claim, e) : claim));
  }
  return { ...state, sheet, claims, lastSeq };
};

/** The site would not take these claims at all (a rejected send): they will never reach the family device */
export const refuseClaims = (state: HeroPhoneState, ids: string[]): HeroPhoneState => {
  const refused = new Set(ids);
  const claims = state.claims.map((claim) =>
    refused.has(claim.id) && claim.status === "waiting" ? { ...claim, status: "refused" as const, note: "The site turned this claim away." } : claim
  );
  return { ...state, claims };
};

/** Every waiting claim, then the settled ones, newest first and at most MAX_SETTLED_CLAIMS of them */
export const trimClaims = (state: HeroPhoneState): HeroPhoneState => {
  const waiting = state.claims.filter((claim) => claim.status === "waiting" || claim.status === "pending");
  const settled = state.claims.filter((claim) => !waiting.includes(claim)).slice(0, MAX_SETTLED_CLAIMS);
  const keep = new Set([...waiting, ...settled]);
  return { ...state, claims: state.claims.filter((claim) => keep.has(claim)) };
};

/**
 * The quests the phone offers: the sheet's, less the ones this phone claimed since the sheet was made. A claim still
 * waiting always hides its quest (the family device has not seen it yet); a claim the family device took hides it until
 * a newer sheet arrives, which already counts it. A turned-away claim hides nothing.
 */
export const claimableQuests = (state: HeroPhoneState): SheetQuest[] => {
  const sheet = state.sheet;
  if (!sheet) return [];
  const sheetSeq = sheet.seq;
  const hidden = new Set(
    state.claims
      .filter((claim) => claim.status === "waiting" || ((claim.status === "pending" || claim.status === "approved") && claim.settledSeq > sheetSeq))
      .map((claim) => claim.questId)
  );
  return sheet.quests.filter((quest) => !hidden.has(quest.questId));
};

/** Whether the claim is still in this phone's send queue (not on the server yet) */
export const isUnsent = (state: HeroPhoneState, claimId: string): boolean => state.outbox.some((e) => e.id === claimId);
