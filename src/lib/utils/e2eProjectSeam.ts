/**
 * Development-only seams for the project tower walk (tests/e2e/specs/project-tower.spec.js). main.ts puts them on
 * `window.__xp` beside restoreBackup and loginUser; a production build never loads this file. They read the running
 * project and a temple's record, and claim a floor's chores as a hero, the way the quest book's claim does (a chore that
 * waits for the Game Master is approved at once), so a spec can fast-forward a tower without fighting every room.
 * Everything is loaded when it is called, so the page pays nothing for them until a spec asks.
 */

/** A copy a spec can read: the stores hand out live records */
const plain = <T>(value: T): unknown => JSON.parse(JSON.stringify(value ?? null));

export const projectTowerSeam = () => ({
  /** The running project's record, or null */
  getProject: async (): Promise<unknown> => {
    const { getProjectDb } = await import("@/lib/databases/ProjectDb");
    return plain(await getProjectDb().getActive());
  },

  /** The newest cleared project's record, or null */
  getTrophy: async (): Promise<unknown> => {
    const { readTrophies } = await import("@/lib/services/projects/projectService");
    return plain((await readTrophies())[0]);
  },

  /** A temple's record from the temple store, or null */
  getTemple: async (templeId: string): Promise<unknown> => {
    const { TempleDb, templeStorage } = await import("@/lib/databases/TempleDb");
    await templeStorage.create();
    return plain(await new TempleDb(templeStorage).getTempleById(templeId));
  },

  /**
   * Claims every chore of the running project's floor that nobody was paid for, as the hero, and approves what waits for
   * the Game Master. Resolves with how many it claimed.
   */
  claimFloor: async (userId: string, floorKey: string): Promise<number> => {
    const [{ getProjectDb }, { getQuestLogDb }, { default: AchievementDb, achievementStorage }, { approveCompletion, completeQuest }] =
      await Promise.all([
        import("@/lib/databases/ProjectDb"),
        import("@/lib/databases/QuestLogDb"),
        import("@/lib/databases/AchievementDb"),
        import("@/lib/services/quests/QuestCompletionService"),
      ]);
    const project = await getProjectDb().getActive();
    const floor = project?.floors.find((each) => each.floorKey === floorKey);
    if (!floor) return 0;
    const paid = new Set((await getQuestLogDb().getEntries()).filter((entry) => entry.rewardsApplied).map((entry) => String(entry.questId)));
    const quests = new AchievementDb(achievementStorage);
    let claimed = 0;
    for (const questId of floor.questIds.filter((id) => !paid.has(id))) {
      const quest = await quests.getTaskById(questId);
      if (!quest) continue;
      const done = await completeQuest(quest, userId, "claim");
      if (done.awaitingApproval) await approveCompletion(done.entry.id);
      claimed += 1;
    }
    return claimed;
  },
});
