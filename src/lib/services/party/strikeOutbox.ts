/**
 * Strikes for raids with other families wait here until the site takes them. A chore finished offline, or before the
 * site answered, is not lost: it is kept across restarts and sent when the connection is back. A strike is sent once
 * per key however often it is sent again (the site counts a key once), and one the site will never take (the raid is
 * gone, the strike is stale, the hero is not in the party) is dropped rather than kept for ever.
 */
import { myParties, partyProblem, sendStrike, type PartyProblem } from "./partyClient";
import { queueKeyOf, type QueuedStrike } from "./partyState";
import { usePartyStore } from "@/lib/store/stores/party";
import { useProStore } from "@/lib/store/stores/pro";
import { useTownHallStore } from "@/lib/store/stores/townHall";
import debug from "@/lib/utils/debug";

/** Refusals that will not change by waiting */
const NEVER: readonly PartyProblem[] = ["invalid", "gone", "stale", "forbidden", "not-member"];

/**
 * Sends the queue in order. A strike the site took, or answered as not counted (a resend, a closed raid), is done; one
 * it will never take is dropped; one that failed for want of a connection or a free site is kept, and nothing after it
 * is sent, so the order holds.
 *
 * @returns what is left in the queue, and how many the site took
 */
export const settleStrikes = async (
  queue: readonly QueuedStrike[],
  send: (strike: QueuedStrike) => Promise<unknown>
): Promise<{ left: QueuedStrike[]; sent: number }> => {
  const left: QueuedStrike[] = [];
  let sent = 0;
  let stopped = false;
  for (const strike of queue) {
    if (stopped) {
      left.push(strike);
      continue;
    }
    try {
      await send(strike);
      sent += 1;
    } catch (error) {
      const isLasting = NEVER.includes(partyProblem(error));
      if (!isLasting) {
        left.push(strike);
        stopped = true;
      }
    }
  }
  return { left, sent };
};

let flushing = false;

/**
 * One try at what the queue holds now. The strikes it settled (taken, refused for good) leave the queue as it is after
 * the sends, so a strike queued while they were on their way stays queued.
 */
const sendRound = async (): Promise<{ sent: number; isStalled: boolean }> => {
  const store = usePartyStore();
  const townHall = useTownHallStore();
  const round = [...store.outbox];
  const { left, sent } = await settleStrikes(round, ({ raidId, key, heroId, damage, day, at }) =>
    sendStrike(townHall.auth, raidId, { key, heroId, damage, day, at })
  );
  const staying = new Set(left.map(queueKeyOf));
  const settled = new Set(round.map(queueKeyOf).filter((name) => !staying.has(name)));
  store.setOutbox(store.outbox.filter((strike) => !settled.has(queueKeyOf(strike))));
  return { sent, isStalled: left.length > 0 };
};

/**
 * Sends what the outbox holds, if the family holds XP Pro and an account is linked, then asks the site for the
 * parties again so the raid shows the strikes. Two flushes never overlap: a strike queued while one runs is sent by
 * it, in another round, unless the connection is down.
 */
export const flushOutbox = async (): Promise<void> => {
  const store = usePartyStore();
  const pro = useProStore();
  const townHall = useTownHallStore();
  const canSend = pro.isPro && townHall.isLinked;
  const hasQueue = store.outbox.length > 0;
  const mustWait = !canSend || !hasQueue || flushing;
  if (mustWait) return;

  flushing = true;
  try {
    let sent = 0;
    let isStalled = false;
    while (!isStalled && store.outbox.length > 0) {
      const round = await sendRound();
      sent += round.sent;
      isStalled = round.isStalled;
    }
    const sentSome = sent > 0;
    if (sentSome) store.applyServer(await myParties(townHall.auth));
  } catch (error) {
    // The refresh after a send failed: the strikes are already on the site, and the next refresh shows them
    debug.warn("party: could not refresh the parties after sending strikes", error);
  } finally {
    flushing = false;
  }
};
