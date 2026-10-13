import type { Achievement } from "@/lib/databases/AchievementDb";
import AchievementDb from "@/lib/databases/AchievementDb";
import {
  MAX_ESTIMATED_MINUTES,
  activeSuggestion,
  beastQuestPatch,
  beastToAdopt,
  hasEstimatedMinutes,
  isBeastless,
  parseMinutes,
  suggestionsFor,
  takesSuggestion,
  withoutUnsetMinutes,
} from "@/lib/services/quests/questFormRules";
import { questMinutes } from "@/lib/services/quests/questClock";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";

const quest = (patch: Partial<Achievement> = {}): Achievement => ({
  ...AchievementDb.getDefault(),
  achievementName: "Load the dishwasher",
  ...patch,
});

const dishGoblin = BEAST_LIBRARY.find((b) => b.name === "Dish Goblin")!;
const socktopus = BEAST_LIBRARY.find((b) => b.name === "Socktopus")!;

describe("the quest form's minutes", () => {
  it("follows the difficulty until the parent edits it", () => {
    const fresh = quest({ difficulty: 1 });
    expect(hasEstimatedMinutes(fresh)).toBe(false);
    expect(questMinutes(fresh)).toBe(3);
    expect(questMinutes({ ...fresh, difficulty: 5 })).toBe(12);
    expect(questMinutes({ ...fresh, difficulty: 13 })).toBe(30);
  });

  it("stays put once edited, whatever the slider does", () => {
    const edited = quest({ difficulty: 2, estimatedMinutes: 17 });
    expect(hasEstimatedMinutes(edited)).toBe(true);
    expect(questMinutes({ ...edited, difficulty: 8 })).toBe(17);
    expect(questMinutes({ ...edited, difficulty: 1 })).toBe(17);
  });

  it("goes back to the default when the estimate is dropped", () => {
    const edited = quest({ difficulty: 8, estimatedMinutes: 45 });
    const { estimatedMinutes, ...reset } = edited;
    expect(estimatedMinutes).toBe(45);
    expect(hasEstimatedMinutes(reset as Achievement)).toBe(false);
    expect(questMinutes(reset as Achievement)).toBe(20);
  });

  it("reads the field's text: whole minutes of at least one, at most a day", () => {
    expect(parseMinutes("12")).toBe(12);
    expect(parseMinutes(12)).toBe(12);
    expect(parseMinutes("7.6")).toBe(8);
    expect(parseMinutes(" 20 ")).toBe(20);
    expect(parseMinutes("99999")).toBe(MAX_ESTIMATED_MINUTES);
  });

  it("ignores text that is no usable number, so a half-typed field changes nothing", () => {
    expect(parseMinutes("")).toBeNull();
    expect(parseMinutes("abc")).toBeNull();
    expect(parseMinutes("0")).toBeNull();
    expect(parseMinutes("0.2")).toBeNull();
    expect(parseMinutes("-5")).toBeNull();
    expect(parseMinutes(null)).toBeNull();
    expect(parseMinutes(undefined)).toBeNull();
  });

  it("drops an unusable estimate from the record that is saved, and keeps a real one", () => {
    expect(withoutUnsetMinutes(quest({ estimatedMinutes: 0 }))).not.toHaveProperty("estimatedMinutes");
    expect(withoutUnsetMinutes(quest({ estimatedMinutes: Number.NaN }))).not.toHaveProperty("estimatedMinutes");
    expect(withoutUnsetMinutes(quest())).not.toHaveProperty("estimatedMinutes");
    expect(withoutUnsetMinutes(quest({ estimatedMinutes: 25 })).estimatedMinutes).toBe(25);
  });

  it("does not change the quest it is given", () => {
    const original = quest({ estimatedMinutes: 0 });
    withoutUnsetMinutes(original);
    expect(original.estimatedMinutes).toBe(0);
  });
});

describe("the beast the library suggests for a quest", () => {
  it("is for a quest with no beast that is not a chain", () => {
    expect(isBeastless(quest())).toBe(true);
    expect(isBeastless(quest({ beastId: "beast-dish-goblin" }))).toBe(false);
    expect(isBeastless(quest({ adventureType: "chain" }))).toBe(false);
    expect(isBeastless(quest({ adventureType: "beast" }))).toBe(false);
  });

  it("suggests by the quest's name, best first", () => {
    const names = suggestionsFor(quest()).map((b) => b.name);
    expect(names[0]).toBe("Dish Goblin");
    expect(suggestionsFor(quest({ achievementName: "Match the socks" }))[0].name).toBe("Socktopus");
  });

  it("suggests nothing for a quest that already has a beast, is a chain, or is no chore", () => {
    expect(suggestionsFor(quest({ beastId: "beast-socktopus" }))).toEqual([]);
    expect(suggestionsFor(quest({ adventureType: "chain" }))).toEqual([]);
    expect(suggestionsFor(quest({ achievementName: "Defeat the final boss of Hyrule" }))).toEqual([]);
    expect(suggestionsFor(quest({ achievementName: "" }))).toEqual([]);
  });

  it("offers the top suggestion, or the one the parent picked instead", () => {
    expect(activeSuggestion(quest())?.name).toBe("Dish Goblin");
    expect(activeSuggestion(quest(), socktopus)?.name).toBe("Socktopus");
  });

  it("is withdrawn when the parent chose no beast, or the quest has one", () => {
    expect(activeSuggestion(quest({ noBeast: true }))).toBeNull();
    expect(activeSuggestion(quest({ noBeast: true }), socktopus)).toBeNull();
    expect(activeSuggestion(quest({ beastId: "beast-socktopus" }), dishGoblin)).toBeNull();
  });

  it("is taken only by a live quest: a draft keeps it as a suggestion", () => {
    expect(takesSuggestion(quest({ draft: false }), dishGoblin)).toBe(dishGoblin);
    expect(takesSuggestion(quest({ draft: true }), dishGoblin)).toBeNull();
    expect(takesSuggestion(quest({ draft: false }), null)).toBeNull();
    expect(takesSuggestion(quest({ draft: false, noBeast: true }), dishGoblin)).toBeNull();
    expect(takesSuggestion(quest({ draft: false, beastId: "beast-x" }), dishGoblin)).toBeNull();
  });

  it("makes the quest a beast quest with the library beast's id", () => {
    expect(beastQuestPatch(dishGoblin)).toEqual({ beastId: "beast-dish-goblin", adventureType: "beast", noBeast: false });
    const saved = { ...quest(), ...beastQuestPatch(dishGoblin) };
    expect(saved.beastId).toBe(String(dishGoblin.id));
    expect(isBeastless(saved)).toBe(false);
  });

  it("adopts the library beast into the bestiary only when the family does not have it", () => {
    const adopted = beastToAdopt(dishGoblin, []);
    expect(adopted).toMatchObject({ id: dishGoblin.id, name: "Dish Goblin", avatar: dishGoblin.avatar });
    expect(beastToAdopt(dishGoblin, [{ id: dishGoblin.id }])).toBeNull();
    expect(beastToAdopt(dishGoblin, [{ id: "someone-else" }])).not.toBeNull();
  });
});
