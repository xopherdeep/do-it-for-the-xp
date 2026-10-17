import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/lib/store/stores/user";
import { classCodex, classCodexEntry, PILLAR_LABELS, PILLAR_POWER_MAX, pillarPower } from "@/lib/services/stats/ClassCodex";
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
    expect(classCodex(fresh).map((c) => c.name)).toEqual([
      "Warrior",
      "Mage",
      "Thief",
      "Monk",
      "Knight",
      "Berserker",
      "White Mage",
      "Black Mage",
      "Assassin",
      "Ranger",
      "Martial Artist",
      "Mystic",
      "Paladin",
      "Ninja",
      "Sage",
    ]);
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
    expect(entry("Martial Artist").pillars.map((p) => p.key)).toEqual(["physical", "vibrational", "mental"]);
  });

  it("carries the new classes' creed, passive and icon from the tables", () => {
    expect(entry("Black Mage")).toMatchObject({ creed: "Burns through the list.", icon: "fa-meteor", passive: classPassive("Black Mage").blurb });
    expect(entry("Mystic")).toMatchObject({ creed: "Calm sees further.", icon: "fa-eye" });
    expect(entry("Knight").realLife[0]).toBe("Suits the protector jobs: locking up at night, checking on siblings, keeping the house safe.");
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

  it("marks tier 1, 2 and 3: base, advanced and crown", () => {
    ["Warrior", "Mage", "Thief", "Monk"].forEach((name) => expect(entry(name).tier).toBe(1));
    ["Knight", "Berserker", "White Mage", "Black Mage", "Assassin", "Ranger", "Martial Artist", "Mystic"].forEach((name) =>
      expect(entry(name).tier).toBe(2)
    );
    ["Paladin", "Ninja", "Sage"].forEach((name) => expect(entry(name).tier).toBe(3));
    classCodex(fresh).forEach((c) => expect(c.tier).toBe(JOB_CLASS_OPTIONS.find((j) => j.name === c.name)?.tier));
  });
});

describe("growsInto", () => {
  it("each base class grows into its two advanced classes, with nobody to pair with", () => {
    expect(entry("Warrior").growsInto.map((g) => [g.name, g.with])).toEqual([
      ["Knight", null],
      ["Berserker", null],
    ]);
    expect(entry("Mage").growsInto.map((g) => g.name)).toEqual(["White Mage", "Black Mage"]);
    expect(entry("Thief").growsInto.map((g) => g.name)).toEqual(["Assassin", "Ranger"]);
    expect(entry("Monk").growsInto.map((g) => g.name)).toEqual(["Martial Artist", "Mystic"]);
  });

  it("an evolution with one parent carries `with: null`, so the screen leaves the phrase out", () => {
    ["Warrior", "Mage", "Thief", "Monk"].forEach((name) => {
      const grows = entry(name).growsInto;
      expect(grows).toHaveLength(2);
      grows.forEach((g) => expect(g.with).toBeNull());
    });
  });

  it("an advanced class lists the crown classes it parents, each with the other advanced parent", () => {
    expect(entry("Knight").growsInto.map((g) => [g.name, g.with])).toEqual([["Paladin", "Mystic"]]);
    expect(entry("Mystic").growsInto.map((g) => [g.name, g.with])).toEqual([
      ["Paladin", "Knight"],
      ["Sage", "White Mage"],
    ]);
    expect(entry("Berserker").growsInto.map((g) => [g.name, g.with])).toEqual([["Ninja", "Assassin"]]);
    expect(entry("Assassin").growsInto.map((g) => [g.name, g.with])).toEqual([["Ninja", "Berserker"]]);
    expect(entry("White Mage").growsInto.map((g) => [g.name, g.with])).toEqual([["Sage", "Mystic"]]);
    // Black Mage, Ranger and Martial Artist lead nowhere further
    ["Black Mage", "Ranger", "Martial Artist"].forEach((name) => expect(entry(name).growsInto).toEqual([]));
  });

  it("flags a crown evolution as met only when the hero has both advanced parents at level 10", () => {
    const knightOnly = classLevelsOf({ Knight: { level: 10 } });
    expect(entry("Knight", knightOnly).growsInto[0]).toMatchObject({ name: "Paladin", requirement: "Knight 10 + Mystic 10", met: false });
    const both = classLevelsOf({ Knight: { level: 10 }, Mystic: { level: 10 } });
    expect(entry("Knight", both).growsInto[0].met).toBe(true);
    expect(entry("Mystic", both).growsInto.map((g) => [g.name, g.met])).toEqual([
      ["Paladin", true],
      ["Sage", false],
    ]);
  });

  it("a crown class grows into nothing", () => {
    ["Paladin", "Ninja", "Sage"].forEach((name) => expect(entry(name).growsInto).toEqual([]));
  });

  it("a crown class is tier 3 with progress toward both advanced parents", () => {
    const paladin = entry("Paladin", classLevelsOf({ Knight: { level: 4 }, Mystic: { level: 10 } }));
    expect(paladin.tier).toBe(3);
    expect(paladin.growsInto).toEqual([]);
    expect(paladin.requirementProgress).toEqual([
      { name: "Knight", level: 4, needed: 10, met: false },
      { name: "Mystic", level: 10, needed: 10, met: true },
    ]);
  });

  it("shows the requirement label and icon of each evolution", () => {
    const grows = entry("Warrior").growsInto;
    expect(grows[0].requirement).toBe(classRequirementLabel("Knight"));
    expect(grows[0].requirement).toBe("Warrior 10");
    expect(grows[0].icon).toBe(JOB_CLASS_OPTIONS.find((j) => j.name === "Knight")?.icon);
    expect(grows.every((g) => g.met === false)).toBe(true);
  });

  it("flags an evolution as met once the hero has the parent at level 10", () => {
    const grows = entry("Warrior", classLevelsOf({ Warrior: { level: 10 } })).growsInto;
    expect(grows.map((g) => g.met)).toEqual([true, true]);
    expect(entry("Warrior", classLevelsOf({ Warrior: { level: 9 } })).growsInto.map((g) => g.met)).toEqual([false, false]);
    expect(entry("Mage", classLevelsOf({ mage: { level: 10 } })).growsInto.map((g) => g.met)).toEqual([true, true]);
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

  it("an advanced class is sealed behind its one parent and opens at level 10", () => {
    const sealed = entry("White Mage");
    expect(sealed.requirement).toBe(classRequirementLabel("White Mage"));
    expect(sealed.requirement).toBe("Mage 10");
    expect(sealed.sealed).toBe(true);

    expect(entry("White Mage", classLevelsOf({ Mage: { level: 9 } })).sealed).toBe(true);
    expect(entry("White Mage", classLevelsOf({ Mage: { level: 10 } })).sealed).toBe(false);
    expect(entry("Black Mage", classLevelsOf({ Mage: { level: 10 } })).sealed).toBe(false);
    expect(entry("Knight", classLevelsOf({ Mage: { level: 10 } })).sealed).toBe(true);
    // Lower-case spellings from old profiles count the same
    expect(entry("Knight", classLevelsOf({ warrior: { level: 12 } })).sealed).toBe(false);
  });

  it("Paladin is sealed behind its requirement label and opens at Knight 10 + Mystic 10", () => {
    const sealed = entry("Paladin");
    expect(sealed.requirement).toBe(classRequirementLabel("Paladin"));
    expect(sealed.requirement).toBe("Knight 10 + Mystic 10");
    expect(sealed.sealed).toBe(true);

    expect(entry("Paladin", classLevelsOf({ Knight: { level: 10 }, Mystic: { level: 9 } })).sealed).toBe(true);
    expect(entry("Paladin", classLevelsOf({ Knight: { level: 10 }, Mystic: { level: 10 } })).sealed).toBe(false);
    expect(entry("Paladin", classLevelsOf({ knight: { level: 12 }, mystic: { level: 10 } })).sealed).toBe(false);
    // The old pair no longer opens it
    expect(entry("Paladin", classLevelsOf({ Warrior: { level: 10 }, Monk: { level: 10 } })).sealed).toBe(true);
  });

  it("a class with a space in its name opens a crown class", () => {
    expect(entry("Sage").requirement).toBe("White Mage 10 + Mystic 10");
    expect(entry("Sage", classLevelsOf({ "White Mage": { level: 10 }, Mystic: { level: 10 } })).sealed).toBe(false);
    expect(entry("Sage", classLevelsOf({ "White Mage": { level: 10 } })).sealed).toBe(true);
  });

  it("every advanced and crown class is sealed for a fresh hero and carries a requirement", () => {
    classCodex(fresh)
      .filter((c) => !["Warrior", "Mage", "Thief", "Monk"].includes(c.name))
      .forEach((c) => {
        expect(c.sealed).toBe(true);
        expect(c.requirement).toBe(classRequirementLabel(c.name));
        expect(c.requirement).not.toBe("");
      });
  });

  it("reports the hero's progress toward each parent", () => {
    const levels = classLevelsOf({ Knight: { level: 3 }, Mystic: { level: 10 } });
    expect(entry("Paladin", levels).requirementProgress).toEqual([
      { name: "Knight", level: 3, needed: 10, met: false },
      { name: "Mystic", level: 10, needed: 10, met: true },
    ]);
    expect(entry("Ninja", levels).requirementProgress.map((p) => [p.name, p.level])).toEqual([
      ["Assassin", 0],
      ["Berserker", 0],
    ]);
    expect(entry("Knight", classLevelsOf({ Warrior: { level: 4 } })).requirementProgress).toEqual([
      { name: "Warrior", level: 4, needed: 10, met: false },
    ]);
  });
});

describe("power", () => {
  it("lists the five pillars in the profile's order with the class's base stats added up", () => {
    const warrior = entry("Warrior");
    expect(warrior.power.map((p) => p.name)).toEqual(["Body", "Mind", "Spirit", "Heart", "Legend"]);
    // Warrior: defense 8 + strength 12 + endurance 10
    expect(warrior.power[0].value).toBe(30);
    expect(warrior.power.every((p) => p.value === pillarPower(JOB_CLASS_OPTIONS[0], p.key))).toBe(true);
  });

  it("ranks only the three pillars the class trains", () => {
    const mage = entry("Mage");
    const job = JOB_CLASS_OPTIONS.find((j) => j.name === "Mage")!;
    expect(mage.power.find((p) => p.key === job.primaryPillar)?.rank).toBe("Primary");
    expect(mage.power.find((p) => p.key === job.secondaryPillar)?.rank).toBe("Secondary");
    expect(mage.power.find((p) => p.key === job.tertiaryPillar)?.rank).toBe("Tertiary");
    expect(mage.power.filter((p) => p.rank === null)).toHaveLength(2);
  });

  it("puts every bar on one scale: the strongest start of any class fills it", () => {
    const shares = classCodex(fresh).flatMap((c) => c.power.map((p) => p.share));
    expect(Math.max(...shares)).toBe(1);
    expect(shares.every((share) => share >= 0 && share <= 1)).toBe(true);
    expect(PILLAR_POWER_MAX).toBe(Math.max(...classCodex(fresh).flatMap((c) => c.power.map((p) => p.value))));
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
    expect(classCodexEntry("white mage", fresh)?.name).toBe("White Mage");
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
    store.users["hero-1"].stats.classes = { Warrior: { level: 10 }, Knight: { level: 10 }, Mystic: { level: 9 } };

    expect(store.setJobClass("hero-1", "Paladin")).toBe(false);
    await Promise.resolve();

    expect(store.users["hero-1"].jobClass).toBe("warrior");
    expect(mockSetProfile).not.toHaveBeenCalled();
  });

  it("accepts an advanced class once its parent reaches level 10, spaces and all", () => {
    store.users["hero-1"].stats.classes = { Warrior: { level: 10 }, Mage: { level: 10 } };

    expect(store.setJobClass("hero-1", "Knight")).toBe(true);
    expect(store.users["hero-1"].jobClass).toBe("Knight");
    expect(store.setJobClass("hero-1", "White Mage")).toBe(true);
    expect(store.users["hero-1"].jobClass).toBe("White Mage");
  });

  it("accepts a crown class once both advanced parents reach the level", () => {
    store.users["hero-1"].stats.classes = { Knight: { level: 10 }, Mystic: { level: 10 } };

    expect(store.setJobClass("hero-1", "Paladin")).toBe(true);
    expect(store.users["hero-1"].jobClass).toBe("Paladin");
  });

  it("ignores a hero that does not exist and an empty class", () => {
    expect(store.setJobClass("nobody", "Mage")).toBe(false);
    expect(store.setJobClass("hero-1", "")).toBe(false);
    expect(store.users["hero-1"].jobClass).toBe("warrior");
  });
});
