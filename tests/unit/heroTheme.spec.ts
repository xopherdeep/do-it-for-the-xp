import { isHeroTheme, sameTheme, themeOf } from "@/lib/services/profile/heroTheme";
import { nameFromFull } from "@/lib/utils/User/user";
import User from "@/lib/utils/User/user";
import Stats from "@/lib/utils/User/stats";

describe("heroTheme", () => {
  it("knows a game style with menu sounds, and nothing else", () => {
    expect(isHeroTheme({ rpg: "zelda", ui: "sony" })).toBe(true);
    expect(isHeroTheme({ rpg: "pokemon", ui: "nintendo" })).toBe(true);
    expect(isHeroTheme({ rpg: "bogus", ui: "sony" })).toBe(false);
    expect(isHeroTheme({ rpg: "zelda", ui: "xbox" })).toBe(false);
    expect(isHeroTheme(null)).toBe(false);
  });

  it("reads the theme a profile holds, or null for an old profile", () => {
    expect(themeOf({ themeChoice: { rpg: "zelda", ui: "sony", extra: 1 } })).toEqual({ rpg: "zelda", ui: "sony" });
    expect(themeOf({})).toBeNull();
    expect(themeOf({ themeChoice: { rpg: "zelda" } })).toBeNull();
  });

  it("compares themes", () => {
    expect(sameTheme({ rpg: "zelda", ui: "sony" }, { rpg: "zelda", ui: "sony" })).toBe(true);
    expect(sameTheme({ rpg: "zelda", ui: "sony" }, { rpg: "zelda", ui: "nintendo" })).toBe(false);
  });

  it("is kept on a new hero only when valid", () => {
    const base = {
      name: { full: "Sam" }, avatar: "001-gamer", favoriteFood: "Pizza", favoriteThing: "x", jobClass: "Ranger",
      isAdult: false, stats: new Stats(),
    };
    expect(new User({ ...base, themeChoice: { rpg: "zelda", ui: "sony" } }).themeChoice).toEqual({ rpg: "zelda", ui: "sony" });
    expect("themeChoice" in new User({ ...base, themeChoice: { rpg: "nope", ui: "sony" } })).toBe(false);
    expect(nameFromFull({ full: "Sam" }).first).toBe("Sam");
  });
});
