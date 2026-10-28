import {
  extractWidgetHeroPayload,
  extractWidgetQuestPayload,
  buildWidgetSyncPayload
} from "@/lib/services/widgets/widgetDataExtractor";
import type { QuestListRow } from "@/lib/services/quests/QuestList";

describe("widgetDataExtractor", () => {
  describe("extractWidgetHeroPayload", () => {
    it("extracts stats correctly from a populated hero object", () => {
      const hero = {
        nickname: "Ness",
        stats: {
          level: 12,
          hp: 120,
          maxHp: 150,
          mp: 45,
          maxMp: 60,
          xp: 4200,
          nextLevelXp: 5000,
          gp: 350
        },
        jobClass: "Warrior",
        avatar: 42
      };

      const result = extractWidgetHeroPayload(hero, 5);

      expect(result).toEqual({
        name: "Ness",
        level: 12,
        hp: 120,
        maxHp: 150,
        mp: 45,
        maxMp: 60,
        xp: 4200,
        nextLevelXp: 5000,
        gp: 350,
        streak: 5,
        className: "Warrior",
        avatarNumber: 42
      });
    });

    it("applies safe defaults when stats are missing or null", () => {
      const emptyHero = {};
      const result = extractWidgetHeroPayload(emptyHero, 0);

      expect(result.name).toBe("Hero");
      expect(result.level).toBe(1);
      expect(result.hp).toBe(20);
      expect(result.maxHp).toBe(20);
      expect(result.mp).toBe(10);
      expect(result.maxMp).toBe(10);
      expect(result.streak).toBe(0);
      expect(result.className).toBe("Novice");
    });
  });

  describe("extractWidgetQuestPayload", () => {
    it("filters out completed quests and limits row count", () => {
      const rows: Partial<QuestListRow>[] = [
        { id: "q1", title: "Clean room", dueLabel: "Today 6pm", status: "open", rewards: { xp: 50, gp: 20, ap: 0 }, requiresPhoto: false },
        { id: "q2", title: "Dishes", dueLabel: "Overdue", status: "overdue", rewards: { xp: 40, gp: 15, ap: 0 }, requiresPhoto: true },
        { id: "q3", title: "Walk dog", dueLabel: "Done", status: "done", rewards: { xp: 30, gp: 10, ap: 0 }, requiresPhoto: false }
      ];

      const result = extractWidgetQuestPayload(rows as QuestListRow[]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("q1");
      expect(result[0].status).toBe("open");
      expect(result[1].id).toBe("q2");
      expect(result[1].status).toBe("overdue");
      expect(result[1].requiresPhoto).toBe(true);
    });

    it("handles non-array inputs gracefully", () => {
      expect(extractWidgetQuestPayload(null as any)).toEqual([]);
      expect(extractWidgetQuestPayload(undefined as any)).toEqual([]);
    });
  });

  describe("buildWidgetSyncPayload", () => {
    it("calculates streak bonus multipliers accurately", () => {
      const hero = { nickname: "Paula", stats: { level: 5 } };
      const quests: Partial<QuestListRow>[] = [];

      const lowStreak = buildWidgetSyncPayload(hero, quests as QuestListRow[], 2, 100);
      expect(lowStreak.streak.multiplier).toBe(1.0);
      expect(lowStreak.bank.savings).toBe(100);

      const midStreak = buildWidgetSyncPayload(hero, quests as QuestListRow[], 4, 250);
      expect(midStreak.streak.multiplier).toBe(1.2);

      const highStreak = buildWidgetSyncPayload(hero, quests as QuestListRow[], 10, 500);
      expect(highStreak.streak.multiplier).toBe(1.5);
    });
  });
});
