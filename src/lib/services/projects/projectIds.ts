/**
 * How a project quest is told from a plain chore by its id alone. A leaf on purpose (it imports nothing): the quest
 * completion service reads it on every approval, and must not pull the tower builder in with it.
 */

/** Every project quest's id starts with this (projectQuests.projectQuestId) */
export const PROJECT_QUEST_PREFIX = "pq-";

/** Whether the quest id is a project chore's, without reading the quest */
export const isProjectQuestId = (questId: unknown): boolean => String(questId).startsWith(PROJECT_QUEST_PREFIX);
