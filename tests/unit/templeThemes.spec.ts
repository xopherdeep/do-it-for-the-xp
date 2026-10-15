import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
import { TEMPLE_THEMES, TEMPLE_THEME_KEYS, isTempleTheme, templeThemeLabel } from "@/lib/services/temples/templeThemes";

describe("temple themes", () => {
  it("names the nine temple elements, one entry each, in the editor's order", () => {
    expect(TEMPLE_THEME_KEYS).toEqual(["wind", "earth", "water", "fire", "ice", "light", "shadow", "moon", "storm"]);
    expect(Object.keys(TEMPLE_THEMES)).toEqual([...TEMPLE_THEME_KEYS]);
    for (const key of TEMPLE_THEME_KEYS) expect(TEMPLE_THEMES[key].key).toBe(key);
  });

  it("is exactly the set of elements the nine shipped temples carry", () => {
    const shipped = Object.values(TEMPLE_METADATA).map((t) => t.element).filter((e) => e !== "none");
    expect(shipped.sort()).toEqual([...TEMPLE_THEME_KEYS].sort());
  });

  it("labels each theme with its chores and its element, e.g. Kitchen · Shadow", () => {
    expect(TEMPLE_THEMES.shadow.label).toBe("Kitchen · Shadow");
    expect(TEMPLE_THEMES.water.label).toBe("Bathroom · Water");
    expect(TEMPLE_THEMES.light.label).toBe("School · Light");
    for (const info of Object.values(TEMPLE_THEMES)) {
      expect(info.label).toBe(`${info.focus} · ${info.element}`);
      expect(info.element.toLowerCase()).toBe(info.key);
    }
  });

  it("gives every theme a one-line blurb that ends like a sentence", () => {
    for (const info of Object.values(TEMPLE_THEMES)) {
      expect(info.blurb.length).toBeGreaterThan(10);
      expect(info.blurb).not.toContain("\n");
      expect(info.blurb.endsWith(".")).toBe(true);
    }
    expect(new Set(Object.values(TEMPLE_THEMES).map((t) => t.blurb)).size).toBe(9);
  });

  it("tells a theme from a beast's art element or anything else", () => {
    expect(isTempleTheme("storm")).toBe(true);
    for (const other of ["lightning", "neutral", "none", "", "Shadow", 3, null, undefined]) expect(isTempleTheme(other)).toBe(false);
    expect(templeThemeLabel("shadow")).toBe("Kitchen · Shadow");
    expect(templeThemeLabel("lightning")).toBe("");
    expect(templeThemeLabel(undefined)).toBe("");
  });
});
