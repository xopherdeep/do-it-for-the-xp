/**
 * The Beast Maker's rules (kid-creations design, section 5): the kid's four screens on the shared wizard shell, the
 * five-chore cap, the three names it suggests, the library look, and the proposal the Game Master receives. Pure
 * rules only; the modal (XpBeastMakerModal.spec) is the screen on top of them.
 */
import {
  addMakerChore,
  libraryLook,
  makerSteps,
  MAX_MAKER_CHORES,
  NAME_SUFFIXES,
  proposedBeast,
  suggestNames,
} from "@/lib/services/creations/beastMaker";
import { newBeastDraft } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import type { BeastDraft } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";

const DRAWING = "data:image/jpeg;base64,AAAA";

const empty = (): BeastDraft => newBeastDraft({ bg1: 1, bg2: 2 });

describe("the steps", () => {
  it("are look, name, chores and ready, each with a title, a picture and the guide's line in the hero's voice", () => {
    const steps = makerSteps("adventure");
    expect(steps.map((step) => step.id)).toEqual(["look", "name", "chores", "ready"]);
    expect(steps.map((step) => step.guide)).toEqual([
      "Show the village your beast.",
      "What is it called?",
      "Which chores bring it down?",
      "Here it stands. Send it to the Game Master.",
    ]);
    expect(makerSteps("simple").map((step) => step.guide)).toEqual([
      "Show me your beast!",
      "What is it called?",
      "What chores beat it?",
      "Send it to a grown-up.",
    ]);
    for (const step of steps) {
      expect(step.title).not.toBe("");
      expect(step.icon).toBeTruthy();
      expect(step.isSkipped).toBeUndefined();
    }
  });

  it("ask for a look, a name and one chore as the Game Master's form does; ready asks nothing", () => {
    const [look, name, chores, ready] = makerSteps("adventure");
    expect(look.isValid(empty())).toBe("Pick a look");
    expect(look.isValid({ ...empty(), avatar: 7 })).toBe(true);
    expect(look.isValid({ ...empty(), localImage: DRAWING })).toBe(true);
    expect(name.isValid(empty())).toBe("Give it a name");
    expect(name.isValid({ ...empty(), name: " Sock Goblin " })).toBe(true);
    expect(chores.isValid(empty())).toBe("Add one chore it loses to");
    expect(chores.isValid({ ...empty(), checklist: ["  ", "Sort the socks"] })).toBe(true);
    expect(ready.isValid(empty())).toBe(true);
  });
});

describe("the chores", () => {
  it("take up to five; the sixth is refused and the list is always a copy", () => {
    expect(MAX_MAKER_CHORES).toBe(5);
    const five = ["a", "b", "c", "d", "e"];
    expect(addMakerChore(["a"], " b ")).toEqual(["a", "b"]);
    expect(addMakerChore(five, "f")).toEqual(five);
    expect(addMakerChore(five, "f")).not.toBe(five);
    expect(addMakerChore(["a"], "   ")).toEqual(["a"]);
  });
});

describe("suggestNames", () => {
  it("names the beast after the thing of the first chore, three ways, never the same suffix twice", () => {
    const names = suggestNames(["Sort the socks", "Fold them"]);
    expect(names).toHaveLength(3);
    expect(new Set(names).size).toBe(3);
    for (const name of names) {
      expect(name.startsWith("Sock ")).toBe(true);
      expect(NAME_SUFFIXES).toContain(name.slice("Sock ".length));
    }
  });

  it("follows the dice, and skips a suffix already used when the dice land on it again", () => {
    expect(suggestNames(["Load the dishwasher"], () => 0)).toEqual(["Dishwasher Beast", "Dishwasher Goblin", "Dishwasher Fiend"]);
    expect(suggestNames(["Vacuum"], () => 0.99)).toEqual(["Vacuum Gremlin", "Vacuum Ghoul", "Vacuum Dragon"]);
  });

  it("names the thing the chore is done to, not what is done to it (the library's Socktopus chore)", () => {
    expect(suggestNames(["Sort and match the socks"], () => 0)[0]).toBe("Sock Beast");
    expect(suggestNames(["Take out the trash!"], () => 0)[0]).toBe("Trash Beast");
  });

  it("offers three stock names when the chores give no word to work with", () => {
    const stock = ["Mystery Beast", "The Lurker", "Chore Fiend"];
    expect(suggestNames([])).toEqual(stock);
    expect(suggestNames(["Do it"])).toEqual(stock);
    expect(suggestNames(["   "])).toEqual(stock);
  });
});

describe("libraryLook", () => {
  it("wears the library beast's portrait and its own battlefield when it has one, letting a drawing go", () => {
    const draft = { ...empty(), localImage: DRAWING };
    expect(libraryLook(draft, { avatar: 12, bg1: 100, bg2: 200 })).toEqual({ ...draft, avatar: 12, localImage: "", bg1: 100, bg2: 200 });
  });

  it("keeps the backdrop the draft was dealt when the library beast has none", () => {
    const draft = empty();
    expect(libraryLook(draft, { avatar: 12 })).toEqual({ ...draft, avatar: 12 });
    expect(draft.avatar).toBe(0);
  });
});

describe("proposedBeast", () => {
  it("is the form's patch, signed by the maker and waiting for a Game Master, with no id of its own yet", () => {
    const now = new Date("2026-10-27T15:00:00.000Z");
    const draft: BeastDraft = { ...newBeastDraft({ bg1: 3, bg2: 4 }), name: " Sock Goblin ", checklist: ["Sort the socks", ""], localImage: DRAWING };
    const beast = proposedBeast(draft, "hero-1", now);
    expect(beast).toEqual({
      name: "Sock Goblin",
      checklist: ["Sort the socks"],
      avatar: 0,
      localImage: DRAWING,
      bg1: 3,
      bg2: 4,
      aspectRatio: 64,
      madeBy: "hero-1",
      proposal: { by: "hero-1", on: "2026-10-27T15:00:00.000Z", state: "proposed" },
    });
    expect(beast.id).toBeUndefined();
  });
});
