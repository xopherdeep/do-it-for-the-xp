/**
 * Development-only seams for the party walk (tests/e2e/specs/party.spec.js). main.ts puts them on `window.__xp` beside the
 * project tower's; a production build never loads this file. They put a worn-down raid on the device and claim a chore as
 * a hero (a chore that waits for the Game Master is approved at once), so a spec can strike a raid with real paid chores
 * without waiting days for them. Everything is loaded when it is called, so the page pays nothing until a spec asks.
 */

export const partySeam = () => ({
  /** Saves these raids as the device's raids, the rest of the party record empty; a raid that is not shaped right is dropped. Call before the party screens load. */
  seedRaids: async (raids: unknown[]): Promise<number> => {
    const [{ getPartyDb }, { cleanPartyState }] = await Promise.all([
      import("@/lib/databases/PartyDb"),
      import("@/lib/services/party/partyState"),
    ]);
    const state = cleanPartyState({ raids });
    await getPartyDb().saveState(state);
    return state.raids.length;
  },

  /** Claims one chore as the hero, the way the quest book's claim does; resolves false for a chore that is not on the board */
  claimQuest: async (userId: string, questId: string): Promise<boolean> => {
    const [{ default: AchievementDb, achievementStorage }, { approveCompletion, completeQuest }] = await Promise.all([
      import("@/lib/databases/AchievementDb"),
      import("@/lib/services/quests/QuestCompletionService"),
    ]);
    const quest = await new AchievementDb(achievementStorage).getTaskById(questId);
    if (!quest) return false;
    const done = await completeQuest(quest, userId, "claim");
    if (done.awaitingApproval) await approveCompletion(done.entry.id);
    return true;
  },
});
