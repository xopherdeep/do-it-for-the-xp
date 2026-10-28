/**
 * The Start a Project wizard's rules: which step is valid when, what choosing a type fills in, how the house re-homes
 * the chores, and how the Game Master's edits to the list change the draft. Pure: no storage, no Vue.
 */
import { addDays } from "date-fns";
import { CATALOG } from "@/lib/services/copy/catalog";
import { VOICES } from "@/lib/services/copy/voices";
import type { CopyCatalog } from "@/lib/services/copy/voices";
import { DEFAULT_MOVING_ROOMS } from "@/lib/services/core/packs/movingPack";
import { FIBONACCI_STEPS, dateKey, parseLocalDate } from "@/lib/services/core/packs/packCommon";
import type { PackHero } from "@/lib/services/core/packs/packCommon";
import { PROJECT_TYPES } from "@/lib/services/core/packs/projects";
import {
  WHOLE_HOUSE_ID,
  choresFromLastRun,
  houseRoomsOf,
  rehomeChores,
  suggestChores,
} from "@/lib/services/projects/projectChores";
import type { ProjectChore } from "@/lib/services/projects/projectChores";
import { minimumEndOn, phaseWindows } from "@/lib/services/projects/projectSchedule";
import {
  PROJECT_WIZARD_STEPS,
  addChore,
  dayText,
  dropChore,
  heroesFrom,
  isRealDay,
  isRerun,
  newProjectDraft,
  projectIdOf,
  projectWizardSteps,
  reassignChore,
  renameChore,
  resizeChore,
  roomCount,
  towerInputOf,
  whoLabel,
  windowLines,
  withHouse,
  withType,
} from "@/lib/services/projects/projectWizard";
import type { ProjectDraft } from "@/lib/services/projects/projectWizard";

const TODAY = "2026-10-27";

const mom: PackHero = { id: "mom", name: "Mom", band: "grownup" };
const kai: PackHero = { id: "kai", name: "Kai", band: "kid" };
const lia: PackHero = { id: "lia", name: "Lia", band: "little" };
const HEROES = [mom, kai, lia];

const context = (lastChores: readonly ProjectChore[] | null = null) => ({ today: TODAY, heroes: HEROES, lastChores });

const picked = (typeId: "spring-cleaning" | "moving-out" = "spring-cleaning", lastChores: readonly ProjectChore[] | null = null): ProjectDraft =>
  withType(newProjectDraft(TODAY), typeId, context(lastChores));

const stepOf = (id: string, steps = projectWizardSteps("adventure", () => TODAY)) => {
  const found = steps.find((step) => step.id === id);
  if (!found) throw new Error(`no step ${id}`);
  return found;
};

const SPRING = PROJECT_TYPES["spring-cleaning"];
const phaseName = (index: number): string => SPRING.phases[index].name;

/** The draft with every chore of one phase taken out */
const without = (draft: ProjectDraft, phaseId: string): ProjectDraft => ({
  ...draft,
  chores: draft.chores.filter((chore) => chore.phaseId !== phaseId),
});

describe("projectIdOf", () => {
  it("is the type and the first day, the id the quests and the record are kept under", () => {
    expect(projectIdOf("spring-cleaning", TODAY)).toBe("spring-cleaning-2026-10-27");
    expect(projectIdOf("moving-out", "2027-01-02")).toBe("moving-out-2027-01-02");
  });
});

describe("the wizard's steps", () => {
  it("are type, house, chores, dates and build, each with a title, a guide line and an icon", () => {
    expect(PROJECT_WIZARD_STEPS.map((step) => step.id)).toEqual(["type", "house", "chores", "dates", "build"]);
    PROJECT_WIZARD_STEPS.forEach((step) => {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.guide.length).toBeGreaterThan(0);
      expect(step.icon).toBeTruthy();
    });
  });

  it("speak in the voice they are built for", () => {
    const guides = VOICES.map((voice) => projectWizardSteps(voice)[0].guide);
    expect(new Set(guides).size).toBe(3);
  });

  it("skip nothing", () => {
    const draft = picked();
    PROJECT_WIZARD_STEPS.forEach((step) => expect(step.isSkipped?.(draft) ?? false).toBe(false));
  });
});

describe("a new draft", () => {
  it("has no type, the usual rooms, no chores, today as the end and no reward", () => {
    const draft = newProjectDraft(TODAY);
    expect(draft.typeId).toBeUndefined();
    expect(draft.house.rooms).toEqual(DEFAULT_MOVING_ROOMS);
    expect(draft.chores).toEqual([]);
    expect(draft.endOn).toBe(TODAY);
    expect(draft.rewardText).toBe("");
  });

  it("owns its rooms: one draft's edit never reaches the next", () => {
    const first = newProjectDraft(TODAY);
    first.house.rooms.bedroom = 7;
    expect(newProjectDraft(TODAY).house.rooms.bedroom).toBe(DEFAULT_MOVING_ROOMS.bedroom);
    expect(DEFAULT_MOVING_ROOMS.bedroom).toBe(3);
  });
});

describe("the type step", () => {
  const type = stepOf("type");

  it("is valid only with a type chosen", () => {
    expect(type.isValid(newProjectDraft(TODAY))).not.toBe(true);
    expect(type.isValid(picked())).toBe(true);
  });

  it("does not take a type it does not know", () => {
    const stray = { ...newProjectDraft(TODAY), typeId: "holiday-prep" } as unknown as ProjectDraft;
    expect(type.isValid(stray)).not.toBe(true);
  });
});

describe("choosing a type", () => {
  it("ends the project the type's default days from today", () => {
    expect(picked("spring-cleaning").endOn).toBe(dateKey(addDays(parseLocalDate(TODAY), PROJECT_TYPES["spring-cleaning"].defaultDays)));
    expect(picked("moving-out").endOn).toBe(dateKey(addDays(parseLocalDate(TODAY), PROJECT_TYPES["moving-out"].defaultDays)));
  });

  it("fills the chores from the suggestions for the house and the heroes", () => {
    const draft = picked("spring-cleaning");
    expect(draft.typeId).toBe("spring-cleaning");
    expect(draft.chores).toEqual(suggestChores(SPRING, draft.house, HEROES));
    expect(draft.chores.length).toBeGreaterThan(0);
  });

  it("starts from the last run's list when there is one, with its ids made new", () => {
    const last = suggestChores(SPRING, newProjectDraft(TODAY).house, HEROES);
    const draft = picked("spring-cleaning", last);
    expect(draft.chores).toEqual(rehomeChores(choresFromLastRun(last, HEROES), draft.house));
    expect(draft.chores.every((chore) => chore.id.includes("~r1"))).toBe(true);
  });

  it("changes nothing else the Game Master said: the rooms and the reward stay", () => {
    const before = { ...newProjectDraft(TODAY), rewardText: "Pizza night", house: { rooms: { kitchen: 1, bedroom: 2 } } };
    const after = withType(before, "moving-out", context());
    expect(after.house).toEqual({ rooms: { kitchen: 1, bedroom: 2 } });
    expect(after.rewardText).toBe("Pizza night");
  });

  it("hands over its own copies: an edit never reaches the type or the last run", () => {
    const typeBefore = JSON.stringify(SPRING);
    const last = suggestChores(SPRING, newProjectDraft(TODAY).house, HEROES);
    const lastBefore = JSON.stringify(last);
    const fresh = picked("spring-cleaning");
    const fromRun = picked("spring-cleaning", last);
    [fresh, fromRun].forEach((draft) => {
      draft.chores.forEach((chore) => {
        chore.name = "Edited";
        chore.assignee.push("x");
      });
      draft.house.rooms.kitchen = 9;
    });
    expect(JSON.stringify(SPRING)).toBe(typeBefore);
    expect(JSON.stringify(last)).toBe(lastBefore);
    expect(suggestChores(SPRING, newProjectDraft(TODAY).house, HEROES)).toEqual(JSON.parse(lastBefore));
  });

  it("does not change the draft it was given", () => {
    const blank = newProjectDraft(TODAY);
    const before = JSON.stringify(blank);
    withType(blank, "spring-cleaning", context());
    expect(JSON.stringify(blank)).toBe(before);
  });

  it("gives a chore to every phase of each type on the usual house", () => {
    (["spring-cleaning", "moving-out"] as const).forEach((typeId) => {
      expect(stepOf("chores").isValid(picked(typeId))).toBe(true);
    });
  });
});

describe("a last run that cannot be started from", () => {
  it("is not used when it has no chores, or a floor the type no longer has, or two finales: the suggestions fill in", () => {
    const suggested = suggestChores(SPRING, newProjectDraft(TODAY).house, HEROES);
    const stray = suggested.map((chore, index) => (index === 0 ? { ...chore, phaseId: "attic" } : chore));
    const twoFinales = [...suggested, { ...suggested[suggested.length - 1], id: "roof:again" }];
    [[], stray, twoFinales].forEach((last) => {
      const draft = picked("spring-cleaning", last);
      expect(draft.chores).toEqual(suggested);
      expect(isRerun(SPRING, last)).toBe(false);
    });
  });

  it("is used when it fits, and no type means no re-run", () => {
    const last = suggestChores(SPRING, newProjectDraft(TODAY).house, HEROES);
    expect(isRerun(SPRING, last)).toBe(true);
    expect(isRerun(SPRING, null)).toBe(false);
    expect(isRerun(undefined, last)).toBe(false);
  });
});

describe("re-homing a re-run", () => {
  it("sends a chore whose room is gone to the whole house and loses none", () => {
    const big = { rooms: { bedroom: 3, kitchen: 1 } };
    const last = suggestChores(SPRING, big, HEROES);
    expect(last.some((chore) => chore.roomId === "bedroom-3")).toBe(true);
    const small = { ...newProjectDraft(TODAY), house: { rooms: { bedroom: 1, kitchen: 1 } } };
    const draft = withType(small, "spring-cleaning", context(last));
    expect(draft.chores).toHaveLength(last.length);
    expect(draft.chores.some((chore) => chore.roomId === "bedroom-3")).toBe(false);
    const lost = last.filter((chore) => chore.roomId === "bedroom-3" || chore.roomId === "bedroom-2").length;
    expect(draft.chores.filter((chore) => chore.roomId === WHOLE_HOUSE_ID).length).toBeGreaterThanOrEqual(lost);
  });

  it("keeps the finale on the roof", () => {
    const last = suggestChores(SPRING, { rooms: { kitchen: 1 } }, HEROES);
    const draft = withType({ ...newProjectDraft(TODAY), house: { rooms: { yard: 1 } } }, "spring-cleaning", context(last));
    const finale = draft.chores.filter((chore) => chore.phaseId === "roof");
    expect(finale).toHaveLength(1);
    expect(finale[0].roomId).toBe("roof");
  });

  it("is one rule for the wizard and the builder: rooms the house has stay, others go to the whole house", () => {
    const house = { rooms: { kitchen: 1 } };
    const chores: ProjectChore[] = [
      { id: "a", phaseId: "declutter", roomId: "kitchen", name: "A", difficulty: 2, assignee: [] },
      { id: "b", phaseId: "declutter", roomId: "garage", name: "B", difficulty: 2, assignee: [] },
      { id: "c", phaseId: "roof", roomId: "roof", name: "C", difficulty: 8, assignee: [] },
    ];
    expect(rehomeChores(chores, house).map((chore) => chore.roomId)).toEqual(["kitchen", WHOLE_HOUSE_ID, "roof"]);
    expect(houseRoomsOf(house).some((room) => room.id === WHOLE_HOUSE_ID)).toBe(true);
    expect(chores[1].roomId).toBe("garage");
  });
});

describe("changing the house", () => {
  it("rebuilds the suggestions for the new rooms", () => {
    const draft = picked();
    const smaller = { rooms: { kitchen: 1 } };
    const after = withHouse(draft, smaller, context());
    expect(after.house).toEqual(smaller);
    expect(after.chores).toEqual(suggestChores(SPRING, smaller, HEROES));
    expect(after.chores.length).toBeLessThan(draft.chores.length);
  });

  it("rebuilds a re-run from the last run, so a room that comes back gets its chores back", () => {
    const last = suggestChores(SPRING, { rooms: { bedroom: 3, kitchen: 1 } }, HEROES);
    const draft = picked("spring-cleaning", last);
    const fewer = withHouse(draft, { rooms: { kitchen: 1 } }, context(last));
    expect(fewer.chores.some((chore) => chore.roomId.startsWith("bedroom"))).toBe(false);
    const back = withHouse(fewer, { rooms: { bedroom: 3, kitchen: 1 } }, context(last));
    expect(back.chores.map((chore) => chore.roomId)).toEqual(rehomeChores(choresFromLastRun(last, HEROES), back.house).map((chore) => chore.roomId));
    expect(back.chores.some((chore) => chore.roomId === "bedroom-3")).toBe(true);
  });

  it("leaves the edited list alone when only the basement changes, since the chores do not read it", () => {
    const edited = renameChore(picked(), picked().chores[0].id, "My own name");
    const after = withHouse(edited, { rooms: { ...edited.house.rooms }, basement: true }, context());
    expect(after.house.basement).toBe(true);
    expect(after.chores).toBe(edited.chores);
  });

  it("only keeps the rooms when no type is chosen yet", () => {
    const after = withHouse(newProjectDraft(TODAY), { rooms: { kitchen: 1 } }, context());
    expect(after.house.rooms).toEqual({ kitchen: 1 });
    expect(after.chores).toEqual([]);
  });

  it("holds its own copy of the rooms", () => {
    const rooms = { kitchen: 1 };
    const after = withHouse(picked(), { rooms }, context());
    rooms.kitchen = 5;
    expect(after.house.rooms.kitchen).toBe(1);
  });
});

describe("the house step", () => {
  const house = stepOf("house");

  it("counts the rooms the house has, not the Whole House", () => {
    expect(roomCount({ rooms: {} })).toBe(0);
    expect(roomCount({ rooms: { kitchen: 1, bedroom: 3 } })).toBe(4);
    expect(roomCount({ rooms: { kitchen: 0, bedroom: 0 } })).toBe(0);
  });

  it("needs at least one room", () => {
    expect(house.isValid(newProjectDraft(TODAY))).toBe(true);
    const empty = { ...newProjectDraft(TODAY), house: { rooms: { kitchen: 0, bedroom: 0 } } };
    const verdict = house.isValid(empty);
    expect(typeof verdict).toBe("string");
    expect((verdict as string).length).toBeGreaterThan(0);
  });
});

describe("the chores step", () => {
  const chores = stepOf("chores");

  it("needs a chore in every phase and names the phase that has none", () => {
    expect(chores.isValid(picked())).toBe(true);
    SPRING.phases.forEach((phase, index) => {
      const verdict = chores.isValid(without(picked(), phase.id));
      expect(typeof verdict).toBe("string");
      expect(verdict).toContain(phaseName(index));
    });
  });

  it("names the phase in every voice", () => {
    VOICES.forEach((voice) => {
      const verdict = stepOf("chores", projectWizardSteps(voice, () => TODAY)).isValid(without(picked(), "organize"));
      expect(verdict).toContain("Organize");
    });
  });

  it("asks the last phase for a chore too, since its biggest chore guards the Boss Key", () => {
    const lastPhase = SPRING.phases[SPRING.phases.length - 1];
    expect(chores.isValid(without(picked(), lastPhase.id))).toContain(lastPhase.name);
  });

  it("does not count the roof's finale as a phase's chore", () => {
    const onlyFinale = { ...picked(), chores: picked().chores.filter((chore) => chore.phaseId === "roof") };
    expect(onlyFinale.chores).toHaveLength(1);
    expect(chores.isValid(onlyFinale)).toContain(phaseName(0));
  });

  it("asks for a name on every chore", () => {
    const draft = picked();
    const nameless = renameChore(draft, draft.chores[0].id, "   ");
    expect(typeof chores.isValid(nameless)).toBe("string");
  });

  it("is not valid before a type is chosen", () => {
    expect(chores.isValid(newProjectDraft(TODAY))).not.toBe(true);
  });
});

describe("the dates step", () => {
  const dates = stepOf("dates");
  const ready = (over: Partial<ProjectDraft> = {}): ProjectDraft => ({ ...picked(), rewardText: "Pizza night", ...over });
  // Spring Cleaning has four phases: a day each at the least, so the earliest end is three days after the start
  const earliest = minimumEndOn(SPRING.phases.length, TODAY);

  it("takes the type's default end, with a reward", () => {
    expect(dates.isValid(ready())).toBe(true);
  });

  it("takes the earliest end, a day for each phase", () => {
    expect(earliest).toBe("2026-10-30");
    expect(dates.isValid(ready({ endOn: earliest }))).toBe(true);
  });

  it("refuses an end before that and names the earliest date", () => {
    const verdict = dates.isValid(ready({ endOn: "2026-10-29" }));
    expect(typeof verdict).toBe("string");
    expect(verdict).toContain(earliest);
  });

  it("names the earliest date in every voice", () => {
    VOICES.forEach((voice) => {
      const verdict = stepOf("dates", projectWizardSteps(voice, () => TODAY)).isValid(ready({ endOn: TODAY }));
      expect(verdict).toContain(earliest);
    });
  });

  it("refuses text that is not a real day before it asks the schedule anything", () => {
    ["", "soon", "2026-02-31", "2026-13-01", "10/30/2026", "2026-10-30T00:00"].forEach((endOn) => {
      const verdict = dates.isValid(ready({ endOn }));
      expect(typeof verdict).toBe("string");
      expect(verdict).not.toContain(earliest);
    });
  });

  it("asks for the family reward, and a few spaces are not one", () => {
    expect(typeof dates.isValid(ready({ rewardText: "" }))).toBe("string");
    expect(typeof dates.isValid(ready({ rewardText: "    " }))).toBe("string");
    expect(dates.isValid(ready({ rewardText: "Ice cream" }))).toBe(true);
  });

  it("is not valid before a type is chosen", () => {
    expect(dates.isValid({ ...newProjectDraft(TODAY), rewardText: "x" })).not.toBe(true);
  });

  it("reads today from the clock when the steps are the ready-made ones", () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date(2026, 9, 27, 9, 0, 0));
      const verdict = stepOf("dates", PROJECT_WIZARD_STEPS).isValid(ready({ endOn: "2026-10-28" }));
      expect(verdict).toContain("2026-10-30");
      jest.setSystemTime(new Date(2026, 9, 20, 9, 0, 0));
      expect(stepOf("dates", PROJECT_WIZARD_STEPS).isValid(ready({ endOn: "2026-10-28" }))).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("isRealDay", () => {
  it("is true for a day that exists and false for anything else", () => {
    expect(isRealDay("2026-10-27")).toBe(true);
    expect(isRealDay("2028-02-29")).toBe(true);
    expect(isRealDay("2026-02-29")).toBe(false);
    expect(isRealDay("2026-04-31")).toBe(false);
    expect(isRealDay("2026-1-5")).toBe(false);
    expect(isRealDay("")).toBe(false);
  });
});

describe("the heroes", () => {
  it("are everyone in the family, banded by the profile: an adult is a grown-up, a child's age decides", () => {
    const year = new Date().getFullYear();
    const heroes = heroesFrom([
      { id: 7, name: { nick: "Mom", first: "Maria" }, isAdult: true, birthday: `${year - 35}-03-04` },
      { id: "kai", name: { first: "Kai" }, isAdult: false, birthday: `${year - 12}-01-01` },
      { id: "lia", name: { full: "Lia Ray" }, isAdult: false, birthday: `${year - 6}-01-01` },
      { id: "x" },
    ]);
    expect(heroes).toEqual([
      { id: "7", name: "Mom", band: "grownup" },
      { id: "kai", name: "Kai", band: "kid" },
      { id: "lia", name: "Lia Ray", band: "little" },
      { id: "x", name: "Hero", band: "kid" },
    ]);
  });

  it("are named on a chore: the hero, everyone when all who play have it, the names together, or nobody", () => {
    const words = { nobody: "Nobody", everyone: "Everyone" };
    const sitter: PackHero = { id: "sit", name: "Sitter", band: "out" };
    const chore = (assignee: string[]): ProjectChore => ({ id: "c", phaseId: "p", roomId: "house", name: "C", difficulty: 2, assignee });
    expect(whoLabel(chore([]), HEROES, words)).toBe("Nobody");
    expect(whoLabel(chore(["kai"]), HEROES, words)).toBe("Kai");
    expect(whoLabel(chore(["mom", "kai", "lia"]), HEROES, words)).toBe("Everyone");
    expect(whoLabel(chore(["mom", "kai"]), HEROES, words)).toBe("Mom, Kai");
    expect(whoLabel(chore(["mom", "kai"]), [mom, kai, sitter], words)).toBe("Everyone");
    expect(whoLabel(chore(["ghost"]), HEROES, words)).toBe("Hero");
  });
});

describe("the dates, read out", () => {
  it("names a day by its weekday, month and date", () => {
    expect(dayText("2026-10-27")).toBe("Tue Oct 27");
    expect(dayText("2026-11-10")).toBe("Tue Nov 10");
  });

  it("lists each floor's days in order, from today to the end, and one-day floors without the 'to'", () => {
    const draft = { ...picked(), endOn: "2026-10-30" };
    const lines = windowLines(draft, TODAY, "adventure");
    expect(lines.map((line) => line.id)).toEqual(SPRING.phases.map((phase) => phase.id));
    expect(lines[0].text).toBe("Declutter: Tue Oct 27");
    expect(lines[3].text).toBe("Final Inspection: Fri Oct 30");
    const longer = windowLines({ ...picked(), endOn: "2026-11-10" }, TODAY, "adventure");
    expect(longer[0].text).toContain(" to ");
    expect(longer[0].text.startsWith("Declutter: Tue Oct 27 to ")).toBe(true);
  });

  it("lists nothing while the end is not a real day or is too near, or before a type is chosen", () => {
    expect(windowLines({ ...picked(), endOn: "soon" }, TODAY, "adventure")).toEqual([]);
    expect(windowLines({ ...picked(), endOn: TODAY }, TODAY, "adventure")).toEqual([]);
    expect(windowLines(newProjectDraft(TODAY), TODAY, "adventure")).toEqual([]);
  });
});

describe("the build step", () => {
  it("is the summary: valid once a type is chosen", () => {
    expect(stepOf("build").isValid(picked())).toBe(true);
    expect(stepOf("build").isValid(newProjectDraft(TODAY))).not.toBe(true);
  });
});

describe("editing the list", () => {
  const draft = picked();
  const first = draft.chores[0];

  it("renames a chore and nothing else", () => {
    const after = renameChore(draft, first.id, "Sweep the porch");
    expect(after.chores[0]).toEqual({ ...first, name: "Sweep the porch" });
    expect(after.chores.slice(1)).toEqual(draft.chores.slice(1));
    expect(draft.chores[0].name).toBe(first.name);
  });

  it("resizes onto the slider's steps: any size snaps to the nearest, a tie to the bigger", () => {
    const sizes = [0, 1, 4, 6, 7, 10, 13, 40].map((raw) => resizeChore(draft, first.id, raw).chores[0].difficulty);
    expect(sizes).toEqual([1, 1, 5, 5, 8, 8, 13, 13]);
    sizes.forEach((size) => expect(FIBONACCI_STEPS).toContain(size));
  });

  it("keeps the size when the chore changes hands, even a size the new hero's age would not get", () => {
    const big = resizeChore(draft, first.id, 13);
    const owned = { ...big, chores: big.chores.map((chore) => ({ ...chore, assignee: ["mom"] })) };
    const handed = reassignChore(owned, first.id, HEROES);
    expect(handed.chores[0].assignee).toEqual(["kai"]);
    expect(handed.chores[0].difficulty).toBe(13);
  });

  it("hands the chore to each hero in turn, then to everyone, then round again", () => {
    let current = { ...draft, chores: draft.chores.map((chore) => ({ ...chore, assignee: [] as string[] })) };
    const seen: string[][] = [];
    for (let turn = 0; turn < 5; turn += 1) {
      current = reassignChore(current, first.id, HEROES);
      seen.push(current.chores[0].assignee);
    }
    expect(seen).toEqual([["mom"], ["kai"], ["lia"], ["mom", "kai", "lia"], ["mom"]]);
  });

  it("does not offer everyone to a family of one, and skips heroes who sit out", () => {
    const sitter: PackHero = { id: "sit", name: "Sitter", band: "out" };
    const solo = { ...draft, chores: draft.chores.map((chore) => ({ ...chore, assignee: [] as string[] })) };
    const once = reassignChore(solo, first.id, [mom]);
    expect(once.chores[0].assignee).toEqual(["mom"]);
    expect(reassignChore(once, first.id, [mom]).chores[0].assignee).toEqual(["mom"]);
    expect(reassignChore(solo, first.id, [sitter, kai]).chores[0].assignee).toEqual(["kai"]);
    expect(reassignChore(solo, first.id, [sitter]).chores[0].assignee).toEqual([]);
  });

  it("adds the Game Master's own chore to a phase, in the whole house, marked as theirs", () => {
    const after = addChore(draft, "organize", "Sort the toy bin", HEROES);
    const added = after.chores.filter((chore) => !draft.chores.some((old) => old.id === chore.id));
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ phaseId: "organize", roomId: WHOLE_HOUSE_ID, name: "Sort the toy bin", custom: true, assignee: ["mom"] });
    expect(FIBONACCI_STEPS).toContain(added[0].difficulty);
  });

  it("gives every added chore an id of its own, also after one is dropped", () => {
    let current = draft;
    for (let count = 0; count < 3; count += 1) current = addChore(current, "organize", "Another", HEROES);
    expect(new Set(current.chores.map((chore) => chore.id)).size).toBe(current.chores.length);
    const mine = current.chores.filter((chore) => chore.custom);
    expect(mine).toHaveLength(3);
    const gone = dropChore(current, mine[1].id);
    const again = addChore(gone, "organize", "Another", HEROES);
    expect(again.chores).toHaveLength(current.chores.length);
    expect(new Set(again.chores.map((chore) => chore.id)).size).toBe(again.chores.length);
  });

  it("puts a new chore last in its phase, where the list shows it", () => {
    const after = addChore(draft, "declutter", "Last of declutter", HEROES);
    const inPhase = after.chores.filter((chore) => chore.phaseId === "declutter");
    expect(inPhase[inPhase.length - 1].name).toBe("Last of declutter");
  });

  it("will not add to the roof, which holds one finale, or to a floor the tower does not have", () => {
    expect(addChore(draft, "roof", "Second boss", HEROES)).toBe(draft);
    expect(addChore(draft, "attic", "Nowhere", HEROES)).toBe(draft);
  });

  it("drops a chore, but never the finale", () => {
    const after = dropChore(draft, first.id);
    expect(after.chores.some((chore) => chore.id === first.id)).toBe(false);
    expect(after.chores).toHaveLength(draft.chores.length - 1);
    const finale = draft.chores.find((chore) => chore.phaseId === "roof") as ProjectChore;
    expect(dropChore(draft, finale.id)).toBe(draft);
  });

  it("leaves a name, a size or an owner it does not find as it was", () => {
    expect(renameChore(draft, "nope", "x")).toEqual(draft);
    expect(resizeChore(draft, "nope", 8)).toEqual(draft);
    expect(reassignChore(draft, "nope", HEROES)).toEqual(draft);
    expect(dropChore(draft, "nope")).toEqual(draft);
  });

  it("never changes the draft it was given or the type", () => {
    const typeBefore = JSON.stringify(SPRING);
    const draftBefore = JSON.stringify(draft);
    renameChore(draft, first.id, "x");
    resizeChore(draft, first.id, 13);
    reassignChore(draft, first.id, HEROES);
    addChore(draft, "organize", "y", HEROES);
    dropChore(draft, first.id);
    expect(JSON.stringify(draft)).toBe(draftBefore);
    expect(JSON.stringify(SPRING)).toBe(typeBefore);
  });
});

describe("the tower input", () => {
  const now = new Date(2026, 9, 27, 18, 30, 0);
  const draft = { ...picked(), rewardText: "Pizza night" };

  it("is the type, the house, the chores, the phases' windows, the build time and the heroes", () => {
    const input = towerInputOf(draft, { today: TODAY, now, heroes: HEROES });
    expect(input.projectId).toBe(projectIdOf("spring-cleaning", TODAY));
    expect(input.type).toBe(SPRING);
    expect(input.house).toEqual(draft.house);
    expect(input.chores).toEqual(draft.chores);
    expect(input.windows).toEqual(phaseWindows(SPRING.phases, TODAY, draft.endOn));
    expect(input.now).toBe(now);
    expect(input.heroes).toEqual(HEROES);
  });

  it("trims the names and holds its own copy of the list, so the record outlives the wizard", () => {
    const messy = renameChore(draft, draft.chores[0].id, "  Sweep the porch  ");
    const input = towerInputOf(messy, { today: TODAY, now, heroes: HEROES });
    expect(input.chores[0].name).toBe("Sweep the porch");
    input.chores[1].assignee.push("x");
    input.house.rooms.kitchen = 9;
    expect(messy.chores[1].assignee).not.toContain("x");
    expect(messy.house.rooms.kitchen).toBe(1);
  });

  it("refuses a draft with no type", () => {
    expect(() => towerInputOf(newProjectDraft(TODAY), { today: TODAY, now, heroes: HEROES })).toThrow();
  });

  it("lets the schedule's own error through for an end too near, so a build never goes ahead on bad dates", () => {
    expect(() => towerInputOf({ ...draft, endOn: TODAY }, { today: TODAY, now, heroes: HEROES })).toThrow(RangeError);
  });
});

describe("the wizard's words", () => {
  const lines = Object.entries(CATALOG as CopyCatalog).filter(([key]) => key.startsWith("projectWizard."));

  it("are in the catalogue, written in all three voices for the guides and the problems", () => {
    expect(lines.length).toBeGreaterThan(10);
    const spoken = lines.filter(([key]) => /^projectWizard\.(guide|problem)\./.test(key));
    expect(spoken.length).toBeGreaterThan(8);
    spoken.forEach(([key, entry]) => {
      expect([key, Boolean(entry.simple), Boolean(entry.classic)]).toEqual([key, true, true]);
    });
  });

  it("have no em dashes", () => {
    const withDash = lines
      .filter(([, entry]) => [entry.simple, entry.adventure, entry.classic].some((line) => (line ?? "").includes("\u2014")))
      .map(([key]) => key);
    expect(withDash).toEqual([]);
  });
});
