import { rewardsToPay, type RewardToPay } from "@/lib/services/multiplayer/eventInbox";
import type { ReceivedEvent } from "@/lib/services/multiplayer/familyServer";
import { isHistory } from "@/lib/services/multiplayer/phoneClaimIntake";
import { payServerReward } from "@/lib/services/multiplayer/serverRewards";
import { useSyncStore } from "../sync";

/**
 * The family's events that write a hero's game (server rewards, phone claims, the Game Masters' verdicts), taken on the
 * hero's turn under Family Sync (family sync spec, sections 5 and 6). Bound to the family store the way the sender and
 * the card queue are: the store hands over how it takes its phone claims.
 *
 * - Under Family Sync a write runs on the hero's turn, asked for once per hero for all its events: here when this device
 *   holds the hero (confirmed, not an offline hold), on the turn borrowed for the moment when nobody does, and not at all
 *   when another device holds it (that device does it on its own download). Without it, at once, as the home device
 *   always has.
 * - Under Family Sync, history (what the site received before this device started reading the events) is skipped, and a
 *   claim or reward another device's turn kept from this one waits in the sync store, tried again each round.
 * - A Pro kid phone in the full portal plays its hero, so its hero's rewards, re-sent claims and verdicts are taken there.
 */
export interface TurnIntakeContext {
  /** The phone claims among the events this device has not taken yet */
  phoneClaimsIn(events: ReceivedEvent[]): Promise<ReceivedEvent[]>;
  /** Takes phone claims at once (the caller is on their hero's turn) */
  takePhoneClaims(claims: ReceivedEvent[]): Promise<void>;
}

export interface TurnIntake {
  /** The events of a downloaded page; answers the reward ids paid (or found paid) */
  takeEvents(events: ReceivedEvent[], paidBefore: { id: string }[]): Promise<string[]>;
  /** Kept claims and rewards tried again after a round (sync/verdicts.ts); answers the ids still left for another device */
  retakeEvents(events: ReceivedEvent[]): Promise<string[]>;
  /** A page of a kid phone's events */
  takeOnPhone(events: ReceivedEvent[]): Promise<void>;
}

/** Runs what writes a hero's game on the hero's turn under Family Sync, otherwise at once; false when another device holds it */
const underTurn = async (heroId: string, fn: () => Promise<void>): Promise<boolean> => {
  const sync = useSyncStore();
  if (sync.isOn) return sync.withTurn(heroId, fn);
  await fn();
  return true;
};

export const createTurnIntake = (ctx: TurnIntakeContext): TurnIntake => {
  /**
   * One turn per hero for all its rewards (each once, serverRewards.ts) and phone claims; answers the reward ids paid
   * (or found paid) and the ids of what was left for the device holding its hero
   */
  const takeOnTurns = async (rewards: RewardToPay[], claims: ReceivedEvent[]): Promise<{ paidIds: string[]; leftIds: string[] }> => {
    const paidIds: string[] = [];
    const leftIds: string[] = [];
    const heroes = new Set([...rewards.map((reward) => reward.heroId), ...claims.map((claim) => claim.heroId)]);
    for (const heroId of heroes) {
      const heroRewards = rewards.filter((reward) => reward.heroId === heroId);
      const heroClaims = claims.filter((claim) => claim.heroId === heroId);
      const isRun = await underTurn(heroId, async () => {
        for (const reward of heroRewards) await payServerReward(reward);
        await ctx.takePhoneClaims(heroClaims);
      });
      const rewardIds = heroRewards.map((reward) => reward.id);
      if (isRun) paidIds.push(...rewardIds);
      else leftIds.push(...rewardIds, ...heroClaims.map((claim) => claim.id));
    }
    return { paidIds, leftIds };
  };

  const takeEvents = async (events: ReceivedEvent[], paidBefore: { id: string }[]): Promise<string[]> => {
    const sync = useSyncStore();
    const isSyncing = sync.isOn;
    const since = isSyncing ? sync.state.claimsSince : null;
    const fresh = events.filter((e) => !isHistory(e, since));
    const { paidIds, leftIds } = await takeOnTurns(rewardsToPay(fresh, paidBefore), await ctx.phoneClaimsIn(fresh));
    if (!isSyncing) return paidIds;
    await sync.keepEvents(fresh.filter((e) => leftIds.includes(e.id)));
    await sync.takeVerdicts(events);
    return paidIds;
  };

  const retakeEvents = async (events: ReceivedEvent[]): Promise<string[]> => {
    const { leftIds } = await takeOnTurns(rewardsToPay(events, []), await ctx.phoneClaimsIn(events));
    return leftIds;
  };

  const takeOnPhone = async (events: ReceivedEvent[]): Promise<void> => {
    const isFullPortal = useSyncStore().isFullPortal;
    if (isFullPortal) await takeEvents(events, []);
  };

  return { takeEvents, retakeEvents, takeOnPhone };
};
