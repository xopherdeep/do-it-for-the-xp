/**
 * Kid creations: the beasts and quests a hero makes and a Game Master approves. Pure: records in, new records out; no
 * storage, no Vue.
 *
 * A creation is an ordinary beast or quest record with a `proposal` block on it (no separate store). It goes
 * proposed -> approved, or proposed -> returned (the Game Master's note says why) -> proposed again when the kid sends
 * it back. A record with no proposal was made by a Game Master, or before kids could make things, and is live. Until
 * a creation is approved it stays out of play: a proposed quest is also saved with `draft: true`, which every hero list
 * already hides (questDrafts.hideDrafts); a proposed beast is left out by `isLiveBeast`, behind BestiaryDb.getLiveBeasts.
 *
 * Every transition hands back a new record (the one given is not changed), and a transition that does not apply hands
 * back the same record, so a replayed tap approves nothing twice and a Game Master's screen needs no guard of its own.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { suggestedRewards } from "@/lib/services/quests/sizeRewards";

export type ProposalState = "proposed" | "returned" | "approved";

export interface Proposal {
  /** The hero who made it */
  by: string;
  /** ISO time it was sent (sent again, after a return) */
  on: string;
  state: ProposalState;
  /** The Game Master's reason for sending it back */
  note?: string;
  reviewedBy?: string;
  reviewedOn?: string;
  /** On a beast: the quest the kid made with it, approved together */
  questId?: string;
  /** ISO time the AP for making it was paid: set once, so a replayed approval cannot pay twice */
  paidOn?: string;
}

/** Anything a kid can make: a beast or a quest */
export interface Proposed {
  proposal?: Proposal;
}

export type CreationKind = "beast" | "quest";

/** How many creations one hero may have waiting or sent back at once */
export const MAKER_CAP = 10;

/** Make a record a creation, waiting for a Game Master. `questId` ties a beast to the quest made with it. */
export const propose = <T extends Proposed>(record: T, by: string, now: Date, questId?: string): T => ({
  ...record,
  proposal: { by, on: now.toISOString(), state: "proposed", ...(questId ? { questId } : {}) },
});

/**
 * Whether a record is in play: it has no proposal (made by a Game Master, or before kids could make things) or its
 * proposal is approved. No record at all is not live, so a list with a hole in it (storage can hand back a null) comes
 * out clean when it is filtered with this.
 */
export const isLive = (record: Proposed | null | undefined): boolean => {
  if (!record) return false;
  return !record.proposal || record.proposal.state === "approved";
};

/** The one filter behind BestiaryDb.getLiveBeasts: beasts the family may fight, link and pick */
export const isLiveBeast = (beast: Pick<Beast, "proposal"> | null | undefined): boolean => isLive(beast);

/** Sent and not yet looked at (or sent again) */
export const isWaiting = (record: Proposed): boolean => record.proposal?.state === "proposed";

/** Sent back by a Game Master, with the kid to answer */
export const isReturned = (record: Proposed): boolean => record.proposal?.state === "returned";

/**
 * Approve a creation: it goes live. An approved record, and a record with no proposal, come back as the very same
 * object, which is how a second approval stays a no-op. The note of an earlier return is dropped: there is nothing
 * left to fix, and the maker's screen must not keep asking for it.
 */
export const approveCreation = <T extends Proposed>(record: T, reviewerId: string, now: Date): T => {
  const { proposal } = record;
  const hasNothingToApprove = !proposal || proposal.state === "approved";
  if (hasNothingToApprove) return record;
  const approved: Proposal = { ...proposal, state: "approved", reviewedBy: reviewerId, reviewedOn: now.toISOString() };
  delete approved.note;
  return { ...record, proposal: approved };
};

/**
 * Approve a quest: approveCreation, then out of the drafts so heroes see it, given to the heroes the Game Master chose
 * (the assignee the kid asked for stays when none is chosen). An already approved quest comes back unchanged.
 */
export const approveQuest = (quest: Achievement, reviewerId: string, now: Date, assignee?: string[]): Achievement => {
  const approved = approveCreation(quest, reviewerId, now);
  const wasAlreadyApproved = approved === quest;
  if (wasAlreadyApproved) return quest;
  return { ...approved, draft: false, ...(assignee ? { assignee } : {}) };
};

/**
 * Send a creation back to its maker. The note is trimmed and an empty one is dropped. A record that is already
 * approved is live and may be in use, so it is not taken back: it comes back unchanged, as does one with no proposal.
 */
export const returnCreation = <T extends Proposed>(record: T, reviewerId: string, note: string | undefined, now: Date): T => {
  const { proposal } = record;
  const cannotBeReturned = !proposal || proposal.state === "approved";
  if (cannotBeReturned) return record;
  const kept = note?.trim() || undefined;
  return { ...record, proposal: { ...proposal, state: "returned", note: kept, reviewedBy: reviewerId, reviewedOn: now.toISOString() } };
};

/** The maker sends a returned creation again: waiting, dated now, the old note cleared. Anything else is unchanged. */
export const resend = <T extends Proposed>(record: T, now: Date): T => {
  const { proposal } = record;
  const isNotReturned = proposal?.state !== "returned";
  if (isNotReturned) return record;
  const sentAgain: Proposal = { ...proposal, state: "proposed", on: now.toISOString() };
  delete sentAgain.note;
  return { ...record, proposal: sentAgain };
};

const isOpen = (record: Proposed): boolean => isWaiting(record) || isReturned(record);

/** How many creations this hero has waiting or sent back (approved ones are done and do not count) */
export const openCount = (records: readonly Proposed[], by: string): number =>
  records.filter((record) => isOpen(record) && record.proposal?.by === by).length;

/** Whether this hero may send another creation */
export const canPropose = (records: readonly Proposed[], by: string): boolean => openCount(records, by) < MAKER_CAP;

/** A row as storage hands it back: a hole (null) is possible and counts for nothing */
type StoredRow = Proposed | null | undefined;

/**
 * Whether this hero may send another creation, counting their beasts and quests together: a creation is either, and
 * the cap (spec section 3) is on creations, not on each kind. The Beast Maker and the Quest Wizard both ask this.
 */
export const canProposeAny = (beasts: readonly StoredRow[], quests: readonly StoredRow[], by: string): boolean => {
  const records = [...beasts, ...quests].filter((record): record is Proposed => Boolean(record));
  return canPropose(records, by);
};

/**
 * The AP a creation earns, from the Quest Wizard's own reward table so there are no new numbers: a beast is worth a
 * size 3 quest, a quest a size 1 quest.
 */
export const creationAp = (kind: CreationKind): number => suggestedRewards(kind === "beast" ? 3 : 1).ap;

/** What says who made a record: a beast keeps `madeBy`, a quest has `createdBy`, and either may carry a proposal */
export interface MadeRecord {
  madeBy?: string;
  createdBy?: string;
  proposal?: Proposal;
}

/** The hero id who made a record: kept on the beast (`madeBy`), else who proposed it, else the quest's creator */
export const makerOf = (record: MadeRecord): string => record.madeBy || record.proposal?.by || record.createdBy || "";

/** A made record that may also carry a picture of the kid's own */
export interface CreditedRecord extends MadeRecord {
  localImage?: string;
}

/**
 * "Drawn by Ronan" for a beast with a picture of the kid's own, "Made by Ronan" for a beast with a library look,
 * "Suggested by Jack" for a quest. Nothing ("") when nobody made it or the maker is no hero we know (`nickOf` answers
 * a blank name), so the screen can simply leave the line out.
 */
export const creditLine = (record: CreditedRecord, kind: CreationKind, nickOf: (id: string) => string): string => {
  const maker = makerOf(record);
  const name = maker ? nickOf(maker) : "";
  const hasNoName = !name;
  if (hasNoName) return "";
  const isQuest = kind === "quest";
  if (isQuest) return `Suggested by ${name}`;
  return record.localImage ? `Drawn by ${name}` : `Made by ${name}`;
};

/** One line in the Game Master's Creations list: a beast (with the quest made along with it) or a quest on its own */
export interface CreationRow {
  key: string;
  kind: CreationKind;
  id: string;
  name: string;
  by: string;
  on: string;
  state: ProposalState;
  note?: string;
  beast?: Beast;
  quest?: Achievement;
  /** The quest the kid made with this beast: reviewed on the beast's row, never as a row of its own */
  pairedQuest?: Achievement;
}

/** What every row has, whichever kind it is */
const baseRow = (kind: CreationKind, id: string, name: string, proposal: Proposal): CreationRow => ({
  key: `${kind}:${id}`,
  kind,
  id,
  name,
  by: proposal.by,
  on: proposal.on,
  state: proposal.state,
  note: proposal.note,
});

/** A record with a proposal on it: a creation, whatever state it is in */
const hasProposal = (record: Proposed): record is { proposal: Proposal } => Boolean(record.proposal);

/** The quest a beast is reviewed with: the one its proposal names, else the first waiting quest that fights it */
const pairOf = (beast: Beast & { proposal: Proposal }, waiting: readonly Achievement[]): Achievement | undefined => {
  const named = beast.proposal.questId;
  const namedQuest = named ? waiting.find((quest) => String(quest.id) === named) : undefined;
  return namedQuest ?? waiting.find((quest) => String(quest.beastId ?? "") === String(beast.id));
};

/**
 * The rows for the Game Master's Creations list: one per beast or quest whose proposal is in `states` (waiting ones by
 * default), oldest first. A beast not yet in the game is one row with the quest it is reviewed with (`pairedQuest`: the
 * quest its proposal names, else a waiting quest that fights it), whatever state either is in, so a beast that was sent
 * back and the quest the kid sent again on its own show as one line; that quest gets no row of its own, and a second
 * quest on the same beast does. A quest whose beast is in the game, or is nobody's creation, is its own row.
 */
export const creationRows = (
  beasts: readonly Beast[],
  quests: readonly Achievement[],
  states: readonly ProposalState[] = ["proposed"]
): CreationRow[] => {
  const isAsked = (record: Proposed): record is { proposal: Proposal } => !!record.proposal && states.includes(record.proposal.state);
  // Only a quest still to be approved rides on a beast's row: an approved one is in the game already
  const stillToApprove = quests.filter((quest) => hasProposal(quest) && !isLive(quest));
  const pairedIds = new Set<string>();
  const rows: CreationRow[] = [];

  for (const beast of beasts) {
    if (!hasProposal(beast)) continue;
    const unpaired = stillToApprove.filter((quest) => !pairedIds.has(String(quest.id)));
    const pairedQuest = isLive(beast) ? undefined : pairOf(beast, unpaired);
    const isWanted = isAsked(beast) || (pairedQuest !== undefined && isAsked(pairedQuest));
    if (!isWanted) continue;
    if (pairedQuest) pairedIds.add(String(pairedQuest.id));
    rows.push({ ...baseRow("beast", String(beast.id), beast.name, beast.proposal), beast, pairedQuest });
  }

  for (const quest of quests) {
    const hasItsOwnRow = isAsked(quest) && !pairedIds.has(String(quest.id));
    if (!hasItsOwnRow) continue;
    rows.push({ ...baseRow("quest", String(quest.id), quest.achievementName, quest.proposal), quest });
  }

  return rows.sort((a, b) => a.on.localeCompare(b.on));
};
