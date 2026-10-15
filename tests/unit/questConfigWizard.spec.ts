/**
 * The Game Master's quest config as steps of the shared wizard shell (docs: compendium-wizards-design, W4): What's the
 * chore? -> Who does it? -> When? -> How hard? -> Ready? Pure rules only: the steps with their guide line and the
 * one-line reason, the rules the old tabs and the Save chip already had (now in one list), where a quest opens, which
 * step a summary tile leads to, and the category helpers (a typed name that already exists is picked, not duplicated).
 */
import {
  ASSIGNMENT_CHOICES,
  QUEST_KINDS,
  cleanCategoryName,
  findCategory,
  isQuestReady,
  openingIndex,
  questConfigSteps,
  questMissing,
  readySubtitle,
  stepForSegment,
  stepIndexOf,
} from "@/app/Admin/XpCompendium/views/XpAchievements/questConfigWizard";
import type { QuestConfigDraft, QuestStepId } from "@/app/Admin/XpCompendium/views/XpAchievements/questConfigWizard";
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

const steps = questConfigSteps();
const at = (id: QuestStepId): number => stepIndexOf(steps, id);

/** A quest that is complete: named, filed, a plain chore for one hero, with a difficulty */
const complete = (patch: QuestConfigDraft = {}): QuestConfigDraft => ({
  achievementName: "Load the dishwasher",
  categoryId: "cat-kitchen",
  adventureType: "simple",
  beastId: "",
  subAchievementIds: [],
  type: "individual",
  assignee: ["hero-1"],
  difficulty: 3,
  ...patch,
});

describe("the steps", () => {
  it("are five, in the parent's words and order", () => {
    expect(steps.map((step) => step.id)).toEqual(["chore", "who", "when", "hard", "ready"]);
    expect(steps.map((step) => step.title)).toEqual(["What's the chore?", "Who does it?", "When?", "How hard?", "Ready?"]);
  });

  it("each carry one guide line for the Game Master and a picture, and none is ever skipped", () => {
    for (const step of steps) {
      expect(step.guide.length).toBeGreaterThan(10);
      expect(step.guide.length).toBeLessThan(100);
      expect(step.icon).toBeTruthy();
      expect(step.isSkipped).toBeUndefined();
    }
    expect(progressOf(steps, complete(), at("hard"))).toEqual({ n: 4, total: 5 });
  });

  it("carry the coach's lines: sharing and the Open Bounty, the schedule, what the difficulty pays", () => {
    expect(steps[at("who")].guide).toMatch(/Open Bounty/);
    expect(steps[at("when")].guide).toMatch(/due/);
    expect(steps[at("hard")].guide).toMatch(/XP, GP and AP/);
  });
});

describe("What's the chore? asks for a name, a category and a kind, with the reason a parent would say", () => {
  const chore = steps[at("chore")];

  it("is valid for a complete quest", () => {
    expect(chore.isValid(complete())).toBe(true);
  });

  it("wants a name, and a blank or spaces-only one is no name", () => {
    expect(chore.isValid(complete({ achievementName: "" }))).toBe("Name the chore");
    expect(chore.isValid(complete({ achievementName: "   " }))).toBe("Name the chore");
    expect(chore.isValid(complete({ achievementName: undefined }))).toBe("Name the chore");
  });

  it("wants a category once it is named", () => {
    expect(chore.isValid(complete({ categoryId: "" }))).toBe("Pick a category");
    expect(chore.isValid(complete({ achievementName: "", categoryId: "" }))).toBe("Name the chore");
  });

  it("wants one of the three kinds", () => {
    expect(chore.isValid(complete({ adventureType: "" }))).toBe("Choose normal, beast or chain");
    expect(chore.isValid(complete({ adventureType: "saga" }))).toBe("Choose normal, beast or chain");
    for (const kind of QUEST_KINDS) {
      const draft = complete({ adventureType: kind.value, beastId: "beast-1", subAchievementIds: ["quest-2"] });
      expect(chore.isValid(draft)).toBe(true);
    }
  });

  it("wants a beast for a beast quest and chain quests for a chain, and nothing for a normal chore", () => {
    expect(chore.isValid(complete({ adventureType: "beast", beastId: "" }))).toBe("Pick the beast to fight");
    expect(chore.isValid(complete({ adventureType: "beast", beastId: undefined }))).toBe("Pick the beast to fight");
    expect(chore.isValid(complete({ adventureType: "beast", beastId: "beast-1" }))).toBe(true);
    expect(chore.isValid(complete({ adventureType: "chain", subAchievementIds: [] }))).toBe("Add a quest to the chain");
    expect(chore.isValid(complete({ adventureType: "chain", subAchievementIds: undefined }))).toBe("Add a quest to the chain");
    expect(chore.isValid(complete({ adventureType: "chain", subAchievementIds: ["quest-2"] }))).toBe(true);
    expect(chore.isValid(complete({ adventureType: "simple", beastId: "", subAchievementIds: [] }))).toBe(true);
  });

  it("offers the three kinds as Normal, Beast and Chain", () => {
    expect(QUEST_KINDS.map((kind) => [kind.value, kind.label])).toEqual([
      ["simple", "Normal"],
      ["beast", "Beast"],
      ["chain", "Chain"],
    ]);
    for (const kind of QUEST_KINDS) {
      expect(kind.icon).toBeTruthy();
      expect(kind.hint.length).toBeGreaterThan(10);
    }
  });
});

describe("Who does it? wants a hero unless the quest is an Open Bounty", () => {
  const who = steps[at("who")];

  it("wants at least one hero for every way of sharing but the Open Bounty", () => {
    for (const type of ["individual", "collaborate", "rotate", "compete"]) {
      expect(who.isValid(complete({ type, assignee: [] }))).toBe("Pick at least one hero");
      expect(who.isValid(complete({ type, assignee: undefined }))).toBe("Pick at least one hero");
      expect(who.isValid(complete({ type, assignee: ["hero-1"] }))).toBe(true);
    }
  });

  it("lets an Open Bounty name no hero, because it is open to every hero", () => {
    expect(who.isValid(complete({ type: "asNeeded", assignee: [] }))).toBe(true);
  });

  it("offers the five ways of sharing in short words", () => {
    expect(ASSIGNMENT_CHOICES.map((choice) => choice.value)).toEqual(["asNeeded", "individual", "collaborate", "rotate", "compete"]);
    expect(ASSIGNMENT_CHOICES.map((choice) => choice.label)).toEqual(["Open", "Solo", "Team", "Rotate", "Race"]);
  });
});

describe("When? and Ready? never block", () => {
  it("are valid for any quest, even an empty one", () => {
    expect(steps[at("when")].isValid({})).toBe(true);
    expect(steps[at("ready")].isValid({})).toBe(true);
  });
});

describe("How hard? wants a difficulty", () => {
  const hard = steps[at("hard")];

  it("says so when there is none", () => {
    for (const difficulty of [0, undefined, Number.NaN]) {
      expect(hard.isValid(complete({ difficulty }))).toBe("Set the difficulty");
    }
    expect(hard.isValid(complete({ difficulty: 1 }))).toBe(true);
    expect(hard.isValid(complete({ difficulty: 144 }))).toBe(true);
  });
});

describe("Ready: the whole quest", () => {
  it("is ready for a complete quest and for an Open Bounty with no hero", () => {
    expect(isReady(steps, complete())).toBe(true);
    expect(isQuestReady(complete())).toBe(true);
    expect(isReady(steps, complete({ type: "asNeeded", assignee: [] }))).toBe(true);
  });

  it("is the same answer from the steps and from the rule list, for every way a quest can be short", () => {
    const shorts: QuestConfigDraft[] = [
      complete(),
      complete({ achievementName: "" }),
      complete({ categoryId: "" }),
      complete({ adventureType: "" }),
      complete({ adventureType: "beast" }),
      complete({ adventureType: "chain" }),
      complete({ assignee: [] }),
      complete({ difficulty: 0 }),
      {},
    ];
    for (const draft of shorts) expect(isQuestReady(draft)).toBe(isReady(steps, draft));
  });

  it("matches the old draft rule: name, category, difficulty, a beast or chain where asked, a hero unless Open Bounty", () => {
    const old = (a: QuestConfigDraft): boolean => {
      if (!a.achievementName?.trim()) return false;
      if (!a.categoryId) return false;
      if (!a.difficulty) return false;
      const strategy =
        a.adventureType === "simple" ||
        (a.adventureType === "beast" && !!a.beastId) ||
        (a.adventureType === "chain" && (a.subAchievementIds?.length || 0) > 0);
      const party = a.type === "asNeeded" || (a.assignee?.length || 0) > 0;
      return strategy && party;
    };
    const names = ["", "Mow", "  "];
    const kinds = ["simple", "beast", "chain", "", "x"];
    for (const achievementName of names)
      for (const adventureType of kinds)
        for (const beastId of ["", "b1"])
          for (const subAchievementIds of [[], ["q2"]])
            for (const type of ["asNeeded", "individual"])
              for (const assignee of [[], ["h1"]])
                for (const difficulty of [0, 5]) {
                  const draft: QuestConfigDraft = {
                    achievementName,
                    categoryId: "c1",
                    adventureType,
                    beastId,
                    subAchievementIds,
                    type,
                    assignee,
                    difficulty,
                  };
                  expect(isQuestReady(draft)).toBe(old(draft));
                }
  });

  it("lists every line still missing, in the order the steps ask (the Save chip's list)", () => {
    expect(questMissing(complete())).toEqual([]);
    expect(questMissing({ adventureType: "beast", type: "individual", assignee: [], difficulty: 0 })).toEqual([
      "Name the chore",
      "Pick a category",
      "Pick the beast to fight",
      "Pick at least one hero",
      "Set the difficulty",
    ]);
    expect(questMissing(complete({ adventureType: "" }))).toEqual(["Choose normal, beast or chain"]);
  });

  it("holds the verb shut on the summary until the quest is complete, and names the first thing missing", () => {
    const last = at("ready");
    expect(isLast(steps, complete(), last)).toBe(true);
    expect(canNext(steps, complete(), last)).toBe(true);
    expect(canNext(steps, complete({ difficulty: 0 }), last)).toBe(false);
    expect(blockedBy(steps, complete({ difficulty: 0, assignee: [] }), last)).toBe("Pick at least one hero");
    expect(blockedBy(steps, complete({ achievementName: "", difficulty: 0 }), last)).toBe("Name the chore");
    expect(blockedBy(steps, complete(), last)).toBe("");
  });

  it("holds Next shut on a step until its answer is there", () => {
    expect(canNext(steps, complete({ achievementName: "" }), at("chore"))).toBe(false);
    expect(canNext(steps, complete({ assignee: [] }), at("who"))).toBe(false);
    expect(canNext(steps, complete({ assignee: [] }), at("when"))).toBe(true);
    expect(canNext(steps, complete({ difficulty: 0 }), at("hard"))).toBe(false);
  });
});

describe("where a quest opens, and which dots may be tapped", () => {
  it("opens a new quest on the first step", () => {
    expect(openingIndex(steps, complete(), false)).toBe(firstIndex(steps, complete()));
    expect(openingIndex(steps, {}, false)).toBe(at("chore"));
  });

  it("opens a saved, complete quest on the summary", () => {
    expect(openingIndex(steps, complete(), true)).toBe(lastIndex(steps, complete()));
    expect(openingIndex(steps, complete(), true)).toBe(at("ready"));
  });

  it("opens a saved draft on the first step that still wants an answer", () => {
    expect(openingIndex(steps, complete({ assignee: [] }), true)).toBe(at("who"));
    expect(openingIndex(steps, complete({ difficulty: 0 }), true)).toBe(at("hard"));
    expect(openingIndex(steps, complete({ achievementName: "", assignee: [] }), true)).toBe(at("chore"));
  });

  it("lets every dot be tapped once the quest is complete", () => {
    for (const id of ["chore", "who", "when", "hard", "ready"] as QuestStepId[]) {
      expect(canJumpTo(steps, complete(), at(id))).toBe(true);
    }
  });

  it("never lets a dot leap over a step that still wants an answer", () => {
    const noHero = complete({ assignee: [] });
    expect(canJumpTo(steps, noHero, at("chore"))).toBe(true);
    expect(canJumpTo(steps, noHero, at("who"))).toBe(false);
    expect(canJumpTo(steps, noHero, at("hard"))).toBe(false);
    expect(canJumpTo(steps, noHero, at("ready"))).toBe(false);
  });
});

describe("the summary's tiles lead to the step that owns the answer", () => {
  it("maps the old tab names and the approval, priority and category tiles", () => {
    expect(stepForSegment("quest-type")).toBe("chore");
    expect(stepForSegment("category")).toBe("chore");
    expect(stepForSegment("heros")).toBe("who");
    expect(stepForSegment("when")).toBe("when");
    expect(stepForSegment("points")).toBe("hard");
    expect(stepForSegment("approval")).toBe("hard");
    expect(stepForSegment("bonus")).toBe("hard");
    expect(stepForSegment("dashboard")).toBe("ready");
  });

  it("finds each step's place, and -1 for an id that is not a step", () => {
    expect(at("chore")).toBe(0);
    expect(at("ready")).toBe(4);
    expect(stepIndexOf(steps, "nope" as QuestStepId)).toBe(-1);
  });
});

describe("the line under the quest's name when it is made Ready", () => {
  const name = (id: string): string => ({ h1: "Mia", h2: "Sam", h3: "Ola", h4: "Kit", h5: "" })[id] ?? "";

  it("names the heroes it is for", () => {
    expect(readySubtitle({ type: "individual", assignee: ["h1"] }, name)).toBe("For Mia");
    expect(readySubtitle({ type: "collaborate", assignee: ["h1", "h2"] }, name)).toBe("For Mia, Sam");
  });

  it("keeps a long party short", () => {
    expect(readySubtitle({ type: "rotate", assignee: ["h1", "h2", "h3", "h4"] }, name)).toBe("For Mia, Sam, Ola and 1 more");
  });

  it("says an Open Bounty is open to every hero, and says nothing when no hero is named", () => {
    expect(readySubtitle({ type: "asNeeded", assignee: [] }, name)).toBe("Open to every hero");
    expect(readySubtitle({ type: "individual", assignee: [] }, name)).toBe("");
    expect(readySubtitle({ type: "individual", assignee: ["h5"] }, name)).toBe("");
  });
});

describe("categories: a typed name that already exists is picked, not duplicated", () => {
  const categories = [
    { id: "c1", name: "Kitchen" },
    { id: "c2", name: "Before School" },
  ];

  it("finds a category by its name in any case and spacing", () => {
    expect(findCategory(categories, "Kitchen")?.id).toBe("c1");
    expect(findCategory(categories, "kitchen")?.id).toBe("c1");
    expect(findCategory(categories, "  KITCHEN ")?.id).toBe("c1");
    expect(findCategory(categories, "before   school")?.id).toBe("c2");
  });

  it("finds nothing for a new name, a near miss or a blank", () => {
    expect(findCategory(categories, "Garden")).toBeUndefined();
    expect(findCategory(categories, "Kitchens")).toBeUndefined();
    expect(findCategory(categories, "")).toBeUndefined();
    expect(findCategory(categories, "   ")).toBeUndefined();
    expect(findCategory([], "Kitchen")).toBeUndefined();
  });

  it("cleans a name to what is saved: trimmed, one space between words", () => {
    expect(cleanCategoryName("  Before   School ")).toBe("Before School");
    expect(cleanCategoryName("Garden")).toBe("Garden");
  });
});
