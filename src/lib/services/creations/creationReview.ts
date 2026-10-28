/**
 * The Game Master's review of a kid's creation, the glue (creations.ts holds the pure transitions): read the stored
 * beast or quest fresh, write the verdict, pay the maker's AP once and tell them. The Approvals screen and the two
 * edit forms (a Game Master who saves a proposed beast or quest in their own form approves it with the edits) all
 * settle creations through here, so they behave the same.
 *
 * Paying once rests on `proposal.paidOn` read fresh from storage, never on the row the screen holds: a replayed tap, a
 * second Game Master or a synced device that arrives late finds the date and pays nothing. The record is written with
 * the date before the AP moves, so a save that fails pays nothing.
 *
 * The two stores are passed in so a spec can use plain objects; the app passes none and gets the real ones.
 */
import { AchievementDb, achievementStorage } from "@/lib/databases/AchievementDb";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { BestiaryDb, beastStorage } from "@/lib/databases/BestiaryDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { approveCreation, approveQuest, creationAp, creationRows, isLive, makerOf, returnCreation } from "@/lib/services/creations/creations";
import type { CreationKind, CreationRow, MadeRecord, Proposal, ProposalState, Proposed } from "@/lib/services/creations/creations";
import { creationApprovedNotification, creationReturnedNotification } from "@/lib/services/notifications/Notifications";
import type { CreationRef } from "@/lib/services/notifications/Notifications";
import { notify } from "@/lib/services/notifications/notify";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

export interface ReviewStores {
  bestiaryDb: Pick<BestiaryDb, "getBeasts" | "setBeast">;
  achievementDb: Pick<AchievementDb, "getTasks" | "setTask">;
}

let appStores: ReviewStores | null = null;

const realStores = (): ReviewStores =>
  (appStores ??= {
    bestiaryDb: new BestiaryDb(beastStorage),
    achievementDb: new AchievementDb(achievementStorage),
  });

type Creation = Beast | Achievement;

/** Storage can hand back a null row; the lists go on without it */
const present = <T>(rows: readonly (T | null | undefined)[]): T[] => rows.filter((row): row is T => Boolean(row));

const storedBeast = async (id: string, stores: ReviewStores): Promise<Beast | undefined> =>
  present<Beast>(await stores.bestiaryDb.getBeasts()).find((beast) => String(beast.id) === id);

const storedQuest = async (id: string, stores: ReviewStores): Promise<Achievement | undefined> =>
  present<Achievement>(await stores.achievementDb.getTasks()).find((quest) => String(quest.id) === id);

const stored = (kind: CreationKind, id: string, stores: ReviewStores): Promise<Creation | undefined> =>
  kind === "beast" ? storedBeast(id, stores) : storedQuest(id, stores);

const write = (kind: CreationKind, record: Creation, stores: ReviewStores): Promise<unknown> =>
  kind === "beast" ? stores.bestiaryDb.setBeast(record as Beast) : stores.achievementDb.setTask(record as Achievement);

const nameOf = (record: Creation): string => ("achievementName" in record ? record.achievementName : record.name);

/** The rows of the Game Master's Creations list, waiting ones by default (creations.creationRows over the stores) */
export const loadCreationRows = async (
  states: readonly ProposalState[] = ["proposed"],
  stores: ReviewStores = realStores()
): Promise<CreationRow[]> => {
  const [beasts, quests] = await Promise.all([stores.bestiaryDb.getBeasts(), stores.achievementDb.getTasks()]);
  return creationRows(present<Beast>(beasts), present<Achievement>(quests), states);
};

/**
 * A creation was settled (approved, sent back, or taken away by its maker): the "a creation awaits" notices about it are
 * read in every Game Master's feed. Never throws.
 */
export const settleNotices = (key: string): void => {
  try {
    useNotificationsStore().markReadByRef("creation-waiting", key);
  } catch (error) {
    // no store in a spec without Pinia: there are no notices to settle
    debug.warn("[creationReview] could not settle the waiting notices", error);
  }
};

/**
 * Write an approved record, dated with the day its AP was paid, then pay the maker and tell them. The AP moves only
 * when the stored record carried no `paidOn` (the date written is the stored one, or now). Gives back the AP paid.
 */
const payAndTell = async <T extends Proposed & MadeRecord>(
  kind: CreationKind,
  before: T,
  approved: T,
  ref: CreationRef,
  now: Date,
  save: (record: T) => Promise<unknown>
): Promise<number> => {
  const wasPaid = Boolean(before.proposal?.paidOn);
  const paidOn = before.proposal?.paidOn ?? now.toISOString();
  await save({ ...approved, proposal: { ...(approved.proposal as Proposal), paidOn } });
  settleNotices(ref.key);
  if (wasPaid) return 0;
  const ap = creationAp(kind);
  const maker = makerOf(before);
  useUserStore().recordAPGain({ userId: maker, amount: ap, source: "creation", at: now.toISOString() });
  notify(creationApprovedNotification(maker, ref, ap));
  return ap;
};

const approveBeastRecord = (beast: Beast, reviewerId: string, now: Date, stores: ReviewStores): Promise<number> =>
  payAndTell("beast", beast, approveCreation(beast, reviewerId, now), { key: `beast:${String(beast.id)}`, name: beast.name, kind: "beast" }, now, (record) =>
    stores.bestiaryDb.setBeast(record)
  );

const approveQuestRecord = (quest: Achievement, reviewerId: string, now: Date, assignee: string[] | undefined, stores: ReviewStores): Promise<number> =>
  payAndTell(
    "quest",
    quest,
    approveQuest(quest, reviewerId, now, assignee),
    { key: `quest:${String(quest.id)}`, name: quest.achievementName, kind: "quest" },
    now,
    (record) => stores.achievementDb.setTask(record)
  );

/** The quest a beast was sent with, when it is still to be approved (an approved one is left as it is) */
const pairedToSettle = async (row: CreationRow, stores: ReviewStores): Promise<Achievement | undefined> => {
  if (!row.pairedQuest) return undefined;
  const paired = await storedQuest(String(row.pairedQuest.id), stores);
  const isStillWaiting = paired !== undefined && !isLive(paired);
  return isStillWaiting ? paired : undefined;
};

export type ApproveOutcome = { ok: true; /** The AP paid, for the toast (0 when it was paid before) */ ap: number } | { ok: false; reason: "gone" | "settled" };

export interface ApproveOptions {
  /** The heroes the Game Master chose for a quest (the kid's choice stays when none) */
  assignee?: string[];
  now?: Date;
}

/**
 * Approve a row: the beast or quest goes live, its maker is paid and told, and so is the quest a beast was sent with.
 * `gone` when the record is no longer stored, `settled` when it is already in the game (or was never a creation).
 */
export const approveRow = async (
  row: CreationRow,
  reviewerId: string,
  options: ApproveOptions = {},
  stores: ReviewStores = realStores()
): Promise<ApproveOutcome> => {
  const now = options.now ?? new Date();
  const record = await stored(row.kind, row.id, stores);
  const isGone = record === undefined;
  if (isGone) return { ok: false, reason: "gone" };
  const isSettled = isLive(record);
  if (isSettled) return { ok: false, reason: "settled" };
  const own =
    row.kind === "beast"
      ? await approveBeastRecord(record as Beast, reviewerId, now, stores)
      : await approveQuestRecord(record as Achievement, reviewerId, now, options.assignee, stores);
  const paired = await pairedToSettle(row, stores);
  const pairedAp = paired ? await approveQuestRecord(paired, reviewerId, now, options.assignee, stores) : 0;
  return { ok: true, ap: own + pairedAp };
};

/**
 * Send a row back to its maker with the Game Master's note (blank means none), the quest a beast was sent with along
 * with it. A record that is gone or already in the game is left alone.
 */
export const returnRow = async (
  row: CreationRow,
  reviewerId: string,
  note: string | undefined,
  stores: ReviewStores = realStores()
): Promise<{ ok: boolean }> => {
  const now = new Date();
  const record = await stored(row.kind, row.id, stores);
  const cannotBeReturned = record === undefined || isLive(record);
  if (cannotBeReturned) return { ok: false };
  const returned = returnCreation(record, reviewerId, note, now);
  await write(row.kind, returned, stores);
  const paired = await pairedToSettle(row, stores);
  if (paired) await stores.achievementDb.setTask(returnCreation(paired, reviewerId, note, now));
  settleNotices(row.key);
  notify(creationReturnedNotification(makerOf(record), { key: row.key, name: nameOf(record), kind: row.kind }, returned.proposal?.note));
  return { ok: true };
};

/**
 * The edit path: the Game Master saved a proposed beast in their own form, so it is approved with the edits (paid and
 * told like any approval). False when there is nothing to do: no such beast, or one already in the game.
 */
export const approveStoredBeast = async (beastId: string, reviewerId: string, stores: ReviewStores = realStores()): Promise<boolean> => {
  const beast = await storedBeast(beastId, stores);
  const isWaiting = beast !== undefined && !isLive(beast);
  if (!isWaiting) return false;
  await approveBeastRecord(beast, reviewerId, new Date(), stores);
  return true;
};

/** The edit path for a quest: the Game Master's own form saved it, so it goes live for the heroes it was for. */
export const approveStoredQuest = async (questId: string, reviewerId: string, stores: ReviewStores = realStores()): Promise<boolean> => {
  const quest = await storedQuest(questId, stores);
  const isWaiting = quest !== undefined && !isLive(quest);
  if (!isWaiting) return false;
  await approveQuestRecord(quest, reviewerId, new Date(), undefined, stores);
  return true;
};
