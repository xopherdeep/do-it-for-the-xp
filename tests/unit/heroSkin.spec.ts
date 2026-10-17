import { DEFAULT_HERO_SKIN, isHeroSkin, skinOf } from "@/lib/services/profile/heroSkin";
import { NEW_HERO_STEPS } from "@/lib/services/profile/newHeroSteps";

describe("heroSkin", () => {
  it("knows the two skins and nothing else", () => {
    expect(isHeroSkin("retro")).toBe(true);
    expect(isHeroSkin("modern")).toBe(true);
    expect(isHeroSkin("neon")).toBe(false);
    expect(isHeroSkin(undefined)).toBe(false);
  });

  it("reads the skin a profile holds, or null for an old profile", () => {
    expect(skinOf({ skin: "retro" })).toBe("retro");
    expect(skinOf({})).toBeNull();
    expect(skinOf(null)).toBeNull();
    expect(skinOf({ skin: "bogus" })).toBeNull();
  });

  it("defaults to the app's own look", () => {
    expect(DEFAULT_HERO_SKIN).toBe("modern");
  });

  it("is asked right after the hero's face in the wizard", () => {
    const ids = NEW_HERO_STEPS.map((step) => step.id);
    expect(ids.indexOf("style")).toBe(ids.indexOf("look") + 1);
  });
});
