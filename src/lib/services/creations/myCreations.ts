/**
 * The kid's own list of creations (kid-creations design, sections 5 and 9): the beasts and quests this hero made, each
 * in the state the Game Master left it in, and what the maker may do with them: send one that came back again (as it
 * is, or fixed first), delete one that is still waiting or came back, or lose them all when the hero's profile is
 * deleted. The transitions are creations.ts's; this is the maker's side of them, over the two stores.
 *
 * A row's state is read fresh from storage before anything is written: the Game Master may approve or take back a
 * creation while the kid's list is open, and the list on screen must never un-approve, or delete, what is in the game.
 *
 * The stores are passed in so a spec can use plain objects; the app passes none and gets the real ones.
 */
import { beastPatch } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import type { BeastDraft } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import { beastPortraitUrl } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait";
import { AchievementDb, achievementStorage } from "@/lib/databases/AchievementDb";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { BestiaryDb, beastStorage } from "@/lib/databases/BestiaryDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { deleteQuest } from "@/lib/services/compendium/deleteContent";
import { copyFor } from "@/lib/services/copy/copy";
import type { Voice } from "@/lib/services/copy/voices";
import { useUserStore } from "@/lib/store/stores/user";
import { settleNotices } from "./creationReview";
import type { ReviewStores } from "./creationReview";
import { canProposeAny, isLive, isReturned, isWaiting, makerOf, resend, returnCreation } from "./creations";
import type { CreationKind, ProposalState } from "./creations";

export type MyCreationState = "waiting" | "back" | "inGame";

/** One line in the kid's list: a beast or a quest they made */
export interface MyCreationRow {
  key: string;
  kind: CreationKind;
  id: string;
  name: string;
  state: MyCreationState;
  /** The Game Master's reason, on a row that came back */
  note?: string;
  /** ISO time it was sent (or sent again) */
  on: string;
  portrait?: string;
  beast?: Beast;
  quest?: Achievement;
  /** On a beast that is in the game: the live quest its Beast Card opens on. Without one the row is plain. */
  card?: Achievement;
}

const STATE_OF: Record<ProposalState, MyCreationState> = { proposed: "waiting", returned: "back", approved: "inGame" };

/** The note a creation carries back to the Game Master when its maker's profile is deleted */
export const MAKER_GONE = "maker gone";

/** Storage can hand back a null row; the lists go on without it */
const present = <T>(rows: readonly (T | null | undefined)[]): T[] => rows.filter((row): row is T => Boolean(row));

/**
 * The quest a beast's card opens on: a quest that is in play and fights this beast, the one sent with it first. A
 * beast with no such quest (the Game Master has not linked one yet) has no card to open.
 */
const cardQuestOf = (beast: Beast, quests: readonly Achievement[]): Achievement | undefined => {
  const isInPlay = (quest: Achievement) => isLive(quest) && !quest.draft;
  const sentWithId = beast.proposal?.questId;
  const sentWith = sentWithId ? quests.find((quest) => isInPlay(quest) && String(quest.id) === sentWithId) : undefined;
  return sentWith ?? quests.find((quest) => isInPlay(quest) && String(quest.beastId ?? "") === String(beast.id));
};

/**
 * Every beast and quest the hero made with a proposal on it (a Game Master's own records have none), newest sent first.
 * A quest sent with a beast has a row of its own: it is its own creation, with its own state.
 */
export const myCreationRows = (beasts: readonly Beast[], quests: readonly Achievement[], heroId: string): MyCreationRow[] => {
  const rows: MyCreationRow[] = [];

  for (const beast of beasts) {
    const proposal = beast?.proposal;
    const isNotMine = !proposal || makerOf(beast) !== heroId;
    if (isNotMine) continue;
    const state = STATE_OF[proposal.state];
    const card = state === "inGame" ? cardQuestOf(beast, quests) : undefined;
    rows.push({
      key: `beast:${beast.id}`,
      kind: "beast",
      id: String(beast.id),
      name: beast.name,
      state,
      ...(state === "back" && proposal.note ? { note: proposal.note } : {}),
      on: proposal.on,
      portrait: beast.localImage || beastPortraitUrl(beast.avatar) || undefined,
      beast,
      ...(card ? { card } : {}),
    });
  }

  for (const quest of quests) {
    const proposal = quest?.proposal;
    const isNotMine = !proposal || makerOf(quest) !== heroId;
    if (isNotMine) continue;
    const state = STATE_OF[proposal.state];
    rows.push({
      key: `quest:${quest.id}`,
      kind: "quest",
      id: String(quest.id),
      name: quest.achievementName,
      state,
      ...(state === "back" && proposal.note ? { note: proposal.note } : {}),
      on: proposal.on,
      portrait: quest.localImage || quest.imageUrl || undefined,
      quest,
    });
  }

  return rows.sort((a, b) => b.on.localeCompare(a.on));
};

/** The chip on a row: Waiting, Came back, In the game, in the hero's voice */
export const stateChip = (state: MyCreationState, voice: Voice): string => copyFor(`beastMaker.state.${state}`, voice);

// ---------------------------------------------------------------------------------------------------------------------
// The stores
// ---------------------------------------------------------------------------------------------------------------------

/** What delete needs on top of what review needs: remove a beast, and remove a quest with everything that points at it */
export interface DeleteStores extends ReviewStores {
  bestiaryDb: Pick<BestiaryDb, "getBeasts" | "setBeast" | "deleteBeast">;
  removeQuest: (quest: Pick<Achievement, "id">) => Promise<unknown>;
}

const appStores = (): DeleteStores => ({
  bestiaryDb: new BestiaryDb(beastStorage),
  achievementDb: new AchievementDb(achievementStorage),
  removeQuest: deleteQuest,
});

type Stored = Beast | Achievement;

/** The row's record as storage holds it now (undefined when it is gone) */
const storedOf = async (row: Pick<MyCreationRow, "kind" | "id">, stores: ReviewStores): Promise<Stored | undefined> => {
  const isBeast = row.kind === "beast";
  const records: Stored[] = isBeast ? present<Beast>(await stores.bestiaryDb.getBeasts()) : present<Achievement>(await stores.achievementDb.getTasks());
  return records.find((record) => String(record.id) === row.id);
};

const write = (kind: CreationKind, record: Stored, stores: ReviewStores): Promise<unknown> =>
  kind === "beast" ? stores.bestiaryDb.setBeast(record as Beast) : stores.achievementDb.setTask(record as Achievement);

export interface MyCreations {
  rows: MyCreationRow[];
  /** The hero has as many creations waiting or sent back as they may have (MAKER_CAP): no new one until a Game Master looks */
  isFull: boolean;
}

/** The hero's rows, and whether they have reached the cap, from one read of the two stores */
export const loadMyCreations = async (heroId: string, stores: ReviewStores = appStores()): Promise<MyCreations> => {
  const [allBeasts, allQuests] = await Promise.all([stores.bestiaryDb.getBeasts(), stores.achievementDb.getTasks()]);
  const beasts = present<Beast>(allBeasts);
  const quests = present<Achievement>(allQuests);
  return { rows: myCreationRows(beasts, quests, heroId), isFull: !canProposeAny(beasts, quests, heroId) };
};

// ---------------------------------------------------------------------------------------------------------------------
// Send again, Fix it, Delete
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The other half of a pair, when it came back too: the quest a beast was sent with (its proposal names it), or the
 * beast a quest fights. The Game Master returns both with one note, so the kid sends both again with one tap.
 */
const returnedPairOf = async (kind: CreationKind, record: Stored, stores: ReviewStores): Promise<{ kind: CreationKind; record: Stored } | undefined> => {
  const isBeast = kind === "beast";
  const otherKind: CreationKind = isBeast ? "quest" : "beast";
  const otherId = isBeast ? (record as Beast).proposal?.questId : (record as Achievement).beastId;
  if (!otherId) return undefined;
  const other = await storedOf({ kind: otherKind, id: String(otherId) }, stores);
  const cameBackToo = other !== undefined && isReturned(other);
  return cameBackToo ? { kind: otherKind, record: other } : undefined;
};

/**
 * Send a creation that came back again, as it is: waiting, dated now, the Game Master's note cleared, and the other
 * half of its pair with it when that came back too. A record that is no longer sent back (approved, waiting, or gone)
 * is left alone.
 */
export const resendCreation = async (
  row: Pick<MyCreationRow, "kind" | "id">,
  now: Date,
  stores: ReviewStores = appStores()
): Promise<{ ok: boolean }> => {
  const record = await storedOf(row, stores);
  const cannotBeSentAgain = record === undefined || !isReturned(record);
  if (cannotBeSentAgain) return { ok: false };
  await write(row.kind, resend(record, now), stores);
  const other = await returnedPairOf(row.kind, record, stores);
  if (other) await write(other.kind, resend(other.record, now), stores);
  return { ok: true };
};

/**
 * What Send writes after Fix it: the fixed draft over the beast that came back, sent again. The patch names only what the
 * form owns, so the maker (`madeBy`), the quest sent with it and the review that sent it back stay on the record.
 */
export const resentBeast = (returned: Beast, draft: BeastDraft, now: Date): Beast => ({ ...resend(returned, now), ...beastPatch(draft) });

/**
 * Send the fixed beast: the stored beast (read fresh) becomes `resentBeast`. Null, and nothing written, when the beast is
 * no longer sent back: the Game Master approved it, or it was taken back, while the kid was fixing it.
 */
export const sendFixedBeast = async (draft: BeastDraft, now: Date, stores: ReviewStores = appStores()): Promise<Beast | null> => {
  const stored = (await storedOf({ kind: "beast", id: draft.id }, stores)) as Beast | undefined;
  const isNoLongerSentBack = stored === undefined || !isReturned(stored);
  if (isNoLongerSentBack) return null;
  const sent = resentBeast(stored, draft, now);
  await stores.bestiaryDb.setBeast(sent);
  return sent;
};

/**
 * Delete a creation that is waiting or came back. A beast takes the quest sent with it along, while that quest is not in
 * the game either; a quest goes through the Compendium's own delete so nothing is left pointing at it. What is in the
 * game is never deleted from here (`ok: false`), and nor is a beast a live quest fights (approving the quest approves
 * the beast, so that is old data, but the quest must not be left pointing at nothing); a record that is gone already
 * counts as deleted. The Game Master's "a creation awaits" notices about it are settled.
 */
export const deleteCreation = async (row: Pick<MyCreationRow, "kind" | "id" | "key">, stores: DeleteStores = appStores()): Promise<{ ok: boolean }> => {
  const record = await storedOf(row, stores);
  const isGone = record === undefined;
  if (isGone) return { ok: true };
  const isInTheGame = isLive(record);
  if (isInTheGame) return { ok: false };

  const isQuest = row.kind === "quest";
  if (isQuest) {
    await stores.removeQuest(record as Achievement);
  } else {
    const beast = record as Beast;
    const quests = present<Achievement>(await stores.achievementDb.getTasks());
    const sentWithId = beast.proposal?.questId;
    const fightsIt = (quest: Achievement) => String(quest.id) === sentWithId || String(quest.beastId ?? "") === String(beast.id);
    const isFoughtLive = quests.some((quest) => isLive(quest) && fightsIt(quest));
    if (isFoughtLive) return { ok: false };
    // The quest first: if the beast then fails to go, the kid still sees its row and can try again
    const sentWith = sentWithId ? quests.find((quest) => String(quest.id) === sentWithId) : undefined;
    if (sentWith) {
      await stores.removeQuest(sentWith);
      settleNotices(`quest:${sentWith.id}`);
    }
    await stores.bestiaryDb.deleteBeast(beast);
  }
  settleNotices(row.key);
  return { ok: true };
};

// ---------------------------------------------------------------------------------------------------------------------
// Maker gone
// ---------------------------------------------------------------------------------------------------------------------

/**
 * A hero's profile was deleted: every creation of theirs still waiting goes back to the Game Master as returned with the
 * note "maker gone", so the history shows what became of it. The signed-in Game Master is the reviewer. Ones already sent
 * back keep their note and ones in the game stay, though their credit line goes blank (creditLine has no name to give
 * for a hero who is gone) until follow-up #1586 keeps the name. Answers how many it sent back.
 */
export const orphanCreations = async (heroId: string, now: Date, stores: ReviewStores = appStores()): Promise<number> => {
  const reviewerId = String(useUserStore().currentUser.id ?? "");
  const [beasts, quests] = await Promise.all([stores.bestiaryDb.getBeasts(), stores.achievementDb.getTasks()]);
  const isWaitingFromHero = (record: Beast | Achievement) => isWaiting(record) && makerOf(record) === heroId;
  let sentBack = 0;

  for (const beast of present<Beast>(beasts).filter(isWaitingFromHero)) {
    await stores.bestiaryDb.setBeast(returnCreation(beast, reviewerId, MAKER_GONE, now));
    settleNotices(`beast:${beast.id}`);
    sentBack++;
  }
  for (const quest of present<Achievement>(quests).filter(isWaitingFromHero)) {
    await stores.achievementDb.setTask(returnCreation(quest, reviewerId, MAKER_GONE, now));
    settleNotices(`quest:${quest.id}`);
    sentBack++;
  }
  return sentBack;
};
