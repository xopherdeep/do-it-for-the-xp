/**
 * A hero's card: the public-safe face of a hero that other devices of the family (and later parties) may see. It holds
 * only the nickname, the look, the class and the level; never the full name, birthday, email, passcode or favourites.
 */
import { DEFAULT_LOOK, isHeroLook, type HeroLook } from "@/lib/hero-look/types";

export interface HeroCard {
  heroId: string;
  nickname: string;
  look: HeroLook;
  jobClass: string;
  level: number;
  updatedAt: string;
}

/** The profile fields a card reads (id, name.nick, look, jobClass, stats.level); everything else on the profile is ignored */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CardProfile = any;

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const levelOf = (value: unknown): number => {
  const level = Number(value);
  return Number.isFinite(level) && level >= 1 ? Math.floor(level) : 1;
};

/** The card of a profile, or null when the hero has no id or no nickname yet (they are registered once they have one) */
export const cardOf = (profile: CardProfile, now: Date = new Date()): HeroCard | null => {
  const heroId = text(profile?.id);
  const nickname = text(profile?.name?.nick);
  if (!heroId || !nickname) return null;
  const look = isHeroLook(profile.look) ? profile.look : DEFAULT_LOOK;
  return { heroId, nickname, look, jobClass: text(profile.jobClass), level: levelOf(profile.stats?.level), updatedAt: now.toISOString() };
};

const sortedKeys = (value: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** What identifies a card's content: the JSON of every field but `updatedAt`, with the look's keys in a fixed order */
export const cardKey = (card: HeroCard): string =>
  JSON.stringify({ heroId: card.heroId, nickname: card.nickname, jobClass: card.jobClass, level: card.level, look: sortedKeys(card.look) });
