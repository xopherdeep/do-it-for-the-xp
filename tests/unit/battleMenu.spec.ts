import { JOB_CLASS_OPTIONS } from "@/constants/JOB_CLASS_OPTIONS";
import { CLASS_WEAPON_ICONS, DEFAULT_TACKLE_ICON, tackleIcon } from "@/app/Console/BattleField/battle/battleMenu";

/** Tackle wears the hero's class weapon; every class has one, and a hero without a class tackles with a fist. */
describe("battleMenu: the Tackle weapon", () => {
  it("every class in JOB_CLASS_OPTIONS has a weapon", () => {
    const missing = JOB_CLASS_OPTIONS.map((job) => job.name).filter((name) => tackleIcon(name) === DEFAULT_TACKLE_ICON && name !== "Monk");
    expect(missing).toEqual([]);
    expect(Object.keys(CLASS_WEAPON_ICONS)).toHaveLength(JOB_CLASS_OPTIONS.length);
  });

  it("tackleIcon ignores case and spacing", () => {
    expect(tackleIcon("warrior")).toBe("axe");
    expect(tackleIcon("Warrior")).toBe("axe");
    expect(tackleIcon("White Mage")).toBe("hand-holding-magic");
    expect(tackleIcon("white-mage")).toBe("hand-holding-magic");
    expect(tackleIcon("Martial Artist")).toBe("hand-rock");
    expect(tackleIcon("Ninja")).toBe("sickle");
  });

  it("no class or an unknown class tackles with a fist", () => {
    expect(DEFAULT_TACKLE_ICON).toBe("fist-raised");
    expect(tackleIcon(undefined)).toBe("fist-raised");
    expect(tackleIcon("")).toBe("fist-raised");
    expect(tackleIcon("Chef")).toBe("fist-raised");
    expect(tackleIcon({ name: "Warrior" })).toBe("fist-raised");
  });
});
