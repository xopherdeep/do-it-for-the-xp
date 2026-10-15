import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { checkClaimWindow } from "@/lib/services/quests/QuestClaimGuard";

// 2026-10-10 is a Saturday; the hero claims at noon.
const NOON = new Date(2026, 9, 10, 12, 0, 0);

const makeQuest = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: "quest-1",
  achievementName: "Clean the kitchen",
  categoryId: "",
  bonusAchievement: false,
  requiresApproval: false,
  type: "individual",
  assignee: ["hero-1"],
  basicSchedule: "daily",
  scheduleType: "basic",
  customFrequency: 1,
  customPeriodType: "day",
  customPeriodNumber: 1,
  dueByTime: "",
  endsOn: "",
  startsOn: "2026-10-01T09:00:00",
  repeatOnDays: [],
  showDailyUntilComplete: false,
  difficulty: 1,
  xp: 100,
  gp: 10,
  ap: 1,
  adventureType: "simple",
  ...overrides,
});

const makeEntry = (overrides: Partial<QuestLogEntry> = {}): QuestLogEntry => ({
  id: "entry-1",
  questId: "quest-1",
  questName: "Clean the kitchen",
  userId: "hero-1",
  completedAt: new Date(2026, 9, 10, 8, 0, 0).toISOString(),
  dayKey: "2026-10-10",
  status: "approved",
  source: "claim",
  rewards: { xp: 100, gp: 10, ap: 1 },
  rewardsApplied: true,
  ...overrides,
});

describe("checkClaimWindow", () => {
  it("lets a due quest through when nothing in the log fills its window", () => {
    expect(checkClaimWindow(makeQuest(), [], "hero-1", NOON)).toEqual({
      canClaim: true,
      isUsedUp: false,
      awaitingApproval: false,
      notice: "",
    });
  });

  it("refuses a quest the hero already claimed today, so a stale row cannot pay twice", () => {
    const check = checkClaimWindow(makeQuest(), [makeEntry()], "hero-1", NOON);
    expect(check).toMatchObject({ canClaim: false, isUsedUp: true, awaitingApproval: false });
    expect(check.notice).toBe("You already tamed this quest.");
  });

  it("refuses a quest whose claim waits for the Game Master, and says so", () => {
    const check = checkClaimWindow(makeQuest(), [makeEntry({ status: "pending" })], "hero-1", NOON);
    expect(check).toMatchObject({ canClaim: false, isUsedUp: true, awaitingApproval: true });
    expect(check.notice).toBe("Your claim is waiting for the Game Master.");
  });

  it("refuses a quest that is not due at all, without calling it tamed", () => {
    const weeklyOnMonday = makeQuest({ basicSchedule: "weekly", repeatOnDays: ["mon"] });
    const check = checkClaimWindow(weeklyOnMonday, [], "hero-1", NOON);
    expect(check).toMatchObject({ canClaim: false, isUsedUp: false, awaitingApproval: false });
    expect(check.notice).toBe("This quest is not due right now.");
  });

  it("reads every hero's clear of a shared quest as the window used up", () => {
    const teamEffort = makeQuest({ type: "collaborate", assignee: ["hero-1", "hero-2"] });
    const miaCleared = makeEntry({ userId: "hero-2" });
    expect(checkClaimWindow(teamEffort, [miaCleared], "hero-1", NOON)).toMatchObject({ canClaim: false, isUsedUp: true });
    // the same clear does not close a solo quest for her sibling
    expect(checkClaimWindow(makeQuest(), [miaCleared], "hero-1", NOON).canClaim).toBe(true);
  });

  it("ignores the log of other quests and of other days", () => {
    const otherQuest = makeEntry({ questId: "quest-2" });
    const yesterday = makeEntry({ completedAt: new Date(2026, 9, 9, 8, 0, 0).toISOString(), dayKey: "2026-10-09" });
    expect(checkClaimWindow(makeQuest(), [otherQuest, yesterday], "hero-1", NOON).canClaim).toBe(true);
  });

  it("counts a rejected claim as no claim at all", () => {
    expect(checkClaimWindow(makeQuest(), [makeEntry({ status: "rejected" })], "hero-1", NOON).canClaim).toBe(true);
  });
});
