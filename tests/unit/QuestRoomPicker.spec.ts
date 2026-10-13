/**
 * The quest picker of the temple room editor as pure rules (docs/Quest-Rooms-Spec.md section 9): the rows the picker
 * shows for the family's quests, what its three segments and the search keep, which library beasts "From the library"
 * offers, the quest it creates from one of them, and the temple size meter that previews the pick.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import {
  LIBRARY_DIFFICULTIES,
  PICKER_SEGMENTS,
  beastToAdopt,
  buildPickerRows,
  defaultLibraryForm,
  defaultPickerSegment,
  dormantLine,
  filterPickerRows,
  NEVER_AMBUSHES_NOTE,
  layoutSize,
  libraryCardOf,
  libraryChoices,
  libraryFormProblem,
  pickerSegmentsFor,
  previewSize,
  questCardOf,
  questFromLibraryBeast,
  roomSizeShare,
  type LibraryQuestForm,
} from "@/lib/services/temples/questRoomPicker";

const libraryBeast = (slug: string) => {
  const beast = BEAST_LIBRARY.find((entry) => entry.slug === slug);
  if (!beast) throw new Error(`no library beast ${slug}`);
  return beast;
};

const quest = (overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id: "q1",
    achievementName: "Load the dishwasher",
    categoryId: "",
    bonusAchievement: false,
    requiresApproval: false,
    beastId: "beast-dish-goblin",
    type: "individual",
    assignee: ["hero-1"],
    basicSchedule: "daily",
    scheduleType: "basic",
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    dueByTime: "",
    endsOn: "",
    startsOn: "2026-01-01T00:00:00.000Z",
    repeatOnDays: [],
    showDailyUntilComplete: false,
    difficulty: 2,
    xp: 200,
    gp: 20,
    ap: 2,
    adventureType: "beast",
    ...overrides,
  }) as Achievement;

const users = [
  { id: "hero-1", name: { nick: "Mia" } },
  { id: "hero-2", name: { nick: "Sam" } },
];

describe("buildPickerRows", () => {
  it("describes a quest the way the picker shows it", () => {
    const [row] = buildPickerRows([quest({ difficulty: 5, requiresApproval: true, dueByTime: "18:00" })], [], users);
    expect(row).toMatchObject({
      id: "q1",
      name: "Load the dishwasher",
      beastId: "beast-dish-goblin",
      beastName: "Dish Goblin",
      theme: "shadow",
      difficulty: 5,
      difficultyName: "Moderate",
      tier: "miniboss",
      tierName: "Miniboss",
      schedule: "Daily",
      heroes: "Mia",
      requiresApproval: true,
      neverAmbushes: false,
    });
    expect(row.avatar).toBe(libraryBeast("dish-goblin").avatar);
  });

  it("says a quest with no due time never ambushes, and one with a due time does", () => {
    const rows = buildPickerRows([quest({ id: "a", dueByTime: "" }), quest({ id: "b", dueByTime: "07:30" })], [], users);
    expect(rows.map((row) => [row.id, row.neverAmbushes])).toEqual([
      ["a", true],
      ["b", false],
    ]);
  });

  it("leaves drafts out, because a draft cannot hold a room", () => {
    const rows = buildPickerRows([quest({ id: "live" }), quest({ id: "wip", draft: true })], [], users);
    expect(rows.map((row) => row.id)).toEqual(["live"]);
  });

  it("reads the beast from the family's bestiary first, then the library, and takes the theme from either", () => {
    const owned: Beast = { id: "beast-dish-goblin", name: "Plate Fiend", avatar: 777, checklist: [], theme: "water" };
    const [fromBestiary] = buildPickerRows([quest()], [owned], users);
    expect(fromBestiary).toMatchObject({ beastName: "Plate Fiend", avatar: 777, theme: "water" });
    const [fromLibrary] = buildPickerRows([quest()], [], users);
    expect(fromLibrary).toMatchObject({ beastName: "Dish Goblin", theme: "shadow" });
  });

  it("uses the beast the library suggests for a quest that has none, and leaves a custom beast without a theme", () => {
    const [suggested] = buildPickerRows([quest({ beastId: "", achievementName: "Banish the Dish Goblin" })], [], users);
    expect(suggested.beastId).toBe("beast-dish-goblin");
    const custom: Beast = { id: "mine", name: "Rex", avatar: 3, checklist: [] };
    const [mine] = buildPickerRows([quest({ beastId: "mine" })], [custom], users);
    expect(mine).toMatchObject({ beastId: "mine", beastName: "Rex" });
    expect(mine.theme).toBeUndefined();
  });

  it("copes with a quest that has no beast at all (the Game Master chose none)", () => {
    const [row] = buildPickerRows([quest({ beastId: "", achievementName: "zzzz qqqq", noBeast: true })], [], users);
    expect(row.beastId).toBeUndefined();
    expect(row.beastName).toBe("No beast");
    expect(row.avatar).toBeUndefined();
  });

  it("lists the rows by name", () => {
    const rows = buildPickerRows(
      [quest({ id: "z", achievementName: "Zebra chores" }), quest({ id: "a", achievementName: "Apple chores" })],
      [],
      users
    );
    expect(rows.map((row) => row.id)).toEqual(["a", "z"]);
  });
});

describe("the cards", () => {
  it("says everything a quest row shows: tier, difficulty with its number, beast, schedule, heroes and approval", () => {
    const [row] = buildPickerRows([quest({ difficulty: 8, requiresApproval: true, dueByTime: "18:00", assignee: ["hero-1", "hero-2"] })], [], users);
    expect(questCardOf(row)).toEqual({
      key: "q1",
      name: "Load the dishwasher",
      avatar: libraryBeast("dish-goblin").avatar,
      portraitAlt: "Dish Goblin",
      tier: "boss",
      tierName: "Boss",
      facts: "Challenging 8 · Dish Goblin",
      when: "Daily · Mia, Sam",
      approval: true,
      note: undefined,
    });
  });

  it("adds 'no due time: never ambushes' to a quest with no due time", () => {
    const [row] = buildPickerRows([quest({ dueByTime: "" })], [], users);
    expect(questCardOf(row).note).toBe(NEVER_AMBUSHES_NOTE);
    expect(NEVER_AMBUSHES_NOTE).toBe("no due time: ambushes any time");
  });

  it("keeps a difficulty between the slider's steps as its number, and skips the missing parts", () => {
    const [odd] = buildPickerRows([quest({ difficulty: 6, beastId: "", noBeast: true, achievementName: "zzz qqq" })], [], users);
    const card = questCardOf(odd);
    expect(card.facts).toBe("6 · No beast");
  });

  it("makes a library card from the beast's chore, name, room and age band, with no tier yet", () => {
    expect(libraryCardOf(libraryBeast("dish-goblin"))).toEqual({
      key: "beast-dish-goblin",
      name: "Load the dishwasher",
      avatar: libraryBeast("dish-goblin").avatar,
      portraitAlt: "Dish Goblin",
      facts: "Dish Goblin",
      when: "Kitchen · Kids",
      approval: false,
    });
  });
});

describe("dormantLine", () => {
  it("names the template's beast: the family's own copy first, then the library's", () => {
    expect(dormantLine({ beastId: "beast-dust-dervish" }, [])).toBe("Dormant: Dust Dervish, no quest yet");
    expect(dormantLine({ beastId: "beast-dust-dervish" }, [{ id: "beast-dust-dervish", name: "Whirl", checklist: [] }])).toBe(
      "Dormant: Whirl, no quest yet"
    );
  });

  it("copes with a beast that is in neither", () => {
    expect(dormantLine({ beastId: "gone" }, [])).toBe("Dormant: a beast, no quest yet");
  });
});

describe("the picker's segments", () => {
  const rows = buildPickerRows(
    [
      quest({ id: "dishes", achievementName: "Load the dishwasher", beastId: "beast-dish-goblin" }),
      quest({ id: "weeds", achievementName: "Pull the weeds", beastId: "beast-weed-wyrm", assignee: ["hero-2"] }),
      quest({ id: "own", achievementName: "Walk Rex", beastId: "mine" }),
    ],
    [{ id: "mine", name: "Rex", checklist: [] }],
    users
  );

  it("offers the temple's theme first when the temple has one, and leaves it out when it has none", () => {
    expect(pickerSegmentsFor("shadow").map((segment) => segment.id)).toEqual(["theme", "all", "library"]);
    expect(pickerSegmentsFor(undefined).map((segment) => segment.id)).toEqual(["all", "library"]);
    expect(PICKER_SEGMENTS.map((segment) => segment.label)).toEqual(["This temple's theme", "All quests", "From the library"]);
    expect(defaultPickerSegment("shadow")).toBe("theme");
    expect(defaultPickerSegment(undefined)).toBe("all");
  });

  it("keeps the quests whose beast belongs to the temple's theme", () => {
    expect(filterPickerRows(rows, { segment: "theme", theme: "shadow", search: "" }).map((row) => row.id)).toEqual(["dishes"]);
    expect(filterPickerRows(rows, { segment: "theme", theme: "earth", search: "" }).map((row) => row.id)).toEqual(["weeds"]);
  });

  it("keeps nothing in the theme segment of a temple without a theme", () => {
    expect(filterPickerRows(rows, { segment: "theme", theme: undefined, search: "" })).toEqual([]);
  });

  it("keeps every quest under All quests, themed or not", () => {
    expect(filterPickerRows(rows, { segment: "all", theme: "shadow", search: "" }).map((row) => row.id)).toEqual(["dishes", "weeds", "own"]);
  });

  it("searches the quest, its beast, its heroes and its tier, ignoring case and spaces at the ends", () => {
    const find = (search: string) => filterPickerRows(rows, { segment: "all", theme: undefined, search }).map((row) => row.id);
    expect(find("  WEEDS ")).toEqual(["weeds"]);
    expect(find("goblin")).toEqual(["dishes"]);
    expect(find("sam")).toEqual(["weeds"]);
    expect(find("monster")).toEqual(["dishes", "weeds", "own"]);
    expect(find("nothing like it")).toEqual([]);
  });

  it("searches inside the theme segment too", () => {
    expect(filterPickerRows(rows, { segment: "theme", theme: "shadow", search: "weeds" })).toEqual([]);
  });

  it("has no quest rows in the library segment: it lists beasts", () => {
    expect(filterPickerRows(rows, { segment: "library", theme: "shadow", search: "" })).toEqual([]);
  });
});

describe("libraryChoices", () => {
  it("lists the theme's chore beasts that no quest uses yet", () => {
    const all = libraryChoices([], { theme: "shadow", search: "" });
    expect(all.length).toBeGreaterThan(5);
    expect(all.every((beast) => beast.theme === "shadow")).toBe(true);
    const taken = libraryChoices([quest({ beastId: "beast-dish-goblin" })], { theme: "shadow", search: "" });
    expect(taken.map((beast) => beast.id)).not.toContain("beast-dish-goblin");
    expect(taken).toHaveLength(all.length - 1);
  });

  it("counts the beast the library suggests for a beast-less quest as used, because a room matches it that way", () => {
    const choices = libraryChoices([quest({ beastId: "", achievementName: "Banish the Dish Goblin" })], { theme: "shadow", search: "" });
    expect(choices.map((beast) => beast.id)).not.toContain("beast-dish-goblin");
  });

  it("does not count a draft as a quest", () => {
    const choices = libraryChoices([quest({ beastId: "beast-dish-goblin", draft: true })], { theme: "shadow", search: "" });
    expect(choices.map((beast) => beast.id)).toContain("beast-dish-goblin");
  });

  it("searches the beast and its chore", () => {
    const choices = libraryChoices([], { theme: "shadow", search: "dishwasher" });
    expect(choices.map((beast) => beast.id)).toContain("beast-dish-goblin");
    expect(choices.every((beast) => beast.theme === "shadow")).toBe(true);
  });

  it("lists every theme's chore beasts, and never a classic one, when the temple has no theme", () => {
    const choices = libraryChoices([], { theme: undefined, search: "" });
    expect(new Set(choices.map((beast) => beast.theme)).size).toBe(9);
    expect(choices.some((beast) => "classic" in beast)).toBe(false);
  });
});

describe("the quest made from a library beast", () => {
  const form: LibraryQuestForm = { heroes: ["hero-1", "hero-2"], schedule: "weekly", difficulty: 5, requiresApproval: true };
  const now = new Date("2026-10-12T09:00:00Z");

  it("takes the beast's chore as its name and the beast as its beast, for the heroes chosen", () => {
    const made = questFromLibraryBeast(libraryBeast("dish-goblin"), form, "tq-1", now);
    expect(made).toMatchObject({
      id: "tq-1",
      achievementName: "Load the dishwasher",
      beastId: "beast-dish-goblin",
      adventureType: "beast",
      type: "individual",
      assignee: ["hero-1", "hero-2"],
      basicSchedule: "weekly",
      scheduleType: "basic",
      requiresApproval: true,
      bonusAchievement: false,
      startsOn: now.toISOString(),
    });
    expect(made.draft).toBeUndefined();
  });

  it("pays the way the quest form does: xp 100 x, gp 10 x and ap 1 x the difficulty", () => {
    const made = questFromLibraryBeast(libraryBeast("dish-goblin"), { ...form, difficulty: 8 }, "tq-2", now);
    expect([made.difficulty, made.xp, made.gp, made.ap]).toEqual([8, 800, 80, 8]);
  });

  it("keeps a daily quest on the board until it is done, and does not for a weekly one", () => {
    expect(questFromLibraryBeast(libraryBeast("dish-goblin"), { ...form, schedule: "daily" }, "a", now).showDailyUntilComplete).toBe(true);
    expect(questFromLibraryBeast(libraryBeast("dish-goblin"), form, "b", now).showDailyUntilComplete).toBe(false);
  });

  it("copies the hero list, so the form can change after the quest is made", () => {
    const heroes = ["hero-1"];
    const made = questFromLibraryBeast(libraryBeast("dish-goblin"), { ...form, heroes }, "c", now);
    heroes.push("hero-2");
    expect(made.assignee).toEqual(["hero-1"]);
  });

  it("starts the form on every hero, a daily quest, Simple, with no approval", () => {
    expect(defaultLibraryForm(["hero-1", "hero-2"])).toEqual({ heroes: ["hero-1", "hero-2"], schedule: "daily", difficulty: 2, requiresApproval: false });
  });

  it("asks for at least one hero and a step of the difficulty slider", () => {
    expect(libraryFormProblem(form)).toBeNull();
    expect(libraryFormProblem({ ...form, heroes: [] })).toMatch(/hero/i);
    expect(libraryFormProblem({ ...form, difficulty: 4 })).toMatch(/difficulty/i);
    expect(LIBRARY_DIFFICULTIES).toEqual([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]);
  });
});

describe("beastToAdopt", () => {
  it("is the library beast when the family's bestiary does not hold it yet", () => {
    const adopted = beastToAdopt("beast-dish-goblin", ["something-else"]);
    expect(adopted).toMatchObject({ id: "beast-dish-goblin", name: "Dish Goblin", theme: "shadow" });
  });

  it("is nothing when the bestiary has the beast, the id is not a library beast, or there is no beast", () => {
    expect(beastToAdopt("beast-dish-goblin", ["beast-dish-goblin"])).toBeNull();
    expect(beastToAdopt("mine", [])).toBeNull();
    expect(beastToAdopt(undefined, [])).toBeNull();
  });
});

describe("temple size", () => {
  const dishes = quest({ id: "dishes", difficulty: 2 });
  const boss = quest({ id: "boss", difficulty: 13, beastId: "beast-trash-troll" });
  const quests = [dishes, boss];

  const roomOf = (content: Room["content"], type = "monster"): Room => ({ type, content });

  describe("roomSizeShare", () => {
    it("is the difficulty of the quest the room holds", () => {
      expect(roomSizeShare(roomOf({ questId: "boss" }), quests)).toEqual({ difficulty: 13 });
    });

    it("counts a quest asleep for some hero too: the temple is the same size for everyone", () => {
      expect(roomSizeShare(roomOf({ questId: "dishes" }), [quest({ id: "dishes", assignee: ["hero-2"], difficulty: 3 })])).toEqual({ difficulty: 3 });
    });

    it("is dormant at the template's difficulty when the quest is gone and the room has a template", () => {
      const template = { beastId: "beast-fluffalo", difficulty: 3, basicSchedule: "daily" };
      expect(roomSizeShare(roomOf({ questId: "deleted", quest: template }), quests)).toEqual({ difficulty: 3, dormant: true });
    });

    it("is nothing when the quest is gone and the room has no template, or when the quest is a draft", () => {
      expect(roomSizeShare(roomOf({ questId: "deleted" }), quests)).toBeNull();
      expect(roomSizeShare(roomOf({ questId: "dishes" }), [quest({ id: "dishes", draft: true })])).toBeNull();
    });

    it("takes a template's size from the live quest that has its beast, else the template's own, dormant", () => {
      const template = { beastId: "beast-dish-goblin", difficulty: 3, basicSchedule: "daily" };
      expect(roomSizeShare(roomOf({ quest: template }), [quest({ difficulty: 5 })])).toEqual({ difficulty: 5 });
      expect(roomSizeShare(roomOf({ quest: template }), [])).toEqual({ difficulty: 3, dormant: true });
    });

    it("leaves classic beast rooms and every other room out", () => {
      expect(roomSizeShare(roomOf({ beasts: ["beast-dish-goblin"] }), quests)).toBeNull();
      expect(roomSizeShare({ type: "loot" }, quests)).toBeNull();
      expect(roomSizeShare(undefined, quests)).toBeNull();
    });
  });

  describe("layoutSize", () => {
    const rooms: Record<string, Room> = {
      WALL: { type: "wall" },
      A: roomOf({ questId: "dishes" }),
      B: roomOf({ questId: "boss" }, "boss"),
      C: roomOf({ beasts: ["x"] }),
    };

    it("adds up every cell of a single-floor maze, and counts a token shared by two cells twice", () => {
      const maze = [
        ["WALL", "A", "A"],
        ["C", "B", "WALL"],
      ];
      expect(layoutSize(maze, rooms, quests)).toEqual({ total: 2 + 2 + 13, here: 0 });
    });

    it("adds up every floor of a multi-floor maze", () => {
      const maze = { "1F": [["A", "WALL"]], "2F": [["B", "A"]] };
      expect(layoutSize(maze, rooms, quests).total).toBe(2 + 13 + 2);
    });

    it("reports the share of the cell being edited, so the preview can swap it for the pick", () => {
      const maze = { "1F": [["A", "WALL"]], "2F": [["B", "A"]] };
      expect(layoutSize(maze, rooms, quests, { level: "2F", row: 0, col: 0 })).toEqual({ total: 17, here: 13 });
      expect(layoutSize(maze, rooms, quests, { level: "1F", row: 0, col: 1 })).toEqual({ total: 17, here: 0 });
    });

    it("names the one floor of a single-grid maze 1F", () => {
      expect(layoutSize([["A", "B"]], rooms, quests, { level: "1F", row: 0, col: 1 })).toEqual({ total: 15, here: 13 });
    });

    it("is zero for an empty or missing maze", () => {
      expect(layoutSize([], rooms, quests)).toEqual({ total: 0, here: 0 });
      expect(layoutSize(undefined, rooms, quests)).toEqual({ total: 0, here: 0 });
      expect(layoutSize([["A"]], undefined, quests)).toEqual({ total: 0, here: 0 });
    });
  });

  describe("previewSize", () => {
    it("reads 'Size 14 → 22 · full at 21' for a pick that adds 8 to a room that holds nothing", () => {
      const preview = previewSize({ total: 14, here: 0 }, 8);
      expect(preview).toMatchObject({ before: 14, after: 22, full: 21, isFull: true });
      expect(preview.label).toBe("Size 14 → 22 · full at 21");
    });

    it("swaps the room's own quest for the pick", () => {
      expect(previewSize({ total: 20, here: 5 }, 2)).toMatchObject({ before: 20, after: 17, isFull: false, label: "Size 20 → 17 · full at 21" });
    });

    it("shows just the size when nothing is picked, or the pick changes nothing", () => {
      expect(previewSize({ total: 14, here: 0 }, undefined).label).toBe("Size 14 · full at 21");
      expect(previewSize({ total: 14, here: 3 }, 3).label).toBe("Size 14 · full at 21");
    });

    it("marks a temple that is full as it stands", () => {
      expect(previewSize({ total: 21, here: 0 }, undefined).isFull).toBe(true);
      expect(previewSize({ total: 20, here: 0 }, undefined).isFull).toBe(false);
    });
  });
});
