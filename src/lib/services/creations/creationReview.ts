/**
 * The Game Master's review of a kid's creation, the glue (creations.ts holds the pure transitions): read the stored
 * beast or quest fresh, write the verdict, pay the maker's AP once and tell them. The Approvals screen, the Bestiary's
 * menu and the two edit forms (a Game Master who saves a proposed beast or quest in their own form approves it with
 * the edits) all settle creations through here, so they behave the same.
 *
 * The one invariant: a quest never goes live on a beast that is not in the game. Every path that approves a quest
 * (`approveRow` on a quest row or a paired row, `approveStoredQuest` from the Compendium) first approves the beast the
 * quest fights when that beast is still waiting or was sent back, and pays its maker for it, in the same call.
 *
 * Paying once rests on `proposal.paidOn` read fresh from storage, never on the row the screen holds: a replayed tap, a
 * second Game Master or a synced device that arrives late finds the date and pays nothing. The record is written with
 * the date before the AP moves, so a save that fails pays nothing. One call tells each maker once, whatever it approved
 * for them: a beast and the quest sent with it are one piece of news, named after the beast, with the AP of both.
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
 * The proposal the stored quest carries now, to spread over the record a form writes: a Game Master's open form must
 * never write the waiting proposal it opened with back over an approval made elsewhere meanwhile. Nothing for a quest
 * that is not stored or carries no proposal, so the form's own record stands.
 */
export const freshProposalOf = async (questId: string, stores: ReviewStores = realStores()): Promise<{ proposal?: Proposal }> => {
  const quest = await storedQuest(questId, stores);
  return quest?.proposal ? { proposal: quest.proposal } : {};
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

/** What one approved record paid: to whom, for what, and how much (0 when it was paid before) */
interface Paid {
  maker: string;
  ref: CreationRef;
  ap: number;
}

/**
 * Write an approved record, dated with the day its AP was paid, then pay the maker. The AP moves only when the stored
 * record carried no `paidOn` (the date written is the stored one, or now). The maker is told later, once per call.
 */
const payOnce = async <T extends Proposed & MadeRecord>(
  kind: CreationKind,
  before: T,
  approved: T,
  ref: CreationRef,
  now: Date,
  save: (record: T) => Promise<unknown>
): Promise<Paid> => {
  const wasPaid = Boolean(before.proposal?.paidOn);
  const paidOn = before.proposal?.paidOn ?? now.toISOString();
  await save({ ...approved, proposal: { ...(approved.proposal as Proposal), paidOn } });
  settleNotices(ref.key);
  const maker = makerOf(before);
  if (wasPaid) return { maker, ref, ap: 0 };
  const ap = creationAp(kind);
  useUserStore().recordAPGain({ userId: maker, amount: ap, source: "creation", at: now.toISOString() });
  return { maker, ref, ap };
};

/**
 * Tell each maker once what one call approved for them, named after the first record of theirs it approved (the beast
 * of a pair) with the AP of all of them; nothing when nothing was paid. Gives back the AP paid in all.
 */
const tellMakers = (paid: readonly Paid[]): number => {
  const byMaker = new Map<string, Paid>();
  for (const one of paid) {
    const told = byMaker.get(one.maker);
    byMaker.set(one.maker, told ? { ...told, ap: told.ap + one.ap } : one);
  }
  for (const one of byMaker.values()) {
    const wasPaidNow = one.ap > 0;
    if (wasPaidNow) notify(creationApprovedNotification(one.maker, one.ref, one.ap));
  }
  return paid.reduce((sum, one) => sum + one.ap, 0);
};

const approveBeastRecord = (beast: Beast, reviewerId: string, now: Date, stores: ReviewStores): Promise<Paid> =>
  payOnce("beast", beast, approveCreation(beast, reviewerId, now), { key: `beast:${String(beast.id)}`, name: beast.name, kind: "beast" }, now, (record) =>
    stores.bestiaryDb.setBeast(record)
  );

const approveQuestRecord = (quest: Achievement, reviewerId: string, now: Date, assignee: string[] | undefined, stores: ReviewStores): Promise<Paid> =>
  payOnce(
    "quest",
    quest,
    approveQuest(quest, reviewerId, now, assignee),
    { key: `quest:${String(quest.id)}`, name: quest.achievementName, kind: "quest" },
    now,
    (record) => stores.achievementDb.setTask(record)
  );

/** The beast a quest fights, when it is stored and not in the game yet: it must go live with the quest, never after */
const unapprovedBeastOf = async (quest: Achievement, stores: ReviewStores): Promise<Beast | undefined> => {
  const beastId = quest.beastId ? String(quest.beastId) : "";
  if (!beastId) return undefined;
  const beast = await storedBeast(beastId, stores);
  const isStillWaiting = beast !== undefined && !isLive(beast);
  return isStillWaiting ? beast : undefined;
};

/** Every quest approval comes through here: the beast it fights first, when that beast is still waiting, then the quest */
const approveQuestAndBeast = async (
  quest: Achievement,
  reviewerId: string,
  now: Date,
  assignee: string[] | undefined,
  stores: ReviewStores
): Promise<Paid[]> => {
  const beast = await unapprovedBeastOf(quest, stores);
  const paid: Paid[] = [];
  if (beast) paid.push(await approveBeastRecord(beast, reviewerId, now, stores));
  paid.push(await approveQuestRecord(quest, reviewerId, now, assignee, stores));
  return paid;
};

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
 * Approve a row: the beast or quest goes live, its maker is paid and told, and so is the quest a beast was sent with
 * (and the beast a quest fights, when that beast still waits). `gone` when the record is no longer stored, `settled`
 * when it is already in the game (or was never a creation).
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
  const paid: Paid[] =
    row.kind === "beast"
      ? [await approveBeastRecord(record as Beast, reviewerId, now, stores)]
      : await approveQuestAndBeast(record as Achievement, reviewerId, now, options.assignee, stores);
  const paired = await pairedToSettle(row, stores);
  if (paired) paid.push(...(await approveQuestAndBeast(paired, reviewerId, now, options.assignee, stores)));
  return { ok: true, ap: tellMakers(paid) };
};

/**
 * The edit path: the Game Master saved a proposed beast in their own form, or tapped Approve on it in the Bestiary, so
 * it is approved as it stands (paid and told like any approval). The quest sent with it keeps waiting, as its own row,
 * which breaks nothing: only the other way round is unsafe. False when there is nothing to do: no such beast, or one
 * already in the game.
 */
export const approveStoredBeast = async (beastId: string, reviewerId: string, stores: ReviewStores = realStores()): Promise<boolean> => {
  const beast = await storedBeast(beastId, stores);
  const isWaiting = beast !== undefined && !isLive(beast);
  if (!isWaiting) return false;
  tellMakers([await approveBeastRecord(beast, reviewerId, new Date(), stores)]);
  return true;
};

/**
 * The edit path for a quest: the Game Master's own form saved it, so it goes live for the heroes it was for, and the
 * beast it fights goes live with it when that beast still waits.
 */
export const approveStoredQuest = async (questId: string, reviewerId: string, stores: ReviewStores = realStores()): Promise<boolean> => {
  const quest = await storedQuest(questId, stores);
  const isWaiting = quest !== undefined && !isLive(quest);
  if (!isWaiting) return false;
  tellMakers(await approveQuestAndBeast(quest, reviewerId, new Date(), undefined, stores));
  return true;
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
 * The Bestiary's Send back on a beast that is not in the game: the same as from the lane, the quest sent with it going
 * back too. False when there is nothing to send back: no such beast, or one already in the game.
 */
export const returnStoredBeast = async (
  beastId: string,
  reviewerId: string,
  note: string | undefined,
  stores: ReviewStores = realStores()
): Promise<boolean> => {
  const beast = await storedBeast(beastId, stores);
  const cannotBeReturned = beast === undefined || isLive(beast);
  if (cannotBeReturned) return false;
  const quests = present<Achievement>(await stores.achievementDb.getTasks());
  const [row] = creationRows([beast], quests, ["proposed", "returned"]);
  const { ok } = await returnRow(row, reviewerId, note, stores);
  return ok;
};
