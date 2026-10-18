/**
 * A hero's sheet: what the hero's own phone shows (two-phone play, FAMILY_EVENTS.md). The family device keeps the game
 * and sends the sheet as `hero.sheet` (family scope: the hero's phones and the parent, never other families) whenever it
 * changes: the hero's numbers and the quests they can claim right now. The phone never edits it; it only shows the
 * newest one, so two devices never disagree about a hero's XP or GP.
 */
import { newEvent, type FamilyEvent } from "./familyEvents";
import type { ReceivedEvent } from "./familyServer";

export interface SheetStats {
  level: number;
  xp: number;
  /** The XP the next level asks for */
  nextLevelXp: number;
  /** GP in the wallet */
  gp: number;
  /** AP earned in all */
  ap: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
}

export interface SheetQuest {
  questId: string;
  name: string;
  difficulty: number;
  xp: number;
  gp: number;
  ap: number;
  /** A Game Master has to say yes before it pays */
  needsApproval: boolean;
  /** The chore wants a photo, which a phone claim cannot carry: the Game Master checks in person */
  photo: boolean;
  /** Past its deadline today */
  overdue: boolean;
}

export interface HeroSheet {
  heroId: string;
  /** ISO time on the family device */
  at: string;
  /** The server's number for the event, so a phone can order the sheet against the claims it settled */
  seq: number;
  stats: SheetStats;
  quests: SheetQuest[];
}

/** The most quests one sheet carries, so the event stays small */
export const MAX_SHEET_QUESTS = 60;
/** The longest quest name a sheet carries */
const MAX_NAME = 80;

const numberOf = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const wholeOf = (value: unknown, fallback = 0): number => Math.max(0, Math.round(numberOf(value, fallback)));

/** The numbers of a profile (stats.level, xp, gp.wallet, ap.total, hp, mp); a missing one reads as 0 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const statsOf = (profile: any): SheetStats => {
  const stats = profile?.stats ?? {};
  return {
    level: Math.max(1, wholeOf(stats.level, 1)),
    xp: wholeOf(stats.xp?.now),
    nextLevelXp: wholeOf(stats.xp?.next_level),
    gp: Math.round(numberOf(stats.gp?.wallet)),
    ap: wholeOf(stats.ap?.total),
    hp: wholeOf(stats.hp?.now),
    maxHp: wholeOf(stats.hp?.max),
    mp: wholeOf(stats.mp?.now),
    maxMp: wholeOf(stats.mp?.max),
  };
};

const sheetQuestFromWire = (raw: unknown): SheetQuest | null => {
  const isObject = !!raw && typeof raw === "object";
  if (!isObject) return null;
  const q = raw as Record<string, unknown>;
  const questId = typeof q.questId === "string" ? q.questId : "";
  if (!questId) return null;
  return {
    questId,
    name: typeof q.name === "string" ? q.name.slice(0, MAX_NAME) : "",
    difficulty: Math.max(1, wholeOf(q.difficulty, 1)),
    xp: wholeOf(q.xp),
    gp: wholeOf(q.gp),
    ap: wholeOf(q.ap),
    needsApproval: q.needsApproval === true,
    photo: q.photo === true,
    overdue: q.overdue === true,
  };
};

/** The quests as a sheet sends them: names cut short, at most MAX_SHEET_QUESTS */
export const sheetQuests = (quests: SheetQuest[]): SheetQuest[] =>
  quests.slice(0, MAX_SHEET_QUESTS).map((quest) => ({ ...quest, name: quest.name.slice(0, MAX_NAME) }));

/** What identifies a sheet's content, to send it only when it changed */
export const sheetKey = (stats: SheetStats, quests: SheetQuest[]): string => JSON.stringify({ stats, quests: sheetQuests(quests) });

export const sheetEvent = (heroId: string, deviceId: string, stats: SheetStats, quests: SheetQuest[]): FamilyEvent =>
  newEvent("hero.sheet", heroId, deviceId, { stats, quests: sheetQuests(quests) });

/** The sheet a received `hero.sheet` carries, or null when it is not one */
export const sheetFromEvent = (e: ReceivedEvent): HeroSheet | null => {
  const isSheet = e.kind === "hero.sheet";
  if (!isSheet) return null;
  const rawQuests = Array.isArray(e.data?.quests) ? (e.data.quests as unknown[]) : [];
  const quests = rawQuests.map(sheetQuestFromWire).filter((q): q is SheetQuest => q !== null);
  return { heroId: e.heroId, at: e.at, seq: e.seq, stats: statsOf({ stats: wireStats(e.data?.stats) }), quests };
};

/** A sheet's stats back in the profile's shape, so statsOf reads both the same way */
const wireStats = (raw: unknown): Record<string, unknown> => {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    level: s.level,
    xp: { now: s.xp, next_level: s.nextLevelXp },
    gp: { wallet: s.gp },
    ap: { total: s.ap },
    hp: { now: s.hp, max: s.maxHp },
    mp: { now: s.mp, max: s.maxMp },
  };
};
