/**
 * Moving Out from a family that already uses the Moving House pack. The wizard opens on Moving Out with the rooms from
 * the family's last moving answers (the usual house when there are none) and the pack's chores that are still open: each
 * becomes a custom chore in the Whole House on its floor, with its name, size, beast and assignee, so what the family
 * has on the board moves into the tower. A floor with no open chore of the pack's keeps the type's own suggestions, so no
 * floor is left bare, and the roof keeps its Hand Over the Keys. The pack's camp, unpack and moving day chores have no
 * floor in the tower and are left on the board. The draft ends on the move day the parent typed (never before the earliest
 * day the floors allow). Pure: no storage, no Vue.
 *
 * A carried chore's id says where it came from (carriedChores.ts), so `carriedQuestIds` can name the board chores that are
 * still in the list when the tower is built: only those leave the board, and a chore the Game Master dropped from the
 * list stays where it was. `withCarried` puts the same chores on a Moving Out draft the Start a Project card began.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { DEFAULT_MOVING_ROOMS } from "@/lib/services/core/packs/movingPack";
import type { MovingAnswers } from "@/lib/services/core/packs/movingPack";
import { dateKey, nearestDifficulty } from "@/lib/services/core/packs/packCommon";
import type { PackHero } from "@/lib/services/core/packs/packCommon";
import { MOVING_OUT } from "@/lib/services/core/packs/projects/movingOut";
import { MOVE_QUEST_PREFIX, carriedChoreId, questIdOfChore } from "./carriedChores";
import { WHOLE_HOUSE_ID } from "./projectChores";
import type { ProjectChore, ProjectHouse } from "./projectChores";
import { isPaidEntry } from "./projectProgress";
import { ROOF_PHASE_ID, minimumEndOn } from "./projectSchedule";
import { isRealDay, newProjectDraft, withType } from "./projectWizard";
import type { ProjectDraft } from "./projectWizard";

/** A pack chore's category is `cat-move-<phase>` */
const CATEGORY_PREFIX = "cat-move-";

/** The floors bottom to top, the roof last */
const FLOOR_ORDER: readonly string[] = [...MOVING_OUT.phases.map((phase) => phase.id), ROOF_PHASE_ID];

const isMoveQuest = (quest: Pick<Achievement, "id">): boolean => String(quest.id).startsWith(MOVE_QUEST_PREFIX);

/** The Moving Out floor a pack chore belongs to; undefined for camp, unpack, moving day and anything not the pack's */
const floorOf = (quest: Achievement): string | undefined => {
  const category = String(quest.categoryId ?? "");
  const phaseId = category.startsWith(CATEGORY_PREFIX) ? category.slice(CATEGORY_PREFIX.length) : "";
  return MOVING_OUT.phases.some((phase) => phase.id === phaseId) ? phaseId : undefined;
};

/** Quests nobody can take back: one that was paid, or whose claim waits for the Game Master (a rejected claim is open again) */
const settledIds = (entries: readonly QuestLogEntry[]): Set<string> =>
  new Set(entries.filter((entry) => isPaidEntry(entry) || entry.status === "pending").map((entry) => String(entry.questId)));

/** The pack's chores that are still open: nobody was paid for them and none is waiting for approval */
export const openMoveQuests = (quests: readonly Achievement[], entries: readonly QuestLogEntry[]): Achievement[] => {
  const settled = settledIds(entries);
  return quests.filter((quest) => isMoveQuest(quest) && !settled.has(String(quest.id)));
};

/** Of these quest ids, the ones that are still open now (the log is read again when the tower is built) */
export const stillOpenIds = (questIds: readonly string[], entries: readonly QuestLogEntry[]): string[] => {
  const settled = settledIds(entries);
  return questIds.filter((id) => !settled.has(id));
};

const houseOf = (answers: MovingAnswers | null): ProjectHouse => {
  if (!answers) return { rooms: { ...DEFAULT_MOVING_ROOMS } };
  const hasBasement = answers.basement === true && Number(answers.rooms.storage) > 0;
  return { rooms: { ...answers.rooms }, ...(hasBasement ? { basement: true } : {}) };
};

/** The move day the parent typed, when the floors have days enough before it; else the earliest end they allow. Not a real day: the type's usual end. */
const endOnFor = (answers: MovingAnswers | null, today: string, usual: string): string => {
  const moveDay = answers?.moveDate ?? "";
  if (!isRealDay(moveDay)) return usual;
  const earliest = minimumEndOn(MOVING_OUT.phases.length, today);
  return moveDay > earliest ? moveDay : earliest;
};

const choreOfQuest = (quest: Achievement, phaseId: string): ProjectChore => ({
  id: carriedChoreId(phaseId, String(quest.id)),
  phaseId,
  roomId: WHOLE_HOUSE_ID,
  name: quest.achievementName,
  difficulty: nearestDifficulty(quest.difficulty),
  assignee: (quest.assignee ?? []).map(String),
  ...(quest.beastId ? { beastId: quest.beastId } : {}),
  ...(quest.estimatedMinutes !== undefined ? { minutes: quest.estimatedMinutes } : {}),
  custom: true,
});

/** The open chores that have a floor in the tower, as chores, in the order given */
const carriedChores = (quests: readonly Achievement[]): ProjectChore[] =>
  quests.flatMap((quest) => {
    const phaseId = isMoveQuest(quest) ? floorOf(quest) : undefined;
    return phaseId ? [choreOfQuest(quest, phaseId)] : [];
  });

/**
 * The Moving Out draft with the open chores in it: on each floor that has open chores, they are the floor's list (the
 * suggestions there go); every other floor keeps what it had. A draft of another project, and a board with nothing open
 * for the tower, come back as they are.
 */
export const withCarried = (draft: ProjectDraft, openQuests: readonly Achievement[]): ProjectDraft => {
  const isMovingOut = draft.typeId === MOVING_OUT.id;
  const carried = isMovingOut ? carriedChores(openQuests) : [];
  const hasNothingToCarry = carried.length === 0;
  if (hasNothingToCarry) return draft;
  const hasCarried = (phaseId: string): boolean => carried.some((chore) => chore.phaseId === phaseId);
  const kept = draft.chores.filter((chore) => !hasCarried(chore.phaseId));
  const byFloor = [...kept, ...carried].sort((a, b) => FLOOR_ORDER.indexOf(a.phaseId) - FLOOR_ORDER.indexOf(b.phaseId));
  return { ...draft, chores: byFloor };
};

/**
 * The wizard's draft for Moving Out: `answers` are the family's last moving answers (null when there are none),
 * `openQuests` the pack's chores still open (`openMoveQuests`), `heroes` who plays.
 */
export const prefillMovingOut = (answers: MovingAnswers | null, openQuests: readonly Achievement[], heroes: readonly PackHero[]): ProjectDraft => {
  const today = answers?.today ?? dateKey(new Date());
  const suggested = withType({ ...newProjectDraft(today), house: houseOf(answers) }, MOVING_OUT.id, { today, heroes, lastChores: null });
  return withCarried({ ...suggested, endOn: endOnFor(answers, today, suggested.endOn) }, openQuests);
};

/** The board chores still in the draft's list: the ones the tower is built from, and so the ones that leave the board */
export const carriedQuestIds = (draft: ProjectDraft): string[] =>
  draft.chores.flatMap((chore) => {
    const questId = questIdOfChore(chore);
    return questId ? [questId] : [];
  });
