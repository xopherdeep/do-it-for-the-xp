/**
 * How a project quest is told from a plain chore by its id alone. A leaf on purpose (it imports nothing): the quest
 * completion service reads it on every approval, and must not pull the tower builder in with it.
 */

/** Every project quest's id starts with this (projectQuests.projectQuestId) */
export const PROJECT_QUEST_PREFIX = "pq-";

/** Whether the quest id is a project chore's, without reading the quest */
export const isProjectQuestId = (questId: unknown): boolean => String(questId).startsWith(PROJECT_QUEST_PREFIX);

/**
 * The project id for a run about to start: `projectId` itself unless a run (cleared, abandoned or running) holds it, then
 * the first of `${projectId}~2`, `~3`, ... that none holds. An abandoned run's paid log entries name its quest ids, so a
 * restart on the same day that took the same id would read its first floor as cleared at once.
 */
export const freshProjectId = (projectId: string, taken: Iterable<string>): string => {
  const held = new Set(taken);
  let candidate = projectId;
  for (let number = 2; held.has(candidate); number += 1) candidate = `${projectId}~${number}`;
  return candidate;
};
