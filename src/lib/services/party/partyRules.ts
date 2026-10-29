/**
 * Party rules: who may join, what a party may see of a hero, and the same-day synergy buff.
 *
 * Pure: no storage, no Vue, no stores. The site checks the same card whitelist (Party_Rules::card), so a party only ever
 * carries a hero's public face: nickname, level, class and look. Never a real name, a birthday, a PIN or an email.
 */
import type { HeroLook } from "@/lib/hero-look/types";

/** The party id of a family's own household party */
export const HOME_PARTY_ID = "home";

/** Where a hero may go: anywhere (open), only where a Game Master said yes (ask), or nowhere outside the household (home) */
export type HeroPartyMode = "open" | "ask" | "home";

/** Kids ask first; grown-ups play open */
export const defaultModeFor = (isAdult: boolean): HeroPartyMode => (isAdult ? "open" : "ask");

export type JoinAnswer = "join" | "needs-game-master" | "needs-leader" | "refused";

export interface JoinRequestState {
  mode: HeroPartyMode;
  /** The hero's Game Master already said yes to this party */
  partyApproved: boolean;
  /** The party's leader accepted the hero */
  leaderAccepted: boolean;
}

/**
 * What a join request needs next. A hero who stays home is refused. An ask-first hero waits for the Game Master to approve
 * the party (once, not per raid) before anything else, so a leader accepting first never lets a kid in. Then the leader
 * must accept. An open hero skips the Game Master step.
 */
export const canJoin = (request: JoinRequestState): JoinAnswer => {
  const staysHome = request.mode === "home";
  const needsGameMaster = request.mode === "ask" && !request.partyApproved;
  const waitsForLeader = !request.leaderAccepted;
  if (staysHome) return "refused";
  if (needsGameMaster) return "needs-game-master";
  return waitsForLeader ? "needs-leader" : "join";
};

/** What leaves a family about a hero */
export interface PartyHeroCard {
  heroId: string;
  nickname: string;
  level: number;
  jobClass: string;
  look: Partial<HeroLook> | null;
}

const NICKNAME_MAX = 24;
const CLASS_MAX = 32;
const LEVEL_MAX = 999;
const LOOK_VALUE_MAX = 40;
const LOOK_KEYS: readonly (keyof HeroLook)[] = [
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
];

const isShortText = (value: unknown): boolean => {
  const isText = typeof value === "string";
  const length = isText ? value.length : 0;
  return length > 0 && length <= LOOK_VALUE_MAX;
};

const cleanLook = (look: unknown): Partial<HeroLook> | null => {
  const isObject = typeof look === "object" && look !== null;
  const source = (isObject ? look : {}) as Record<string, unknown>;
  const known = LOOK_KEYS.map((key): [string, unknown] => [key, source[key]]);
  const kept = Object.fromEntries(known.filter(([, value]) => isShortText(value)));
  const hasAny = Object.keys(kept).length > 0;
  return hasAny ? (kept as Partial<HeroLook>) : null;
};

/** A hero's public card. The nickname only: with none set a hero is just "Hero", never the full name */
export const toHeroCard = (user: any): PartyHeroCard => {
  const rawNick = user?.name?.nick;
  const hasNick = typeof rawNick === "string";
  const nickname = hasNick ? rawNick.trim().slice(0, NICKNAME_MAX).trimEnd() : "";
  const rawClass = user?.jobClass;
  const hasClass = typeof rawClass === "string";
  const level = Math.floor(Number(user?.stats?.level));
  const hasLevel = Number.isFinite(level);
  const rawId = user?.id;
  const hasId = rawId !== undefined && rawId !== null;
  return {
    heroId: hasId ? String(rawId) : "",
    nickname: nickname || "Hero",
    level: hasLevel ? Math.min(LEVEL_MAX, Math.max(1, level)) : 1,
    jobClass: hasClass ? rawClass.slice(0, CLASS_MAX) : "",
    look: cleanLook(user?.look),
  };
};

/** Raid strike multipliers by how many heroes finished chores today: none for one, +10% for two, +20% for three or more */
const SYNERGY_BUFFS: readonly number[] = [1, 1, 1.1, 1.2];

/** The raid strike multiplier for a day: heroes finishing chores side by side hit a little harder */
export const synergyBuff = (heroIdsFinishedToday: readonly string[]): number => {
  const heroes = new Set(heroIdsFinishedToday).size;
  return SYNERGY_BUFFS[Math.min(heroes, SYNERGY_BUFFS.length - 1)];
};
