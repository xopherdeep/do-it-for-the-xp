import { AbilityType, TimePeriod } from "@/hooks/abilities/abilityConstants";
import type { Ability } from "@/hooks/abilities/abilityConstants";
import {
  AP_PERIOD_CHOICES,
  ATTRIBUTE_CHOICES,
  CLASS_CHOICES,
  FREQUENCY_CHOICES,
  KIND_CHOICES,
  blankPower,
  characterLevelOf,
  classLabel,
  classRequirementOf,
  countOf,
  finishedPower,
  iconClassOf,
  loadedPower,
  powerSummary,
  powerWizardSteps,
  scalingOf,
  withApRequirement,
  withCharacterLevel,
  withClassRequirement,
  withPickedIcon,
  withScaling,
} from "@/app/Admin/XpCompendium/views/XpAbilities/powerWizard";
import {
  blockedBy,
  canJumpTo,
  canNext,
  firstIndex,
  isLast,
  isReady,
  lastIndex,
  nextIndex,
  progressOf,
  stepVerdict,
} from "@/lib/services/wizard/wizardSteps";

/**
 * The Power wizard (docs: compendium-wizards-design, section 3): What is it? > What does it do? > What does it cost? >
 * Save. This is the pure part: the steps with their guide lines and reasons, the changes a step makes to the draft
 * (the draft is the Ability itself), what the summary lists and what is saved.
 */

const steps = powerWizardSteps();
const verdictOf = (id: string, draft: Ability) => {
  const step = steps.find((each) => each.id === id);
  if (!step) throw new Error(`no step ${id}`);
  return stepVerdict(step, draft);
};

const named = (patch: Partial<Ability> = {}): Ability => ({ ...blankPower(() => 0.5), name: "Snooze", ...patch });
const spell = (patch: Partial<Ability> = {}): Ability => named({ type: AbilityType.InGame, name: "Stop", ...patch });

describe("the steps", () => {
  it("are What is it?, What does it do?, What does it cost? and the summary, in that order", () => {
    expect(steps.map((step) => step.id)).toEqual(["what", "does", "cost", "ready"]);
    expect(steps.map((step) => step.title)).toEqual(["What is it?", "What does it do?", "What does it cost?", "Ready?"]);
  });

  it("each ask one question in the Game Master's words, with a picture", () => {
    steps.forEach((step) => {
      expect(step.guide.trim().length).toBeGreaterThan(8);
      expect(step.icon).toBeTruthy();
    });
  });

  it("skips none of them: the fields of the step follow the type, the steps stay", () => {
    expect(steps.some((step) => step.isSkipped?.(named()))).toBe(false);
    expect(steps.some((step) => step.isSkipped?.(spell()))).toBe(false);
    expect(progressOf(steps, spell(), 0)).toEqual({ n: 1, total: 4 });
  });
});

describe("What is it?", () => {
  it("wants a name, and says so in one line", () => {
    expect(verdictOf("what", named({ name: "" }))).toEqual({ valid: false, reason: "Give it a name" });
    expect(verdictOf("what", named({ name: "   " }))).toEqual({ valid: false, reason: "Give it a name" });
    expect(verdictOf("what", named({ name: "Snooze" }))).toEqual({ valid: true, reason: "" });
  });

  it("does not need a description or a different icon: the defaults stand", () => {
    const power = blankPower(() => 0);
    power.name = "Movie night";
    expect(power.description).toBe("");
    expect(verdictOf("what", power).valid).toBe(true);
  });

  it("offers the two kinds a parent knows: Real Life and In-Game", () => {
    expect(KIND_CHOICES.map((kind) => kind.id)).toEqual([AbilityType.RealLife, AbilityType.InGame]);
    expect(KIND_CHOICES.map((kind) => kind.label)).toEqual(["Real Life", "In-Game"]);
  });
});

describe("What does it do?", () => {
  it("asks nothing of a Real Life Power: the board effect is optional", () => {
    expect(verdictOf("does", named()).valid).toBe(true);
    expect(verdictOf("does", named({ boardEffect: "snooze" })).valid).toBe(true);
  });

  it("does not hold a Real Life Power to the In-Game fields that are left over on the record", () => {
    const leftover = named({ characterRequirement: { level: -4, class: { "time-mage": 0 } }, scaling: { attribute: "wisdom", rate: 9 } });
    expect(verdictOf("does", leftover).valid).toBe(true);
  });

  it("asks nothing of an In-Game Power either when there is no requirement", () => {
    expect(verdictOf("does", spell()).valid).toBe(true);
  });

  it("wants a class level of at least 1 once a class is picked", () => {
    expect(verdictOf("does", spell({ characterRequirement: { class: { "time-mage": 0 } } }))).toEqual({
      valid: false,
      reason: "Class level starts at 1",
    });
    expect(verdictOf("does", spell({ characterRequirement: { class: { "time-mage": 3 } } })).valid).toBe(true);
  });

  it("does not let the character level go below 0", () => {
    expect(verdictOf("does", spell({ characterRequirement: { level: -1 } }))).toEqual({
      valid: false,
      reason: "Character level can't be negative",
    });
    expect(verdictOf("does", spell({ characterRequirement: { level: 5 } })).valid).toBe(true);
  });

  it("keeps the scaling rate between 0 and 100%", () => {
    expect(verdictOf("does", spell({ scaling: { attribute: "wisdom", rate: 1.5 } }))).toEqual({
      valid: false,
      reason: "Scaling goes from 0 to 100%",
    });
    expect(verdictOf("does", spell({ scaling: { attribute: "wisdom", rate: 0.25 } })).valid).toBe(true);
  });
});

describe("What does it cost?", () => {
  it("is free by default: 0 MP, 0 AP", () => {
    expect(verdictOf("cost", named()).valid).toBe(true);
  });

  it("does not take a negative MP or AP", () => {
    expect(verdictOf("cost", named({ mpCost: -1 }))).toEqual({ valid: false, reason: "MP can't be negative" });
    expect(verdictOf("cost", withApRequirement(named(), { amount: -5 }))).toEqual({
      valid: false,
      reason: "AP can't be negative",
    });
  });

  it("does not take a number that is not one", () => {
    expect(verdictOf("cost", named({ mpCost: NaN }))).toEqual({ valid: false, reason: "MP needs a number" });
    expect(verdictOf("cost", withApRequirement(named(), { amount: NaN }))).toEqual({
      valid: false,
      reason: "AP needs a number",
    });
  });

  it("lists every frequency and the five AP periods the form offered", () => {
    expect(FREQUENCY_CHOICES.map((choice) => choice.id)).toEqual(Object.values(TimePeriod));
    expect(FREQUENCY_CHOICES.map((choice) => choice.label)).toEqual([
      "Hourly",
      "Daily",
      "Weekly",
      "Monthly",
      "Quarterly",
      "Bi-Annual",
      "Yearly",
      "One-Time",
    ]);
    expect(AP_PERIOD_CHOICES.map((choice) => choice.id)).toEqual([
      TimePeriod.Daily,
      TimePeriod.Weekly,
      TimePeriod.Monthly,
      TimePeriod.Yearly,
      TimePeriod.Flat,
    ]);
    expect(AP_PERIOD_CHOICES[AP_PERIOD_CHOICES.length - 1].label).toBe("Total (one-time)");
  });
});

describe("the wizard as a whole", () => {
  it("opens a new Power on step 1 and an edit on the summary", () => {
    expect(firstIndex(steps, named())).toBe(0);
    expect(lastIndex(steps, named())).toBe(3);
    expect(isLast(steps, named(), 3)).toBe(true);
  });

  it("walks What > Does > Cost > Ready one step at a time", () => {
    expect([0, 1, 2].map((from) => nextIndex(steps, named(), from))).toEqual([1, 2, 3]);
  });

  it("holds Next on step 1 until the Power has a name", () => {
    expect(canNext(steps, named({ name: "" }), 0)).toBe(false);
    expect(blockedBy(steps, named({ name: "" }), 0)).toBe("Give it a name");
    expect(canNext(steps, named(), 0)).toBe(true);
  });

  it("holds Save on the summary until every step is good, and says which line is wrong first", () => {
    const broken = named({ name: "", mpCost: -2 });
    expect(isReady(steps, broken)).toBe(false);
    expect(canNext(steps, broken, 3)).toBe(false);
    expect(blockedBy(steps, broken, 3)).toBe("Give it a name");
    expect(blockedBy(steps, named({ mpCost: -2 }), 3)).toBe("MP can't be negative");
    expect(canNext(steps, named(), 3)).toBe(true);
  });

  it("lets the dots go back from the summary in an edit, but not past an unanswered step", () => {
    expect([0, 1, 2, 3].map((at) => canJumpTo(steps, spell(), at))).toEqual([true, true, true, true]);
    expect(canJumpTo(steps, named({ name: "" }), 2)).toBe(false);
  });
});

describe("a new Power", () => {
  it("starts as a Real Life Power: Daily, free, the wand icon, off the Preset list", () => {
    const power = blankPower(() => 0.5);
    expect(power).toMatchObject({
      id: "",
      name: "",
      description: "",
      type: AbilityType.RealLife,
      frequency: TimePeriod.Daily,
      mpCost: 0,
      icon: "hand-holding-magic",
      iconPrefix: "fad",
      isPreset: false,
      prerequisites: [],
    });
    expect(power.apRequirement).toEqual({ amount: 0, period: TimePeriod.Daily });
  });

  it("is placed on the Power tree by chance, inside the tree", () => {
    expect(blankPower(() => 0).position).toEqual({ x: 0, y: 0 });
    expect(blankPower(() => 0.5).position).toEqual({ x: 400, y: 300 });
    const edge = blankPower(() => 0.999999).position;
    expect(edge.x).toBeLessThan(800);
    expect(edge.y).toBeLessThan(600);
  });
});

describe("the class requirement", () => {
  it("reads None when there is no class, and the first class with its level when there is one", () => {
    expect(classRequirementOf(spell())).toBeNull();
    expect(classRequirementOf(spell({ characterRequirement: { level: 3 } }))).toBeNull();
    expect(classRequirementOf(spell({ characterRequirement: { class: { "time-mage": 4 } } }))).toEqual({ name: "time-mage", level: 4 });
  });

  it("sets a class and a level, leaving the character level alone", () => {
    const power = withClassRequirement(spell({ characterRequirement: { level: 3 } }), "black-mage", 2);
    expect(power.characterRequirement).toEqual({ level: 3, class: { "black-mage": 2 } });
  });

  it("replaces the class instead of adding a second one", () => {
    const first = withClassRequirement(spell(), "time-mage", 1);
    expect(withClassRequirement(first, "white-mage", 5).characterRequirement).toEqual({ class: { "white-mage": 5 } });
  });

  it("clears with None and drops the requirement when nothing is left", () => {
    const set = withClassRequirement(spell(), "time-mage", 1);
    expect(withClassRequirement(set, "none", 1).characterRequirement).toBeUndefined();
    const both = withClassRequirement(spell({ characterRequirement: { level: 3 } }), "time-mage", 1);
    expect(withClassRequirement(both, "none", 1).characterRequirement).toEqual({ level: 3 });
  });

  it("does not change the Power it was given", () => {
    const power = spell({ characterRequirement: { level: 3 } });
    withClassRequirement(power, "time-mage", 2);
    expect(power.characterRequirement).toEqual({ level: 3 });
  });

  it("names the classes the way a parent reads them", () => {
    expect(CLASS_CHOICES.map((choice) => choice.id)).toEqual(["time-mage", "black-mage", "white-mage", "technician"]);
    expect(classLabel("time-mage")).toBe("Time Mage");
    expect(classLabel("technician")).toBe("Technician");
    expect(CLASS_CHOICES.map((choice) => choice.label)).toEqual(["Time Mage", "Black Mage", "White Mage", "Technician"]);
  });
});

describe("the character level", () => {
  it("reads 0 when there is none", () => {
    expect(characterLevelOf(spell())).toBe(0);
    expect(characterLevelOf(spell({ characterRequirement: { level: 7 } }))).toBe(7);
  });

  it("sets a level and keeps the class", () => {
    const power = withCharacterLevel(withClassRequirement(spell(), "time-mage", 2), 6);
    expect(power.characterRequirement).toEqual({ class: { "time-mage": 2 }, level: 6 });
  });

  it("0 means no level requirement and drops the requirement when nothing is left", () => {
    expect(withCharacterLevel(spell({ characterRequirement: { level: 6 } }), 0).characterRequirement).toBeUndefined();
    const withClass = spell({ characterRequirement: { level: 6, class: { "time-mage": 2 } } });
    expect(withCharacterLevel(withClass, 0).characterRequirement).toEqual({ class: { "time-mage": 2 } });
  });
});

describe("the scaling", () => {
  it("reads none at 10% when the Power does not scale", () => {
    expect(scalingOf(spell())).toEqual({ attribute: "none", rate: 0.1 });
    expect(scalingOf(spell({ scaling: { attribute: "wisdom", rate: 0.3 } }))).toEqual({ attribute: "wisdom", rate: 0.3 });
  });

  it("offers the six attributes", () => {
    expect(ATTRIBUTE_CHOICES.map((choice) => choice.id)).toEqual([
      "strength",
      "dexterity",
      "constitution",
      "intelligence",
      "wisdom",
      "charisma",
    ]);
  });

  it("starts an attribute at 10% a point and keeps the rate it had when the attribute changes", () => {
    const first = withScaling(spell(), "strength");
    expect(first.scaling).toEqual({ attribute: "strength", rate: 0.1 });
    const tuned = withScaling(first, "strength", 0.35);
    expect(withScaling(tuned, "wisdom").scaling).toEqual({ attribute: "wisdom", rate: 0.35 });
  });

  it("keeps the rate between 0 and 100% in whole percents", () => {
    expect(withScaling(spell(), "wisdom", 1.7).scaling?.rate).toBe(1);
    expect(withScaling(spell(), "wisdom", -0.2).scaling?.rate).toBe(0);
    expect(withScaling(spell(), "wisdom", 0.1 + 0.05).scaling?.rate).toBe(0.15);
  });

  it("None takes the scaling off the record", () => {
    const scaled = withScaling(spell(), "wisdom", 0.4);
    expect(withScaling(scaled, "none").scaling).toBeUndefined();
  });
});

describe("the AP requirement", () => {
  it("changes the amount or the period and leaves the other alone", () => {
    const power = named();
    expect(withApRequirement(power, { amount: 12 }).apRequirement).toEqual({ amount: 12, period: TimePeriod.Daily });
    expect(withApRequirement(power, { period: TimePeriod.Weekly }).apRequirement).toEqual({ amount: 0, period: TimePeriod.Weekly });
    expect(power.apRequirement).toEqual({ amount: 0, period: TimePeriod.Daily });
  });
});

describe("the number fields", () => {
  it("read a whole number, whatever the phone's keyboard typed", () => {
    expect(countOf("12")).toBe(12);
    expect(countOf(" 7 ")).toBe(7);
    expect(countOf("3.9")).toBe(3);
    expect(countOf("-4")).toBe(-4);
    expect(countOf("0")).toBe(0);
  });

  it("read nothing from an empty field or a word, so the field can be cleared to retype", () => {
    expect(countOf("")).toBeNull();
    expect(countOf("  ")).toBeNull();
    expect(countOf("abc")).toBeNull();
    expect(countOf("1e999")).toBeNull();
  });
});

describe("the icon picker", () => {
  it("writes the pick back: the name and the prefix of the icon the picker confirmed", () => {
    const picked = withPickedIcon(named(), { iconName: "dragon", iconPrefix: "fas" });
    expect(picked).toMatchObject({ icon: "dragon", iconPrefix: "fas" });
  });

  it("keeps the icon when the picker brought nothing back", () => {
    const power = named();
    expect(withPickedIcon(power, undefined)).toBe(power);
    expect(withPickedIcon(power, {})).toBe(power);
    expect(withPickedIcon(power, { iconName: "", iconPrefix: "fas" })).toBe(power);
  });

  it("falls back to the duotone family when the picker gave no prefix", () => {
    expect(withPickedIcon(named(), { iconName: "bolt" })).toMatchObject({ icon: "bolt", iconPrefix: "fad" });
  });

  it("draws the icon with its own prefix, duotone when the record has none", () => {
    expect(iconClassOf(named({ icon: "bolt", iconPrefix: "fas" }))).toBe("fas fa-bolt");
    expect(iconClassOf(named({ icon: "bolt", iconPrefix: undefined }))).toBe("fad fa-bolt");
    expect(iconClassOf(named({ icon: "" }))).toBe("fad fa-hand-holding-magic");
  });
});

describe("a Power that is opened for an edit", () => {
  it("is the record, with the costs as numbers so + and - add instead of gluing digits", () => {
    const stored = named({ id: "p9", mpCost: "5" as unknown as number });
    stored.apRequirement = { amount: "20" as unknown as number, period: TimePeriod.Monthly };
    const loaded = loadedPower(stored);
    expect(loaded).toMatchObject({ id: "p9", name: "Snooze", mpCost: 5 });
    expect(loaded.apRequirement).toEqual({ amount: 20, period: TimePeriod.Monthly });
  });

  it("fills in what an old record leaves out, so the steps never meet a missing field", () => {
    const old = { id: "old", type: AbilityType.InGame, frequency: TimePeriod.Flat, icon: "bolt" } as unknown as Ability;
    const loaded = loadedPower(old);
    expect(loaded.name).toBe("");
    expect(loaded.description).toBe("");
    expect(loaded.mpCost).toBe(0);
    expect(loaded.apRequirement).toEqual({ amount: 0, period: TimePeriod.Daily });
    expect(() => steps.forEach((step) => step.isValid(loaded))).not.toThrow();
  });

  it("is a copy: the stored record is not touched", () => {
    const stored = named();
    const loaded = loadedPower(stored);
    expect(loaded).not.toBe(stored);
    expect(loaded.apRequirement).not.toBe(stored.apRequirement);
  });

  it("keeps a bad cost as a bad cost, so the cost step says so instead of the form saving a 0", () => {
    const loaded = loadedPower(named({ mpCost: -3 }));
    expect(loaded.mpCost).toBe(-3);
    expect(verdictOf("cost", loaded).reason).toBe("MP can't be negative");
  });
});

describe("what is saved", () => {
  it("is the Power with its name and description trimmed and its numbers as numbers", () => {
    const typed = named({ name: "  Snooze ", description: " Move a quest to tomorrow\n", mpCost: "5" as unknown as number });
    typed.apRequirement = { amount: "20" as unknown as number, period: TimePeriod.Weekly };
    const saved = finishedPower(typed);
    expect(saved.name).toBe("Snooze");
    expect(saved.description).toBe("Move a quest to tomorrow");
    expect(saved.mpCost).toBe(5);
    expect(saved.apRequirement).toEqual({ amount: 20, period: TimePeriod.Weekly });
  });

  it("is a copy: the draft on the screen is not touched", () => {
    const draft = named({ name: " Snooze " });
    const saved = finishedPower(draft);
    expect(saved).not.toBe(draft);
    expect(saved.apRequirement).not.toBe(draft.apRequirement);
    expect(draft.name).toBe(" Snooze ");
  });

  it("keeps the effects the Game Master picked, 'none' included, and the id", () => {
    const saved = finishedPower(named({ id: "p1", boardEffect: "none", battleEffect: "frost" }));
    expect(saved).toMatchObject({ id: "p1", boardEffect: "none", battleEffect: "frost" });
  });
});

describe("the summary", () => {
  const rowOf = (rows: ReturnType<typeof powerSummary>, id: string) => rows.find((row) => row.id === id);

  it("lists a Real Life Power with its board effect and its costs, each row owned by a step", () => {
    const rows = powerSummary(
      named({
        description: "Move one quest to tomorrow",
        boardEffect: "snooze",
        mpCost: 5,
        apRequirement: { amount: 10, period: TimePeriod.Weekly },
        frequency: TimePeriod.Daily,
      })
    );
    expect(rows.map((row) => row.id)).toEqual(["name", "kind", "board", "mp", "ap", "frequency"]);
    expect(rowOf(rows, "name")).toMatchObject({ step: "what", value: "Snooze" });
    expect(rowOf(rows, "kind")).toMatchObject({ step: "what", value: "Real Life" });
    expect(rowOf(rows, "board")).toMatchObject({ step: "does", value: "Move one quest to tomorrow" });
    expect(rowOf(rows, "mp")).toMatchObject({ step: "cost", value: "5 MP" });
    expect(rowOf(rows, "ap")).toMatchObject({ step: "cost", value: "10 AP, counted weekly" });
    expect(rowOf(rows, "frequency")).toMatchObject({ step: "cost", value: "Daily" });
  });

  it("says plainly what is not set", () => {
    // "Snooze" is a preset name and would read its own board effect, so a name of the Game Master's own
    const rows = powerSummary(named({ name: "Movie night" }));
    expect(rowOf(rows, "board")?.value).toBe("Nothing on the quest board");
    expect(rowOf(rows, "mp")?.value).toBe("Free to cast");
    expect(rowOf(rows, "ap")?.value).toBe("No AP needed");
  });

  it("counts a one-time AP threshold as a total", () => {
    const rows = powerSummary(named({ apRequirement: { amount: 40, period: TimePeriod.Flat } }));
    expect(rowOf(rows, "ap")?.value).toBe("40 AP in total");
  });

  it("reads the board effect a preset Power starts with when the Game Master did not pick one", () => {
    expect(rowOf(powerSummary(named({ name: "Extra Time" })), "board")?.value).toBe("24 more hours on one quest's deadline");
  });

  it("lists an In-Game Power with who may cast it, its effects and what it scales with", () => {
    const rows = powerSummary(
      spell({
        effect: "Time stands still",
        battleEffect: "time-stop",
        characterRequirement: { level: 4, class: { "time-mage": 2 } },
        scaling: { attribute: "wisdom", rate: 0.15 },
        mpCost: 8,
      })
    );
    expect(rows.map((row) => row.id)).toEqual(["name", "kind", "who", "effect", "battle", "scaling", "mp", "ap", "frequency"]);
    expect(rowOf(rows, "kind")?.value).toBe("In-Game");
    expect(rowOf(rows, "who")).toMatchObject({ step: "does", value: "Time Mage level 2, hero level 4" });
    expect(rowOf(rows, "effect")).toMatchObject({ step: "does", value: "Time stands still" });
    expect(rowOf(rows, "battle")).toMatchObject({ step: "does", value: "Pauses the clock for 15 minutes" });
    expect(rowOf(rows, "scaling")).toMatchObject({ step: "does", value: "Wisdom, 15% a point" });
  });

  it("says anyone can cast a spell with no requirement and that nothing scales", () => {
    const rows = powerSummary(spell({ name: "Quick Save" }));
    expect(rowOf(rows, "who")?.value).toBe("Any hero");
    expect(rowOf(rows, "effect")?.value).toBe("No description of the effect");
    expect(rowOf(rows, "battle")?.value).toBe("Nothing in battle");
    expect(rowOf(rows, "scaling")?.value).toBe("Does not scale");
  });

  it("reads only the character level when there is no class", () => {
    expect(rowOf(powerSummary(spell({ characterRequirement: { level: 3 } })), "who")?.value).toBe("Hero level 3");
    expect(rowOf(powerSummary(spell({ characterRequirement: { class: { technician: 1 } } })), "who")?.value).toBe("Technician level 1");
  });

  it("shows the name the Game Master gave it or a nudge when it has none yet", () => {
    expect(rowOf(powerSummary(named({ name: "" })), "name")?.value).toBe("No name yet");
  });
});
