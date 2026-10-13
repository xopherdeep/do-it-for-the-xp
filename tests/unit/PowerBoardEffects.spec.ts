import { createPinia, setActivePinia } from "pinia";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  effectiveDeadline,
  getEffectiveWindow,
  getQuestProgressFor,
  isQuestOverdue,
  isTrustedHour,
  type HeroQuestEffects,
} from "@/lib/engine/quests/QuestSchedule";
import { AbilityType } from "@/hooks/abilities/abilityConstants";
import {
  HYBRID_PRESETS,
  REAL_LIFE_PRESETS,
  TECH_MAGE_PRESETS,
  TIME_MAGE_PRESETS,
} from "@/lib/services/abilities/AbilityPresets";
import {
  EXTRA_TIME_MS,
  POWER_BOARD_EFFECTS,
  POWER_BOARD_EFFECT_OPTIONS,
  PRESET_BOARD_EFFECTS,
  QUIET_DAY_MS,
  TRUSTED_HOUR_MS,
  applyPowerBoardEffect,
  boardEffectOfPower,
  powerBoardEffectBlocked,
} from "@/lib/services/abilities/PowerBoardEffects";
import { hasNoEncounters } from "@/lib/services/quests/ItemEffects";
import { useUserStore } from "@/lib/store/stores/user";

// The user store is real; only what it writes to disk is faked.
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
const at = (iso: string) => new Date(iso);

const quest = (id: string, overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id,
    achievementName: `Quest ${id}`,
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
    ...overrides,
  }) as unknown as Achievement;

const boardItem = (q: Achievement, status: QuestBoardItem["status"] = "open"): QuestBoardItem => ({
  quest: q,
  status,
  progress: status === "notDue" ? null : { done: status === "done" ? 1 : 0, allowance: 1, isOpen: status === "open" },
  pending: false,
  overdue: false,
});

const dishes = quest("q1", { achievementName: "Dishes" });

const addHero = (extra: Record<string, unknown> = {}) => {
  useUserStore().users[HERO] = {
    id: HERO,
    name: { nick: "Hero" },
    stats: { level: 1, hp: { now: 50, max: 50 }, mp: { now: 40, max: 500 }, gp: { wallet: 0 } },
    ...extra,
  };
};
const user = () => useUserStore().users[HERO];

beforeEach(() => {
  setActivePinia(createPinia());
  mockBoard.mockReset();
  mockBoard.mockResolvedValue([boardItem(dishes)]);
  mockSettings.mockReset();
  mockSettings.mockResolvedValue({ trustedHour: false });
  addHero();
});

describe("the four board effects", () => {
  it("labels each effect, and only snooze and extra time pick a quest", () => {
    expect(POWER_BOARD_EFFECTS).toEqual({
      snooze: { label: "Move one quest to tomorrow", picksQuest: true },
      "extra-time": { label: "24 more hours on one quest's deadline", picksQuest: true },
      "quiet-day": { label: "No ambushes for 24 hours", picksQuest: false },
      "trusted-hour": { label: "For one hour, claims skip approval", picksQuest: false },
    });
    expect(POWER_BOARD_EFFECT_OPTIONS).toEqual([
      { value: "none", label: "None" },
      { value: "snooze", label: "Move one quest to tomorrow" },
      { value: "extra-time", label: "24 more hours on one quest's deadline" },
      { value: "quiet-day", label: "No ambushes for 24 hours" },
      { value: "trusted-hour", label: "For one hour, claims skip approval" },
    ]);
    expect([EXTRA_TIME_MS, QUIET_DAY_MS, TRUSTED_HOUR_MS]).toEqual([86_400_000, 86_400_000, 3_600_000]);
  });
});

describe("Snooze", () => {
  it("snoozes one open quest, once a day", async () => {
    expect(await applyPowerBoardEffect("snooze", { userId: HERO, questId: "q1", now })).toEqual({ ok: true, line: "Dishes: snoozed to tomorrow.", sound: "useMP" });
    expect(await powerBoardEffectBlocked("snooze", { userId: HERO, questId: "q1", now })).toBe("Dishes is already snoozed.");
  });

  it("takes the quest off today's board and brings it back tomorrow", async () => {
    await applyPowerBoardEffect("snooze", { userId: HERO, questId: "q1", now });
    const effects: HeroQuestEffects = user().questEffects;
    expect(effects.snoozedOn).toEqual({ q1: "2026-10-08" });
    expect(getEffectiveWindow(dishes, effects, now)).toBeNull();
    expect(getQuestProgressFor(dishes, [], HERO, now, effects)).toBeNull();
    expect(getQuestProgressFor(dishes, [], HERO, at("2026-10-09T09:00:00"), effects)).toEqual({ done: 0, allowance: 1, isOpen: true });
    // The board is asked with the hero's own effects
    expect(mockBoard).toHaveBeenCalledWith(HERO, now, undefined, {});
  });

  it("may snooze the same quest again on a later day", async () => {
    addHero({ questEffects: { snoozedOn: { q1: "2026-10-07" } } });
    expect(await powerBoardEffectBlocked("snooze", { userId: HERO, questId: "q1", now })).toBeNull();
  });
});

describe("Extra Time", () => {
  it("pushes one open quest's deadline back 24 hours", async () => {
    const result = await applyPowerBoardEffect("extra-time", { userId: HERO, questId: "q1", now });
    expect(result).toEqual({ ok: true, line: "Dishes: now due Fri 5:00PM.", sound: "useMP" });
    const effects: HeroQuestEffects = user().questEffects;
    expect(new Date(effects.extendedUntil!.q1)).toEqual(at("2026-10-09T17:00:00"));

    // The board reads it back: not late this evening, late tomorrow evening
    expect(effectiveDeadline(dishes, effects, at("2026-10-08T18:00:00"))).toEqual(at("2026-10-09T17:00:00"));
    expect(isQuestOverdue(dishes, undefined, at("2026-10-08T18:00:00"))).toBe(true);
    expect(isQuestOverdue(dishes, effects, at("2026-10-08T18:00:00"))).toBe(false);
    expect(isQuestOverdue(dishes, effects, at("2026-10-09T18:00:00"))).toBe(true);
  });

  it("refuses a quest with no due time: there is no deadline to push back, and nothing is written", async () => {
    // The quest wizard and the Moving House pack make quests like this one
    mockBoard.mockResolvedValue([boardItem(quest("q1", { achievementName: "Dishes", dueByTime: "" }))]);
    expect(await powerBoardEffectBlocked("extra-time", { userId: HERO, questId: "q1", now })).toBe("Dishes has no deadline to push back.");
    expect(await applyPowerBoardEffect("extra-time", { userId: HERO, questId: "q1", now })).toEqual({
      ok: false,
      line: "Dishes has no deadline to push back.",
      sound: "no",
    });
    expect(user().questEffects).toBeUndefined();
  });

  it("never lands in the past: a quest overdue by days gets 24 hours from now, and is on time again", async () => {
    // Due Monday 17:00, cast Thursday noon
    const move = quest("q1", { achievementName: "Pack the books", basicSchedule: "once", startsOn: "2026-10-05T00:00:00" });
    mockBoard.mockResolvedValue([boardItem(move)]);
    expect(isQuestOverdue(move, undefined, now)).toBe(true);

    const result = await applyPowerBoardEffect("extra-time", { userId: HERO, questId: "q1", now });
    expect(result).toEqual({ ok: true, line: "Pack the books: now due Fri 12:00PM.", sound: "useMP" });
    const effects: HeroQuestEffects = user().questEffects;
    expect(new Date(effects.extendedUntil!.q1)).toEqual(at("2026-10-09T12:00:00"));
    expect(isQuestOverdue(move, effects, at("2026-10-08T12:01:00"))).toBe(false);
    expect(isQuestOverdue(move, effects, at("2026-10-09T12:01:00"))).toBe(true);
  });

  it("never stacks extra time, but allows it again once it passed", async () => {
    await applyPowerBoardEffect("extra-time", { userId: HERO, questId: "q1", now });
    expect(await powerBoardEffectBlocked("extra-time", { userId: HERO, questId: "q1", now })).toBe("Dishes already has extra time.");
    const later = new Date(now.getTime() + 3 * 24 * 3600_000);
    expect(await powerBoardEffectBlocked("extra-time", { userId: HERO, questId: "q1", now: later })).toBeNull();
  });

  it("refuses while an earlier extension has not passed, changing nothing; once it passed a new one is written", async () => {
    addHero({ questEffects: { extendedUntil: { q1: "2026-10-09T17:00:00" } } });
    const before = JSON.stringify(user().questEffects);
    const refused = await applyPowerBoardEffect("extra-time", { userId: HERO, questId: "q1", now: at("2026-10-09T16:59:00") });
    expect(refused).toEqual({ ok: false, line: "Dishes already has extra time.", sound: "no" });
    expect(JSON.stringify(user().questEffects)).toBe(before);

    // Saturday noon: Friday's extension has passed, so today's 5pm plus 24 hours
    const again = await applyPowerBoardEffect("extra-time", { userId: HERO, questId: "q1", now: at("2026-10-10T12:00:00") });
    expect(again).toEqual({ ok: true, line: "Dishes: now due Sun 5:00PM.", sound: "useMP" });
    expect(new Date(user().questEffects.extendedUntil.q1)).toEqual(at("2026-10-11T17:00:00"));
  });
});

describe("the quest pick", () => {
  it("needs a quest, one that is on the board, and one that is open today", async () => {
    mockBoard.mockResolvedValue([boardItem(dishes), boardItem(quest("q2", { achievementName: "Homework" }), "done")]);
    for (const effect of ["snooze", "extra-time"] as const) {
      expect(await powerBoardEffectBlocked(effect, { userId: HERO, now })).toBe("Pick a quest first.");
      expect(await powerBoardEffectBlocked(effect, { userId: HERO, questId: "zzz", now })).toBe("That quest is not on your board.");
      expect(await powerBoardEffectBlocked(effect, { userId: HERO, questId: "q2", now })).toBe("Homework is not open today.");
    }
  });

  it("answers a refusal with the no sound and changes nothing", async () => {
    mockBoard.mockResolvedValue([boardItem(quest("q2", { achievementName: "Homework" }), "notDue")]);
    expect(await applyPowerBoardEffect("snooze", { userId: HERO, questId: "q2", now })).toEqual({
      ok: false,
      line: "Homework is not open today.",
      sound: "no",
    });
    expect(await applyPowerBoardEffect("extra-time", { userId: HERO, now })).toMatchObject({ ok: false, line: "Pick a quest first." });
    expect(user().questEffects).toBeUndefined();
  });
});

describe("Quiet Day", () => {
  it("keeps the beasts away for 24 hours, with no quest to pick", async () => {
    expect(await powerBoardEffectBlocked("quiet-day", { userId: HERO, now })).toBeNull();
    const result = await applyPowerBoardEffect("quiet-day", { userId: HERO, questId: "ignored", now });
    expect(result).toEqual({ ok: true, line: "Unseen by beasts until Fri 12:00PM.", sound: "useMP" });
    expect(mockBoard).not.toHaveBeenCalled();
    expect(hasNoEncounters(user(), at("2026-10-08T13:00:00"))).toBe(true);
    expect(hasNoEncounters(user(), at("2026-10-09T11:59:00"))).toBe(true);
    expect(hasNoEncounters(user(), at("2026-10-09T12:01:00"))).toBe(false);
  });

  it("never touches MP", async () => {
    const mpBefore = user().stats.mp.now;
    await applyPowerBoardEffect("quiet-day", { userId: HERO, now });
    expect(user().stats.mp.now).toBe(mpBefore);
  });

  it("keeps the hero's other effects", async () => {
    addHero({ questEffects: { snoozedOn: { q1: "2026-10-08" } } });
    await applyPowerBoardEffect("quiet-day", { userId: HERO, now });
    expect(user().questEffects.snoozedOn).toEqual({ q1: "2026-10-08" });
  });
});

describe("Trusted Hour", () => {
  it("refuses a trusted hour the family has not allowed and changes nothing", async () => {
    const before = JSON.stringify(user().questEffects ?? {});
    expect((await applyPowerBoardEffect("trusted-hour", { userId: HERO, now })).line).toBe("The Game Master has not allowed a trusted hour.");
    expect(JSON.stringify(user().questEffects ?? {})).toBe(before);
  });

  it("opens one hour of claims without approval when the family allows it", async () => {
    mockSettings.mockResolvedValue({ trustedHour: true });
    expect(await powerBoardEffectBlocked("trusted-hour", { userId: HERO, now })).toBeNull();
    const result = await applyPowerBoardEffect("trusted-hour", { userId: HERO, questId: "ignored", now });
    expect(result).toEqual({ ok: true, line: "For 1 hour your claims need no approval.", sound: "useMP" });
    expect(user().questEffects.trustedUntil).toBe(at("2026-10-08T13:00:00").toISOString());
    expect(isTrustedHour(user().questEffects, at("2026-10-08T12:59:00"))).toBe(true);
    expect(isTrustedHour(user().questEffects, at("2026-10-08T13:01:00"))).toBe(false);
    expect(user().stats.mp.now).toBe(40);
  });
});

describe("which Powers bend the board", () => {
  it("reads the effect only for real-life Powers, None winning over the preset", () => {
    expect(boardEffectOfPower({ name: "Snooze", type: AbilityType.RealLife })).toBe("snooze");
    expect(boardEffectOfPower({ name: "Snooze", type: AbilityType.RealLife, boardEffect: "none" })).toBeNull();
    expect(boardEffectOfPower({ name: "Snooze", type: AbilityType.InGame })).toBeNull();
  });

  it("lets the Game Master's pick beat the preset, and reads bad data as no effect", () => {
    expect(boardEffectOfPower({ name: "Snooze", type: AbilityType.RealLife, boardEffect: "quiet-day" })).toBe("quiet-day");
    expect(boardEffectOfPower({ name: "Night Owl", type: AbilityType.RealLife, boardEffect: "trusted-hour" })).toBe("trusted-hour");
    expect(boardEffectOfPower({ name: "Night Owl", type: AbilityType.RealLife })).toBeNull();
    expect(boardEffectOfPower({ name: "Snooze", type: AbilityType.RealLife, boardEffect: "pull-in" as never })).toBeNull();
    expect(PRESET_BOARD_EFFECTS).toEqual({
      Snooze: "snooze",
      "Extra Time": "extra-time",
      "Quiet Day": "quiet-day",
      "Trusted Hour": "trusted-hour",
    });
  });

  it("ships the four presets", () => {
    const ABILITY_PRESETS = [...TIME_MAGE_PRESETS, ...TECH_MAGE_PRESETS, ...REAL_LIFE_PRESETS, ...HYBRID_PRESETS];
    expect(ABILITY_PRESETS.filter((p) => p.boardEffect).map((p) => p.name)).toEqual(["Snooze", "Extra Time", "Quiet Day", "Trusted Hour"]);
  });

  it("prices the presets weekly, real-life, on the sixth row", () => {
    const rows = REAL_LIFE_PRESETS.filter((p) => p.boardEffect).map((p) => ({
      id: p.id,
      description: p.description,
      mp: p.mpCost,
      ap: p.apRequirement,
      icon: `${p.iconPrefix} ${p.icon}`,
      position: p.position,
      boardEffect: p.boardEffect,
      frequency: p.frequency,
      type: p.type,
    }));
    const weekly = (amount: number) => ({ amount, period: "weekly" });
    expect(rows).toEqual([
      { id: "irl-snooze", description: "Move one quest to tomorrow.", mp: 10, ap: weekly(150), icon: "fad alarm-snooze", position: { x: 100, y: 600 }, boardEffect: "snooze", frequency: "weekly", type: "real-life" },
      { id: "irl-extra-time", description: "24 more hours on one quest's deadline.", mp: 10, ap: weekly(150), icon: "fad hourglass-half", position: { x: 200, y: 600 }, boardEffect: "extra-time", frequency: "weekly", type: "real-life" },
      { id: "irl-quiet-day", description: "No ambushes for 24 hours.", mp: 15, ap: weekly(200), icon: "fad eye-slash", position: { x: 300, y: 600 }, boardEffect: "quiet-day", frequency: "weekly", type: "real-life" },
      { id: "irl-trusted-hour", description: "For one hour, your claims skip the approval queue.", mp: 20, ap: weekly(300), icon: "fad user-shield", position: { x: 400, y: 600 }, boardEffect: "trusted-hour", frequency: "weekly", type: "real-life" },
    ]);
  });
});
