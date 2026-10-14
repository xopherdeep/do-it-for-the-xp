import { loadThemeChoice, saveThemeChoice } from "@/lib/utils/gameStyle";

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
    localStorage.setItem("xp.themeChoice", JSON.stringify({ ui: "sega", rpg: "pokemon" }));
    expect(loadThemeChoice()).toEqual({ ui: "nintendo", rpg: "earthbound" });
    localStorage.setItem("xp.themeChoice", "{not json");
    expect(loadThemeChoice()).toEqual({ ui: "nintendo", rpg: "earthbound" });
  });
});
