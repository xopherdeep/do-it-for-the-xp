/**
 * How a chore carried from the board into a Moving Out draft says where it came from: its id is
 * `${phaseId}:custom-${questId}`, so the draft's list names the board chores that are in the tower. A leaf (it imports only
 * a type): the wizard's rules (projectWizard.ts) and the prefill (movingOutPrefill.ts) both read it, and neither may import
 * the other.
 */
import type { ProjectChore } from "./projectChores";

/** Every chore the Moving House pack makes has an id that starts with this (movingPack.buildMovingPack) */
export const MOVE_QUEST_PREFIX = "move-";

/** The middle of a carried chore's id; the Game Master's own chores are `${phaseId}:custom-1`, `-2`... */
const CARRIED_MARK = "custom-";

export const carriedChoreId = (phaseId: string, questId: string): string => `${phaseId}:${CARRIED_MARK}${questId}`;

/** The board chore a chore of the list was carried from; undefined for any other chore, the Game Master's own included */
export const questIdOfChore = (chore: Pick<ProjectChore, "id" | "phaseId" | "custom">): string | undefined => {
  const prefix = carriedChoreId(chore.phaseId, "");
  const questId = chore.id.startsWith(prefix) ? chore.id.slice(prefix.length) : "";
  const isCarried = chore.custom === true && questId.startsWith(MOVE_QUEST_PREFIX);
  return isCarried ? questId : undefined;
};

export const isCarriedChore = (chore: Pick<ProjectChore, "id" | "phaseId" | "custom">): boolean => questIdOfChore(chore) !== undefined;
