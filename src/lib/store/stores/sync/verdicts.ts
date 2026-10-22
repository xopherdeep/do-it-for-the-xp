import { AchievementDb, achievementStorage } from "@/lib/databases/AchievementDb";
import { getQuestLogDb, type QuestLogEntry } from "@/lib/databases/QuestLogDb";
import type { OutboxItem, PendingVerdict, SyncState, WaitingEvent } from "@/lib/databases/SyncDb";
import { claimSettledEvent, questClaimedEvent, type ClaimSettled, type ClaimSettledStatus, type FamilyEvent } from "@/lib/services/multiplayer/familyEvents";
import type { ReceivedEvent } from "@/lib/services/multiplayer/familyServer";
import { approveCompletion, paidQuestRewards, rejectCompletion } from "@/lib/services/quests/QuestCompletionService";
import { withHuntBonus } from "@/lib/services/quests/huntBonus";
import { rawTargetFor, readRawRecord } from "@/lib/services/sync/recordApply";
import type { BatchRecord } from "@/lib/services/sync/recordOutbox";
import { applyVerdict, type VerdictDeps, type VerdictResult } from "@/lib/services/sync/verdictApply";
import debug from "@/lib/utils/debug";

/**
 * Verdicts and claims under one writer (sections 5 and 6 of the family sync spec): a hero's quest log is written only by
 * the device holding the hero's turn, so a Game Master's verdict is applied and paid there.
 *
 * - A verdict given here on a hero this device does not hold (`send`): `claim.settled` goes in the family's send queue,
 *   the verdict is noted in `verdictsSent` (Approvals says so at once) and kept in `pendingVerdicts`, and the hero's turn
 *   is borrowed to apply it here when nobody holds the hero. When another device holds it, that device applies it on
 *   its next download of the family's events.
 * - A verdict read from the family's events (`take`): applied here when this device holds the hero, or on the turn
 *   borrowed while nobody does.
 * - A verdict not applied (its entry has not come down yet, or another device holds the hero) waits in `pendingVerdicts`
 *   and is tried again after each round (`retry`); it leaves, with its `verdictsSent` line, once its entry is settled
 *   here, by this device or by the holder's copy landing. One whose entry never comes (an answer to a phone claim that
 *   was turned away) goes after a week. `applyVerdict` reads the entry first, so nothing is paid twice.
 * - The device that applies a verdict on a claim taken from a phone tells that phone, with what the hero was paid.
 * - A takeover (`resendClaims`, `resendDropped`): a claim entry the site refused because another device took the hero,
 *   or one the takeover dropped from the outbox unsent, still `pending`, goes again as a phone-style `quest.claimed` (no
 *   `synced` mark, the time the hero made it) for the holder to take, and this device's copy goes: the holder writes the
 *   claim's entry when it takes it.
 * - A phone claim or a server reward another device's turn kept from being taken here (`keepEvents`) waits in
 *   `waitingEvents` and is tried again after each round (the family store takes it), until it is taken somewhere (its
 *   entry or receipt is here, or the device that took a claim answered it) or a week has passed: the family's event
 *   cursor has moved past it, and the device holding the hero may rest before it reads it.
 * - `markHistory`: a device that starts reading the family's events from their beginning notes the moment; a phone claim
 *   or a reward the site received before it is history (the family store skips it).
 *
 * One verdict job at a time. `withTurn` borrows the turn through the store's lane, so `send`, `take` and `retry` never
 * run inside a transfer; `resendClaims` runs from one, and never asks for a turn. Bound to the sync store the way the
 * transfer and the turns are (sync/recordTransfer.ts, sync/heroTurns.ts).
 */
export interface VerdictContext {
  /** What the device keeps, loaded */
  kept(): Promise<SyncState>;
  /** Saves a change, unless the store was reset since the work began in `startedIn` */
  update(change: (current: SyncState) => SyncState, startedIn: number): Promise<void>;
  /** How many resets so far: a verdict taken before the latest one saves nothing after it */
  generation(): number;
  withTurn(heroId: string, fn: () => Promise<void>): Promise<boolean>;
  /** Queues an approval-loop event through the family store (its `queueApprovalEvent`) */
  queueEvent(heroId: string, build: (deviceId: string) => FamilyEvent): Promise<void>;
  /** Tells a hero's phone the verdict on a claim taken from it (the family store; never from a kid phone, which may not) */
  tellPhone(heroId: string, settled: ClaimSettled): Promise<void>;
  /** Takes kept phone claims and rewards on their heroes' turns (the family store); answers the ids still left for another device */
  retakeEvents(events: ReceivedEvent[]): Promise<string[]>;
}

export interface Verdicts {
  /** A Game Master's verdict on a hero this device does not hold; resolves once it is queued and noted, not paid */
  send(settled: ClaimSettled, heroId: string): Promise<void>;
  /** The verdicts among the family's downloaded events */
  take(events: ReceivedEvent[]): Promise<void>;
  /** After a round: the verdicts, claims and rewards that wait are tried again */
  retry(): Promise<void>;
  /** A put the site refused: the pending claims of a hero another device took over go again as phone-style claims */
  resendClaims(refused: (BatchRecord & { code: string })[]): Promise<void>;
  /** A takeover dropped these queued records unsent: their pending claims go again as phone-style claims */
  resendDropped(items: OutboxItem[]): Promise<void>;
  /** Phone claims and rewards another device's turn kept from being taken here */
  keepEvents(events: ReceivedEvent[]): Promise<void>;
  /** This device starts reading the family's events from their beginning: what the site received before now is history */
  markHistory(): Promise<void>;
}

/** What a verdict came to here: applied or found settled (it leaves), or still waiting (missing entry, busy hero) */
type Outcome = VerdictResult | "busy";

const QUEST_LOG = "__questLog";
const TURN_REFUSAL = "xp_family_turn";
/** A verdict waits this long at most */
const MAX_WAIT_MS = 7 * 24 * 60 * 60 * 1000;
const SETTLING: ClaimSettledStatus[] = ["approved", "rejected"];

/** The entry a verdict names: by its id, or the phone claim it was made from (the verdict a phone is told) */
const entryOf = async (claimId: string): Promise<QuestLogEntry | null> => {
  const questLog = getQuestLogDb();
  const byId = (await questLog.get(claimId)) as QuestLogEntry | null;
  if (byId) return byId;
  return (await questLog.getEntries()).find((entry) => entry.phoneClaimId === claimId) ?? null;
};

const numberOf = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** A `claim.settled` that settles a claim, as a verdict to keep; null for a hold-only answer, another kind or a broken one */
const verdictFrom = (e: ReceivedEvent): PendingVerdict | null => {
  const data = e.data ?? {};
  const status = data.status as ClaimSettledStatus;
  const isSettling = e.kind === "claim.settled" && SETTLING.includes(status) && typeof data.claimId === "string";
  if (!isSettling) return null;
  const note = typeof data.note === "string" ? data.note : "";
  const paid = { xp: numberOf(data.xp), gp: numberOf(data.gp), ap: numberOf(data.ap) };
  return { claimId: data.claimId as string, questId: String(data.questId ?? ""), status, note, ...paid, heroId: e.heroId, seq: e.seq };
};

const isVerdict = (verdict: PendingVerdict | null): verdict is PendingVerdict => verdict !== null;

/** What a verdict comes to before any turn is asked for; null when its entry is here and still pending */
const outcomeBefore = (entry: QuestLogEntry | null): Outcome | null => {
  if (!entry) return "missing";
  return entry.status === "pending" ? null : "already";
};

/** A quest log entry still waiting on a Game Master; null for anything else */
const heldClaimOf = (value: unknown): QuestLogEntry | null => {
  const entry = value as QuestLogEntry | null;
  const hasQuest = String(entry?.questId ?? "") !== "";
  const isHeldClaim = entry?.status === "pending" && typeof entry.userId === "string" && hasQuest;
  return isHeldClaim ? entry : null;
};

/** The body a refused record went with, read back; null when it cannot be */
const bodyOf = (record: BatchRecord): unknown => {
  try {
    return JSON.parse(record.body ?? "null");
  } catch {
    return null;
  }
};

/** Whether a kept claim or reward was taken somewhere: its entry (by the phone claim id) or its paid receipt is here */
const isTakenSomewhere = (e: WaitingEvent, entries: QuestLogEntry[]): boolean => {
  const isReward = e.kind === "reward.granted";
  if (isReward) return entries.some((entry) => entry.questId === `party:${e.id}` && entry.rewardsApplied);
  return entries.some((entry) => entry.phoneClaimId === e.id);
};

const isFresh = (at: string, now: number): boolean => now - Date.parse(at) <= MAX_WAIT_MS;

/** The quest's difficulty for the claim event (a Fibonacci step); 1 when the quest is gone or has none */
const difficultyOf = async (questId: string): Promise<number> => {
  try {
    const quest = (await new AchievementDb(achievementStorage).get(questId)) as { difficulty?: unknown } | null;
    const difficulty = Number(quest?.difficulty);
    return difficulty > 0 ? difficulty : 1;
  } catch (error) {
    debug.warn(`sync: could not read quest ${questId}`, error);
    return 1;
  }
};

export const createVerdicts = (ctx: VerdictContext): Verdicts => {
  let running: Promise<void> = Promise.resolve();
  let retrying: Promise<void> | null = null;

  /** A claim taken from a phone hears the verdict from the device that applied it, with what the hero was paid */
  const tellPhone = async (applied: QuestLogEntry | null): Promise<void> => {
    const claimId = applied?.phoneClaimId;
    const isSettled = applied?.status === "approved" || applied?.status === "rejected";
    const mayTell = Boolean(claimId) && isSettled;
    if (!mayTell) return;
    const entry = applied as QuestLogEntry;
    const isPaid = entry.status === "approved";
    const paid = isPaid ? paidQuestRewards(entry.userId, withHuntBonus(entry)) : { xp: 0, gp: 0, ap: 0 };
    const status = entry.status as ClaimSettledStatus;
    await ctx.tellPhone(entry.userId, { claimId: claimId as string, questId: String(entry.questId), status, note: entry.note ?? "", ...paid });
  };

  const deps: VerdictDeps = {
    entry: entryOf,
    approve: async (id) => tellPhone(await approveCompletion(id)),
    reject: async (id, note) => tellPhone(await rejectCompletion(id, undefined, note || undefined)),
  };

  /** One verdict job at a time, in order; a failed one is logged and never stops the next */
  const serial = (job: () => Promise<void>): Promise<void> => {
    const run = running.then(job);
    running = run.catch((error) => debug.warn("sync: a verdict could not be applied", error));
    return run;
  };

  /** Each verdict's outcome: entries read first (a settled or missing one needs no turn), then one turn per hero for the rest */
  const tryAll = async (verdicts: PendingVerdict[]): Promise<Map<string, Outcome>> => {
    const outcomes = new Map<string, Outcome>();
    const due = new Map<string, PendingVerdict[]>();
    for (const verdict of verdicts) {
      const before = outcomeBefore(await entryOf(verdict.claimId));
      if (before) outcomes.set(verdict.claimId, before);
      else due.set(verdict.heroId, [...(due.get(verdict.heroId) ?? []), verdict]);
    }
    for (const [heroId, heroVerdicts] of due) {
      // Busy until applied: another device holds the hero (it applies them), the turn could not be asked for, or it failed
      heroVerdicts.forEach((verdict) => outcomes.set(verdict.claimId, "busy"));
      try {
        await ctx.withTurn(heroId, async () => {
          for (const verdict of heroVerdicts) outcomes.set(verdict.claimId, await applyVerdict(verdict, deps));
        });
      } catch (error) {
        debug.warn(`sync: could not apply a verdict for ${heroId}; it waits for the next round`, error);
      }
    }
    return outcomes;
  };

  /** Tries the verdicts, then keeps those still waiting (each with the time it was first kept) and lets the rest go */
  const settle = async (verdicts: PendingVerdict[], startedIn: number): Promise<void> => {
    const outcomes = await tryAll(verdicts);
    const now = new Date();
    await ctx.update((current) => {
      const pendingVerdicts = { ...current.pendingVerdicts };
      const verdictsSent = { ...current.verdictsSent };
      for (const verdict of verdicts) {
        const { claimId } = verdict;
        const at = verdict.at ?? current.pendingVerdicts[claimId]?.at ?? now.toISOString();
        const outcome = outcomes.get(claimId);
        const isDone = outcome === "applied" || outcome === "already";
        const isStale = !isFresh(at, now.getTime());
        if (isStale) debug.warn(`sync: the verdict on ${claimId} waited a week without being applied; dropped`);
        const isGone = isDone || isStale;
        if (isGone) {
          delete pendingVerdicts[claimId];
          delete verdictsSent[claimId];
        } else {
          pendingVerdicts[claimId] = { ...verdict, at };
        }
      }
      return { ...current, pendingVerdicts, verdictsSent };
    }, startedIn);
  };

  const send = async (settled: ClaimSettled, heroId: string): Promise<void> => {
    const startedIn = ctx.generation();
    await ctx.queueEvent(heroId, (deviceId) => claimSettledEvent(heroId, deviceId, settled));
    const at = new Date().toISOString();
    const verdict: PendingVerdict = { ...settled, heroId, seq: 0, at };
    const sent = { approved: settled.status === "approved", at };
    await ctx.update(
      (current) => ({
        ...current,
        verdictsSent: { ...current.verdictsSent, [settled.claimId]: sent },
        pendingVerdicts: { ...current.pendingVerdicts, [settled.claimId]: verdict },
      }),
      startedIn
    );
    // Paid here on a borrowed turn when nobody holds the hero; the Game Master does not wait for it
    serial(() => settle([verdict], startedIn)).catch(() => undefined);
  };

  /** A kept claim the device that took it has answered (a `claim.settled` names it, even turned away) is let go */
  const dropAnswered = async (events: ReceivedEvent[], startedIn: number): Promise<void> => {
    const answered = new Set(events.filter((e) => e.kind === "claim.settled").map((e) => String(e.data?.claimId ?? "")));
    const gone = Object.keys((await ctx.kept()).waitingEvents).filter((id) => answered.has(id));
    const hasGone = gone.length > 0;
    if (!hasGone) return;
    await ctx.update((current) => {
      const waitingEvents = { ...current.waitingEvents };
      gone.forEach((id) => delete waitingEvents[id]);
      return { ...current, waitingEvents };
    }, startedIn);
  };

  const take = (events: ReceivedEvent[]): Promise<void> => {
    const startedIn = ctx.generation();
    const verdicts = events.map(verdictFrom).filter(isVerdict);
    const hasVerdicts = verdicts.length > 0;
    return serial(async () => {
      await dropAnswered(events, startedIn);
      if (hasVerdicts) await settle(verdicts, startedIn);
    });
  };

  /** The kept claims and rewards: those taken somewhere (or a week old) go, the rest are handed to the family store again */
  const retakeEvents = async (startedIn: number): Promise<void> => {
    const kept = Object.values((await ctx.kept()).waitingEvents);
    const hasKept = kept.length > 0;
    if (!hasKept) return;
    const entries = await getQuestLogDb().getEntries();
    const now = Date.now();
    kept.filter((e) => !isFresh(e.keptAt, now)).forEach((e) => debug.warn(`sync: ${e.kind} ${e.id} waited a week for its hero's turn; dropped`));
    const due = kept.filter((e) => isFresh(e.keptAt, now) && !isTakenSomewhere(e, entries));
    const hasDue = due.length > 0;
    const left = new Set(hasDue ? await ctx.retakeEvents(due) : []);
    await ctx.update((current) => {
      const waitingEvents = { ...current.waitingEvents };
      kept.filter((e) => !left.has(e.id)).forEach((e) => delete waitingEvents[e.id]);
      return { ...current, waitingEvents };
    }, startedIn);
  };

  /** Read inside the job, so a verdict applied by the job before it is not tried again */
  const retryNow = async (): Promise<void> => {
    const startedIn = ctx.generation();
    const waiting = Object.values((await ctx.kept()).pendingVerdicts);
    const hasWaiting = waiting.length > 0;
    if (hasWaiting) await settle(waiting, startedIn);
    await retakeEvents(startedIn);
  };

  /** Joins a retry still waiting to run or running */
  const retry = (): Promise<void> => {
    if (!retrying) {
      retrying = serial(retryNow).finally(() => {
        retrying = null;
      });
    }
    return retrying;
  };

  /** A held claim this device lost to a takeover goes again, phone-style, and this device's copy of its entry goes */
  const resendClaim = async (key: string, value: unknown): Promise<void> => {
    const claim = heldClaimOf(value);
    if (!claim) return;
    const heroId = claim.userId;
    const questId = String(claim.questId);
    const difficulty = await difficultyOf(questId);
    // A fresh claim at the time the hero made it, so the holder counts it for that day
    const at = typeof claim.completedAt === "string" ? claim.completedAt : new Date().toISOString();
    await ctx.queueEvent(heroId, (deviceId) => ({ ...questClaimedEvent(heroId, deviceId, { questId, difficulty, requiresApproval: true }), at }));
    // Quietly, as a download lands a record: the removal is this device catching up, never a change to send
    await rawTargetFor(QUEST_LOG)?.remove(key);
  };

  const resendClaims = async (refused: (BatchRecord & { code: string })[]): Promise<void> => {
    for (const record of refused) {
      const isTurnRefusal = record.code === TURN_REFUSAL && record.store === QUEST_LOG;
      if (isTurnRefusal) await resendClaim(record.key, bodyOf(record));
    }
  };

  const resendDropped = async (items: OutboxItem[]): Promise<void> => {
    for (const item of items.filter((dropped) => dropped.store === QUEST_LOG)) await resendClaim(item.key, await readRawRecord(QUEST_LOG, item.key));
  };

  const keepEvents = async (events: ReceivedEvent[]): Promise<void> => {
    const hasEvents = events.length > 0;
    if (!hasEvents) return;
    const keptAt = new Date().toISOString();
    await ctx.update((current) => {
      const waitingEvents = { ...current.waitingEvents };
      events.forEach((e) => {
        waitingEvents[e.id] = waitingEvents[e.id] ?? { ...e, keptAt };
      });
      return { ...current, waitingEvents };
    }, ctx.generation());
  };

  const markHistory = (): Promise<void> =>
    ctx.update((current) => (current.claimsSince ? current : { ...current, claimsSince: new Date().toISOString() }), ctx.generation());

  return { send, take, retry, resendClaims, resendDropped, keepEvents, markHistory };
};
