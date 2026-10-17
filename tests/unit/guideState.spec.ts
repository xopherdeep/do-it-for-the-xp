/**
 * What the Guide remembers on the profile: the Beast Log and a shop seen, and the Sky Champion crown paid once.
 */
import { createPinia, setActivePinia } from "pinia";
import { CHAMPION_REWARD } from "@/lib/services/guide/nextStep";
import { crownChampion, guideRecordOf, markGuide, markRouteSeen } from "@/lib/services/guide/guideState";
import { HERO, addHero, hero, wallet } from "./templeFixtures";

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

beforeEach(() => {
  setActivePinia(createPinia());
  addHero();
});

describe("guide record", () => {
  it("is empty on an older profile", () => {
    expect(guideRecordOf(hero())).toEqual({});
    expect(guideRecordOf(null)).toEqual({});
  });

  it("notes the Beast Log and the shops, and nothing for other routes", () => {
    markRouteSeen("home-town", HERO);
    expect(guideRecordOf(hero())).toEqual({});
    markRouteSeen("my-tasks", HERO);
    markRouteSeen("shop", HERO);
    expect(guideRecordOf(hero())).toEqual({ questsSeen: true, shopSeen: true });
  });

  it("merges patches", () => {
    markGuide(HERO, { introSeen: true });
    markGuide(HERO, { hidden: true });
    expect(guideRecordOf(hero())).toEqual({ introSeen: true, hidden: true });
  });
});

describe("crownChampion", () => {
  it("pays the reward once and remembers when", () => {
    const before = wallet();
    const paid = crownChampion(HERO, new Date("2026-10-17T12:00:00Z"));
    expect(paid).toMatchObject({ xp: CHAMPION_REWARD.xp, gp: CHAMPION_REWARD.gp, ap: CHAMPION_REWARD.ap });
    expect(wallet()).toBe(before + CHAMPION_REWARD.gp);
    expect(guideRecordOf(hero()).championAt).toBe("2026-10-17T12:00:00.000Z");
    expect(crownChampion(HERO)).toBeNull();
    expect(wallet()).toBe(before + CHAMPION_REWARD.gp);
  });

  it("does nothing for an unknown hero", () => {
    expect(crownChampion("nobody")).toBeNull();
  });
});
