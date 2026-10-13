import { ageGroupOf, type AgeGroup } from "@/lib/services/multiplayer/ageGroup";
import { cardEvent, leveledEvent, type FamilyEvent } from "@/lib/services/multiplayer/familyEvents";
import { familyProblem, saveHero } from "@/lib/services/multiplayer/familyServer";
import { cardKey, cardOf, type HeroCard } from "@/lib/services/multiplayer/heroCard";
import type { TownHallAuth } from "@/lib/services/townhall/townHallClient";
import debug from "@/lib/utils/debug";

/**
 * The family store's hero cards (multiplayer, MP12). A pass compares each hero's card with the last one this device
 * sent (`lastCards`) and queues a `hero.card` when it changed, with a `hero.leveled` when the level went up. A hero with
 * no card sent yet was added after the bind, so the site is told about them (`saveHero`) before their first card; one
 * the bind registered in this run is not registered twice. A profile without a nickname has no card and sends nothing.
 *
 * Bound to the store the way the user store binds its persister (`stores/user/persistence.ts`).
 */
type Profile = Parameters<typeof ageGroupOf>[0];

export interface CardsContext {
  /** Whether events may be queued: the flag is on and this device is the family's home */
  mayQueue(): boolean;
  /** The parent's sign-in while the family is linked */
  auth(): TownHallAuth | null;
  /** heroId -> the card key of the last card sent */
  lastCards(): Promise<Record<string, string>>;
  deviceId(): Promise<string>;
  /** The profiles on this device, Game Masters included */
  profiles(): Profile[];
  /** The age group the Game Master picked for a hero with no birthday */
  ageGroupPick(heroId: string): AgeGroup | undefined;
  /** Queues the events and keeps `sentCards` as the last cards sent, in one save */
  queue(events: FamilyEvent[], sentCards: Record<string, string>): Promise<void>;
  /** A failure that is not about one hero (a dead connection, a refused link): kept as the problem */
  failed(error: unknown): Promise<void>;
}

export interface CardQueue {
  /** Queues the cards that changed since the last ones sent; one pass at a time, in order */
  queueCards(): Promise<void>;
  /** The site took the hero (the bind registered them, or an age pick did) */
  registered(heroId: string): void;
  /** The site refused the hero's nickname: not tried again until it changes */
  refused(heroId: string, nickname: string): void;
  /** The hero's profile is gone */
  forget(heroId: string): void;
  /** Whether the site knows the hero: it took them in this run, or this device sent their card */
  isKnown(heroId: string, lastCards: Record<string, string>): boolean;
}

type Registering = "registered" | "skipped" | "stopped";

/** The level a card key (the JSON of the last card sent) holds, or null when it holds none */
export const levelOfCardKey = (key: string | undefined): number | null => {
  try {
    const level = Number((JSON.parse(key ?? "null") as { level?: unknown } | null)?.level);
    const isLevel = Number.isFinite(level);
    return isLevel ? level : null;
  } catch {
    return null;
  }
};

/** The events for a card that changed: the card, then `hero.leveled` when the level went up since the last card */
export const cardChangeEvents = (card: HeroCard, lastKey: string | undefined, deviceId: string): FamilyEvent[] => {
  const lastLevel = levelOfCardKey(lastKey);
  const isLevelUp = lastLevel !== null && card.level > lastLevel;
  const leveled = isLevelUp ? [leveledEvent(card.heroId, card.level, card.jobClass, deviceId)] : [];
  return [cardEvent(card, deviceId), ...leveled];
};

export const createCardQueue = (ctx: CardsContext): CardQueue => {
  const registeredIds = new Set<string>();
  const refusedNicknames = new Map<string, string>();

  const registered = (heroId: string): void => {
    registeredIds.add(heroId);
    refusedNicknames.delete(heroId);
  };
  const refused = (heroId: string, nickname: string): void => {
    refusedNicknames.set(heroId, nickname);
  };
  const forget = (heroId: string): void => {
    registeredIds.delete(heroId);
    refusedNicknames.delete(heroId);
  };
  const isKnown = (heroId: string, lastCards: Record<string, string>): boolean => registeredIds.has(heroId) || lastCards[heroId] !== undefined;

  /** A nickname the site cannot take skips only that hero; anything else stops the registering for this pass */
  const refusalOf = async (error: unknown, card: HeroCard): Promise<Registering> => {
    const isOneHeroOnly = familyProblem(error) === "invalid";
    if (!isOneHeroOnly) {
      await ctx.failed(error);
      return "stopped";
    }
    debug.warn(`family: the site refused hero ${card.heroId}`, error);
    refused(card.heroId, card.nickname);
    return "skipped";
  };

  /** Tells the site about a hero added after the bind, unless it took them already or refused this nickname */
  const register = async (profile: Profile, card: HeroCard): Promise<Registering> => {
    const isTaken = registeredIds.has(card.heroId);
    if (isTaken) return "registered";
    const auth = ctx.auth();
    if (!auth) return "skipped";
    const isRefusedAsIs = refusedNicknames.get(card.heroId) === card.nickname;
    if (isRefusedAsIs) return "skipped";
    try {
      await saveHero(auth, card.heroId, card.nickname, ageGroupOf(profile, ctx.ageGroupPick(card.heroId)));
      registered(card.heroId);
      return "registered";
    } catch (error) {
      return refusalOf(error, card);
    }
  };

  /** A hero whose card was sent before is on the site; a new one is registered first, unless registering stopped */
  const registeringOf = async (profile: Profile, card: HeroCard, lastKey: string | undefined, mayRegister: boolean): Promise<Registering> => {
    const wasSentBefore = lastKey !== undefined;
    if (wasSentBefore) return "registered";
    if (!mayRegister) return "skipped";
    return register(profile, card);
  };

  const runPass = async (): Promise<void> => {
    const mayQueue = ctx.mayQueue();
    if (!mayQueue) return;
    const lastCards = await ctx.lastCards();
    const deviceId = await ctx.deviceId();
    const events: FamilyEvent[] = [];
    const sentCards: Record<string, string> = {};
    // A dead connection or a refused link stops the registering; the heroes the site already knows still get theirs
    let mayRegister = true;
    for (const profile of ctx.profiles()) {
      const card = cardOf(profile);
      if (!card) continue;
      const key = cardKey(card);
      const lastKey = lastCards[card.heroId];
      const isUnchanged = key === lastKey;
      if (isUnchanged) continue;
      const registering = await registeringOf(profile, card, lastKey, mayRegister);
      mayRegister = mayRegister && registering !== "stopped";
      const isOnTheSite = registering === "registered";
      if (!isOnTheSite) continue;
      events.push(...cardChangeEvents(card, lastKey, deviceId));
      sentCards[card.heroId] = key;
    }
    await ctx.queue(events, sentCards);
  };

  let passes: Promise<void> = Promise.resolve();

  /** One pass at a time, in order, so two passes never both see a card as new */
  const queueCards = (): Promise<void> => {
    const pass = passes.then(runPass);
    passes = pass.catch(() => undefined);
    return pass;
  };

  return { queueCards, registered, refused, forget, isKnown };
};
