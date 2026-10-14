import {
  allowedGameStyle,
  GAME_STYLE_NAMES,
  GAME_STYLES,
  isProGameStyle,
  loadThemeChoice,
  saveThemeChoice,
} from "@/lib/utils/gameStyle";

describe("gameStyle", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to Nintendo sounds and the Earthbound game style", () => {
    expect(loadThemeChoice()).toEqual({ ui: "nintendo", rpg: "earthbound" });
  });

  it("keeps the chosen game style across reloads", () => {
    saveThemeChoice({ ui: "sony", rpg: "zelda" });
    expect(loadThemeChoice()).toEqual({ ui: "sony", rpg: "zelda" });
  });

  it("falls back to the default for an unknown or broken save", () => {
    localStorage.setItem("xp.themeChoice", JSON.stringify({ ui: "sega", rpg: "streetFighter" }));
    expect(loadThemeChoice()).toEqual({ ui: "nintendo", rpg: "earthbound" });
    localStorage.setItem("xp.themeChoice", "{not json");
    expect(loadThemeChoice()).toEqual({ ui: "nintendo", rpg: "earthbound" });
  });

  it("keeps a Pro game style across reloads", () => {
    saveThemeChoice({ ui: "nintendo", rpg: "dragonQuest" });
    expect(loadThemeChoice().rpg).toBe("dragonQuest");
  });

  it("names every style", () => {
    GAME_STYLES.forEach((style) => expect(GAME_STYLE_NAMES[style]).toBeTruthy());
  });

  it("keeps the four original styles free and the new ones behind Pro", () => {
    expect(["earthbound", "chronoTrigger", "finalFantasy", "zelda"].some(isProGameStyle)).toBe(false);
    expect(isProGameStyle("pokemon")).toBe(true);
    expect(allowedGameStyle("pokemon", false)).toBe("earthbound");
    expect(allowedGameStyle("pokemon", true)).toBe("pokemon");
    expect(allowedGameStyle("zelda", false)).toBe("zelda");
  });
});
