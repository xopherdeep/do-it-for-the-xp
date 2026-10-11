import fs from "fs";
import path from "path";
import { createPinia, setActivePinia } from "pinia";
import { useUserStore } from "@/lib/store/stores/user";
import {
  JOB_CLASS_OPTIONS,
  TIER_2_PARENT,
  TIER_3_PARENTS,
  averageBaseStats,
  combineStatBoosts,
  raiseBaseStats,
} from "@/constants/JOB_CLASS_OPTIONS";
import {
  CLASS_LEVEL_BONUSES,
  JOB_CLASS_BASE_STATS,
  JOB_UNLOCK_REQUIREMENTS,
  getClassStatBonus,
  getXpForLevel,
} from "@/lib/services/stats/PlayerStatsService";
import {
  canonicalClassName,
  classLevelsOf,
  classPassive,
  classRequirementLabel,
  isClassUnlocked,
} from "@/lib/services/stats/ClassPassives";

/**
 * The class tree: 4 base classes -> 8 advanced classes (one parent each, level 10) -> 3 crown classes (two advanced
 * parents each, level 10). Pure tables, plus the user store for the one thing that needs it: a tier-2 class levels
 * under its own name ("White Mage") the way a base class does.
 */
jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({
  __esModule: true,
  ProfileDb: class {
    setProfile() {
      return Promise.resolve();
    }
  },
  default: class {},
}));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));

const byName = (name: string) => {
  const found = JOB_CLASS_OPTIONS.find((job) => job.name === name);
  if (!found) throw new Error(`no class ${name}`);
  return found;
};

const BASE = ["Warrior", "Mage", "Thief", "Monk"];
const ADVANCED = ["Knight", "Berserker", "White Mage", "Black Mage", "Assassin", "Ranger", "Martial Artist", "Mystic"];
const CROWN = ["Paladin", "Ninja", "Sage"];

describe("the tree", () => {
  it("lists 4 base, 8 advanced and 3 crown classes, in tree order", () => {
    expect(JOB_CLASS_OPTIONS.map((job) => [job.name, job.tier])).toEqual([
      ...BASE.map((name) => [name, 1]),
      ...ADVANCED.map((name) => [name, 2]),
      ...CROWN.map((name) => [name, 3]),
    ]);
    expect(new Set(JOB_CLASS_OPTIONS.map((job) => job.name)).size).toBe(15);
  });

  it("gives each advanced class one parent and each crown class two advanced parents", () => {
    expect(TIER_2_PARENT).toEqual({
      Knight: "Warrior",
      Berserker: "Warrior",
      "White Mage": "Mage",
      "Black Mage": "Mage",
      Assassin: "Thief",
      Ranger: "Thief",
      "Martial Artist": "Monk",
      Mystic: "Monk",
    });
    expect(TIER_3_PARENTS).toEqual({
      Paladin: ["Knight", "Mystic"],
      Ninja: ["Assassin", "Berserker"],
      Sage: ["White Mage", "Mystic"],
    });
  });

  it("unlocks an advanced class at its parent's level 10 and a crown class at both parents' level 10", () => {
    expect(JOB_UNLOCK_REQUIREMENTS).toEqual({
      Knight: { Warrior: 10 },
      Berserker: { Warrior: 10 },
      "White Mage": { Mage: 10 },
      "Black Mage": { Mage: 10 },
      Assassin: { Thief: 10 },
      Ranger: { Thief: 10 },
      "Martial Artist": { Monk: 10 },
      Mystic: { Monk: 10 },
      Paladin: { Knight: 10, Mystic: 10 },
      Ninja: { Assassin: 10, Berserker: 10 },
      Sage: { "White Mage": 10, Mystic: 10 },
    });
  });

  it("agrees with itself: the requirement table lists exactly the parents the class table names", () => {
    Object.entries(TIER_2_PARENT).forEach(([name, parent]) => {
      expect(Object.keys(JOB_UNLOCK_REQUIREMENTS[name])).toEqual([parent]);
      expect(byName(parent).tier).toBe(1);
    });
    Object.entries(TIER_3_PARENTS).forEach(([name, parents]) => {
      expect(Object.keys(JOB_UNLOCK_REQUIREMENTS[name])).toEqual(parents);
      parents.forEach((parent) => expect(byName(parent).tier).toBe(2));
    });
    JOB_CLASS_OPTIONS.filter((job) => job.tier === 1).forEach((job) => expect(JOB_UNLOCK_REQUIREMENTS[job.name]).toBeUndefined());
  });
});

describe("unlocking", () => {
  it("seals an advanced class until its one parent is level 10", () => {
    expect(isClassUnlocked("Knight", {})).toBe(false);
    expect(isClassUnlocked("Knight", { Warrior: 9 })).toBe(false);
    expect(isClassUnlocked("Knight", { Warrior: 10 })).toBe(true);
    expect(isClassUnlocked("Berserker", { Warrior: 10 })).toBe(true);
    expect(isClassUnlocked("Mystic", { Warrior: 10 })).toBe(false);
    expect(isClassUnlocked("Mystic", { Monk: 14 })).toBe(true);
  });

  it("opens both children of a parent together, and neither child opens the other's", () => {
    const levels = { Mage: 10 };
    expect(isClassUnlocked("White Mage", levels)).toBe(true);
    expect(isClassUnlocked("Black Mage", levels)).toBe(true);
    expect(isClassUnlocked("Sage", levels)).toBe(false);
  });

  it("seals a crown class until BOTH advanced parents are level 10", () => {
    expect(isClassUnlocked("Paladin", { Knight: 10 })).toBe(false);
    expect(isClassUnlocked("Paladin", { Knight: 10, Mystic: 9 })).toBe(false);
    expect(isClassUnlocked("Paladin", { Knight: 10, Mystic: 10 })).toBe(true);
    expect(isClassUnlocked("Ninja", { Assassin: 10, Berserker: 10 })).toBe(true);
    expect(isClassUnlocked("Ninja", { Assassin: 10, Ranger: 10 })).toBe(false);
    expect(isClassUnlocked("Sage", { "White Mage": 10, Mystic: 10 })).toBe(true);
    expect(isClassUnlocked("Sage", { "White Mage": 10, "Black Mage": 10 })).toBe(false);
  });

  it("no longer opens a crown class from the old pair of base classes", () => {
    expect(isClassUnlocked("Paladin", { Warrior: 10, Monk: 10 })).toBe(false);
    expect(isClassUnlocked("Ninja", { Thief: 10, Warrior: 10 })).toBe(false);
    expect(isClassUnlocked("Sage", { Mage: 10, Monk: 10 })).toBe(false);
  });

  it("reads class names that contain a space, however they are cased", () => {
    expect(isClassUnlocked("white mage", { mage: 10 })).toBe(true);
    expect(isClassUnlocked("MARTIAL ARTIST", { Monk: 10 })).toBe(true);
    expect(isClassUnlocked("Sage", { "white mage": 10, mystic: 10 })).toBe(true);
    expect(canonicalClassName("black mage")).toBe("Black Mage");
    expect(canonicalClassName("  martial artist ")).toBe("Martial Artist");
    expect(classLevelsOf({ "White Mage": { level: 10 } })).toEqual({ "White Mage": 10 });
  });

  it("prints every requirement the way the picker shows it", () => {
    expect(classRequirementLabel("Knight")).toBe("Warrior 10");
    expect(classRequirementLabel("White Mage")).toBe("Mage 10");
    expect(classRequirementLabel("Martial Artist")).toBe("Monk 10");
    expect(classRequirementLabel("Paladin")).toBe("Knight 10 + Mystic 10");
    expect(classRequirementLabel("Ninja")).toBe("Assassin 10 + Berserker 10");
    expect(classRequirementLabel("Sage")).toBe("White Mage 10 + Mystic 10");
    BASE.forEach((name) => expect(classRequirementLabel(name)).toBe(""));
  });
});

describe("base stats and boosts", () => {
  it("raises a parent's stats by 10 % rounded up, with integer maths (10 -> 11, never 12)", () => {
    expect(raiseBaseStats({ a: 10, b: 20, c: 8, d: 2, e: 0 })).toEqual({ a: 11, b: 22, c: 9, d: 3, e: 0 });
    expect(raiseBaseStats(undefined)).toEqual({});
  });

  it("gives every advanced class its parent's stats +10 % and the parent's boosts", () => {
    Object.entries(TIER_2_PARENT).forEach(([name, parent]) => {
      expect(byName(name).baseStats).toEqual(raiseBaseStats(byName(parent).baseStats));
      expect(byName(name).statBoosts).toEqual(byName(parent).statBoosts);
      // a copy: editing one class's boosts can never move its parent's
      expect(byName(name).statBoosts).not.toBe(byName(parent).statBoosts);
    });
    expect(byName("Knight").baseStats).toMatchObject({ strength: 14, endurance: 11, defense: 9, guts: 9, presence: 6, mastery: 3 });
    expect(byName("Black Mage").baseStats).toMatchObject({ intelligence: 14, wisdom: 11, focus: 7 });
    expect(byName("Assassin").baseStats).toMatchObject({ agility: 14, flow: 11, luck: 11 });
    expect(byName("Mystic").baseStats).toMatchObject({ focus: 11, endurance: 11, wisdom: 9 });
  });

  it("gives every crown class the average of its two advanced parents and the union of their boosts", () => {
    Object.entries(TIER_3_PARENTS).forEach(([name, [first, second]]) => {
      expect(byName(name).baseStats).toEqual(averageBaseStats(byName(first).baseStats, byName(second).baseStats));
      expect(byName(name).statBoosts).toEqual(combineStatBoosts(byName(first).statBoosts, byName(second).statBoosts));
    });
    expect(byName("Paladin").baseStats?.strength).toBe(12); // (Knight 14 + Mystic 9) / 2, rounded
    expect(byName("Sage").baseStats?.intelligence).toBe(10); // (White Mage 14 + Mystic 5) / 2, rounded
    expect(byName("Ninja").statBoosts).toEqual(expect.arrayContaining([{ stat: "agility", amount: 2 }, { stat: "strength", amount: 2 }]));
  });

  it("keeps every class's stats whole numbers over the same 15 stats", () => {
    const stats = Object.keys(byName("Warrior").baseStats!).sort();
    JOB_CLASS_OPTIONS.forEach((job) => {
      expect(Object.keys(job.baseStats!).sort()).toEqual(stats);
      Object.values(job.baseStats!).forEach((value) => expect(Number.isInteger(value)).toBe(true));
    });
  });
});

describe("pillars", () => {
  it("gives each advanced class its three pillars (primary, secondary, tertiary)", () => {
    const pillars = (name: string) => [byName(name).primaryPillar, byName(name).secondaryPillar, byName(name).tertiaryPillar];
    expect(pillars("Knight")).toEqual(["physical", "eternal", "relational"]);
    expect(pillars("Berserker")).toEqual(["physical", "eternal", "vibrational"]);
    expect(pillars("White Mage")).toEqual(["mental", "relational", "eternal"]);
    expect(pillars("Black Mage")).toEqual(["mental", "vibrational", "eternal"]);
    expect(pillars("Assassin")).toEqual(["vibrational", "physical", "eternal"]);
    expect(pillars("Ranger")).toEqual(["vibrational", "relational", "eternal"]);
    expect(pillars("Martial Artist")).toEqual(["physical", "vibrational", "mental"]);
    expect(pillars("Mystic")).toEqual(["mental", "vibrational", "physical"]);
  });

  it("leaves the crown classes' pillars as they were", () => {
    const pillars = (name: string) => [byName(name).primaryPillar, byName(name).secondaryPillar, byName(name).tertiaryPillar];
    expect(pillars("Paladin")).toEqual(["physical", "mental", "eternal"]);
    expect(pillars("Ninja")).toEqual(["vibrational", "physical", "relational"]);
    expect(pillars("Sage")).toEqual(["mental", "vibrational", "eternal"]);
  });

  it("never repeats a pillar inside one class", () => {
    JOB_CLASS_OPTIONS.forEach((job) => {
      expect(new Set([job.primaryPillar, job.secondaryPillar, job.tertiaryPillar]).size).toBe(3);
    });
  });
});

describe("HP and MP", () => {
  it("has a row in the base table and the class-level table for every class", () => {
    JOB_CLASS_OPTIONS.forEach((job) => {
      expect(JOB_CLASS_BASE_STATS[job.name]).toBeDefined();
      expect(CLASS_LEVEL_BONUSES[job.name]).toBeDefined();
    });
  });

  it("keeps each advanced class near its parent: HP and MP within 15 %, growth within 2", () => {
    Object.entries(TIER_2_PARENT).forEach(([name, parent]) => {
      const child = JOB_CLASS_BASE_STATS[name];
      const base = JOB_CLASS_BASE_STATS[parent];
      expect(Math.abs(child.hp - base.hp)).toBeLessThanOrEqual(Math.ceil(base.hp * 0.15));
      expect(Math.abs(child.mp - base.mp)).toBeLessThanOrEqual(Math.ceil(base.mp * 0.15));
      expect(Math.abs(child.hpGrowth - base.hpGrowth)).toBeLessThanOrEqual(2);
      expect(Math.abs(child.mpGrowth - base.mpGrowth)).toBeLessThanOrEqual(2);
    });
  });

  it("leaves the crown classes' HP and MP exactly where heroes already have them", () => {
    expect([JOB_CLASS_BASE_STATS.Paladin.hp, JOB_CLASS_BASE_STATS.Paladin.mp]).toEqual([48, 18]);
    expect([JOB_CLASS_BASE_STATS.Ninja.hp, JOB_CLASS_BASE_STATS.Ninja.mp]).toEqual([43, 15]);
    expect([JOB_CLASS_BASE_STATS.Sage.hp, JOB_CLASS_BASE_STATS.Sage.mp]).toEqual([35, 33]);
    expect(CLASS_LEVEL_BONUSES.Paladin).toEqual({ hp: 6, mp: 2 });
    expect(CLASS_LEVEL_BONUSES.Ninja).toEqual({ hp: 3, mp: 3 });
    expect(CLASS_LEVEL_BONUSES.Sage).toEqual({ hp: 2, mp: 6 });
  });

  it("pays HP/MP per class level by the class, for names with a space too", () => {
    expect(getClassStatBonus("Knight", 10)).toEqual({ hp: 60, mp: 10 });
    expect(getClassStatBonus("Berserker", 10)).toEqual({ hp: 60, mp: 0 });
    expect(getClassStatBonus("White Mage", 10)).toEqual({ hp: 20, mp: 50 });
    expect(getClassStatBonus("Black Mage", 10)).toEqual({ hp: 10, mp: 60 });
    expect(getClassStatBonus("Assassin", 10)).toEqual({ hp: 40, mp: 20 });
    expect(getClassStatBonus("Ranger", 10)).toEqual({ hp: 30, mp: 30 });
    expect(getClassStatBonus("Martial Artist", 10)).toEqual({ hp: 50, mp: 20 });
    expect(getClassStatBonus("Mystic", 10)).toEqual({ hp: 30, mp: 40 });
    // a class the table has never heard of still gets the default
    expect(getClassStatBonus("Bard", 10)).toEqual({ hp: 20, mp: 20 });
  });

  it("leans each way its parent leans: Berserker HP, Black Mage MP", () => {
    expect(CLASS_LEVEL_BONUSES.Berserker.hp).toBeGreaterThanOrEqual(CLASS_LEVEL_BONUSES.Warrior.hp);
    expect(CLASS_LEVEL_BONUSES["Black Mage"].mp).toBeGreaterThanOrEqual(CLASS_LEVEL_BONUSES.Mage.mp);
    expect(JOB_CLASS_BASE_STATS["Black Mage"].mp).toBeGreaterThan(JOB_CLASS_BASE_STATS["White Mage"].mp);
    expect(JOB_CLASS_BASE_STATS.Berserker.hp).toBeGreaterThan(JOB_CLASS_BASE_STATS.Knight.hp);
  });
});

describe("the Codex copy", () => {
  it("gives every class a creed, three real-life lines and one description sentence", () => {
    ADVANCED.forEach((name) => {
      const job = byName(name);
      expect(job.creed.length).toBeGreaterThan(0);
      expect(job.realLife).toHaveLength(3);
      job.realLife.forEach((line) => expect(line.length).toBeGreaterThan(0));
      expect(job.description).toMatch(/[.]$/);
      // one sentence: the only full stop is the last character
      expect((job.description ?? "").slice(0, -1)).not.toMatch(/[.!?]/);
    });
  });

  it("says what the owner wrote for the creeds", () => {
    expect(byName("Knight").creed).toBe("Holds the line.");
    expect(byName("Berserker").creed).toBe("All in, every time.");
    expect(byName("White Mage").creed).toBe("Heals the party.");
    expect(byName("Black Mage").creed).toBe("Burns through the list.");
    expect(byName("Assassin").creed).toBe("In and out before anyone notices.");
    expect(byName("Ranger").creed).toBe("Patient, then precise.");
    expect(byName("Martial Artist").creed).toBe("Practice is the point.");
    expect(byName("Mystic").creed).toBe("Calm sees further.");
  });

  it("names the new parents in the crown classes' descriptions", () => {
    expect(byName("Paladin").description).toMatch(/Knight.*Mystic/);
    expect(byName("Ninja").description).toMatch(/Assassin.*Berserker/);
    expect(byName("Sage").description).toMatch(/White Mage.*Mystic/);
  });
});

describe("icons", () => {
  const fontAwesome = path.resolve(__dirname, "../../src/assets/fonts/font-awesome");
  const allCss = fs.readFileSync(path.join(fontAwesome, "css/all.css"), "utf8");

  it("gives each new class the icon the brief chose", () => {
    expect(ADVANCED.map((name) => [name, byName(name).icon])).toEqual([
      ["Knight", "fa-helmet-battle"],
      ["Berserker", "fa-axe-battle"],
      ["White Mage", "fa-hand-holding-medical"],
      ["Black Mage", "fa-meteor"],
      ["Assassin", "fa-dagger"],
      ["Ranger", "fa-bow-arrow"],
      ["Martial Artist", "fa-hand-rock"],
      ["Mystic", "fa-eye"],
    ]);
  });

  it("only uses icons that ship in the bundled Font Awesome duotone set", () => {
    JOB_CLASS_OPTIONS.forEach((job) => {
      expect(job.icon).toMatch(/^fa-[a-z0-9-]+$/);
      expect(allCss).toContain(`.${job.icon}:before`);
      expect(fs.existsSync(path.join(fontAwesome, "svgs/duotone", `${job.icon.slice(3)}.svg`))).toBe(true);
    });
  });

  it("never gives a child the exact icon of its base parent", () => {
    Object.entries(TIER_2_PARENT).forEach(([name, parent]) => expect(byName(name).icon).not.toBe(byName(parent).icon));
  });

  it("gives every advanced class an icon of its own", () => {
    const icons = [...ADVANCED, ...CROWN.filter((name) => name !== "Sage")].map((name) => byName(name).icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});

describe("a hero levelling an advanced class", () => {
  let store: ReturnType<typeof useUserStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useUserStore();
    store.addUser({
      id: "hero-1",
      avatar: "003-gamer",
      name: { nick: "Max" },
      jobClass: "Knight",
      stats: {
        hp: { now: 50, max: 50, min: 0 },
        mp: { now: 10, max: 10, min: 0 },
        classes: { Knight: { level: 1, xp: 0, unlocked: true } },
      },
    });
  });

  it("grows the class under its own name and pays the class-level HP/MP like a base class", () => {
    const result = store.updateClassXp("hero-1", "Knight", getXpForLevel(2));
    const stats = store.users["hero-1"].stats;

    expect(result).toMatchObject({ didLevelUp: true, oldLevel: 1, newLevel: 2, jobClassId: "Knight" });
    expect(stats.classes.Knight.level).toBe(2);
    // Knight pays 6 HP and 1 MP per class level
    expect(stats.hp.max).toBe(50 + (getClassStatBonus("Knight", 2).hp - getClassStatBonus("Knight", 1).hp));
    expect(stats.hp.max).toBe(56);
    expect(stats.mp.max).toBe(11);
  });

  it("keys a class with a space the same way, and unlocks a crown class when both parents reach 10", () => {
    store.users["hero-1"].jobClass = "White Mage";
    store.users["hero-1"].stats.classes = {
      "White Mage": { level: 9, xp: getXpForLevel(10) - 100, unlocked: true },
      Mystic: { level: 10, xp: getXpForLevel(10), unlocked: true },
    };

    const result = store.updateClassXp("hero-1", "White Mage", 100);
    const classes = store.users["hero-1"].stats.classes;

    expect(result).toMatchObject({ didLevelUp: true, oldLevel: 9, newLevel: 10, jobClassId: "White Mage" });
    expect(classes["White Mage"].level).toBe(10);
    expect(classes.Sage).toMatchObject({ unlocked: true });
    expect(isClassUnlocked("Sage", classLevelsOf(classes))).toBe(true);
    expect(store.setJobClass("hero-1", "Sage")).toBe(true);
    expect(store.users["hero-1"].jobClass).toBe("Sage");
  });

  it("unlocks both children of a base class at its level 10", () => {
    store.users["hero-1"].jobClass = "Warrior";
    store.users["hero-1"].stats.classes = { Warrior: { level: 9, xp: getXpForLevel(10) - 10, unlocked: true } };

    store.updateClassXp("hero-1", "Warrior", 10);
    const classes = store.users["hero-1"].stats.classes;

    expect(classes.Knight).toMatchObject({ unlocked: true });
    expect(classes.Berserker).toMatchObject({ unlocked: true });
    expect(classes["White Mage"]).toBeUndefined();
    expect(store.setJobClass("hero-1", "Berserker")).toBe(true);
  });

  it("keeps a hero's current class when the tree changes, but seals what the old pair rule had opened", () => {
    store.users["hero-1"].jobClass = "Paladin";
    store.users["hero-1"].stats.classes = { Warrior: { level: 10 }, Monk: { level: 10 }, Paladin: { level: 4 } };

    // the hero keeps playing Paladin; setJobClass refuses sealed classes and never rewrites the current one
    expect(store.users["hero-1"].jobClass).toBe("Paladin");
    expect(store.setJobClass("hero-1", "Ninja")).toBe(false);
    expect(store.setJobClass("hero-1", "Paladin")).toBe(false);
    expect(store.users["hero-1"].jobClass).toBe("Paladin");
    // ... but a fresh pick of Paladin needs the new pair
    expect(isClassUnlocked("Paladin", classLevelsOf(store.users["hero-1"].stats.classes))).toBe(false);
  });
});

describe("passives of the whole tree", () => {
  it("gives every class in the tree a blurb of its own", () => {
    const blurbs = JOB_CLASS_OPTIONS.map((job) => classPassive(job.name).blurb);
    expect(new Set(blurbs).size).toBe(blurbs.length);
    blurbs.forEach((blurb) => expect(blurb).not.toBe(classPassive("default").blurb));
  });
});
