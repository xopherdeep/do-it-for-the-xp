import { readFileSync } from "fs";
import { resolve } from "path";
import { FA_ICON_ALIASES, faIconName } from "@/lib/services/items/faIcons";

/**
 * The app ships Font Awesome Pro 5.15.4 (src/assets/fonts/font-awesome). Icon names from Font Awesome 6 render as
 * blank glyphs, so the few that reached stored data are aliased to their FA 5 name at render time.
 */
const FA5_CSS = readFileSync(resolve(__dirname, "../../src/assets/fonts/font-awesome/css/all.css"), "utf8");
const hasFa5Icon = (name: string) => new RegExp(`\\.fa-${name}:before`).test(FA5_CSS);

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

  it("only aliases names the font lacks, and only to names it has", () => {
    for (const [from, to] of Object.entries(FA_ICON_ALIASES)) {
      expect(hasFa5Icon(from)).toBe(false);
      expect(hasFa5Icon(to)).toBe(true);
    }
  });
});
