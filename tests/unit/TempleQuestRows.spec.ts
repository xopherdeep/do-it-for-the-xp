/**
 * The temple's Quests tab as pure rules (docs/Quest-Rooms-Spec.md section 9, "Temple Quests tab"): which cells of the
 * maze are quest rooms, which quest each holds from the Game Master's side, the size of the temple, and the rows the
 * tab shows: the quest or "Dormant: Dust Dervish, no quest yet", its schedule, its heroes, a status dot per hero, and a
 * flag when the room's tier and the quest's tier disagree.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { Room, RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  buildTempleQuests,
  gmResolution,
  libraryEntryOf,
  questRoomCells,
  type QuestHero,
  type QuestLayout,
} from "@/lib/services/temples/templeQuestRows";

const KIA = "hero-1";
const MIA = "hero-2";

const makeQuest = (id: string, overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id,
    achievementName: `Quest ${id}`,
    type: "individual",
    assignee: [KIA],
    basicSchedule: "daily",
    scheduleType: "basic",
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    repeatOnDays: [],
    showDailyUntilComplete: false,
    startsOn: "2026-10-01T09:00:00",
    endsOn: "",
    dueByTime: "",
    difficulty: 2,
    beastId: "beast-dish-goblin",
    requiresApproval: false,
    ...overrides,
  }) as unknown as Achievement;

const makeItem = (quest: Achievement, status: QuestBoardItem["status"] = "open", pending = false): QuestBoardItem =>
  ({ quest, status, progress: null, pending, overdue: false }) as QuestBoardItem;

const template = (overrides: Partial<RoomQuestTemplate> = {}): RoomQuestTemplate => ({
  beastId: "beast-dish-goblin",
  difficulty: 2,
  basicSchedule: "daily",
  ...overrides,
});

const room = (type: string, content: Room["content"] = {}): Room => ({ type, content });

const beast = (id: string, name: string, avatar = 104): Beast =>
  ({ id, name, avatar, bg1: 1, bg2: 2, aspectRatio: 48, checklist: [] }) as unknown as Beast;

const hero = (id: string, nick: string, board: QuestBoardItem[] | null): QuestHero => ({
  id,
  nick,
  board: board ? { board } : null,
});

const NOW = new Date("2026-10-14T17:00:00");

describe("questRoomCells", () => {
  const layout: QuestLayout = {
    maze: [
      ["E", "b", "____"],
      ["t", "c", "m"],
      ["w", "q", "a"],
    ],
    rooms: {
      E: room("entrance"),
      b: room("boss", { quest: template({ beastId: "beast-laundry-lurker", difficulty: 13 }) }),
      t: room("trap"),
      c: room("monster", { beasts: ["beast-dish-goblin"] }),
      m: room("miniboss", { quest: template({ difficulty: 5 }) }),
      w: room("wall"),
      q: room("monster", { questId: "q-1" }),
      a: room("treasure", { quest: template() }),
    },
  };

  it("lists the combat rooms that hold a quest or a template, in reading order, with their symbols and tiers", () => {
    expect(questRoomCells(layout).map((cell) => [cell.key, cell.symbol, cell.tier])).toEqual([
      ["1F:0,1", "b", "boss"],
      ["1F:1,2", "m", "miniboss"],
      ["1F:2,1", "q", "monster"],
    ]);
  });

  it("leaves classic beast rooms, traps, walls and rooms that are not combat rooms to the tab's old cards", () => {
    const symbols = questRoomCells(layout).map((cell) => cell.symbol);
    expect(symbols).not.toContain("c");
    expect(symbols).not.toContain("t");
    expect(symbols).not.toContain("a");
  });

  it("finds a room that lists several quests, though it has no questId", () => {
    const listed: QuestLayout = {
      maze: [["l", "k"]],
      rooms: { l: room("monster", { questIds: ["mugs", "dishes"] }), k: room("monster", { questIds: [] }) },
    };
    expect(questRoomCells(listed).map((cell) => cell.symbol)).toEqual(["l"]);
  });

  it("reads every floor of a tower, and counts a token many cells share once for each cell", () => {
    const tower: QuestLayout = {
      maze: { "1F": [["M", "M"]], "2F": [["M", "_"]] },
      rooms: { M: room("monster", { quest: template() }) },
    };
    expect(questRoomCells(tower).map((cell) => cell.key)).toEqual(["1F:0,0", "1F:0,1", "2F:0,0"]);
  });

  it("copes with a temple that has no layout yet", () => {
    expect(questRoomCells(undefined)).toEqual([]);
    expect(questRoomCells({})).toEqual([]);
    expect(questRoomCells({ maze: [["a"]] })).toEqual([]);
  });
});

describe("gmResolution", () => {
  const goblin = makeQuest("q-goblin");

  it("leaves a classic room alone", () => {
    expect(gmResolution(room("monster", { beasts: ["x"] }), [goblin])).toEqual({ kind: "classic" });
  });

  it("takes the quest the Game Master picked", () => {
    const found = gmResolution(room("monster", { questId: "q-goblin" }), [goblin]);
    expect(found).toEqual({ kind: "quest", quest: goblin, source: "questId" });
  });

  it("takes the live quest whose beast is the template's", () => {
    const found = gmResolution(room("monster", { quest: template() }), [makeQuest("q-other", { beastId: "beast-socktopus" }), goblin]);
    expect(found).toEqual({ kind: "quest", quest: goblin, source: "template" });
  });

  it("takes a quest with no beast of its own through the library's suggestion for its name", () => {
    const nameOnly = makeQuest("q-name", { beastId: "", achievementName: "Banish the Dish Goblin" });
    const found = gmResolution(room("monster", { quest: template() }), [nameOnly]);
    expect(found).toMatchObject({ kind: "quest", source: "template" });
  });

  it("is dormant when no live quest fills the template", () => {
    const t = template();
    expect(gmResolution(room("monster", { quest: t }), [])).toEqual({ kind: "dormant", template: t });
    expect(gmResolution(room("monster", { quest: t }), [makeQuest("q-other", { beastId: "beast-socktopus" })])).toEqual({
      kind: "dormant",
      template: t,
    });
  });

  it("ignores a draft: heroes never see it, and it cannot hold a room", () => {
    const draft = makeQuest("q-goblin", { draft: true });
    const t = template();
    expect(gmResolution(room("monster", { quest: t }), [draft])).toEqual({ kind: "dormant", template: t });
    expect(gmResolution(room("monster", { questId: "q-goblin" }), [draft])).toEqual({ kind: "emptyLair" });
  });

  it("falls back to the template when the pick is gone, and is an empty lair when there is no template either", () => {
    const t = template();
    expect(gmResolution(room("monster", { questId: "gone", quest: t }), [])).toEqual({ kind: "dormant", template: t });
    expect(gmResolution(room("monster", { questId: "gone" }), [goblin])).toEqual({ kind: "emptyLair" });
  });

  it("prefers the pick to a template match", () => {
    const other = makeQuest("q-other", { beastId: "beast-socktopus" });
    const found = gmResolution(room("monster", { questId: "q-other", quest: template() }), [goblin, other]);
    expect(found).toMatchObject({ kind: "quest", quest: other, source: "questId" });
  });
});

describe("gmResolution of a room that lists several quests", () => {
  const mugs = makeQuest("mugs", { achievementName: "Collect the mugs", difficulty: 3 });
  const dishes = makeQuest("dishes", { achievementName: "Wash the dishes", difficulty: 13 });

  it("takes the biggest live quest the room lists, as its questId pick", () => {
    expect(gmResolution(room("monster", { questIds: ["mugs", "dishes"] }), [mugs, dishes])).toEqual({
      kind: "quest",
      quest: dishes,
      source: "questId",
    });
  });

  it("skips a draft and a quest that is gone, and is an empty lair when none of them is live", () => {
    const draft = makeQuest("dishes", { difficulty: 13, draft: true });
    expect(gmResolution(room("monster", { questIds: ["mugs", "dishes", "gone"] }), [mugs, draft])).toMatchObject({ quest: mugs });
    expect(gmResolution(room("monster", { questIds: ["gone", "dishes"] }), [draft])).toEqual({ kind: "emptyLair" });
  });

  it("falls back to the template when no listed quest is live", () => {
    const withTemplate = room("monster", { questIds: ["gone"], quest: template({ beastId: "beast-socktopus" }) });
    expect(gmResolution(withTemplate, [mugs, dishes])).toEqual({ kind: "dormant", template: withTemplate.content!.quest });
  });
});

describe("libraryEntryOf", () => {
  it("finds a library beast by its id, and nothing for a beast the library lacks", () => {
    expect(libraryEntryOf("beast-dish-goblin")?.name).toBe("Dish Goblin");
    expect(libraryEntryOf("custom-beast")).toBeUndefined();
  });
});

describe("buildTempleQuests", () => {
  const goblinQuest = makeQuest("q-goblin", { achievementName: "Load the dishwasher", difficulty: 2, assignee: [KIA, MIA] });
  const lurkerQuest = makeQuest("q-lurker", {
    achievementName: "Do a load of laundry",
    beastId: "beast-laundry-lurker",
    difficulty: 3,
    basicSchedule: "weekly",
    assignee: [KIA],
  });

  const layout: QuestLayout = {
    maze: [
      ["E", "b", "m"],
      ["s", "g", "c"],
    ],
    rooms: {
      E: room("entrance"),
      // the starter Laundry Lurker is a 3 in a boss room: a tier mismatch
      b: room("boss", { quest: template({ beastId: "beast-laundry-lurker", difficulty: 13, basicSchedule: "weekly" }) }),
      m: room("miniboss", { quest: template({ beastId: "beast-dust-dervish", difficulty: 5, basicSchedule: "weekly" }) }),
      s: room("monster", { quest: template({ beastId: "beast-dish-goblin", difficulty: 2 }) }),
      g: room("monster", { questId: "q-gone" }),
      c: room("monster", { beasts: ["beast-socktopus"] }),
    },
  };

  const heroes = [
    hero(KIA, "Kia", [makeItem(goblinQuest, "open"), makeItem(lurkerQuest, "done")]),
    hero(MIA, "Mia", [makeItem(goblinQuest, "done", true)]),
  ];

  const build = (overrides: Partial<Parameters<typeof buildTempleQuests>[0]> = {}) =>
    buildTempleQuests({
      layout,
      quests: [goblinQuest, lurkerQuest],
      beasts: [beast("beast-dish-goblin", "Dish Goblin", 104)],
      heroes,
      now: NOW,
      ...overrides,
    });

  it("makes a row for each quest room, grouped by the tier the room was built as", () => {
    const view = build();
    expect(view.rows.map((row) => row.key)).toEqual(["1F:0,1", "1F:0,2", "1F:1,0", "1F:1,1"]);
    expect(Object.keys(view.groups)).toEqual(["boss", "miniboss", "monster"]);
    expect(view.groups.boss.map((row) => row.symbol)).toEqual(["b"]);
    expect(view.groups.miniboss.map((row) => row.symbol)).toEqual(["m"]);
    expect(view.groups.monster.map((row) => row.symbol)).toEqual(["s", "g"]);
  });

  it("shows a quest room's quest, difficulty, schedule and heroes", () => {
    const row = build().rows.find((r) => r.symbol === "s")!;
    expect(row).toMatchObject({
      kind: "quest",
      title: "Load the dishwasher",
      difficulty: 2,
      difficultyName: "Simple",
      schedule: "Daily",
      heroes: "Kia, Mia",
      beastName: "Dish Goblin",
      avatar: 104,
      approval: false,
      mismatch: null,
      moreQuests: 0,
      tier: "monster",
      tierName: "Monster",
      facts: "Simple 2 · Dish Goblin",
      when: "Daily · Kia, Mia",
    });
    expect(row.quest).toBe(goblinQuest);
  });

  it("shows a dormant room as 'Dormant: <beast>, no quest yet', with the template's schedule and difficulty", () => {
    const row = build().rows.find((r) => r.symbol === "m")!;
    expect(row).toMatchObject({
      kind: "dormant",
      title: "Dormant: Dust Dervish, no quest yet",
      difficulty: 5,
      schedule: "Weekly",
      heroes: "",
      beastName: "Dust Dervish",
      mismatch: null,
      dots: [],
      tier: "miniboss",
      tierName: "Miniboss",
      facts: "Moderate 5 · if woken",
      when: "Weekly",
    });
    expect(row.quest).toBeUndefined();
  });

  it("names the library's beast when the family's bestiary lacks it, and a stand-in when nobody knows it", () => {
    const custom = build({
      layout: { maze: [["x"]], rooms: { x: room("monster", { quest: template({ beastId: "beast-made-up" }) }) } },
    });
    expect(custom.rows[0].title).toBe("Dormant: a beast, no quest yet");
  });

  it("flags a quest whose tier is not the room's: 'Boss room holds a Miniboss quest (3)'", () => {
    const row = build().rows.find((r) => r.symbol === "b")!;
    expect(row.kind).toBe("quest");
    expect(row.mismatch).toBe("Boss room holds a Miniboss quest (3)");
  });

  it("says an empty lair when the Game Master's quest is gone and there is no template", () => {
    const row = build().rows.find((r) => r.symbol === "g")!;
    expect(row).toMatchObject({ kind: "emptyLair", title: "Empty lair: its quest is gone", dots: [], mismatch: null, tierName: "", facts: "", when: "" });
    expect(row.tier).toBeUndefined();
  });

  it("leaves classic beast rooms out of the rows", () => {
    expect(build().rows.map((r) => r.symbol)).not.toContain("c");
  });

  describe("the size of the temple", () => {
    it("adds the quests' difficulties and the dormant templates' (shown 'if woken')", () => {
      const { size } = build();
      // boss room holds the 3 (laundry), dust dervish dormant 5, dish goblin 2, the gone quest nothing
      expect(size).toMatchObject({ total: 10, awake: 5, dormant: 5, dormantRooms: 1, isFull: false });
    });

    it("says it in words", () => {
      expect(build().sizeLine).toBe("Size 10 of 21 · 5 if woken");
      const woken = build({
        layout: { maze: [["x"]], rooms: { x: room("boss", { quest: template({ difficulty: 21 }) }) } },
        quests: [],
      });
      expect(woken.sizeLine).toBe("Size 21 of 21 · 21 if woken");
      expect(build({ layout: {} }).sizeLine).toBe("Size 0 of 21");
    });

    it("counts a shared token once for each cell it covers", () => {
      const view = build({
        layout: { maze: [["M", "M", "M"]], rooms: { M: room("monster", { quest: template({ difficulty: 2 }) }) } },
        quests: [],
      });
      expect(view.size.total).toBe(6);
      expect(view.size.dormantRooms).toBe(3);
    });
  });

  describe("a status dot for each hero", () => {
    const dots = (symbol: string, view = build()) =>
      view.rows.find((r) => r.symbol === symbol)!.dots.map((dot) => `${dot.name}:${dot.status}`);

    it("reads the hero's own board: lurking, tamed, waiting on the Game Master, resting", () => {
      expect(dots("s")).toEqual(["Kia:lurking", "Mia:pending"]);
      expect(dots("b")).toEqual(["Kia:cleared", "Mia:dormant"]);
    });

    it("reads a quest that is not due as away", () => {
      const view = build({ heroes: [hero(KIA, "Kia", [makeItem(goblinQuest, "notDue")]), heroes[1]] });
      expect(dots("s", view)).toEqual(["Kia:away", "Mia:pending"]);
    });

    it("words each dot for a screen reader and a long press", () => {
      const row = build().rows.find((r) => r.symbol === "s")!;
      expect(row.dots.map((dot) => dot.label)).toEqual([
        "Kia: the beast is here",
        "Mia: tied up, waiting on the Game Master",
      ]);
      const cleared = build().rows.find((r) => r.symbol === "b")!;
      expect(cleared.dots.map((dot) => dot.label)).toEqual(["Kia: tamed", "Mia: no quest of theirs here, plays the classic fight"]);
    });

    it("says not yours for a hero the Game Master's picked quest is not for", () => {
      const view = build({
        layout: { maze: [["p"]], rooms: { p: room("monster", { questId: "q-lurker" }) } },
        heroes: [hero(KIA, "Kia", [makeItem(lurkerQuest)]), hero(MIA, "Mia", [])],
      });
      expect(dots("p", view)).toEqual(["Kia:lurking", "Mia:notYours"]);
    });

    it("leaves out a hero whose board could not be read", () => {
      const view = build({ heroes: [heroes[0], hero(MIA, "Mia", null)] });
      expect(dots("s", view)).toEqual(["Kia:lurking"]);
    });
  });

  it("names the other quests too when several fill one room", () => {
    const second = makeQuest("q-second", { achievementName: "Wash the dishes", assignee: [MIA] });
    const view = build({
      layout: { maze: [["s"]], rooms: { s: room("monster", { quest: template() }) } },
      quests: [goblinQuest, second],
      heroes: [hero(KIA, "Kia", [makeItem(goblinQuest)]), hero(MIA, "Mia", [makeItem(second)])],
    });
    expect(view.rows[0].title).toBe("Load the dishwasher");
    expect(view.rows[0].moreQuests).toBe(1);
  });

  describe("a room that lists several quests", () => {
    const mugs = makeQuest("mugs", { achievementName: "Collect the mugs", difficulty: 3 });
    const dishes = makeQuest("dishes", { achievementName: "Wash the dishes", difficulty: 13 });
    const listLayout: QuestLayout = {
      maze: [["l"]],
      rooms: { l: room("monster", { questIds: ["mugs", "dishes"] }) },
    };

    it("is one row named for its biggest quest, with the others counted and no tier mismatch", () => {
      const view = build({ layout: listLayout, quests: [mugs, dishes], heroes: [] });
      expect(view.rows).toHaveLength(1);
      expect(view.rows[0]).toMatchObject({
        kind: "quest",
        title: "Wash the dishes",
        quest: dishes,
        moreQuests: 1,
        mismatch: null,
        difficulty: 13,
      });
    });

    it("sizes the temple by the biggest quest the room lists", () => {
      const view = build({ layout: listLayout, quests: [mugs, dishes], heroes: [] });
      expect(view.size.total).toBe(13);
    });

    it("counts only the live quests as more: a draft or a missing one is not a quest the room holds", () => {
      const draft = makeQuest("wip", { difficulty: 2, draft: true });
      const lone: QuestLayout = { maze: [["l"]], rooms: { l: room("monster", { questIds: ["dishes", "mugs", "wip", "gone"] }) } };
      const view = build({ layout: lone, quests: [mugs, dishes, draft], heroes: [] });
      expect(view.rows[0].moreQuests).toBe(1);
    });

    it("still flags a quest-id room whose quest is bigger than the room", () => {
      const single: QuestLayout = { maze: [["l"]], rooms: { l: room("monster", { questId: "dishes" }) } };
      const row = build({ layout: single, quests: [mugs, dishes], heroes: [] }).rows[0];
      expect(row.mismatch).toBe("Monster room holds a Boss quest (13)");
    });
  });

  it("shows the approval badge and the quest's own difficulty name", () => {
    const strict = makeQuest("q-goblin", { requiresApproval: true, difficulty: 8 });
    const row = build({ quests: [strict] }).rows.find((r) => r.symbol === "s")!;
    expect(row.approval).toBe(true);
    expect(row.difficultyName).toBe("Challenging");
  });

  it("does not change the quests, the layout or the heroes it is given", () => {
    const before = JSON.stringify({ layout, heroes, goblinQuest });
    build();
    expect(JSON.stringify({ layout, heroes, goblinQuest })).toBe(before);
  });
});
