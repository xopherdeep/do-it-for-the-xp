import { createPinia, setActivePinia } from "pinia";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { dayKeyOf } from "@/lib/engine/quests/QuestSchedule";
import { AbilityType } from "@/hooks/abilities/abilityConstants";
import type { Ability } from "@/types/abilities";
import { useUserStore } from "@/lib/store/stores/user";
import { castWithBoardEffect, type BoardCastDeps } from "../boardCast";

/**
 * What casting a Power does on the Powers page when the Power bends the quest board: it asks which quest first
 * (Snooze, Extra Time), charges nothing when the hero backs out or the effect would not land, casts, and then
 * lands the effect. The user store is real; only what it writes to disk, the quest engine and the family
 * settings are faked.
 */

jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));

// The quest engine reads IndexedDB; here the board is whatever the spec says it is.
const mockBoard = jest.fn();
jest.mock("@/lib/engine/quests/QuestEngine", () => ({
  getQuestEngine: () => ({ getQuestBoardForUser: (...args: unknown[]) => mockBoard(...args) }),
}));

// The family settings the Game Master saved: only `trustedHour` matters here.
const mockSettings = jest.fn();
jest.mock("@/lib/databases/FamilySettingsDb", () => ({
  getFamilySettingsDb: () => ({ getSettings: () => mockSettings() }),
}));

const HERO = "hero-1";
// Calendar facts: 2026-10-08 is a Thursday.
const now = new Date("2026-10-08T12:00:00");

const quest = (id: string, achievementName: string): Achievement =>
  ({
    id,
    achievementName,
    type: "assigned",
    assignee: [HERO],
    basicSchedule: "daily",
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    repeatOnDays: [],
    showDailyUntilComplete: false,
    startsOn: "2026-10-01T09:00:00",
    endsOn: "",
    dueByTime: "17:00",
  }) as unknown as Achievement;

const boardItem = (q: Achievement): QuestBoardItem => ({
  quest: q,
  status: "open",
  progress: { done: 0, allowance: 1, isOpen: true },
  pending: false,
  overdue: false,
});

const dishes = quest("q1", "Dishes");

const power = (overrides: Partial<Ability>): Ability =>
  ({
    id: "power-1",
    name: "Power",
    description: "",
    type: AbilityType.RealLife,
    frequency: "daily",
    mpCost: 5,
    apRequirement: { amount: 0, period: "daily" },
    prerequisites: [],
    icon: "fa-star",
    isPreset: false,
    position: { x: 0, y: 0 },
    ...overrides,
  }) as Ability;

const snooze = power({ id: "snooze-id", name: "Snooze" });
const quietDay = power({ id: "quiet-id", name: "Quiet Day" });
const nightOwl = power({ id: "owl-id", name: "Night Owl" });
const spell = power({ id: "spell-id", name: "Snooze", type: AbilityType.InGame });

/** Dependencies whose pick, quests and cast the spec chooses; the cast pays no MP here. */
const fakeDeps = (options: { picked?: string | null; quests?: QuestBoardItem[]; castOk?: boolean } = {}) => {
  const { picked = "q1", quests = [boardItem(dishes)], castOk = true } = options;
  const deps = {
    openQuests: jest.fn().mockResolvedValue(quests),
    selectQuest: jest.fn().mockResolvedValue(picked),
    cast: jest.fn().mockResolvedValue({ ok: castOk }),
    now,
  };
  return deps satisfies BoardCastDeps;
};

beforeEach(() => {
  setActivePinia(createPinia());
  mockBoard.mockReset();
  mockBoard.mockResolvedValue([boardItem(dishes)]);
  mockSettings.mockReset();
  mockSettings.mockResolvedValue({ trustedHour: true });
  useUserStore().users[HERO] = {
    id: HERO,
    name: { nick: "Hero" },
    stats: { level: 1, hp: { now: 50, max: 50 }, mp: { now: 40, max: 500 }, gp: { wallet: 0 } },
  };
});

describe("castWithBoardEffect", () => {
  it("casts a plain Power without picking", async () => {
    const deps = fakeDeps();
    expect(await castWithBoardEffect(nightOwl, HERO, deps)).toEqual({ status: "cast" });
    expect(deps.selectQuest).not.toHaveBeenCalled();
    expect(deps.openQuests).not.toHaveBeenCalled();
    expect(deps.cast).toHaveBeenCalledWith(nightOwl.id, HERO);
  });

  it("casts an in-game Power named like a board Power without picking", async () => {
    const deps = fakeDeps();
    expect((await castWithBoardEffect(spell, HERO, deps)).status).toBe("cast");
    expect(deps.selectQuest).not.toHaveBeenCalled();
  });

  it("asks which quest, under the Power's name and what it does", async () => {
    const deps = fakeDeps();
    await castWithBoardEffect(snooze, HERO, deps);
    expect(deps.selectQuest).toHaveBeenCalledWith([boardItem(dishes)], "Snooze: Move one quest to tomorrow");
  });

  it("charges nothing when the pick is cancelled", async () => {
    const deps = fakeDeps({ picked: null });
    expect((await castWithBoardEffect(snooze, HERO, deps)).status).toBe("cancelled");
    expect(deps.cast).not.toHaveBeenCalled();
  });

  it("charges nothing and asks nothing when no quest is open", async () => {
    const deps = fakeDeps({ quests: [] });
    expect(await castWithBoardEffect(snooze, HERO, deps)).toEqual({ status: "refused", line: "No open quests on the board.", sound: "no" });
    expect(deps.selectQuest).not.toHaveBeenCalled();
    expect(deps.cast).not.toHaveBeenCalled();
  });

  it("charges nothing when the effect refuses", async () => {
    // the quest is already snoozed today
    useUserStore().users[HERO].questEffects = { snoozedOn: { q1: dayKeyOf(now) } };
    const deps = fakeDeps();
    const out = await castWithBoardEffect(snooze, HERO, deps);
    expect(out).toEqual({ status: "refused", line: "Dishes is already snoozed.", sound: "no" });
    expect(deps.cast).not.toHaveBeenCalled();
  });

  it("charges nothing when the Game Master has not allowed a trusted hour", async () => {
    mockSettings.mockResolvedValue({ trustedHour: false });
    const deps = fakeDeps();
    const trustedHour = power({ id: "trusted-id", name: "Trusted Hour" });
    expect(await castWithBoardEffect(trustedHour, HERO, deps)).toEqual({
      status: "refused",
      line: "The Game Master has not allowed a trusted hour.",
      sound: "no",
    });
    expect(deps.cast).not.toHaveBeenCalled();
  });

  it("casts, then applies the effect", async () => {
    const deps = fakeDeps();
    expect(await castWithBoardEffect(snooze, HERO, deps)).toEqual({
      status: "cast",
      line: "Dishes: snoozed to tomorrow.",
      sound: "useMP",
    });
    expect(deps.cast).toHaveBeenCalledWith(snooze.id, HERO);
    expect(useUserStore().users[HERO].questEffects.snoozedOn).toEqual({ q1: dayKeyOf(now) });
  });

  it("casts a Power that picks no quest and applies it straight away", async () => {
    const deps = fakeDeps();
    const out = await castWithBoardEffect(quietDay, HERO, deps);
    expect(out.status).toBe("cast");
    expect(out.line).toMatch(/^Unseen by beasts until /);
    expect(out.sound).toBe("useMP");
    expect(deps.selectQuest).not.toHaveBeenCalled();
    expect(useUserStore().users[HERO].questEffects.noEncountersUntil).toBeTruthy();
  });

  it("checks and lands the effect at the one moment it read, however long the cast takes", async () => {
    // The page passes no clock: the check and the landing must still see the same instant
    jest.useFakeTimers();
    try {
      jest.setSystemTime(now);
      const deps: BoardCastDeps = {
        ...fakeDeps(),
        now: undefined,
        cast: jest.fn(async () => {
          jest.setSystemTime(new Date("2026-10-09T00:30:00")); // the cast ran past midnight
          return { ok: true };
        }),
      };
      expect((await castWithBoardEffect(snooze, HERO, deps)).status).toBe("cast");
      expect(mockBoard.mock.calls.map((call) => call[1])).toEqual([now, now]);
      expect(useUserStore().users[HERO].questEffects.snoozedOn).toEqual({ q1: dayKeyOf(now) });
    } finally {
      jest.useRealTimers();
    }
  });

  it("lets a failure after the cast reach the page, which says the Power may have been cast", async () => {
    const deps = fakeDeps();
    mockBoard.mockResolvedValueOnce([boardItem(dishes)]).mockRejectedValueOnce(new Error("board gone"));
    await expect(castWithBoardEffect(snooze, HERO, deps)).rejects.toThrow("board gone");
    expect(deps.cast).toHaveBeenCalledTimes(1);
  });

  it("says nothing more when the cast itself fails, and lands no effect", async () => {
    // the composable has already toasted why (not enough MP, on cooldown)
    const deps = fakeDeps({ castOk: false });
    expect(await castWithBoardEffect(snooze, HERO, deps)).toEqual({ status: "failed" });
    expect(useUserStore().users[HERO].questEffects).toBeUndefined();
  });
});
