import { readFileSync } from "fs";
import { resolve } from "path";
import { FA_ICON_ALIASES, faIconName, faTintStyle } from "@/lib/services/items/faIcons";

/**
 * The app ships Font Awesome Pro 5.15.4 (src/assets/fonts/font-awesome). Icon names from Font Awesome 6 render as
 * blank glyphs, so the few that reached stored data are aliased to their FA 5 name at render time.
 */
const FA5_CSS = readFileSync(resolve(__dirname, "../../src/assets/fonts/font-awesome/css/all.css"), "utf8");
const hasFa5Icon = (name: string) => new RegExp(`\\.fa-${name}:before`).test(FA5_CSS);

/** Every `icon: "fa-..."` literal in a source file, commented-out entries included: they get uncommented as-is. */
const iconLiteralsIn = (file: string): string[] => {
  const source = readFileSync(resolve(__dirname, "../../src", file), "utf8");
  return [...source.matchAll(/icon: "fa-([a-z0-9-]+)"/g)].map((m) => m[1]);
};

describe("faIconName", () => {
  it("strips the fa- prefix and keeps a name the font has", () => {
    expect(faIconName("flask-potion")).toBe("flask-potion");
    expect(faIconName("fa-flask-potion")).toBe("flask-potion");
    expect(faIconName("  fa-scroll ")).toBe("scroll");
  });

  it("renames the Font Awesome 6 flask names to the FA 5 glyphs", () => {
    expect(faIconName("flask-round-potion")).toBe("flask-potion");
    expect(faIconName("fa-flask-round-potion")).toBe("flask-potion");
    expect(faIconName("flask-vial")).toBe("flask");
    expect(faIconName("droplet")).toBe("tint");
  });

  it("gives back an empty string for nothing", () => {
    expect(faIconName(undefined)).toBe("");
    expect(faIconName("")).toBe("");
  });

  it("turns a tint into the duotone colour variables, and nothing into nothing", () => {
    expect(faTintStyle({ primary: "red", secondary: "pink" })).toEqual({
      "--fa-primary-color": "var(--xp-color-red)",
      "--fa-secondary-color": "var(--xp-color-pink)",
      "--fa-secondary-opacity": "1",
    });
    expect(faTintStyle(null)).toEqual({});
    expect(faTintStyle(undefined)).toEqual({});
  });

  it("only aliases names the font lacks, and only to names it has", () => {
    for (const [from, to] of Object.entries(FA_ICON_ALIASES)) {
      expect(hasFa5Icon(from)).toBe(false);
      expect(hasFa5Icon(to)).toBe(true);
    }
  });
});

describe("the constants' icon literals", () => {
  it.each(["constants/JOB_CLASS_OPTIONS.ts", "constants/FOOD_OPTIONS.ts"])("%s names glyphs the font has", (file) => {
    const names = iconLiteralsIn(file);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !hasFa5Icon(name))).toEqual([]);
  });
});
