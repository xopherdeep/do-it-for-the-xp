import { createPinia, setActivePinia } from "pinia";
import { AbilityType } from "@/hooks/abilities/abilityConstants";
import type { Ability } from "@/types/abilities";
import { useUserStore } from "@/lib/store/stores/user";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { cancelAlert, scheduleAlert, showAlert } from "@/lib/services/notifications/alertBridge";
import {
  countdownLabel,
  durationLabel,
  expiredTimers,
  isTimedPower,
  msLeft,
  newTimer,
  powerTimerBlocked,
  runningTimerOf,
  runningTimers,
  timerAlertId,
  timerMinutesOf,
} from "@/lib/services/abilities/PowerTimers";
import { endPowerTimer, finishExpiredTimers, startPowerTimer } from "@/lib/services/abilities/PowerTimerActions";

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
jest.mock("@/lib/store/stores/notifications", () => {
  const notifications = { push: jest.fn() };
  return { __esModule: true, useNotificationsStore: () => notifications };
});
jest.mock("@/lib/services/notifications/alertBridge", () => ({
  __esModule: true,
  isNativeApp: () => false,
  showAlert: jest.fn(async () => ({ shown: true })),
  scheduleAlert: jest.fn(async () => ({ shown: false, reason: "web" })),
  cancelAlert: jest.fn(async () => undefined),
}));

const HERO = "hero-1";
const DAD = "dad-1";
const now = new Date("2026-10-14T16:00:00.000Z");
const later = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

const power = (overrides: Partial<Ability> = {}): Ability =>
  ({
    id: "game-on",
    name: "Game On",
    description: "Video games",
    type: AbilityType.RealLife,
    frequency: "daily",
    mpCost: 8,
    apRequirement: { amount: 0, period: "daily" },
    prerequisites: [],
    icon: "gamepad-alt",
    isPreset: false,
    position: { x: 0, y: 0 },
    timerMinutes: 30,
    ...overrides,
  }) as Ability;

const hero = () => useUserStore().users[HERO];
const push = () => useNotificationsStore().push as jest.Mock;

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
  const users = useUserStore().users;
  users[HERO] = { id: HERO, name: { nick: "Mia" }, stats: { mp: { now: 40, max: 40 } } };
  users[DAD] = { id: DAD, name: { nick: "Dad" }, isAdult: true, stats: {} };
});

describe("timed privileges, the pure part", () => {
  it("reads the minutes off real-life Powers only, clamped to a day", () => {
    expect(timerMinutesOf(power())).toBe(30);
    expect(timerMinutesOf(power({ timerMinutes: undefined }))).toBe(0);
    expect(timerMinutesOf(power({ timerMinutes: -5 }))).toBe(0);
    expect(timerMinutesOf(power({ timerMinutes: 5000 }))).toBe(1440);
    expect(timerMinutesOf(power({ type: AbilityType.InGame }))).toBe(0);
    expect(isTimedPower(power())).toBe(true);
    expect(isTimedPower(power({ timerMinutes: 0 }))).toBe(false);
  });

  it("starts a timer that ends after the Power's minutes", () => {
    expect(newTimer(power(), now)).toEqual({
      abilityId: "game-on",
      name: "Game On",
      icon: "gamepad-alt",
      startedAt: now.toISOString(),
      endsAt: later(30).toISOString(),
    });
  });

  it("tells running timers from run-out ones, soonest first, and skips bad records", () => {
    const profile = {
      powerTimers: {
        a: newTimer(power({ id: "a", timerMinutes: 60 }), now),
        b: newTimer(power({ id: "b", timerMinutes: 15 }), now),
        c: newTimer(power({ id: "c", timerMinutes: 10 }), later(-20)),
        junk: { abilityId: "junk", endsAt: "not a date" },
      },
    };
    expect(runningTimers(profile, now).map((timer) => timer.abilityId)).toEqual(["b", "a"]);
    expect(expiredTimers(profile, now).map((timer) => timer.abilityId)).toEqual(["c"]);
    expect(runningTimerOf(profile, "c", now)).toBeNull();
    expect(runningTimers(undefined, now)).toEqual([]);
  });

  it("counts down in minutes and seconds, and hours past an hour", () => {
    expect(countdownLabel(30 * 60_000)).toBe("30:00");
    expect(countdownLabel(59_001)).toBe("1:00");
    expect(countdownLabel(5_000)).toBe("0:05");
    expect(countdownLabel(0)).toBe("0:00");
    expect(countdownLabel(-10)).toBe("0:00");
    expect(countdownLabel(3_723_000)).toBe("1:02:03");
    expect(msLeft(newTimer(power(), now), later(10))).toBe(20 * 60_000);
  });

  it("names a duration the way a row shows it", () => {
    expect(durationLabel(30)).toBe("30 min");
    expect(durationLabel(60)).toBe("1 hr");
    expect(durationLabel(90)).toBe("1 hr 30 min");
  });

  it("refuses a second cast while the timer runs, and lets it go once time is up", () => {
    const profile = { powerTimers: { "game-on": newTimer(power(), now) } };
    expect(powerTimerBlocked(power(), profile, later(6))).toBe("Game On is already running · 24:00 left.");
    expect(powerTimerBlocked(power(), profile, later(30))).toBeNull();
    expect(powerTimerBlocked(power({ timerMinutes: 0 }), profile, later(6))).toBeNull();
  });

  it("gives each hero's Power its own alert id, the same one every time", () => {
    const id = timerAlertId(HERO, "game-on");
    expect(id).toBeGreaterThanOrEqual(7100);
    expect(id).toBeLessThan(8000);
    expect(timerAlertId(HERO, "game-on")).toBe(id);
  });
});

describe("timed privileges on the hero", () => {
  it("stores the timer on the profile and books the time's up alert for its end", () => {
    const timer = startPowerTimer(power(), HERO, now);
    expect(hero().powerTimers).toEqual({ "game-on": timer });
    expect(scheduleAlert).toHaveBeenCalledWith(
      expect.objectContaining({ id: timerAlertId(HERO, "game-on"), title: "Time's up: Game On", at: later(30) })
    );
  });

  it("starts nothing for a Power with no timer or a hero who is not there", () => {
    expect(startPowerTimer(power({ timerMinutes: 0 }), HERO, now)).toBeNull();
    expect(startPowerTimer(power(), "nobody", now)).toBeNull();
    expect(hero().powerTimers).toBeUndefined();
  });

  it("keeps other Powers' timers when one starts", () => {
    startPowerTimer(power({ id: "tv", name: "TV Time" }), HERO, now);
    startPowerTimer(power(), HERO, now);
    expect(Object.keys(hero().powerTimers).sort()).toEqual(["game-on", "tv"]);
  });

  it("ends a timer early, takes its alert back and tells the hero who ended it", () => {
    startPowerTimer(power(), HERO, now);
    expect(endPowerTimer(HERO, "game-on", DAD)?.abilityId).toBe("game-on");
    expect(hero().powerTimers).toEqual({});
    expect(cancelAlert).toHaveBeenCalledWith(timerAlertId(HERO, "game-on"));
    expect(push()).toHaveBeenCalledWith(expect.objectContaining({ heroId: HERO, title: "Game On ended", body: "Dad ended it early." }));
    expect(endPowerTimer(HERO, "game-on", DAD)).toBeNull();
  });

  it("says time's up once: rings the alert, tells the hero and the Game Masters, and takes the timer off", () => {
    startPowerTimer(power(), HERO, now);
    startPowerTimer(power({ id: "tv", name: "TV Time", timerMinutes: 60 }), HERO, now);

    expect(finishExpiredTimers(HERO, later(29))).toEqual([]);
    const ended = finishExpiredTimers(HERO, later(30));
    expect(ended.map((timer) => timer.abilityId)).toEqual(["game-on"]);
    expect(Object.keys(hero().powerTimers)).toEqual(["tv"]);
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Time's up: Game On" }));
    expect(push()).toHaveBeenCalledWith(expect.objectContaining({ heroId: HERO, title: "Time's up: Game On" }));
    expect(push()).toHaveBeenCalledWith(expect.objectContaining({ heroId: DAD, title: "Game On is over", body: "Mia's time is up." }));

    expect(finishExpiredTimers(HERO, later(31))).toEqual([]);
  });
});
