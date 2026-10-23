/**
 * The game events a device sends to the family server, and the rules that decide who may see and write each kind.
 * The lists mirror the server's (Xophz_Compass_Xp_Family_Event_Rules::KINDS in xophz-compass-xp): the server keeps only
 * the listed fields, refuses unknown kinds, and refuses a kind its writer may not send. Keep both in step.
 */
import { v4 as uuidv4 } from "uuid";
import type { HeroCard } from "./heroCard";

export type FamilyEventKind =
  | "hero.card"
  | "hero.leveled"
  | "quest.done"
  | "quest.claimed"
  | "quest.approved"
  | "quest.rejected"
  | "reward.granted"
  | "hero.sheet"
  | "claim.settled";

export interface FamilyEvent {
  /** uuid v4, made on the device */
  id: string;
  heroId: string;
  deviceId: string;
  kind: FamilyEventKind;
  /** ISO time on the device */
  at: string;
  data: Record<string, unknown>;
}

export interface EventKindRule {
  /** Who may see it: `public` is the family's own devices in this base; `family` is the hero's own phones and the parent */
  scope: "public" | "family";
  /** Who may write it: the home device, the home device or the hero's own linked phone (its hero key), or the server only */
  writer: "home" | "home-or-phone" | "server";
  fields: string[];
}

export const EVENT_KINDS: Record<FamilyEventKind, EventKindRule> = {
  "hero.card": { scope: "public", writer: "home", fields: ["nickname", "look", "jobClass", "level"] },
  "hero.leveled": { scope: "public", writer: "home", fields: ["level", "jobClass"] },
  "quest.done": { scope: "public", writer: "home", fields: ["difficulty", "xp", "fight"] },
  "quest.claimed": { scope: "family", writer: "home-or-phone", fields: ["questId", "difficulty", "requiresApproval", "synced"] },
  "quest.approved": { scope: "family", writer: "home", fields: ["questId", "note"] },
  "quest.rejected": { scope: "family", writer: "home", fields: ["questId", "note"] },
  "reward.granted": { scope: "family", writer: "server", fields: ["xp", "ap", "reason", "sourceId"] },
  "hero.sheet": { scope: "family", writer: "home", fields: ["stats", "quests"] },
  "claim.settled": { scope: "family", writer: "home", fields: ["claimId", "questId", "status", "note", "xp", "gp", "ap"] },
};

/** The look fields the server keeps (string values up to 32 characters) */
export const LOOK_FIELDS = [
  "skin",
  "hair",
  "hairColor",
  "face",
  "eyeColor",
  "outfit",
  "outfitColor",
  "outfitAccent",
  "hat",
  "hatColor",
  "leftHand",
  "rightHand",
] as const;

/** The data of a kind: only its listed fields, and only the ones present */
const keepFields = (kind: FamilyEventKind, data: Record<string, unknown>): Record<string, unknown> => {
  const kept: Record<string, unknown> = {};
  for (const field of EVENT_KINDS[kind].fields) {
    const isPresent = data[field] !== undefined;
    if (isPresent) kept[field] = data[field];
  }
  return kept;
};

/** An event for the queue. Throws for a kind only the server may write. */
export const newEvent = (
  kind: FamilyEventKind,
  heroId: string,
  deviceId: string,
  data: Record<string, unknown>,
  now: Date = new Date(),
  id: string = uuidv4(),
): FamilyEvent => {
  const isServerKind = EVENT_KINDS[kind].writer === "server";
  if (isServerKind) throw new Error(`${kind} is written by the server only`);
  return { id, heroId, deviceId, kind, at: now.toISOString(), data: keepFields(kind, data) };
};

const lookData = (look: HeroCard["look"]): Record<string, string> => {
  const kept: Record<string, string> = {};
  for (const field of LOOK_FIELDS) {
    const value = (look as unknown as Record<string, unknown>)[field];
    const isText = typeof value === "string";
    if (isText) kept[field] = value as string;
  }
  return kept;
};

export const cardEvent = (card: HeroCard, deviceId: string): FamilyEvent =>
  newEvent("hero.card", card.heroId, deviceId, { nickname: card.nickname, look: lookData(card.look), jobClass: card.jobClass, level: card.level });

export const leveledEvent = (heroId: string, level: number, jobClass: string, deviceId: string): FamilyEvent =>
  newEvent("hero.leveled", heroId, deviceId, { level, jobClass });

export const questDoneEvent = (heroId: string, deviceId: string, d: { difficulty: number; xp: number; fight: boolean }): FamilyEvent =>
  newEvent("quest.done", heroId, deviceId, { difficulty: d.difficulty, xp: d.xp, fight: d.fight });

/** What a claim says: the quest, its difficulty and whether it waits for a Game Master */
export interface QuestClaim {
  questId: string;
  difficulty: number;
  requiresApproval: boolean;
  /**
   * Set by a device that syncs records (family sync, section 6): the claim's quest log entry arrives as a record, so the
   * intake never takes it as a phone claim. A free kid phone's claim, and one sent again after a takeover, carry no mark.
   */
  synced?: boolean;
}

export const questClaimedEvent = (heroId: string, deviceId: string, d: QuestClaim): FamilyEvent =>
  newEvent("quest.claimed", heroId, deviceId, {
    questId: d.questId,
    difficulty: d.difficulty,
    requiresApproval: d.requiresApproval,
    ...(d.synced ? { synced: true } : {}),
  });

/** The Game Master's verdict on a held claim: `quest.approved`, or `quest.rejected` with the note the hero saw */
export const questReviewedEvent = (
  heroId: string,
  deviceId: string,
  d: { questId: string; approved: boolean; note: string },
): FamilyEvent =>
  newEvent(d.approved ? "quest.approved" : "quest.rejected", heroId, deviceId, { questId: d.questId, note: d.note });

/** What the family device did with a claim from the hero's phone: took it and holds it, paid it, or turned it away */
export type ClaimSettledStatus = "pending" | "approved" | "rejected";

export interface ClaimSettled {
  /** The phone's `quest.claimed` event id */
  claimId: string;
  questId: string;
  status: ClaimSettledStatus;
  note: string;
  xp: number;
  gp: number;
  ap: number;
}

export const claimSettledEvent = (heroId: string, deviceId: string, d: ClaimSettled): FamilyEvent =>
  newEvent("claim.settled", heroId, deviceId, {
    claimId: d.claimId,
    questId: d.questId,
    status: d.status,
    note: d.note.slice(0, 140),
    xp: d.xp,
    gp: d.gp,
    ap: d.ap,
  });
