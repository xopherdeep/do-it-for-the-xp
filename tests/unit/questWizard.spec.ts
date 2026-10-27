import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { SEED_REWARDS } from "@/lib/services/core/packs/packSeeds";
import { prefillQueryFor, questPrefill } from "@/lib/services/quests/questPrefill";
import {
  addStep,
  buildWizardQuest,
  canAdvance,
  chooseFamilyBeast,
  choreTiles,
  clampDifficulty,
  cleanSteps,
  COMMON_CHORES,
  defaultChore,
  draftProblem,
  dropStep,
  HERO_QUESTS_CATEGORY,
  KID_MAX_DIFFICULTY,
  newDraft,
  pickChore,
  questWizardSteps,
  rewardsOf,
  searchChores,
  setWhen,
  sizesFor,
  stepGuide,
  STEP_ICON,
  suggestedRewards,
  toggleDay,
  toggleEveryone,
  toggleHero,
  typeChore,
  weekdayOf,
  whenLine,
  willPropose,
  wizardCategory,
  wizardSteps,
} from "@/lib/services/quests/questWizard";
import type { BuildContext, WizardDraft } from "@/lib/services/quests/questWizard";
import { saveWizardQuest } from "@/lib/services/quests/questWizardSave";

const bySlug = (slug: string) => {
  const entry = BEAST_LIBRARY.find((beast) => beast.slug === slug);
  if (!entry) throw new Error(`no library beast ${slug}`);
  return entry;
};

// Wed 14 Oct 2026, local noon
const TODAY = new Date(2026, 9, 14, 12, 0);

const kidCtx: BuildContext = {
  isGm: false,
  creatorId: "kid-1",
  categoryId: HERO_QUESTS_CATEGORY.id,
  familyBeasts: [],
  questId: "quest-abcdef123456",
  today: TODAY,
};
const gmCtx: BuildContext = { ...kidCtx, isGm: true, creatorId: "gm-1" };

const picked = (slug: string, over: Partial<WizardDraft> = {}, isGm = false): WizardDraft => ({
  ...pickChore(newDraft({ isGm, heroId: isGm ? "gm-1" : "kid-1", today: TODAY }), bySlug(slug)),
  ...over,
});

describe("the wizard's screens", () => {
  it("gives a Game Master the Who screen and a hero none", () => {
    expect(wizardSteps(true)).toEqual(["what", "steps", "when", "size", "who", "ready"]);
    expect(wizardSteps(false)).toEqual(["what", "steps", "when", "size", "ready"]);
  });

  it("gives a maker the Who screen too, so a kid can choose who the quest is for", () => {
    expect(wizardSteps(false, true)).toEqual(["what", "steps", "when", "size", "who", "ready"]);
    expect(wizardSteps(false, false)).toEqual(["what", "steps", "when", "size", "ready"]);
  });

  it("blocks Next only on the screen that names the quest", () => {
    expect(canAdvance("what", { name: "" })).toBe(false);
    expect(canAdvance("what", { name: "  " })).toBe(false);
    expect(canAdvance("what", { name: "Make the bed" })).toBe(true);
    for (const step of ["steps", "when", "size", "who", "ready"] as const) expect(canAdvance(step, { name: "" })).toBe(true);
  });
});

describe("the wizard's screens as shell steps", () => {
  it("gives a Game Master six steps and a hero five, in the order of the screens", () => {
    expect(questWizardSteps(true).map((step) => step.id)).toEqual(["what", "steps", "when", "size", "who", "ready"]);
    expect(questWizardSteps(false).map((step) => step.id)).toEqual(["what", "steps", "when", "size", "ready"]);
  });

  it("gives a maker six steps, with the Who in the same place a Game Master has it", () => {
    expect(questWizardSteps(false, "adventure", true).map((step) => step.id)).toEqual(["what", "steps", "when", "size", "who", "ready"]);
    expect(questWizardSteps(false, "adventure").map((step) => step.id)).not.toContain("who");
  });

  it("carries each screen's guide line in the hero's voice and its picture", () => {
    for (const voice of ["simple", "adventure", "classic"] as const) {
      for (const step of questWizardSteps(true, voice)) {
        expect(step.guide).toBe(stepGuide(step.id as Parameters<typeof stepGuide>[0], voice));
        expect(step.guide).not.toBe("");
      }
    }
    for (const step of questWizardSteps(true)) {
      expect(step.icon).toBe(STEP_ICON[step.id as keyof typeof STEP_ICON]);
      expect(step.title).not.toBe("");
    }
  });

  it("asks only for the name, and gives no reason line (the guide's question already asks for it)", () => {
    const [what, ...others] = questWizardSteps(true);
    expect(what.isValid({ ...newDraft({ isGm: true, heroId: "gm-1", today: TODAY }), name: "" })).toBe(false);
    expect(what.isValid({ ...newDraft({ isGm: true, heroId: "gm-1", today: TODAY }), name: "Make the bed" })).toBe(true);
    for (const step of others) expect(step.isValid(newDraft({ isGm: true, heroId: "gm-1", today: TODAY }))).toBe(true);
  });

  it("skips nothing: a hero's missing Who is left out of the list, not skipped", () => {
    for (const step of questWizardSteps(true)) expect(step.isSkipped).toBeUndefined();
  });
});

describe("sizes", () => {
  it("offers a hero Tiny to Big, 1 2 3 5, and a Game Master Boss 8 and Mega 13 as well", () => {
    expect(sizesFor(false).map((s) => [s.label, s.id])).toEqual([["Tiny", 1], ["Small", 2], ["Medium", 3], ["Big", 5]]);
    expect(sizesFor(true).map((s) => s.id)).toEqual([1, 2, 3, 5, 8, 13]);
    expect(KID_MAX_DIFFICULTY).toBe(5);
  });

  it("pays what the Quick Start quests pay for the same size: Small is 120 XP, 30 GP and 2 AP", () => {
    expect(rewardsOf(1)).toEqual({ xp: 60, gp: 15, ap: 1 });
    expect(rewardsOf(2)).toEqual({ xp: 120, gp: 30, ap: 2 });
    expect(rewardsOf(3)).toEqual({ xp: 220, gp: 60, ap: 4 });
    for (const size of [1, 2, 3] as const) expect(rewardsOf(size)).toEqual(SEED_REWARDS[size]);
  });

  it("goes on past the packs' sizes at the rate of the largest one, so Tiny pays less than Small and a bigger size never pays less", () => {
    expect(rewardsOf(5)).toEqual({ xp: 370, gp: 100, ap: 7 });
    expect(rewardsOf(8)).toEqual({ xp: 590, gp: 160, ap: 11 });
    expect(rewardsOf(13)).toEqual({ xp: 950, gp: 260, ap: 17 });
    const sizes = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
    for (let at = 1; at < sizes.length; at++) {
      const smaller = suggestedRewards(sizes[at - 1]);
      const bigger = suggestedRewards(sizes[at]);
      expect(bigger.xp).toBeGreaterThan(smaller.xp);
      expect(bigger.gp).toBeGreaterThan(smaller.gp);
      expect(bigger.ap).toBeGreaterThan(smaller.ap);
    }
  });

  it("treats a size that is no number, or less than Tiny, as Tiny", () => {
    expect(suggestedRewards(Number.NaN)).toEqual(suggestedRewards(1));
    expect(suggestedRewards(0)).toEqual(suggestedRewards(1));
    expect(suggestedRewards(-4)).toEqual(suggestedRewards(1));
  });

  it("snaps a stray number to the nearest size the person may pick", () => {
    expect(clampDifficulty(13, false)).toBe(5);
    expect(clampDifficulty(8, false)).toBe(5);
    expect(clampDifficulty(4, false)).toBe(3);
    expect(clampDifficulty(13, true)).toBe(13);
    expect(clampDifficulty(Number.NaN, false)).toBe(2);
  });
});

describe("the chore tiles", () => {
  it("lists every chore beast once, never a classic one", () => {
    const tiles = choreTiles("kid");
    expect(tiles).toHaveLength(BEAST_LIBRARY.length);
    expect(new Set(tiles.map((t) => t.id)).size).toBe(BEAST_LIBRARY.length);
  });

  it("puts the hero's own age band first, and the most common chores first inside it", () => {
    const little = choreTiles("little");
    const littleCount = BEAST_LIBRARY.filter((b) => b.age === "little").length;
    expect(little.slice(0, littleCount).every((b) => b.age === "little")).toBe(true);
    expect(little[0].slug).toBe("bed-basilisk");

    const kid = choreTiles("kid");
    expect(kid[0].age).toBe("kid");
    expect(kid.slice(-1)[0].age).toBe("little");

    const grownup = choreTiles("grownup");
    expect(grownup[0].age).toBe("teen");
  });

  it("only names chores that exist in the library", () => {
    const slugs = new Set(BEAST_LIBRARY.map((b) => b.slug));
    for (const slug of COMMON_CHORES) expect(slugs.has(slug)).toBe(true);
  });

  it("finds a chore by the words a person types, and nothing for a blank field", () => {
    expect(searchChores("dishwasher").map((e) => e.name)).toContain("Dish Goblin");
    expect(searchChores("teeth")[0].name).toBe("Fang Fairy");
    expect(searchChores("   ")).toEqual([]);
    expect(searchChores("zzzzqx")).toEqual([]);
  });
});

describe("typing a chore", () => {
  const blank = newDraft({ isGm: false, heroId: "kid-1", today: TODAY });

  it("takes the beast the library suggests and its steps", () => {
    const draft = typeChore(blank, "brush my teeth");
    expect(draft.entry?.name).toBe("Fang Fairy");
    expect(draft.steps).toEqual([...bySlug("fang-fairy").checklist]);
    expect(draft.isOwn).toBe(true);
    expect(draft.name).toBe("brush my teeth");
  });

  it("falls back to the default beast with no steps when nothing fits", () => {
    const draft = typeChore(blank, "juggle flaming torches");
    expect(draft.entry?.id).toBe(defaultChore().id);
    expect(draft.entry?.slug).toBe("mess-hog");
    expect(draft.steps).toEqual([]);
  });

  it("keeps the steps already edited while the same beast fits", () => {
    const first = addStep(typeChore(blank, "brush teeth"), "Floss too");
    const second = typeChore(first, "brush my teeth now");
    expect(second.steps).toContain("Floss too");
  });

  it("holds no beast for an empty name", () => {
    const draft = typeChore(typeChore(blank, "brush teeth"), "");
    expect(draft.entry).toBeNull();
    expect(draftProblem(draft)).toMatch(/chore/);
  });

  it("is a different matter from a picked tile, which brings its own name and steps", () => {
    const draft = pickChore(blank, bySlug("dish-goblin"));
    expect(draft.name).toBe("Load the dishwasher");
    expect(draft.steps).toEqual([...bySlug("dish-goblin").checklist]);
    expect(draft.isOwn).toBe(false);
    // a copy: dropping a step does not touch the library
    expect(dropStep(draft, 0).steps).toHaveLength(draft.steps.length - 1);
    expect(bySlug("dish-goblin").checklist).toHaveLength(draft.steps.length);
  });
});

describe("steps", () => {
  it("trims, drops blanks and repeats, and keeps a sensible count", () => {
    expect(cleanSteps(["  Wash  the cups ", "", "Wash the cups", "Dry"])).toEqual(["Wash the cups", "Dry"]);
    expect(cleanSteps(Array.from({ length: 30 }, (_, i) => `step ${i}`))).toHaveLength(12);
  });

  it("adds a step and drops one by place", () => {
    const base = picked("bed-basilisk");
    const added = addStep(base, "Fluff the pillow");
    expect(added.steps.slice(-1)[0]).toBe("Fluff the pillow");
    expect(dropStep(added, added.steps.length - 1).steps).toEqual(base.steps);
    expect(addStep(base, "   ").steps).toEqual(base.steps);
  });
});

describe("the draft's defaults and the Calendar's prefill", () => {
  it("starts on today, anytime, Small, the hero alone, and approval for a hero", () => {
    const draft = newDraft({ isGm: false, heroId: "kid-1", today: TODAY });
    expect(draft).toMatchObject({ when: "today", time: "anytime", difficulty: 2, heroIds: ["kid-1"], day: "2026-10-14", requiresApproval: true });
    expect(newDraft({ isGm: true, heroId: "gm-1", today: TODAY }).requiresApproval).toBe(false);
  });

  it("takes the day and part of the day the Calendar was showing", () => {
    const prefill = questPrefill(prefillQueryFor(new Date(2026, 9, 16), "evening", "kid-1"));
    const draft = newDraft({ isGm: false, heroId: "kid-1", prefill, today: TODAY });
    expect(draft.day).toBe("2026-10-16");
    expect(draft.time).toBe("evening");
    expect(draft.heroIds).toEqual(["kid-1"]);
  });

  it("lets a Game Master make the quest for the hero whose Calendar it is, but a hero only for themself", () => {
    const prefill = questPrefill(prefillQueryFor(TODAY, "all", "kid-2"));
    expect(newDraft({ isGm: true, heroId: "gm-1", prefill, today: TODAY }).heroIds).toEqual(["kid-2"]);
    expect(newDraft({ isGm: false, heroId: "kid-1", prefill, today: TODAY }).heroIds).toEqual(["kid-1"]);
  });

  it("lets a maker keep the hero the Calendar named, and a family beast the Maker just made", () => {
    const prefill = { ...questPrefill(prefillQueryFor(TODAY, "all", "kid-2")), beastId: "b9" };
    const draft = newDraft({ isGm: false, isMaker: true, heroId: "kid-1", prefill, today: TODAY });
    expect(draft.heroIds).toEqual(["kid-2"]);
    expect(draft.beastId).toBe("b9");
    expect(draft.entry).toBeNull();
    // the same prefill for a hero who may not make things still keeps the hero to themself
    expect(newDraft({ isGm: false, heroId: "kid-1", prefill, today: TODAY }).heroIds).toEqual(["kid-1"]);
    expect(newDraft({ isGm: false, isMaker: true, heroId: "kid-1", today: TODAY }).beastId).toBeUndefined();
  });

  it("picks a family beast outright: its name names the quest unless the draft has one, and its steps fill an empty list", () => {
    const beast = { id: "b9", name: "Sock Monster", checklist: ["Find the pair", "Roll them"] };
    const blank = newDraft({ isGm: false, isMaker: true, heroId: "kid-1", today: TODAY });
    expect(chooseFamilyBeast(blank, beast)).toMatchObject({ beastId: "b9", name: "Sock Monster", steps: ["Find the pair", "Roll them"], entry: null });
    const named = { ...blank, name: "Pair the socks", steps: ["Dump the basket"] };
    expect(chooseFamilyBeast(named, beast)).toMatchObject({ beastId: "b9", name: "Pair the socks", steps: ["Dump the basket"] });
  });

  it("lets go of the family beast when a chore is picked or typed instead", () => {
    const beast = { id: "b9", name: "Sock Monster", checklist: ["Find the pair"] };
    const withBeast = chooseFamilyBeast(newDraft({ isGm: false, isMaker: true, heroId: "kid-1", today: TODAY }), beast);
    expect(pickChore(withBeast, bySlug("bed-basilisk")).beastId).toBeUndefined();
    expect(typeChore(withBeast, "juggle flaming torches").beastId).toBeUndefined();
    expect(typeChore(withBeast, "").beastId).toBeUndefined();
  });

  it("ignores a prefill it cannot read", () => {
    const draft = newDraft({ isGm: false, heroId: "kid-1", prefill: questPrefill({ day: "tomorrow", time: "teatime" }), today: TODAY });
    expect(draft).toMatchObject({ day: "2026-10-14", time: "anytime" });
  });
});

describe("when", () => {
  it("ticks the start day's weekday when Some days is picked, and never lets the last one go", () => {
    const draft = setWhen(picked("bed-basilisk"), "days");
    expect(weekdayOf("2026-10-14")).toBe("wed");
    expect(draft.days).toEqual(["wed"]);
    expect(toggleDay(draft, "wed").days).toEqual(["wed"]);
    expect(toggleDay(toggleDay(draft, "mon"), "fri").days).toEqual(["mon", "wed", "fri"]);
    expect(toggleDay(toggleDay(draft, "mon"), "wed").days).toEqual(["mon"]);
  });

  it("reads the schedule back in a line", () => {
    const base = picked("bed-basilisk");
    expect(whenLine(base, TODAY)).toBe("Today");
    expect(whenLine({ ...base, time: "morning" }, TODAY)).toBe("Today · Morning");
    expect(whenLine({ ...base, when: "daily", time: "night" }, TODAY)).toBe("Every day · Night");
    expect(whenLine({ ...base, when: "days", days: ["mon", "wed"] }, TODAY)).toBe("Mon · Wed");
    expect(whenLine({ ...base, day: "2026-10-16" }, TODAY)).toBe("Fri 16 Oct");
  });
});

describe("building the quest", () => {
  it("saves a one-time beast quest the way the Compendium form would", () => {
    const { quest, beast } = buildWizardQuest(picked("dish-goblin", { difficulty: 3, time: "evening" }), kidCtx);
    expect(quest).toMatchObject({
      id: "quest-abcdef123456",
      achievementName: "Load The Dishwasher",
      categoryId: "cat-hero-quests",
      beastId: "beast-dish-goblin",
      adventureType: "beast",
      noBeast: false,
      basicSchedule: "once",
      scheduleType: "basic",
      showDailyUntilComplete: false,
      repeatOnDays: [],
      timesOfDay: ["evening"],
      difficulty: 3,
      xp: 220,
      gp: 60,
      ap: 4,
      type: "individual",
      draft: false,
      bonusAchievement: false,
      subAchievementIds: [],
      endsOn: "",
    });
    expect(new Date(quest.startsOn).getTime()).toBe(new Date(2026, 9, 14).getTime());
    // the library beast joins the family's bestiary with its steps
    expect(beast?.id).toBe("beast-dish-goblin");
    expect(beast?.checklist).toEqual([...bySlug("dish-goblin").checklist]);
  });

  it("never overwrites a beast the family already has", () => {
    const { quest, beast } = buildWizardQuest(picked("dish-goblin"), { ...kidCtx, familyBeasts: [{ id: "beast-dish-goblin" }] });
    expect(beast).toBeNull();
    expect(quest.beastId).toBe("beast-dish-goblin");
  });

  it("leaves the part of the day off for Anytime", () => {
    const { quest } = buildWizardQuest(picked("bed-basilisk"), kidCtx);
    expect(quest.timesOfDay).toBeUndefined();
  });

  it("makes a daily quest that shows until it is done", () => {
    const { quest } = buildWizardQuest(picked("bed-basilisk", { when: "daily", time: "morning" }), kidCtx);
    expect(quest).toMatchObject({ basicSchedule: "daily", showDailyUntilComplete: true, repeatOnDays: [], timesOfDay: ["morning"] });
  });

  it("makes a weekly quest on the ticked days", () => {
    const draft = toggleDay(setWhen(picked("bed-basilisk"), "days"), "mon");
    const { quest } = buildWizardQuest(draft, kidCtx);
    expect(quest).toMatchObject({ basicSchedule: "weekly", showDailyUntilComplete: false, repeatOnDays: ["mon", "wed"] });
  });

  it("falls back to the start day's weekday when no day is ticked", () => {
    const { quest } = buildWizardQuest(picked("bed-basilisk", { when: "days", days: [] }), kidCtx);
    expect(quest.repeatOnDays).toEqual(["wed"]);
  });

  it("saves a hero's edited steps as the family's own copy of the beast, leaving the library's alone", () => {
    const draft = addStep(picked("dish-goblin"), "Say thank you to the dishwasher");
    const { quest, beast } = buildWizardQuest(draft, kidCtx);
    expect(beast?.id).toBe("beast-dish-goblin-quest-ab");
    expect(quest.beastId).toBe(beast?.id);
    expect(beast?.name).toBe("Dish Goblin");
    expect(beast?.avatar).toBe(bySlug("dish-goblin").avatar);
    expect(beast?.checklist.slice(-1)[0]).toBe("Say thank you to the dishwasher");
    expect(bySlug("dish-goblin").checklist).not.toContain("Say thank you to the dishwasher");
  });

  it("gives a chore the library does not know the default beast and the one step of itself", () => {
    const draft = typeChore(newDraft({ isGm: false, heroId: "kid-1", today: TODAY }), "juggle flaming torches");
    const { quest, beast } = buildWizardQuest(draft, kidCtx);
    expect(quest.achievementName).toBe("Juggle Flaming Torches");
    expect(quest.adventureType).toBe("beast");
    expect(beast?.name).toBe("Mess Hog");
    expect(beast?.checklist).toEqual([]);
    expect(quest.beastId).toBe(beast?.id);
  });

  it("refuses a quest with no name", () => {
    expect(() => buildWizardQuest(newDraft({ isGm: false, heroId: "kid-1", today: TODAY }), kidCtx)).toThrow(/name/);
  });
});

describe("how a hero's quest is protected", () => {
  it("is for that hero alone, whoever the draft says", () => {
    const draft = picked("bed-basilisk", { heroIds: ["kid-2", "gm-1"] });
    expect(buildWizardQuest(draft, kidCtx).quest.assignee).toEqual(["kid-1"]);
  });

  it("is never bigger than Big, whatever the draft says", () => {
    const { quest } = buildWizardQuest(picked("bed-basilisk", { difficulty: 13 }), kidCtx);
    expect(quest).toMatchObject({ difficulty: 5, xp: 370, gp: 100, ap: 7 });
  });

  it("a chore that asks for a photo carries the flag and forces approval on for a Game Master too", () => {
    const { quest } = buildWizardQuest({ ...picked("bed-basilisk", { requiresApproval: false }), requiresPhoto: true }, gmCtx);
    expect(quest).toMatchObject({ requiresPhoto: true, requiresApproval: true });
    expect(buildWizardQuest(picked("bed-basilisk", {}), gmCtx).quest.requiresPhoto).toBeUndefined();
  });

  it("always needs the Game Master's approval, whatever the draft says", () => {
    const { quest } = buildWizardQuest(picked("bed-basilisk", { requiresApproval: false }), kidCtx);
    expect(quest.requiresApproval).toBe(true);
  });

  it("records the hero who made it", () => {
    expect(buildWizardQuest(picked("bed-basilisk"), kidCtx).quest.createdBy).toBe("kid-1");
  });
});

describe("what a maker may do", () => {
  const makerCtx: BuildContext = { ...kidCtx, isMaker: true };
  const sentOn = "2026-10-20T08:00:00.000Z";
  // A beast the kid made: waiting for a Game Master, sent back with a note, or approved
  const familyBeast = (state: "proposed" | "returned" | "approved") => ({
    id: "beast-sock",
    name: "Sock Monster",
    checklist: ["Find the pair", "Roll them"],
    proposal: { by: "kid-1", on: sentOn, state },
  });
  const forBeast = (over: Partial<WizardDraft> = {}): WizardDraft => ({
    ...chooseFamilyBeast(newDraft({ isGm: false, isMaker: true, heroId: "kid-1", today: TODAY }), familyBeast("proposed")),
    ...over,
  });

  it("still saves a quest for themself on a library beast live, with no proposal (D5)", () => {
    const draft = picked("bed-basilisk");
    const { quest, linkBeast } = buildWizardQuest(draft, makerCtx);
    expect(quest.proposal).toBeUndefined();
    expect(quest.draft).toBeFalsy();
    expect(quest.assignee).toEqual(["kid-1"]);
    expect(quest.requiresApproval).toBe(true);
    expect(linkBeast).toBeUndefined();
    expect(willPropose(draft, makerCtx)).toBe(false);
  });

  it("proposes a quest for a sibling, hidden from the heroes until a Game Master approves it", () => {
    const draft = picked("bed-basilisk", { heroIds: ["kid-1", "kid-2"] });
    const { quest, linkBeast } = buildWizardQuest(draft, makerCtx);
    expect(quest).toMatchObject({ draft: true, assignee: ["kid-1", "kid-2"], createdBy: "kid-1", requiresApproval: true });
    expect(quest.proposal).toEqual({ by: "kid-1", on: TODAY.toISOString(), state: "proposed" });
    expect(linkBeast).toBeUndefined();
    expect(willPropose(draft, makerCtx)).toBe(true);
  });

  it("proposes a quest made only for someone else, and keeps the maker out of the party they did not pick", () => {
    const draft = picked("bed-basilisk", { heroIds: ["kid-2"] });
    expect(buildWizardQuest(draft, makerCtx).quest).toMatchObject({ assignee: ["kid-2"], draft: true });
    expect(willPropose(draft, makerCtx)).toBe(true);
  });

  it("still falls back to themself when no hero is ticked, and that stays live", () => {
    const draft = picked("bed-basilisk", { heroIds: [] });
    const { quest } = buildWizardQuest(draft, makerCtx);
    expect(quest).toMatchObject({ assignee: ["kid-1"], draft: false });
    expect(quest.proposal).toBeUndefined();
    expect(willPropose(draft, makerCtx)).toBe(false);
  });

  it("proposes a quest on a family beast that is still waiting, and points the beast back at the quest", () => {
    const familyBeasts = [familyBeast("proposed")];
    const draft = forBeast();
    const { quest, beast, linkBeast } = buildWizardQuest(draft, { ...makerCtx, familyBeasts });
    expect(quest).toMatchObject({ beastId: "beast-sock", adventureType: "beast", noBeast: false, draft: true });
    expect(quest.achievementName).toBe("Sock Monster");
    expect(quest.proposal).toMatchObject({ state: "proposed", by: "kid-1" });
    // the family's beast is the beast: nothing is adopted or copied, even though the draft carries no edits
    expect(beast).toBeNull();
    expect(linkBeast).toEqual({ id: "beast-sock", proposal: { by: "kid-1", on: sentOn, state: "proposed", questId: quest.id } });
    expect(willPropose(draft, { ...makerCtx, familyBeasts })).toBe(true);
  });

  it("proposes a quest on a family beast a Game Master sent back, linking it too", () => {
    const familyBeasts = [familyBeast("returned")];
    const { quest, linkBeast } = buildWizardQuest(forBeast(), { ...makerCtx, familyBeasts });
    expect(quest.proposal?.state).toBe("proposed");
    expect(linkBeast?.proposal).toMatchObject({ state: "returned", questId: quest.id });
    expect(willPropose(forBeast(), { ...makerCtx, familyBeasts })).toBe(true);
  });

  it("saves a quest for themself on an approved family beast live", () => {
    const familyBeasts = [familyBeast("approved")];
    const draft = forBeast();
    const { quest, beast, linkBeast } = buildWizardQuest(draft, { ...makerCtx, familyBeasts });
    expect(quest).toMatchObject({ beastId: "beast-sock", adventureType: "beast", noBeast: false, draft: false });
    expect(quest.proposal).toBeUndefined();
    expect(beast).toBeNull();
    expect(linkBeast).toBeUndefined();
    expect(willPropose(draft, { ...makerCtx, familyBeasts })).toBe(false);
  });

  it("saves a quest on a Game Master's family beast (no proposal on it) live too", () => {
    const { id, name, checklist } = familyBeast("approved");
    const familyBeasts = [{ id, name, checklist }];
    expect(willPropose(forBeast(), { ...makerCtx, familyBeasts })).toBe(false);
    expect(buildWizardQuest(forBeast(), { ...makerCtx, familyBeasts }).quest.proposal).toBeUndefined();
  });

  it("proposes for a sibling even on an approved family beast", () => {
    const familyBeasts = [familyBeast("approved")];
    const draft = forBeast({ heroIds: ["kid-1", "kid-2"] });
    const { quest, linkBeast } = buildWizardQuest(draft, { ...makerCtx, familyBeasts });
    expect(quest).toMatchObject({ draft: true, beastId: "beast-sock" });
    expect(linkBeast).toBeUndefined();
  });

  it("never proposes for a hero who may not make things, whatever the draft says", () => {
    const familyBeasts = [familyBeast("proposed")];
    const draft = forBeast({ heroIds: ["kid-1", "kid-2"] });
    expect(willPropose(draft, { ...kidCtx, familyBeasts })).toBe(false);
    expect(buildWizardQuest(draft, { ...kidCtx, familyBeasts }).quest).toMatchObject({ assignee: ["kid-1"], draft: false });
  });

  it("never proposes for a Game Master, who approves their own", () => {
    const familyBeasts = [familyBeast("proposed")];
    const draft = forBeast({ heroIds: ["kid-1", "kid-2"] });
    const ctx = { ...gmCtx, isMaker: true, familyBeasts };
    expect(willPropose(draft, ctx)).toBe(false);
    const { quest, linkBeast } = buildWizardQuest(draft, ctx);
    expect(quest.proposal).toBeUndefined();
    expect(linkBeast).toBeUndefined();
  });

  it("is still never bigger than Big", () => {
    expect(buildWizardQuest(picked("bed-basilisk", { difficulty: 13 }), makerCtx).quest.difficulty).toBe(5);
  });

  it("taps Everyone to put every profile in the party, and taps it again to go back to themself", () => {
    const everyone = ["kid-1", "kid-2", "gm-1"];
    const base = picked("bed-basilisk");
    const all = toggleEveryone(base, everyone, "kid-1");
    expect(all.heroIds).toEqual(everyone);
    expect(buildWizardQuest(all, makerCtx).quest).toMatchObject({ assignee: everyone, draft: true });
    expect(toggleEveryone(all, everyone, "kid-1").heroIds).toEqual(["kid-1"]);
    // a party of two out of three is not everyone yet
    expect(toggleEveryone(toggleHero(base, "kid-2"), everyone, "kid-1").heroIds).toEqual(everyone);
  });
});

describe("what a Game Master may do", () => {
  it("picks any heroes, any size and whether the quest needs approval", () => {
    const draft = toggleHero(picked("bed-basilisk", { difficulty: 13, heroIds: ["kid-1"] }, true), "kid-2");
    const { quest } = buildWizardQuest(draft, gmCtx);
    expect(quest).toMatchObject({ assignee: ["kid-1", "kid-2"], difficulty: 13, xp: 950, requiresApproval: false, createdBy: "gm-1" });
    expect(buildWizardQuest({ ...draft, requiresApproval: true }, gmCtx).quest.requiresApproval).toBe(true);
  });

  it("falls back to themself when no hero is ticked", () => {
    const draft = picked("bed-basilisk", { heroIds: [] }, true);
    expect(buildWizardQuest(draft, gmCtx).quest.assignee).toEqual(["gm-1"]);
  });
});

describe("the Hero Quests category", () => {
  it("is created once, then reused", () => {
    expect(wizardCategory([{ id: "cat-chamber" }])).toEqual({ id: "cat-hero-quests", create: HERO_QUESTS_CATEGORY });
    expect(wizardCategory([{ id: "cat-hero-quests" }])).toEqual({ id: "cat-hero-quests", create: null });
  });
});

describe("saving", () => {
  const stores = (over: { categories?: unknown[]; beasts?: unknown[] } = {}) => {
    const calls: string[] = [];
    return {
      calls,
      stores: {
        categoryDb: {
          getAll: jest.fn(async () => over.categories ?? [undefined]),
          setCategory: jest.fn(async (category: { id: string }) => void calls.push(`category:${category.id}`)),
        },
        bestiaryDb: {
          getBeasts: jest.fn(async () => over.beasts ?? []),
          setBeast: jest.fn(async (beast: { id: string }) => void calls.push(`beast:${beast.id}`)),
        },
        achievementDb: { setTask: jest.fn(async (quest: { id: string }) => void calls.push(`quest:${quest.id}`)) },
      },
    };
  };

  it("writes the category, then the beast, then the quest", async () => {
    const { calls, stores: fake } = stores();
    const quest = await saveWizardQuest(picked("bed-basilisk"), { isGm: false, creatorId: "kid-1", questId: "q1", today: TODAY }, fake as never);
    expect(calls).toEqual(["category:cat-hero-quests", "beast:beast-bed-basilisk", "quest:q1"]);
    expect(quest.categoryId).toBe("cat-hero-quests");
  });

  it("adds neither a category nor a beast the family already has", async () => {
    const { calls, stores: fake } = stores({ categories: [{ id: "cat-hero-quests" }], beasts: [{ id: "beast-bed-basilisk" }] });
    await saveWizardQuest(picked("bed-basilisk"), { isGm: false, creatorId: "kid-1", questId: "q2", today: TODAY }, fake as never);
    expect(calls).toEqual(["quest:q2"]);
  });

  it("writes nothing for a quest with no name", async () => {
    const { calls, stores: fake } = stores();
    const blank = newDraft({ isGm: false, heroId: "kid-1", today: TODAY });
    await expect(saveWizardQuest(blank, { isGm: false, creatorId: "kid-1" }, fake as never)).rejects.toThrow(/name/);
    expect(calls).toEqual([]);
  });
});
