import {
  DEFAULT_LATE_CHORES,
  cappedPenalty,
  lateOverrideOf,
  latePenalty,
  lateReward,
  lateRuleFor,
  lateStatus,
  lockedNotice,
  normalizeLateChores,
  penaltyKeyOf,
  penaltyLine,
  type LateChoreSettings,
} from "@/lib/services/quests/lateRules";

const quest = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "q1",
    basicSchedule: "daily",
    scheduleType: "basic",
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    dueByTime: "18:00",
    endsOn: "",
    startsOn: "2026-10-01T09:00:00",
    repeatOnDays: [],
    showDailyUntilComplete: false,
    ...overrides,
  }) as any;

const family = (overrides: Partial<LateChoreSettings> = {}): LateChoreSettings => ({ ...DEFAULT_LATE_CHORES, ...overrides });
const AT_5PM = new Date(2026, 9, 10, 17, 0, 0);
const AT_7PM = new Date(2026, 9, 10, 19, 0, 0);

describe("normalizeLateChores", () => {
  it("is all off by default so nothing changes for existing families", () => {
    expect(normalizeLateChores(undefined)).toEqual({
      lockLate: false,
      penalty: false,
      reducedPay: false,
      lateShare: 50,
      penaltyMode: "percent",
      penaltyAmount: 25,
    });
  });

  it("holds the numbers in range", () => {
    expect(normalizeLateChores({ lateShare: 400 }).lateShare).toBe(100);
    expect(normalizeLateChores({ lateShare: -3 }).lateShare).toBe(0);
    expect(normalizeLateChores({ penaltyAmount: 900 }).penaltyAmount).toBe(100);
    expect(normalizeLateChores({ penaltyMode: "flat", penaltyAmount: 900 }).penaltyAmount).toBe(900);
    expect(normalizeLateChores({ lateShare: "abc" as any }).lateShare).toBe(50);
  });
});

describe("lateRuleFor", () => {
  it("follows the family when the chore has no say", () => {
    expect(lateRuleFor(quest(), family()).lockLate).toBe(false);
    expect(lateRuleFor(quest(), family({ lockLate: true })).lockLate).toBe(true);
    expect(lateRuleFor(quest({ lateRule: "mystery" }), family({ lockLate: true })).lockLate).toBe(true);
    expect(lateOverrideOf({})).toBe("family");
  });

  it("lets a chore allow late or lock when late against the family", () => {
    expect(lateRuleFor(quest({ lateRule: "allow" }), family({ lockLate: true })).lockLate).toBe(false);
    expect(lateRuleFor(quest({ lateRule: "lock" }), family()).lockLate).toBe(true);
  });

  it("lets a chore opt out of the penalty only", () => {
    const rule = lateRuleFor(quest({ lateRule: "noPenalty" }), family({ penalty: true, lockLate: true }));
    expect(rule.penalty).toBe(false);
    expect(rule.lockLate).toBe(true);
    expect(lateRuleFor(quest(), family({ penalty: true })).penalty).toBe(true);
  });

  it("pays in full unless late finishes pay less", () => {
    expect(lateRuleFor(quest(), family({ lateShare: 20 })).lateShare).toBe(100);
    expect(lateRuleFor(quest(), family({ reducedPay: true, lateShare: 20 })).lateShare).toBe(20);
  });
});

describe("lateStatus", () => {
  const open = lateRuleFor(quest(), family());
  const locking = lateRuleFor(quest(), family({ lockLate: true }));

  it("is on time before the due time and with no due time", () => {
    expect(lateStatus(quest(), locking, undefined, AT_5PM).state).toBe("onTime");
    expect(lateStatus(quest({ dueByTime: "" }), locking, undefined, AT_7PM).state).toBe("onTime");
  });

  it("is late after the due time, locked when the rule locks", () => {
    expect(lateStatus(quest(), open, undefined, AT_7PM).state).toBe("late");
    const locked = lateStatus(quest(), locking, undefined, AT_7PM);
    expect(locked.state).toBe("locked");
    expect(locked.deadline).toEqual(new Date(2026, 9, 10, 18, 0, 0));
  });

  it("respects Extra Time and a held clock", () => {
    const extended = { extendedUntil: { q1: new Date(2026, 9, 10, 20, 0, 0).toISOString() } };
    expect(lateStatus(quest(), locking, extended, AT_7PM).state).toBe("onTime");
    const paused = {
      pause: { from: new Date(2026, 9, 10, 12, 0).toISOString(), until: new Date(2026, 9, 10, 23, 0).toISOString() },
    };
    expect(lateStatus(quest(), locking, paused, AT_7PM).state).toBe("onTime");
  });
});

describe("lockedNotice", () => {
  it("names the clock, and the day when it closed on another", () => {
    expect(lockedNotice(new Date(2026, 9, 10, 18, 0), AT_7PM)).toBe("Too late: this one closed at 6:00pm");
    expect(lockedNotice(new Date(2026, 9, 9, 18, 0), AT_7PM)).toBe("Too late: this one closed Fri 9 Oct at 6:00pm");
    expect(lockedNotice(null, AT_7PM)).toBe("Too late: this one has closed.");
  });
});

describe("lateReward", () => {
  const rewards = { xp: 100, gp: 11, ap: 3 };
  it("pays a share, rounded", () => {
    const rule = lateRuleFor(quest(), family({ reducedPay: true, lateShare: 50 }));
    expect(lateReward(rewards, rule)).toEqual({ xp: 50, gp: 6, ap: 2 });
  });
  it("can pay nothing or everything", () => {
    expect(lateReward(rewards, lateRuleFor(quest(), family({ reducedPay: true, lateShare: 0 })))).toEqual({ xp: 0, gp: 0, ap: 0 });
    expect(lateReward(rewards, lateRuleFor(quest(), family()))).toEqual(rewards);
  });
});

describe("latePenalty", () => {
  const rewards = { xp: 100, gp: 10, ap: 4 };
  it("is nothing when the penalty is off", () => {
    expect(latePenalty(lateRuleFor(quest(), family()), rewards)).toEqual({ xp: 0, gp: 0 });
  });
  it("takes 25% of the reward by default and never AP", () => {
    expect(latePenalty(lateRuleFor(quest(), family({ penalty: true })), rewards)).toEqual({ xp: 25, gp: 3 });
  });
  it("takes a flat amount of each", () => {
    const rule = lateRuleFor(quest(), family({ penalty: true, penaltyMode: "flat", penaltyAmount: 7 }));
    expect(latePenalty(rule, rewards)).toEqual({ xp: 7, gp: 7 });
  });
  it("is nothing for a chore with no reward in percent mode", () => {
    expect(latePenalty(lateRuleFor(quest(), family({ penalty: true })), { xp: 0, gp: 0, ap: 0 })).toEqual({ xp: 0, gp: 0 });
  });
});

describe("cappedPenalty", () => {
  it("never takes the wallet below 0", () => {
    expect(cappedPenalty({ xp: 0, gp: 30 }, { xp: 0, levelFloorXp: 0, gp: 12 })).toEqual({ xp: 0, gp: 12 });
    expect(cappedPenalty({ xp: 0, gp: 30 }, { xp: 0, levelFloorXp: 0, gp: -4 })).toEqual({ xp: 0, gp: 0 });
  });
  it("never takes XP below the current level, so it never levels down", () => {
    expect(cappedPenalty({ xp: 50, gp: 0 }, { xp: 130, levelFloorXp: 100, gp: 0 })).toEqual({ xp: 30, gp: 0 });
    expect(cappedPenalty({ xp: 50, gp: 0 }, { xp: 100, levelFloorXp: 100, gp: 0 })).toEqual({ xp: 0, gp: 0 });
  });
});

describe("penalty record helpers", () => {
  it("keys a penalty by hero, chore and the day the window closed", () => {
    expect(penaltyKeyOf("h1", "q1", new Date(2026, 9, 10, 18, 0))).toBe("h1:q1:2026-10-10");
  });
  it("prints the line", () => {
    expect(penaltyLine({ xp: 12, gp: 5 })).toBe("-12 XP, -5 GP");
    expect(penaltyLine({ xp: 0, gp: 5 })).toBe("-5 GP");
  });
});
