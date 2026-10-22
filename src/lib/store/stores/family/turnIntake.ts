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
 * - Under Family Sync a write runs on the hero's turn: here when this device holds the hero, on the turn borrowed for the
 *   moment when nobody does, and not at all when another device holds it (that device does it on its own download).
 *   Without it, at once, as the home device always has.
 * - Under Family Sync, history (what the site received before this device started reading the events) is skipped, and a
 *   claim or reward another device's turn kept from this one waits in the sync store, tried again each round.
 * - A kid phone reading its events from the beginning marks the moment; a Pro kid phone in the full portal plays its
 *   hero, so its hero's rewards, re-sent claims and verdicts are taken there.
 */
export interface TurnIntakeContext {
  /** Takes the phone claims among the events; answers those left for the device holding their hero */
  takePhoneClaims(events: ReceivedEvent[]): Promise<ReceivedEvent[]>;
}

export interface TurnIntake {
  /** The events of a downloaded page; answers the reward ids paid (or found paid) */
  takeEvents(events: ReceivedEvent[], paidBefore: { id: string }[]): Promise<string[]>;
  /** Kept claims and rewards tried again after a round (sync/verdicts.ts); answers the ids still left for another device */
  retakeEvents(events: ReceivedEvent[]): Promise<string[]>;
  /** A page of the phone's events, `since` being the cursor before it */
  takeOnPhone(events: ReceivedEvent[], since: number): Promise<void>;
}

/** Runs what writes a hero's game on the hero's turn under Family Sync, otherwise at once; false when another device holds it */
export const underTurn = async (heroId: string, fn: () => Promise<void>): Promise<boolean> => {
  const sync = useSyncStore();
  if (sync.isOn) return sync.withTurn(heroId, fn);
  await fn();
  return true;
};

/** Server rewards, each once (serverRewards.ts) and on its hero's turn; answers the ids paid here, or found paid */
const payRewards = async (rewards: RewardToPay[]): Promise<string[]> => {
  const paid: string[] = [];
  for (const reward of rewards) {
    const isPaid = await underTurn(reward.heroId, () => payServerReward(reward));
    if (isPaid) paid.push(reward.id);
  }
  return paid;
};

export const createTurnIntake = (ctx: TurnIntakeContext): TurnIntake => {
  const takeEvents = async (events: ReceivedEvent[], paidBefore: { id: string }[]): Promise<string[]> => {
    const sync = useSyncStore();
    const isSyncing = sync.isOn;
    const since = isSyncing ? sync.state.claimsSince : null;
    const fresh = events.filter((e) => !isHistory(e, since));
    const rewards = rewardsToPay(fresh, paidBefore);
    const paidIds = await payRewards(rewards);
    const leftClaims = await ctx.takePhoneClaims(fresh);
    if (!isSyncing) return paidIds;
    const leftRewards = fresh.filter((e) => rewards.some((reward) => reward.id === e.id) && !paidIds.includes(e.id));
    await sync.keepEvents([...leftRewards, ...leftClaims]);
    await sync.takeVerdicts(events);
    return paidIds;
  };

  const retakeEvents = async (events: ReceivedEvent[]): Promise<string[]> => {
    const rewards = rewardsToPay(events, []);
    const paidIds = await payRewards(rewards);
    const leftClaims = await ctx.takePhoneClaims(events);
    return [...rewards.map((reward) => reward.id).filter((id) => !paidIds.includes(id)), ...leftClaims.map((e) => e.id)];
  };

  const takeOnPhone = async (events: ReceivedEvent[], since: number): Promise<void> => {
    const sync = useSyncStore();
    const isFromStart = since === 0;
    if (isFromStart) await sync.markHistory();
    const isFullPortal = sync.isFullPortal;
    if (isFullPortal) await takeEvents(events, []);
  };

  return { takeEvents, retakeEvents, takeOnPhone };
};
