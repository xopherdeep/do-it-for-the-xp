/**
 * The Game Master's beast form as steps of the shared wizard shell (docs: compendium-wizards-design, sections 1 and
 * 3): Pick its look, Name it, Chores that beat it, then the summary that carries the verb. Pure rules only: the steps
 * with their guide line and the one-line reason, the draft a form starts from, the list moves, the summary lines, and
 * the patch that goes to BestiaryDb.setBeast (the stored record keeps what the form does not own: BestiaryDb.spec).
 */
import {
  addChore,
  beastPatch,
  beastProblem,
  beastSummary,
  beastWizardSteps,
  dropChore,
  draftFromBeast,
  filledChores,
  moveChore,
  newBeastDraft,
  openingIndex,
} from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import type { BeastDraft } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import {
  blockedBy,
  canJumpTo,
  canNext,
  firstIndex,
  isLast,
  isReady,
  lastIndex,
  progressOf,
} from "@/lib/services/wizard/wizardSteps";

const steps = beastWizardSteps();

const complete = (): BeastDraft => ({
  id: "",
  name: "Kitchen Dragon",
  checklist: ["Load the dishwasher", "Wipe the counters"],
  avatar: 12,
  bg1: 40,
  bg2: 7,
  aspectRatio: 64,
});

describe("the steps", () => {
  it("are four, in the parent's words: look, name, chores, then the summary", () => {
    expect(steps.map((step) => step.id)).toEqual(["look", "name", "chores", "summon"]);
    expect(steps.map((step) => step.title)).toEqual(["Pick its look", "Name it", "Chores that beat it", "Summon"]);
  });

  it("each carry a guide line for the Game Master and a picture, and none is ever skipped", () => {
    for (const step of steps) {
      expect(step.guide.length).toBeGreaterThan(10);
      expect(step.icon).toBeTruthy();
      expect(step.isSkipped).toBeUndefined();
    }
    expect(progressOf(steps, complete(), 2)).toEqual({ n: 3, total: 4 });
  });

  it("ask for a look first, with the reason a parent would say", () => {
    const draft = { ...complete(), avatar: 0 };
    expect(steps[0].isValid(draft)).toBe("Pick a look");
    expect(steps[0].isValid(complete())).toBe(true);
  });

  it("ask for a name, and a name of spaces is no name", () => {
    expect(steps[1].isValid({ ...complete(), name: "" })).toBe("Give it a name");
    expect(steps[1].isValid({ ...complete(), name: "   " })).toBe("Give it a name");
    expect(steps[1].isValid(complete())).toBe(true);
  });

  it("ask for one chore it loses to, and blank rows are not chores", () => {
    expect(steps[2].isValid({ ...complete(), checklist: [] })).toBe("Add one chore it loses to");
    expect(steps[2].isValid({ ...complete(), checklist: ["", "  "] })).toBe("Add one chore it loses to");
    expect(steps[2].isValid({ ...complete(), checklist: ["", "Sweep"] })).toBe(true);
  });

  it("make the summary the last step, which is the verb's", () => {
    expect(isLast(steps, complete(), 3)).toBe(true);
    expect(isLast(steps, complete(), 2)).toBe(false);
  });
});

describe("the shell's rules over these steps", () => {
  it("shut Next on each step until its own answer is given, and say why", () => {
    const blank = { ...newBeastDraft({ bg1: 1, bg2: 2 }) };
    expect(canNext(steps, blank, 0)).toBe(false);
    expect(blockedBy(steps, blank, 0)).toBe("Pick a look");
    expect(canNext(steps, { ...blank, avatar: 3 }, 0)).toBe(true);
    expect(blockedBy(steps, { ...blank, avatar: 3 }, 1)).toBe("Give it a name");
    expect(blockedBy(steps, { ...blank, avatar: 3, name: "Gobbo" }, 2)).toBe("Add one chore it loses to");
  });

  it("let the verb through only when every step is answered, and name the first one that is not", () => {
    expect(isReady(steps, complete())).toBe(true);
    expect(canNext(steps, complete(), 3)).toBe(true);
    const nameless = { ...complete(), name: "" };
    expect(canNext(steps, nameless, 3)).toBe(false);
    expect(blockedBy(steps, nameless, 3)).toBe("Give it a name");
    expect(blockedBy(steps, { ...nameless, avatar: 0 }, 3)).toBe("Pick a look");
  });

  it("let the dots go back over answered steps, never leap over an unanswered one", () => {
    const noChoresYet = { ...complete(), checklist: [] };
    expect(canJumpTo(steps, noChoresYet, 1)).toBe(true);
    expect(canJumpTo(steps, noChoresYet, 2)).toBe(false);
    expect(canJumpTo(steps, noChoresYet, 3)).toBe(false);
    expect(canJumpTo(steps, { ...complete(), name: "" }, 2)).toBe(false);
    expect(canJumpTo(steps, complete(), 3)).toBe(true);
  });
});

describe("where the form opens", () => {
  it("a new beast opens on its look, and an edit on the summary", () => {
    expect(openingIndex(steps, newBeastDraft())).toBe(firstIndex(steps, newBeastDraft()));
    expect(openingIndex(steps, newBeastDraft())).toBe(0);
    expect(openingIndex(steps, { ...complete(), id: "beast-1" })).toBe(lastIndex(steps, complete()));
    expect(openingIndex(steps, { ...complete(), id: "beast-1" })).toBe(3);
  });
});

describe("the draft", () => {
  it("starts a new beast empty, with backgrounds drawn from the 328 and the form's usual letterbox", () => {
    const draft = newBeastDraft({}, () => 0.5);
    expect(draft).toEqual({ id: "", name: "", checklist: [], avatar: 0, bg1: 164, bg2: 164, aspectRatio: 64 });
    expect(newBeastDraft({}, () => 0.999999).bg1).toBe(327);
  });

  it("takes the backgrounds the Bestiary handed over, and draws one for a number that is no background", () => {
    expect(newBeastDraft({ bg1: 12, bg2: 99 }, () => 0).bg1).toBe(12);
    expect(newBeastDraft({ bg1: 12, bg2: 99 }, () => 0).bg2).toBe(99);
    expect(newBeastDraft({ bg1: Number.NaN, bg2: -4 }, () => 0.5).bg1).toBe(164);
    expect(newBeastDraft({ bg1: Number.NaN, bg2: -4 }, () => 0.5).bg2).toBe(164);
    expect(newBeastDraft({ bg1: 400, bg2: 3.5 }, () => 0.5).bg1).toBe(164);
  });

  it("is a stored beast's own fields copied, so editing never writes into the stored object", () => {
    const stored = { id: "beast-1", name: "Gobbo", checklist: ["Sweep"], avatar: 5, bg1: 10, bg2: 20, aspectRatio: 48 };
    const draft = draftFromBeast(stored);
    expect(draft).toEqual(stored);
    draft.checklist.push("Mop");
    expect(stored.checklist).toEqual(["Sweep"]);
  });

  it("fills what an old record lacks: no chores, no picture, no background, the usual letterbox", () => {
    const draft = draftFromBeast({ id: "old", name: "Oldie" } as never);
    expect(draft).toEqual({ id: "old", name: "Oldie", checklist: [], avatar: 0, bg1: 0, bg2: 0, aspectRatio: 64 });
  });
});

describe("the chore list", () => {
  it("adds a chore at the end, trimmed, and an empty one adds nothing", () => {
    expect(addChore(["Sweep"], "  Mop the floor ")).toEqual(["Sweep", "Mop the floor"]);
    expect(addChore(["Sweep"], "   ")).toEqual(["Sweep"]);
  });

  it("moves a chore up or down one place, and a move off either end does nothing", () => {
    expect(moveChore(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveChore(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
    expect(moveChore(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
    expect(moveChore(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
  });

  it("drops a chore by its place, and a place that is not there drops nothing", () => {
    expect(dropChore(["a", "b", "c"], 1)).toEqual(["a", "c"]);
    expect(dropChore(["a"], 4)).toEqual(["a"]);
  });

  it("never changes the list it was given", () => {
    const list = ["a", "b"];
    addChore(list, "c");
    moveChore(list, 0, 1);
    dropChore(list, 0);
    expect(list).toEqual(["a", "b"]);
  });

  it("counts the filled chores, trimmed, in order", () => {
    expect(filledChores({ checklist: [" a ", "", "  ", "b"] })).toEqual(["a", "b"]);
  });
});

describe("the problem", () => {
  it("is empty for a finished beast and the first thing missing otherwise, in the order the steps ask", () => {
    expect(beastProblem(complete())).toBeNull();
    expect(beastProblem({ ...complete(), avatar: 0, name: "" })).toBe("Pick a look");
    expect(beastProblem({ ...complete(), name: "", checklist: [] })).toBe("Give it a name");
    expect(beastProblem({ ...complete(), checklist: [""] })).toBe("Add one chore it loses to");
  });
});

describe("the summary", () => {
  it("has a line for each answer, naming the step a tap goes back to", () => {
    expect(beastSummary(complete())).toEqual([
      { stepId: "look", label: "Look", value: "Beast 012", isMissing: false },
      { stepId: "name", label: "Name", value: "Kitchen Dragon", isMissing: false },
      { stepId: "chores", label: "Chores", value: "2 chores", isMissing: false },
    ]);
  });

  it("says one chore in the singular, and marks what is still missing", () => {
    const lines = beastSummary({ ...complete(), avatar: 0, name: " ", checklist: ["", "Sweep"] });
    expect(lines.map((line) => line.value)).toEqual(["Not picked", "Not named", "1 chore"]);
    expect(lines.map((line) => line.isMissing)).toEqual([true, true, false]);
    expect(beastSummary({ ...complete(), checklist: [] })[2]).toMatchObject({ value: "No chores", isMissing: true });
  });
});

describe("the patch for the Bestiary", () => {
  it("is exactly the fields the form owns, cleaned: trimmed name, filled chores, the look and the backdrop", () => {
    const patch = beastPatch({ ...complete(), name: "  Kitchen Dragon ", checklist: ["", " Load the dishwasher ", "  "] });
    expect(patch).toEqual({
      name: "Kitchen Dragon",
      checklist: ["Load the dishwasher"],
      avatar: 12,
      bg1: 40,
      bg2: 7,
      aspectRatio: 64,
    });
  });

  it("names the beast it edits, and a new beast carries no id for the Bestiary to give", () => {
    expect(beastPatch({ ...complete(), id: "beast-1" }).id).toBe("beast-1");
    expect("id" in beastPatch(complete())).toBe(false);
  });

  it("never mentions what the form does not own, so a save cannot wipe it", () => {
    const keys = Object.keys(beastPatch({ ...complete(), id: "beast-1" }));
    for (const owned of ["achievementIds", "element", "theme", "variantAvatar", "imageUrl", "localImage"]) {
      expect(keys).not.toContain(owned);
    }
  });
});
