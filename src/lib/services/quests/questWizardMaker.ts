/**
 * What a "maker" adds to the Quest Wizard (questWizard.ts re-exports these, so screens and specs import them from
 * there). A maker is a hero a Game Master allowed to make things (services/family/familySettings `canMake`): they choose
 * who a quest is for, and may build it on a beast they drew themselves. Pure: no storage, no Vue.
 *
 * The one rule is "one gate per creation, never two" (D5 of the kid creations design). A maker's quest for themself on
 * a beast the family may already use stays live, exactly as a hero's always was. A quest for anyone else, or on a beast
 * that is still waiting for a Game Master (or was sent back), is saved as a proposal instead: a draft with a proposal
 * block that no hero sees until a Game Master approves it, and the waiting beast is pointed at the quest so the two are
 * approved together. A hero who may not make things, and a Game Master, never propose.
 *
 * This lives apart from questWizard.ts to keep that file under its line budget. It only imports the wizard's types, so
 * the two modules never load each other.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { isReturned, isWaiting, propose } from "@/lib/services/creations/creations";
import type { Proposal } from "@/lib/services/creations/creations";
import type { BuildContext, WizardDraft } from "@/lib/services/quests/questWizard";

/** A beast of the family's bestiary as the builder reads it: the proposal says whether a Game Master has seen it */
export type FamilyBeastRef = Pick<Beast, "id"> & Partial<Pick<Beast, "proposal" | "checklist" | "name">>;

/** The family beast still waiting on a Game Master, with the proposal it should now carry: it points at the quest */
export interface LinkBeast {
  id: string;
  proposal: Proposal;
}

/**
 * A family beast chosen outright (the one a maker just drew): it fights the quest, so the library entry is dropped.
 * Its name names the quest unless the draft already has one, and its checklist fills an empty list of steps.
 */
export const chooseFamilyBeast = (draft: WizardDraft, beast: Pick<Beast, "id" | "name" | "checklist">): WizardDraft => ({
  ...draft,
  beastId: String(beast.id),
  entry: null,
  isOwn: false,
  name: draft.name.trim() ? draft.name : beast.name,
  steps: draft.steps.length ? draft.steps : [...beast.checklist],
});

/** The maker's Everyone tile: every profile on the device fights it; tapped again, back to the maker alone. */
export const toggleEveryone = (draft: WizardDraft, everyoneIds: readonly string[], heroId: string): WizardDraft => {
  const isEveryone = everyoneIds.every((id) => draft.heroIds.includes(id));
  return { ...draft, heroIds: isEveryone ? [heroId] : [...everyoneIds] };
};

/** Who fights the quest: a Game Master's or a maker's choice, else the hero who made it, alone. */
export function partyOf(draft: Pick<WizardDraft, "heroIds">, ctx: Pick<BuildContext, "isGm" | "isMaker" | "creatorId">): string[] {
  const choosesWho = ctx.isGm || Boolean(ctx.isMaker);
  return choosesWho && draft.heroIds.length ? [...new Set(draft.heroIds.map(String))] : [ctx.creatorId];
}

/** The quest fields that point it at a beast of the family's own, chosen outright: nothing to adopt or copy */
export const familyBeastFields = (beastId: string): Pick<Achievement, "beastId" | "adventureType" | "noBeast"> => ({
  beastId,
  adventureType: "beast",
  noBeast: false,
});

/** The family beast a draft chose outright, or undefined (a library chore, or a beast the family no longer has) */
const familyBeastOf = (draft: Pick<WizardDraft, "beastId">, ctx: Pick<BuildContext, "familyBeasts">): FamilyBeastRef | undefined =>
  draft.beastId ? ctx.familyBeasts.find((beast) => String(beast.id) === draft.beastId) : undefined;

/** A family beast no Game Master has approved yet: waiting for a look, or sent back to be fixed */
const isUnapproved = (beast: FamilyBeastRef | undefined): beast is FamilyBeastRef & { proposal: Proposal } =>
  beast !== undefined && (isWaiting(beast) || isReturned(beast));

/**
 * Does this quest wait for a Game Master before any hero sees it? Only a maker's does, and only when it is for anyone
 * but themself or fights a beast that is itself still waiting (or sent back).
 */
export function willPropose(
  draft: Pick<WizardDraft, "heroIds" | "beastId">,
  ctx: Pick<BuildContext, "isGm" | "isMaker" | "creatorId" | "familyBeasts">
): boolean {
  const isKidMaker = !ctx.isGm && Boolean(ctx.isMaker);
  if (!isKidMaker) return false;
  const isForSomeoneElse = partyOf(draft, ctx).some((id) => id !== String(ctx.creatorId));
  return isForSomeoneElse || isUnapproved(familyBeastOf(draft, ctx));
}

/**
 * The finished quest as it should be saved: untouched when it stays live, else a draft with a proposal on it (the date
 * is the build date), plus the waiting family beast to point at it (`linkBeast`) when it fights one. A beast keeps the
 * first quest it was linked to: a second quest made with it proposes on its own, pointing at the beast by id, and the
 * review (creationReview) still approves the beast with whichever quest the Game Master takes first.
 */
export function proposeForMaker(quest: Achievement, draft: WizardDraft, ctx: BuildContext): { quest: Achievement; linkBeast?: LinkBeast } {
  const isProposal = willPropose(draft, ctx);
  if (!isProposal) return { quest };
  const proposed = propose({ ...quest, draft: true }, ctx.creatorId, ctx.today ?? new Date());
  const waitingBeast = familyBeastOf(draft, ctx);
  if (!isUnapproved(waitingBeast)) return { quest: proposed };
  const linked = waitingBeast.proposal.questId;
  const namesAnotherQuest = Boolean(linked) && linked !== String(quest.id);
  if (namesAnotherQuest) return { quest: proposed };
  return { quest: proposed, linkBeast: { id: String(waitingBeast.id), proposal: { ...waitingBeast.proposal, questId: quest.id } } };
}

/**
 * A library beast whose steps a maker edited is the family's own copy of it, and the maker's work: when the quest waits
 * for a Game Master the copy waits too, pointed at the quest and credited to the maker, so the pair is approved
 * together and the edited steps never go live first. With a quest that stays live (D5) the copy is as it always was.
 */
export function proposeCopyBeast(copy: Beast, quest: Achievement, ctx: Pick<BuildContext, "creatorId" | "today">): Beast {
  const staysLive = !quest.proposal;
  if (staysLive) return copy;
  return propose({ ...copy, madeBy: ctx.creatorId }, ctx.creatorId, ctx.today ?? new Date(), String(quest.id));
}
