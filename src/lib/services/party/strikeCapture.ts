import { onQuestPaid, type QuestPaid } from "@/lib/services/multiplayer/gameSignals";
import { usePartyStore } from "@/lib/store/stores/party";
import { useProStore } from "@/lib/store/stores/pro";
import debug from "@/lib/utils/debug";
import { memberKey } from "./partyFeedView";
import { HOME_PARTY_ID, synergyBuff } from "./partyRules";
import { toDayKey } from "./partyStats";
import { raidState, strikeDamage, type Raid } from "./raidRules";
import { flushOutbox } from "./strikeOutbox";

/**
 * Raid strikes from paid chores. Every time a quest pays (a claim paid at once, a Game Master's approval, a battle win)
 * the hero strikes each raid they are in, once, with the size of the chore. A claim still waiting on a Game Master says
 * nothing until it is paid, so it never strikes, and a rejected one never pays at all.
 */

/** The heroes who already struck this raid on `day` (the device's calendar day) */
const heroesOnDay = (raid: Raid, day: string): string[] => {
  const today = raid.strikes.filter((strike) => toDayKey(new Date(strike.at)) === day);
  return today.map((strike) => strike.heroId);
};

/** One payment is one strike: the log entry names it, so a repeating chore finished twice is two strikes and a resend is one */
const strikeKeyOf = (paid: QuestPaid, now: Date): string => {
  const hasEntry = Boolean(paid.entryId);
  return hasEntry ? `completion:${paid.entryId}` : `quest:${paid.questId}:${paid.heroId}:${now.toISOString()}`;
};

/**
 * Queues a strike for every raid with other families that this hero may strike now, and starts sending. The site counts
 * the strike (its caps, its health), so nothing is counted here: the raid shows the blow once the site has taken it.
 * The saved copy of each raid says who is in the party and who struck today, so a chore approved right after the app
 * starts (before the site's list of parties was read) strikes too.
 */
const queueOutsideStrikes = (paid: QuestPaid, base: number, now: Date): void => {
  const store = usePartyStore();
  const hero = memberKey(useProStore().familyId, paid.heroId);
  const day = toDayKey(now);
  let queued = false;
  for (const raid of store.raids) {
    const isOutside = raid.partyId !== HOME_PARTY_ID;
    const isOurs = raid.memberIds.includes(hero);
    const isActive = raidState(raid, now).status === "active";
    const mayStrike = isOutside && isOurs && isActive;
    if (!mayStrike) continue;
    const buff = synergyBuff([...heroesOnDay(raid, day), hero]);
    store.queueStrike({
      raidId: raid.id,
      key: strikeKeyOf(paid, now),
      heroId: paid.heroId,
      damage: Math.round(base * buff),
      day,
      at: now.toISOString(),
    });
    queued = true;
  }
  if (queued) void flushOutbox();
};

/**
 * Turns one paid quest into a blow on every raid the hero may strike now. The blow is the chore's size, a little harder
 * when other heroes finished chores today too (synergyBuff); the raid trims it to the hero's daily cap. A chore with no
 * size strikes nothing. Waits for the saved raids to load first, so the read can never erase the blow.
 */
export const recordPaidStrike = async (paid: QuestPaid, now: Date = new Date()): Promise<void> => {
  const base = strikeDamage(Number(paid.difficulty));
  const hasSize = base > 0;
  if (!hasSize) return;
  const store = usePartyStore();
  await store.load();
  const day = toDayKey(now);
  for (const raid of store.activeRaidsFor(paid.heroId, now)) {
    const buff = synergyBuff([...heroesOnDay(raid, day), paid.heroId]);
    const damage = Math.round(base * buff);
    store.strike(raid.id, { key: strikeKeyOf(paid, now), heroId: paid.heroId, damage, at: now.toISOString() });
  }
  const staysHome = store.modeOf(paid.heroId) === "home";
  if (!staysHome) queueOutsideStrikes(paid, base, now);
};

/** Starts striking on every paid quest. Call once at start-up; returns how to stop. */
export const listenForRaidStrikes = (): (() => void) =>
  onQuestPaid((paid) => {
    recordPaidStrike(paid).catch((error) => debug.warn("party: could not strike the raid", error));
  });
