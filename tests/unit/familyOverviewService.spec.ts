import {
  buildFamilyOverview,
  mapBoardItemToChore,
} from "@/lib/services/family/familyOverviewService";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import type { Achievement } from "@/lib/databases/AchievementDb";

const makeQuest = (id: string, name: string): Achievement => ({
  id,
  achievementName: name,
  categoryId: "cat-1",
  bonusAchievement: false,
  requiresApproval: false,
  type: "daily",
  assignee: ["hero-1"],
  basicSchedule: "daily",
  scheduleType: "anytime",
  xp: 50,
  gp: 10,
  ap: 5,
} as Achievement);

const makeBoardItem = (quest: Achievement, status: "open" | "done" | "notDue", pending = false, overdue = false): QuestBoardItem => ({
  quest,
  status,
  progress: null,
  pending,
  overdue,
  doneBy: [],
  slots: [],
});

describe("familyOverviewService", () => {
  const today = new Date("2026-10-29T12:00:00Z");

  it("handles empty family state safely", () => {
    const summary = buildFamilyOverview({
      users: {},
      questLogs: [],
      userBoards: {},
      pendingApprovals: [],
      today,
    });

    expect(summary.totalMembers).toBe(0);
    expect(summary.totalHeroes).toBe(0);
    expect(summary.totalAdults).toBe(0);
    expect(summary.totalChoresToday).toBe(0);
    expect(summary.completedChoresToday).toBe(0);
    expect(summary.choresProgressPercent).toBe(100);
    expect(summary.pendingApprovalsCount).toBe(0);
    expect(summary.totalFamilyGp).toBe(0);
    expect(summary.longestStreak).toBe(0);
    expect(summary.members).toEqual([]);
    expect(summary.allTodayChores).toEqual([]);
  });

  it("aggregates members, vitals, streaks, and vault gold correctly", () => {
    const users = {
      "hero-1": {
        id: "hero-1",
        name: { nick: "Lucas", full: "Lucas Smith" },
        isAdult: false,
        jobClass: "Warrior",
        stats: {
          level: 5,
          hp: { now: 45, max: 50 },
          mp: { now: 15, max: 20 },
          xp: { current: 150, next_level: 200 },
          gp: { wallet: 250, bank: 500 },
        },
      },
      "gm-1": {
        id: "gm-1",
        name: { nick: "Dad", full: "John Smith" },
        isAdult: true,
        stats: {
          level: 10,
          hp: { now: 100, max: 100 },
          mp: { now: 50, max: 50 },
          xp: { current: 0, next_level: 100 },
          gp: { wallet: 1000, bank: 2000 },
        },
      },
    };

    const quest1 = makeQuest("q1", "Brush Teeth");
    const quest2 = makeQuest("q2", "Do Homework");
    const userBoards: Record<string, QuestBoardItem[]> = {
      "hero-1": [
        makeBoardItem(quest1, "done"),
        makeBoardItem(quest2, "open"),
      ],
      "gm-1": [],
    };

    const questLogs: QuestLogEntry[] = [
      {
        id: "log-1",
        questId: "q1",
        questName: "Brush Teeth",
        userId: "hero-1",
        completedAt: "2026-10-29T08:00:00Z",
        dayKey: "2026-10-29",
        status: "approved",
        source: "claim",
        rewards: { xp: 50, gp: 10, ap: 5 },
        rewardsApplied: true,
      },
      {
        id: "log-2",
        questId: "q1",
        questName: "Brush Teeth",
        userId: "hero-1",
        completedAt: "2026-10-28T08:00:00Z",
        dayKey: "2026-10-28",
        status: "approved",
        source: "claim",
        rewards: { xp: 50, gp: 10, ap: 5 },
        rewardsApplied: true,
      },
      {
        id: "log-3",
        questId: "q1",
        questName: "Brush Teeth",
        userId: "hero-1",
        completedAt: "2026-10-27T08:00:00Z",
        dayKey: "2026-10-27",
        status: "approved",
        source: "claim",
        rewards: { xp: 50, gp: 10, ap: 5 },
        rewardsApplied: true,
      },
    ];

    const pendingApprovals: QuestLogEntry[] = [
      {
        id: "pending-1",
        questId: "q3",
        questName: "Clean Room",
        userId: "hero-1",
        completedAt: "2026-10-29T11:00:00Z",
        dayKey: "2026-10-29",
        status: "pending",
        source: "claim",
        rewards: { xp: 100, gp: 20, ap: 10 },
        rewardsApplied: false,
      },
    ];

    const summary = buildFamilyOverview({
      users,
      questLogs,
      userBoards,
      pendingApprovals,
      today,
    });

    expect(summary.totalMembers).toBe(2);
    expect(summary.totalHeroes).toBe(1);
    expect(summary.totalAdults).toBe(1);
    expect(summary.totalFamilyGp).toBe(3750); // 750 + 3000
    expect(summary.totalChoresToday).toBe(2);
    expect(summary.completedChoresToday).toBe(1);
    expect(summary.choresProgressPercent).toBe(50);
    expect(summary.pendingApprovalsCount).toBe(1);
    expect(summary.longestStreak).toBe(3); // 3 consecutive days for hero-1

    const hero = summary.members.find((m) => m.id === "hero-1")!;
    expect(hero.nick).toBe("Lucas");
    expect(hero.isAdult).toBe(false);
    expect(hero.jobClass).toBe("Warrior");
    expect(hero.level).toBe(5);
    expect(hero.hp).toEqual({ now: 45, max: 50 });
    expect(hero.mp).toEqual({ now: 15, max: 20 });
    expect(hero.xp.percent).toBe(75);
    expect(hero.gp).toEqual({ wallet: 250, bank: 500, total: 750 });
    expect(hero.streak.current).toBe(3);
    expect(hero.streak.tier).toBe("flame");
    expect(hero.chores.totalAssigned).toBe(2);
    expect(hero.chores.doneCount).toBe(1);
    expect(hero.chores.openCount).toBe(1);
    expect(hero.todayQuests.length).toBe(2);
  });

  it("maps a board item into a FamilyChoreItem with correct status", () => {
    const quest = makeQuest("q1", "Feed Dog");
    const item = makeBoardItem(quest, "done");
    const chore = mapBoardItemToChore(item, "hero-1", "Lucas", today);

    expect(chore.id).toBe("q1");
    expect(chore.title).toBe("Feed Dog");
    expect(chore.assigneeId).toBe("hero-1");
    expect(chore.assigneeName).toBe("Lucas");
    expect(chore.status).toBe("done");
    expect(chore.statusLabel).toBe("Tamed");
    expect(chore.rewards).toEqual({ xp: 50, gp: 10, ap: 5 });
  });
});
