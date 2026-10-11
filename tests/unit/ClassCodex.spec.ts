import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/lib/store/stores/user";
import { classCodex, classCodexEntry, PILLAR_LABELS } from "@/lib/services/stats/ClassCodex";
import { classLevelsOf, classPassive, classRequirementLabel } from "@/lib/services/stats/ClassPassives";
import { JOB_CLASS_OPTIONS } from "@/constants/JOB_CLASS_OPTIONS";
import { PILLARS } from "@/constants/PILLARS";
import { calculateMaxHp, calculateMaxMp } from "@/lib/services/stats/PlayerStatsService";

/**
 * The Class Codex as data: what each class is, what it does, what it grows into and what unlocks it.
 * The module is pure, so nothing is mocked for it. The levels come in the way the store holds them
 * (stats.classes). The last block runs the real user store (setJobClass); only what it talks to is faked.
 */
const mockSetProfile = jest.fn().mockResolvedValue(undefined);

jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({
  __esModule: true,
  ProfileDb: class {
    setProfile(profile: unknown) {
      return mockSetProfile(profile);
    }
  },
  default: class {},
}));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));

const fresh = classLevelsOf({});
const entry = (name: string, levels: Record<string, number> = fresh) => {
  const found = classCodexEntry(name, levels);
  if (!found) throw new Error(`no codex entry for ${name}`);
  return found;
};

describe("classCodex", () => {
  it("lists every class in JOB_CLASS_OPTIONS order", () => {
    expect(classCodex(fresh).map((c) => c.name)).toEqual(JOB_CLASS_OPTIONS.map((j) => j.name));
    expect(classCodex(fresh).map((c) => c.name)).toEqual(["Warrior", "Mage", "Thief", "Monk", "Paladin", "Ninja", "Sage"]);
  });

  it("gives every class a creed, three real-life lines, a passive and three pillars with stat names", () => {
    classCodex(fresh).forEach((c) => {
      expect(c.creed.length).toBeGreaterThan(0);
      expect(c.realLife).toHaveLength(3);
      c.realLife.forEach((line) => expect(line.length).toBeGreaterThan(0));
      expect(c.description.length).toBeGreaterThan(0);
      expect(c.passive).toBe(classPassive(c.name).blurb);
      expect(c.pillars.map((p) => p.rank)).toEqual(["Primary", "Secondary", "Tertiary"]);
      c.pillars.forEach((p) => {
        expect(p.stats).toHaveLength(3);
        expect(p.stats).toEqual(Object.values(PILLARS[p.key].stats).map((s) => s.name));
        expect(p.name).toBe(PILLAR_LABELS[p.key]);
        expect(p.icon).toBe(PILLARS[p.key].icon);
        expect(p.color).toBe(PILLARS[p.key].color);
        expect(p.currency).toBe(PILLARS[p.key].currencyLabel);
      });
      expect(new Set(c.pillars.map((p) => p.key)).size).toBe(3);
    });
  });

  it("follows the class table for the pillars", () => {
    const warrior = entry("Warrior");
    expect(warrior.pillars.map((p) => p.key)).toEqual(["physical", "eternal", "relational"]);
    expect(warrior.pillars[0]).toMatchObject({ name: "Body", stats: ["Defense", "Strength", "Endurance"], currency: "HP" });
    expect(entry("Sage").pillars.map((p) => p.key)).toEqual(["mental", "vibrational", "eternal"]);
  });

  it("reads the starting HP and MP at level 1 from PlayerStatsService", () => {
    expect(entry("Warrior")).toMatchObject({ startingHp: 50, startingMp: 10 });
    expect(entry("Mage")).toMatchObject({ startingHp: 25, startingMp: 40 });
    expect(entry("Thief")).toMatchObject({ startingHp: 35, startingMp: 20 });
    expect(entry("Monk")).toMatchObject({ startingHp: 45, startingMp: 25 });
    classCodex(fresh).forEach((c) => {
      expect(c.startingHp).toBe(calculateMaxHp(1, c.name));
      expect(c.startingMp).toBe(calculateMaxMp(1, c.name));
    });
  });

  it("marks tier 1 and tier 2", () => {
    ["Warrior", "Mage", "Thief", "Monk"].forEach((name) => expect(entry(name).tier).toBe(1));
    ["Paladin", "Ninja", "Sage"].forEach((name) => expect(entry(name).tier).toBe(2));
  });
});

describe("growsInto", () => {
  it("Warrior grows into Paladin (with Monk) and Ninja (with Thief)", () => {
    const grows = entry("Warrior").growsInto;
    expect(grows.map((g) => [g.name, g.with])).toEqual([
      ["Paladin", "Monk"],
      ["Ninja", "Thief"],
    ]);
    expect(grows[0].requirement).toBe(classRequirementLabel("Paladin"));
    expect(grows[0].icon).toBe(JOB_CLASS_OPTIONS.find((j) => j.name === "Paladin")?.icon);
    expect(grows.every((g) => g.met === false)).toBe(true);
  });

  it("Monk grows into Paladin (with Warrior) and Sage (with Mage); Mage into Sage; Thief into Ninja", () => {
    expect(entry("Monk").growsInto.map((g) => [g.name, g.with])).toEqual([
      ["Paladin", "Warrior"],
      ["Sage", "Mage"],
    ]);
    expect(entry("Mage").growsInto.map((g) => [g.name, g.with])).toEqual([["Sage", "Monk"]]);
    expect(entry("Thief").growsInto.map((g) => [g.name, g.with])).toEqual([["Ninja", "Warrior"]]);
  });

  it("tier-2 entries grow into nothing", () => {
    ["Paladin", "Ninja", "Sage"].forEach((name) => expect(entry(name).growsInto).toEqual([]));
  });

  it("flags an evolution as met once the hero has both parents at the level", () => {
    const levels = classLevelsOf({ Warrior: { level: 10 }, Monk: { level: 10 } });
    const grows = entry("Warrior", levels).growsInto;
    expect(grows.find((g) => g.name === "Paladin")?.met).toBe(true);
    expect(grows.find((g) => g.name === "Ninja")?.met).toBe(false);
  });
});

describe("sealed classes", () => {
  it("tier-1 classes are never sealed and have no requirement", () => {
    ["Warrior", "Mage", "Thief", "Monk"].forEach((name) => {
      expect(entry(name).sealed).toBe(false);
      expect(entry(name).requirement).toBe("");
      expect(entry(name).requirementProgress).toEqual([]);
    });
  });

  it("Paladin is sealed behind its requirement label and opens at Warrior 10 + Monk 10", () => {
    const sealed = entry("Paladin");
    expect(sealed.requirement).toBe(classRequirementLabel("Paladin"));
    expect(sealed.requirement).toBe("Warrior 10 + Monk 10");
    expect(sealed.sealed).toBe(true);

    expect(entry("Paladin", classLevelsOf({ Warrior: { level: 10 }, Monk: { level: 9 } })).sealed).toBe(true);
    expect(entry("Paladin", classLevelsOf({ Warrior: { level: 10 }, Monk: { level: 10 } })).sealed).toBe(false);
    // Lower-case spellings from old profiles count the same
    expect(entry("Paladin", classLevelsOf({ warrior: { level: 12 }, monk: { level: 10 } })).sealed).toBe(false);
  });

  it("every tier-2 class is sealed for a fresh hero and carries a requirement", () => {
    ["Paladin", "Ninja", "Sage"].forEach((name) => {
      expect(entry(name).sealed).toBe(true);
      expect(entry(name).requirement).toBe(classRequirementLabel(name));
      expect(entry(name).requirement).not.toBe("");
    });
  });

  it("reports the hero's progress toward each parent", () => {
    const levels = classLevelsOf({ Warrior: { level: 3 }, Monk: { level: 10 } });
    expect(entry("Paladin", levels).requirementProgress).toEqual([
      { name: "Warrior", level: 3, needed: 10, met: false },
      { name: "Monk", level: 10, needed: 10, met: true },
    ]);
    expect(entry("Ninja", levels).requirementProgress.map((p) => [p.name, p.level])).toEqual([
      ["Thief", 0],
      ["Warrior", 3],
    ]);
  });
});

describe("heroLevel", () => {
  it("is the hero's level in that class, 0 when never played", () => {
    const levels = classLevelsOf({ Warrior: { level: 4 }, mage: { level: 2 } });
    expect(entry("Warrior", levels).heroLevel).toBe(4);
    expect(entry("Mage", levels).heroLevel).toBe(2);
    expect(entry("Thief", levels).heroLevel).toBe(0);
  });
});

describe("classCodexEntry", () => {
  it("finds a class however it is cased and returns null for a stranger", () => {
    expect(classCodexEntry("warrior", fresh)?.name).toBe("Warrior");
    expect(classCodexEntry("Bard", fresh)).toBeNull();
    expect(classCodexEntry("", fresh)).toBeNull();
  });
});

describe("useUserStore().setJobClass", () => {
  let store: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useUserStore();
    mockSetProfile.mockClear();
    store.addUser({ id: "hero-1", avatar: "003-gamer", name: { nick: "Max" }, jobClass: "warrior", stats: { classes: {} } });
  });

  it("switches to a base class, persists the profile and syncs the signed-in hero", async () => {
    store.loginUser(store.users["hero-1"]);

    expect(store.setJobClass("hero-1", "Mage")).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(store.users["hero-1"].jobClass).toBe("Mage");
    expect((store.currentUser as any).jobClass).toBe("Mage");
    expect(mockSetProfile).toHaveBeenCalledTimes(1);
    expect(mockSetProfile.mock.calls[0][0]).toMatchObject({ id: "hero-1", jobClass: "Mage" });
  });

  it("refuses a sealed class and changes nothing", async () => {
    store.users["hero-1"].stats.classes = { Warrior: { level: 10 }, Monk: { level: 9 } };

    expect(store.setJobClass("hero-1", "Paladin")).toBe(false);
    await Promise.resolve();

    expect(store.users["hero-1"].jobClass).toBe("warrior");
    expect(mockSetProfile).not.toHaveBeenCalled();
  });

  it("accepts a tier-2 class once both parents reach the level", () => {
    store.users["hero-1"].stats.classes = { Warrior: { level: 10 }, Monk: { level: 10 } };

    expect(store.setJobClass("hero-1", "Paladin")).toBe(true);
    expect(store.users["hero-1"].jobClass).toBe("Paladin");
  });

  it("ignores a hero that does not exist and an empty class", () => {
    expect(store.setJobClass("nobody", "Mage")).toBe(false);
    expect(store.setJobClass("hero-1", "")).toBe(false);
    expect(store.users["hero-1"].jobClass).toBe("warrior");
  });
});
