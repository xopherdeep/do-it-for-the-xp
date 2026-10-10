import { createPinia, setActivePinia } from "pinia";
import { AbilityService } from "@/lib/services/abilities/AbilityService";
import { AbilityType, TimePeriod, type Ability } from "@/hooks/abilities/abilityConstants";
import { addHero, HERO, mp } from "./templeFixtures";

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
jest.mock("@/lib/databases/AbilitiesDb", () => ({ __esModule: true, default: class {}, AbilitiesDb: class {} }));

const ability = (id: string, mpCost: number): Ability => ({
  id,
  name: id,
  description: "",
  type: AbilityType.InGame,
  frequency: TimePeriod.Daily,
  mpCost,
  apRequirement: { amount: 0, period: TimePeriod.Flat },
  icon: "",
  prerequisites: [],
  isPreset: false,
  position: { x: 0, y: 0 },
});

/** An in-memory abilities table standing in for AbilitiesDb. */
const table = new Map<string, Ability>();
const fakeDb = {
  setAbility: jest.fn(async (a: Ability) => { table.set(a.id, a); }),
  getAbilityById: jest.fn(async (id: string) => table.get(id) ?? null),
  getAbilities: jest.fn(async () => Array.from(table.values())),
  deleteAbility: jest.fn(async () => Array.from(table.values())),
};

const service = AbilityService.initialize(fakeDb as never);

beforeEach(() => {
  setActivePinia(createPinia());
  table.clear();
  table.set("blink", ability("blink", 8));
  table.set("gaze", ability("gaze", 0));
  fakeDb.setAbility.mockClear();
});

describe("AbilityService.useAbility", () => {
  it("charges the ability's MP cost and stamps lastUsed", async () => {
    addHero({ mp: { now: 10, max: 40 } });

    await expect(service.useAbility("blink", HERO)).resolves.toEqual({ ok: true });

    expect(mp()).toBe(2);
    expect(table.get("blink")?.lastUsed).toBeTruthy();
    expect(fakeDb.setAbility).toHaveBeenCalledTimes(1);
  });

  it("refuses with reason mp, charging nothing, when the hero has less MP than it costs", async () => {
    addHero({ mp: { now: 7, max: 40 } });

    await expect(service.useAbility("blink", HERO)).resolves.toEqual({ ok: false, reason: "mp" });

    expect(mp()).toBe(7);
    expect(table.get("blink")?.lastUsed).toBeUndefined();
    expect(fakeDb.setAbility).not.toHaveBeenCalled();
  });

  it("casts a free ability at exactly 0 MP without touching the pool", async () => {
    addHero({ mp: { now: 0, max: 40 } });

    await expect(service.useAbility("gaze", HERO)).resolves.toEqual({ ok: true });
    expect(mp()).toBe(0);
  });

  it("refuses an unknown ability or hero", async () => {
    addHero();
    await expect(service.useAbility("nope", HERO)).resolves.toEqual({ ok: false, reason: "unknown" });
    await expect(service.useAbility("blink", "ghost")).resolves.toEqual({ ok: false, reason: "unknown" });
    expect(fakeDb.setAbility).not.toHaveBeenCalled();
  });
});
