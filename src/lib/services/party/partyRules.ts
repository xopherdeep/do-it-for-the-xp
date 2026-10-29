/**
 * Party rules: who may join, what a party may see of a hero, and the same-day synergy buff.
 *
 * Pure: no storage, no Vue, no stores. The site checks the same card whitelist (Party_Rules::card), so a party only ever
 * carries a hero's public face: nickname, level, class and look. Never a real name, a birthday, a PIN or an email.
 */
import type { HeroLook } from "@/lib/hero-look/types";

/** Where a hero may go: anywhere (open), only where a Game Master said yes (ask), or nowhere outside the household (home) */
export type HeroPartyMode = "open" | "ask" | "home";

/** Kids ask first; grown-ups play open */
export const defaultModeFor = (isAdult: boolean): HeroPartyMode => (isAdult ? "open" : "ask");

export type JoinAnswer = "join" | "needs-game-master" | "needs-leader" | "refused";

/**
 * What a join request needs next. A hero who stays home is refused. An ask-first hero waits for the Game Master to approve
 * the party (once, not per raid) before anything else, so a leader accepting first never lets a kid in. Then the leader
 * must accept. An open hero skips the Game Master step.
 */
export const canJoin = (args: { mode: HeroPartyMode; partyApproved: boolean; leaderAccepted: boolean }): JoinAnswer => {
  if (args.mode === "home") return "refused";
  if (args.mode === "ask" && !args.partyApproved) return "needs-game-master";
  if (!args.leaderAccepted) return "needs-leader";
  return "join";
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

const cleanLook = (look: unknown): Partial<HeroLook> | null => {
  if (!look || typeof look !== "object") return null;
  const source = look as Record<string, unknown>;
  const kept: Record<string, string> = {};
  for (const key of LOOK_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0 && value.length <= LOOK_VALUE_MAX) kept[key] = value;
  }
  return Object.keys(kept).length > 0 ? (kept as Partial<HeroLook>) : null;
};

/** A hero's public card. The nickname only: with none set a hero is just "Hero", never the full name */
export const toHeroCard = (user: any): PartyHeroCard => {
  const nick = typeof user?.name?.nick === "string" ? user.name.nick.trim().slice(0, NICKNAME_MAX).trimEnd() : "";
  const level = Math.floor(Number(user?.stats?.level));
  const jobClass = typeof user?.jobClass === "string" ? user.jobClass.slice(0, CLASS_MAX) : "";
  return {
    heroId: user?.id === undefined || user?.id === null ? "" : String(user.id),
    nickname: nick || "Hero",
    level: Number.isFinite(level) ? Math.min(LEVEL_MAX, Math.max(1, level)) : 1,
    jobClass,
    look: cleanLook(user?.look),
  };
};

/** The raid strike multiplier for a day: heroes finishing chores side by side hit a little harder (1, 1.1 for two, 1.2 for three or more) */
export const synergyBuff = (heroIdsFinishedToday: readonly string[]): number => {
  const heroes = new Set(heroIdsFinishedToday).size;
  if (heroes >= 3) return 1.2;
  if (heroes === 2) return 1.1;
  return 1;
};
