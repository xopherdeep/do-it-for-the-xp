import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import type { Room, RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import QuestEngine, { type QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import {
  QUEST_TIERS,
  TEMPLE_FULL_SIZE,
  TIER_ATTACK_FACTOR,
  questBeastId,
  questOccurrenceKey,
  questReturnsAt,
  questTier,
  resolveRoomQuest,
  roomQuestState,
  roomQuestStatus,
  sizedRoomOf,
  templeSize,
  tierAttackFactor,
} from "@/lib/services/temples/questRooms";

// The quest board reads quests and the quest log from IndexedDB-backed storage; the restore specs feed the real
// board plain arrays, so the room reads exactly what the board reads.
const mockGetTasks = jest.fn();
const mockGetEntries = jest.fn();

jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  default: class {
    getTasks() {
      return mockGetTasks();
    }
  },
  achievementStorage: {},
}));

jest.mock("@/lib/databases/QuestLogDb", () => ({
  getQuestLogDb: () => ({ getEntries: () => mockGetEntries() }),
}));

describe("questTier", () => {
  it("makes difficulty 1 and 2 a monster, 3 to 5 a miniboss, 8 and up a boss", () => {
    expect([1, 2].map(questTier)).toEqual(["monster", "monster"]);
    expect([3, 5].map(questTier)).toEqual(["miniboss", "miniboss"]);
    expect([8, 13, 21, 34, 55, 89, 144].map(questTier)).toEqual(Array(7).fill("boss"));
  });

  it("rounds a legacy in-between value down to the tier below", () => {
    expect(questTier(4)).toBe("miniboss");
    expect(questTier(6)).toBe("miniboss");
    expect(questTier(7)).toBe("miniboss");
    expect(questTier(9)).toBe("boss");
    expect(questTier(12)).toBe("boss");
    expect(questTier(2.5)).toBe("monster");
    expect(questTier(7.9)).toBe("miniboss");
  });

  it("treats an unset or broken difficulty as the smallest tier", () => {
    expect(questTier(0)).toBe("monster");
    expect(questTier(-3)).toBe("monster");
    expect(questTier(undefined)).toBe("monster");
    expect(questTier(NaN)).toBe("monster");
    expect(questTier(Number("3"))).toBe("miniboss");
  });

  it("lists the tiers weakest first", () => {
    expect(QUEST_TIERS).toEqual(["monster", "miniboss", "boss"]);
  });
});

describe("tierAttackFactor", () => {
  it("is 1 for a monster, 1.2 for a miniboss and 1.5 for a boss", () => {
    expect(tierAttackFactor("monster")).toBe(1);
    expect(tierAttackFactor("miniboss")).toBe(1.2);
    expect(tierAttackFactor("boss")).toBe(1.5);
    expect(TIER_ATTACK_FACTOR).toEqual({ monster: 1, miniboss: 1.2, boss: 1.5 });
  });

  it("only ever makes a beast hit harder as the tier climbs", () => {
    const factors = QUEST_TIERS.map(tierAttackFactor);
    expect([...factors].sort((a, b) => a - b)).toEqual(factors);
    expect(factors[0]).toBe(1);
  });
});

describe("templeSize", () => {
  it("is the sum of the difficulties of the rooms' quests", () => {
    const size = templeSize([{ difficulty: 3 }, { difficulty: 5 }, { difficulty: 13 }]);
    expect(size.total).toBe(21);
    expect(size.awake).toBe(21);
    expect(size.dormant).toBe(0);
    expect(size.dormantRooms).toBe(0);
  });

  it("is zero for a temple without quest rooms", () => {
    expect(templeSize([])).toEqual({ total: 0, awake: 0, dormant: 0, dormantRooms: 0, isFull: false });
  });

  it("counts a dormant room by its template difficulty and tells how much of the size it is", () => {
    const size = templeSize([{ difficulty: 5 }, { difficulty: 8, dormant: true }, { difficulty: 2, dormant: true }]);
    expect(size.total).toBe(15);
    expect(size.awake).toBe(5);
    expect(size.dormant).toBe(10);
    expect(size.dormantRooms).toBe(2);
  });

  it("is full at 21 and over, and not before", () => {
    expect(TEMPLE_FULL_SIZE).toBe(21);
    expect(templeSize([{ difficulty: 13 }, { difficulty: 5 }, { difficulty: 3 }]).isFull).toBe(true); // 21
    expect(templeSize([{ difficulty: 13 }, { difficulty: 8 }, { difficulty: 5 }]).isFull).toBe(true); // 26
    expect(templeSize([{ difficulty: 13 }, { difficulty: 5 }, { difficulty: 2 }]).isFull).toBe(false); // 20
  });

  it("lets dormant rooms fill the temple, since they count with their template difficulty", () => {
    expect(templeSize([{ difficulty: 13 }, { difficulty: 8, dormant: true }]).isFull).toBe(true);
  });

  it("counts a room with an unset or broken difficulty as nothing", () => {
    const size = templeSize([{ difficulty: 3 }, { difficulty: NaN }, { difficulty: -4 }, {} as { difficulty: number }]);
    expect(size.total).toBe(3);
  });

  it("reads a legacy value as it stands, without rounding it to a tier", () => {
    expect(templeSize([{ difficulty: 4 }, { difficulty: 7 }]).total).toBe(11);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Which quest a room holds, and what it says (docs/Quest-Rooms-Spec.md 5.2-5.4)
// Calendar facts: 2026-10-05 is a Monday, 2026-10-08 a Thursday, 2026-10-12 the next Monday.
// ---------------------------------------------------------------------------------------------------------------------

const HERO = "hero-1";
const MIA = "hero-2";
const at = (iso: string) => new Date(iso);

const makeQuest = (id: string, overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id,
    achievementName: `Quest ${id}`,
    type: "individual",
    assignee: [HERO],
    basicSchedule: "daily",
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
    ...overrides,
  }) as unknown as Achievement;

const makeEntry = (questId: string, completedAt: string, overrides: Partial<QuestLogEntry> = {}): QuestLogEntry =>
  ({
    id: `entry-${questId}-${completedAt}-${overrides.userId ?? HERO}`,
    questId,
    questName: questId,
    userId: HERO,
    completedAt,
    dayKey: completedAt.slice(0, 10),
    status: "approved",
    source: "claim",
    rewards: { xp: 0, gp: 0, ap: 0 },
    rewardsApplied: true,
    ...overrides,
  }) as QuestLogEntry;

/** A board row built by hand, for the specs that do not care how the board got there. */
const makeItem = (quest: Achievement, status: QuestBoardItem["status"] = "open", pending = false): QuestBoardItem =>
  ({ quest, status, progress: null, pending, overdue: false }) as QuestBoardItem;

const room = (content: Room["content"] = {}, type = "monster"): Room => ({ type, content });

const template = (overrides: Partial<RoomQuestTemplate> = {}): RoomQuestTemplate => ({
  beastId: "beast-dish-goblin",
  difficulty: 2,
  basicSchedule: "daily",
  ...overrides,
});

/** The real board: what getQuestBoardForUser says for the hero at `date`. */
const boardAt = async (
  quests: Achievement[],
  entries: QuestLogEntry[],
  date: Date,
  effects?: HeroQuestEffects,
  userId = HERO
): Promise<QuestBoardItem[]> => {
  mockGetTasks.mockResolvedValue(quests);
  mockGetEntries.mockResolvedValue(entries);
  return new QuestEngine().getQuestBoardForUser(userId, date, undefined, effects);
};

/** The status of a room the Game Master bound to `quest`, read off the real board at `date`. */
const statusAt = async (quest: Achievement, entries: QuestLogEntry[], date: Date, effects?: HeroQuestEffects) => {
  const board = await boardAt([quest], entries, date, effects);
  return roomQuestStatus(resolveRoomQuest(room({ questId: quest.id }), HERO, board, [quest]));
};

describe("questBeastId", () => {
  it("is the quest's own beast", () => {
    expect(questBeastId(makeQuest("q", { beastId: "beast-socktopus", achievementName: "Banish the Dish Goblin" }))).toBe(
      "beast-socktopus"
    );
  });

  it("is the library's top suggestion for the quest's name when the quest has no beast", () => {
    expect(questBeastId(makeQuest("q", { beastId: "", achievementName: "Banish the Dish Goblin" }))).toBe("beast-dish-goblin");
    expect(questBeastId(makeQuest("q", { beastId: undefined, achievementName: "Banish the Dish Goblin" }))).toBe(
      "beast-dish-goblin"
    );
  });

  it("is nothing when the quest has no beast and the library suggests none", () => {
    expect(questBeastId(makeQuest("q", { beastId: "", achievementName: "Zzxq vvkk" }))).toBeUndefined();
  });
});

describe("resolveRoomQuest", () => {
  describe("classic rooms", () => {
    it("are never resolved, whatever the board holds", () => {
      const goblin = makeQuest("q-dish");
      const board = [makeItem(goblin)];
      expect(resolveRoomQuest(room({ beasts: ["beast-dish-goblin"] }), HERO, board, [goblin])).toEqual({ kind: "classic" });
      expect(resolveRoomQuest(room({ monsterType: "goblin" }), HERO, board, [goblin])).toEqual({ kind: "classic" });
      expect(resolveRoomQuest({ type: "monster" }, HERO, board, [goblin])).toEqual({ kind: "classic" });
      expect(resolveRoomQuest(room({}), HERO, [], [])).toEqual({ kind: "classic" });
    });
  });

  describe("the Game Master's pick (content.questId)", () => {
    it("resolves to that quest and its board row", () => {
      const dishes = makeQuest("q-dish");
      const row = makeItem(dishes);
      const found = resolveRoomQuest(room({ questId: "q-dish" }), HERO, [makeItem(makeQuest("q-other")), row], [dishes]);
      expect(found).toEqual({ kind: "quest", quest: dishes, item: row, source: "questId" });
    });

    it("beats a template that matches another live quest", () => {
      const picked = makeQuest("q-picked", { beastId: "beast-weed-wyrm" });
      const goblin = makeQuest("q-dish");
      const found = resolveRoomQuest(
        room({ questId: "q-picked", quest: template() }),
        HERO,
        [makeItem(goblin), makeItem(picked)],
        [goblin, picked]
      );
      expect(found).toMatchObject({ kind: "quest", source: "questId" });
      expect((found as { quest: Achievement }).quest.id).toBe("q-picked");
    });

    it("compares ids as text", () => {
      const numbered = makeQuest("7");
      (numbered as { id: unknown }).id = 7;
      const found = resolveRoomQuest(room({ questId: "7" }), HERO, [makeItem(numbered)], []);
      expect(found).toMatchObject({ kind: "quest", source: "questId" });
    });

    it("is an empty lair when the quest is gone and the room has no template", () => {
      expect(resolveRoomQuest(room({ questId: "q-gone" }), HERO, [makeItem(makeQuest("q-dish"))], [makeQuest("q-dish")])).toEqual({
        kind: "emptyLair",
      });
    });

    it("falls back to the template when the quest is gone", () => {
      const goblin = makeQuest("q-dish");
      const found = resolveRoomQuest(room({ questId: "q-gone", quest: template() }), HERO, [makeItem(goblin)], [goblin]);
      expect(found).toMatchObject({ kind: "quest", source: "template" });
      expect((found as { quest: Achievement }).quest.id).toBe("q-dish");
    });

    it("falls back to a dormant room when the quest is gone and nothing matches the template", () => {
      const tpl = template({ beastId: "beast-weed-wyrm" });
      expect(resolveRoomQuest(room({ questId: "q-gone", quest: tpl }), HERO, [makeItem(makeQuest("q-dish"))], [])).toEqual({
        kind: "dormant",
        template: tpl,
      });
    });

    it("ignores a draft: a draft is no quest", () => {
      const draft = makeQuest("q-draft", { draft: true });
      expect(resolveRoomQuest(room({ questId: "q-draft" }), HERO, [], [draft])).toEqual({ kind: "emptyLair" });
      expect(resolveRoomQuest(room({ questId: "q-draft" }), HERO, [makeItem(draft)], [draft])).toEqual({ kind: "emptyLair" });
      const tpl = template();
      expect(resolveRoomQuest(room({ questId: "q-draft", quest: tpl }), HERO, [], [draft])).toEqual({ kind: "dormant", template: tpl });
    });

    it("sleeps for a hero the quest is not for", () => {
      const miasDishes = makeQuest("q-dish", { assignee: [MIA] });
      const found = resolveRoomQuest(room({ questId: "q-dish" }), HERO, [], [miasDishes]);
      expect(found).toEqual({ kind: "notYours", quest: miasDishes });
    });

    it("is for everyone when it is an Open Bounty, even when the board hides it (Gale's Wind)", () => {
      const bounty = makeQuest("q-dish", { type: "asNeeded", assignee: [] });
      const found = resolveRoomQuest(room({ questId: "q-dish" }), HERO, [], [bounty]);
      expect(found).toEqual({ kind: "quest", quest: bounty, item: undefined, source: "questId" });
    });

    it("is an empty lair when only the board is given and the quest is not on it", () => {
      expect(resolveRoomQuest(room({ questId: "q-dish" }), HERO, [], [])).toEqual({ kind: "emptyLair" });
      expect(resolveRoomQuest(room({ questId: "q-dish" }), HERO, [])).toEqual({ kind: "emptyLair" });
    });
  });

  describe("the shipped template (content.quest)", () => {
    it("matches a live quest visible to the hero by beast", () => {
      const goblin = makeQuest("q-dish", { beastId: "beast-dish-goblin" });
      const wyrm = makeQuest("q-weed", { beastId: "beast-weed-wyrm" });
      const row = makeItem(goblin);
      const found = resolveRoomQuest(room({ quest: template() }), HERO, [makeItem(wyrm), row], [goblin, wyrm]);
      expect(found).toEqual({ kind: "quest", quest: goblin, item: row, source: "template" });
    });

    it("matches a quest with no beast by the beast the library suggests for its name", () => {
      const nameOnly = makeQuest("q-dish", { beastId: "", achievementName: "Banish the Dish Goblin" });
      const found = resolveRoomQuest(room({ quest: template() }), HERO, [makeItem(nameOnly)], [nameOnly]);
      expect(found).toMatchObject({ kind: "quest", source: "template" });
      expect((found as { quest: Achievement }).quest.id).toBe("q-dish");
    });

    it("keeps a quest's own beast over the suggestion for its name", () => {
      const swapped = makeQuest("q-dish", { beastId: "beast-socktopus", achievementName: "Banish the Dish Goblin" });
      expect(resolveRoomQuest(room({ quest: template() }), HERO, [makeItem(swapped)], [swapped])).toEqual({
        kind: "dormant",
        template: template(),
      });
    });

    it("is dormant when no live quest has the beast", () => {
      const wyrm = makeQuest("q-weed", { beastId: "beast-weed-wyrm" });
      expect(resolveRoomQuest(room({ quest: template() }), HERO, [makeItem(wyrm)], [wyrm])).toEqual({
        kind: "dormant",
        template: template(),
      });
      expect(resolveRoomQuest(room({ quest: template() }), HERO, [], [])).toEqual({ kind: "dormant", template: template() });
    });

    it("does not match a quest the hero cannot see", () => {
      const miasDishes = makeQuest("q-dish", { assignee: [MIA] });
      expect(resolveRoomQuest(room({ quest: template() }), HERO, [], [miasDishes])).toEqual({
        kind: "dormant",
        template: template(),
      });
    });

    it("does not match a draft", () => {
      const draft = makeQuest("q-dish", { draft: true });
      expect(resolveRoomQuest(room({ quest: template() }), HERO, [makeItem(draft)], [draft]).kind).toBe("dormant");
    });

    it("prefers an open quest to a pending one, a pending one to a done one, and a done one to one that is away", () => {
      const away = makeQuest("q-away");
      const done = makeQuest("q-done");
      const pending = makeQuest("q-pending");
      const open = makeQuest("q-open");
      const rows = [makeItem(away, "notDue"), makeItem(done, "done"), makeItem(pending, "done", true), makeItem(open, "open")];
      const pick = (board: QuestBoardItem[]) =>
        (resolveRoomQuest(room({ quest: template() }), HERO, board, []) as { quest: Achievement }).quest.id;
      expect(pick(rows)).toBe("q-open");
      expect(pick(rows.slice(0, 3))).toBe("q-pending");
      expect(pick(rows.slice(0, 2))).toBe("q-done");
      expect(pick(rows.slice(0, 1))).toBe("q-away");
    });

    it("takes the first of two quests that read the same", () => {
      const first = makeQuest("q-first");
      const second = makeQuest("q-second");
      const found = resolveRoomQuest(room({ quest: template() }), HERO, [makeItem(first), makeItem(second)], []);
      expect((found as { quest: Achievement }).quest.id).toBe("q-first");
    });

    it("still finds a visible quest the board hides (Gale's Wind), and reads it as away", () => {
      const goblin = makeQuest("q-dish");
      const found = resolveRoomQuest(room({ quest: template() }), HERO, [], [goblin]);
      expect(found).toEqual({ kind: "quest", quest: goblin, item: undefined, source: "template" });
      expect(roomQuestStatus(found)).toBe("away");
    });
  });
});

describe("roomQuestStatus: what the board item says (5.3)", () => {
  const goblin = makeQuest("q-dish");
  const statusOf = (row: QuestBoardItem) =>
    roomQuestStatus(resolveRoomQuest(room({ questId: "q-dish" }), HERO, [row], [goblin]));

  it("lurks while the board item is open", () => {
    expect(statusOf(makeItem(goblin, "open"))).toBe("lurking");
  });

  it("lurks while the allowance is not used up, even with a claim waiting", () => {
    expect(statusOf(makeItem(goblin, "open", true))).toBe("lurking");
  });

  it("is pending when the quest is done and a claim waits for the Game Master", () => {
    expect(statusOf(makeItem(goblin, "done", true))).toBe("pending");
  });

  it("is cleared when the quest is done and nothing waits", () => {
    expect(statusOf(makeItem(goblin, "done", false))).toBe("cleared");
  });

  it("is away when the quest is not due", () => {
    expect(statusOf(makeItem(goblin, "notDue"))).toBe("away");
  });

  it("is not yours when the quest is not for the hero", () => {
    const miasDishes = makeQuest("q-dish", { assignee: [MIA] });
    expect(roomQuestStatus(resolveRoomQuest(room({ questId: "q-dish" }), HERO, [], [miasDishes]))).toBe("notYours");
  });

  it("is dormant when nothing resolved, classic for a classic room and an empty lair for a quest that is gone", () => {
    expect(roomQuestStatus(resolveRoomQuest(room({ quest: template() }), HERO, [], []))).toBe("dormant");
    expect(roomQuestStatus(resolveRoomQuest(room({ beasts: ["b"] }), HERO, [], []))).toBe("classic");
    expect(roomQuestStatus(resolveRoomQuest(room({ questId: "q-gone" }), HERO, [], []))).toBe("emptyLair");
  });
});

describe("a room restores on its quest's schedule (5.3)", () => {
  it("brings a daily quest's beast back the next day", async () => {
    const dishes = makeQuest("q-dish");
    const entries = [makeEntry("q-dish", "2026-10-08T18:00:00")];
    expect(await statusAt(dishes, [], at("2026-10-08T17:00:00"))).toBe("lurking");
    expect(await statusAt(dishes, entries, at("2026-10-08T18:30:00"))).toBe("cleared");
    expect(await statusAt(dishes, entries, at("2026-10-08T23:59:00"))).toBe("cleared");
    expect(await statusAt(dishes, entries, at("2026-10-09T00:00:00"))).toBe("lurking");
  });

  it("brings a weekly quest's beast back with the next 7-day window", async () => {
    const weekly = makeQuest("q-week", { basicSchedule: "weekly" });
    // startsOn Oct 1 makes the windows Oct 1-7, Oct 8-14, Oct 15-21
    const entries = [makeEntry("q-week", "2026-10-09T10:00:00")];
    expect(await statusAt(weekly, [], at("2026-10-09T09:00:00"))).toBe("lurking");
    expect(await statusAt(weekly, entries, at("2026-10-09T10:30:00"))).toBe("cleared");
    expect(await statusAt(weekly, entries, at("2026-10-14T23:30:00"))).toBe("cleared");
    expect(await statusAt(weekly, entries, at("2026-10-15T00:00:00"))).toBe("lurking");
  });

  it("brings a repeatOnDays quest's beast back on the next listed day, and sleeps in between", async () => {
    const twiceAWeek = makeQuest("q-days", { basicSchedule: "weekly", repeatOnDays: ["mon", "thu"] });
    const entries = [makeEntry("q-days", "2026-10-08T10:00:00")];
    expect(await statusAt(twiceAWeek, [], at("2026-10-08T09:00:00"))).toBe("lurking");
    expect(await statusAt(twiceAWeek, entries, at("2026-10-08T11:00:00"))).toBe("cleared");
    expect(await statusAt(twiceAWeek, entries, at("2026-10-09T09:00:00"))).toBe("away");
    expect(await statusAt(twiceAWeek, entries, at("2026-10-11T09:00:00"))).toBe("away");
    expect(await statusAt(twiceAWeek, entries, at("2026-10-12T09:00:00"))).toBe("lurking");
  });

  it("brings a custom quest's beast back with the next period", async () => {
    const fortnightly = makeQuest("q-custom", {
      basicSchedule: "custom",
      customFrequency: 1,
      customPeriodType: "week",
      customPeriodNumber: 2,
    });
    // startsOn Oct 1: periods Oct 1-14, Oct 15-28
    const entries = [makeEntry("q-custom", "2026-10-03T10:00:00")];
    expect(await statusAt(fortnightly, entries, at("2026-10-10T09:00:00"))).toBe("cleared");
    expect(await statusAt(fortnightly, entries, at("2026-10-14T23:00:00"))).toBe("cleared");
    expect(await statusAt(fortnightly, entries, at("2026-10-15T00:00:00"))).toBe("lurking");
  });

  it("never brings a once quest's beast back", async () => {
    const once = makeQuest("q-once", { basicSchedule: "once" });
    const entries = [makeEntry("q-once", "2026-10-08T10:00:00")];
    expect(await statusAt(once, [], at("2026-10-08T09:00:00"))).toBe("lurking");
    expect(await statusAt(once, entries, at("2026-10-08T10:30:00"))).toBe("cleared");
    expect(await statusAt(once, entries, at("2026-10-20T10:30:00"))).toBe("cleared");
    expect(await statusAt(once, entries, at("2027-10-08T10:30:00"))).toBe("cleared");
  });

  it("lurks again in the same window when the Game Master rejects the claim", async () => {
    const dishes = makeQuest("q-dish");
    const at8 = at("2026-10-08T19:00:00");
    expect(await statusAt(dishes, [makeEntry("q-dish", "2026-10-08T18:00:00", { status: "pending" })], at8)).toBe("pending");
    expect(await statusAt(dishes, [makeEntry("q-dish", "2026-10-08T18:00:00", { status: "approved" })], at8)).toBe("cleared");
    expect(await statusAt(dishes, [makeEntry("q-dish", "2026-10-08T18:00:00", { status: "rejected" })], at8)).toBe("lurking");
  });

  it("lurks until the allowance of a quest done several times a window is used", async () => {
    const twice = makeQuest("q-twice", { timesOfDay: ["morning", "evening"] });
    const morning = makeEntry("q-twice", "2026-10-08T08:00:00");
    const evening = makeEntry("q-twice", "2026-10-08T18:00:00");
    const now = at("2026-10-08T19:00:00");
    expect(await statusAt(twice, [], now)).toBe("lurking");
    expect(await statusAt(twice, [morning], now)).toBe("lurking");
    expect(await statusAt(twice, [morning, evening], now)).toBe("cleared");
    expect(await statusAt(twice, [morning, { ...evening, status: "pending" }], now)).toBe("pending");
    expect(await statusAt(twice, [morning, { ...evening, status: "rejected" }], now)).toBe("lurking");
    expect(await statusAt(twice, [morning, evening], at("2026-10-09T07:00:00"))).toBe("lurking");
  });

  it("clears a shared quest's room for every assignee, and not an individual one's", async () => {
    const teamEffort = makeQuest("q-team", { type: "collaborate", assignee: [HERO, MIA] });
    const solo = makeQuest("q-solo", { type: "individual", assignee: [HERO, MIA] });
    const entries = [
      makeEntry("q-team", "2026-10-08T18:00:00", { userId: MIA }),
      makeEntry("q-solo", "2026-10-08T18:00:00", { userId: MIA }),
    ];
    const board = await boardAt([teamEffort, solo], entries, at("2026-10-08T19:00:00"));
    const statusOf = (id: string) => roomQuestStatus(resolveRoomQuest(room({ questId: id }), HERO, board, []));
    expect(statusOf("q-team")).toBe("cleared");
    expect(statusOf("q-solo")).toBe("lurking");
  });

  it("reads away for every quest while Gale's Wind hides the board", async () => {
    const dishes = makeQuest("q-dish");
    const effects: HeroQuestEffects = { dayOffUntil: "2026-10-09T00:00:00" };
    const board = await boardAt([dishes], [], at("2026-10-08T09:00:00"), effects);
    expect(board).toEqual([]);
    expect(roomQuestStatus(resolveRoomQuest(room({ questId: "q-dish" }), HERO, board, [dishes]))).toBe("away");
    expect(roomQuestStatus(resolveRoomQuest(room({ quest: template() }), HERO, board, [dishes]))).toBe("away");
  });

  it("reads away on the day a quest is snoozed", async () => {
    const dishes = makeQuest("q-dish");
    const effects: HeroQuestEffects = { snoozedOn: { "q-dish": "2026-10-08" } };
    expect(await statusAt(dishes, [], at("2026-10-08T09:00:00"), effects)).toBe("away");
    expect(await statusAt(dishes, [], at("2026-10-09T09:00:00"), effects)).toBe("lurking");
  });

  it("reads away once a quest has ended", async () => {
    const ended = makeQuest("q-dish", { endsOn: "2026-10-07T00:00:00" });
    expect(await statusAt(ended, [], at("2026-10-08T09:00:00"))).toBe("away");
  });
});

describe("questOccurrenceKey", () => {
  it("is the quest id and the day its current window opened", () => {
    expect(questOccurrenceKey(makeQuest("q-dish"), at("2026-10-08T18:00:00"))).toBe("q-dish@2026-10-08");
    expect(questOccurrenceKey(makeQuest("q-dish"), at("2026-10-09T00:00:00"))).toBe("q-dish@2026-10-09");
  });

  it("stays the same for the whole of a multi-day window and changes with the next one", () => {
    const weekly = makeQuest("q-week", { basicSchedule: "weekly" });
    expect(questOccurrenceKey(weekly, at("2026-10-08T00:00:00"))).toBe("q-week@2026-10-08");
    expect(questOccurrenceKey(weekly, at("2026-10-14T23:59:00"))).toBe("q-week@2026-10-08");
    expect(questOccurrenceKey(weekly, at("2026-10-15T00:00:00"))).toBe("q-week@2026-10-15");
  });

  it("is one per listed day for a repeatOnDays quest", () => {
    const twiceAWeek = makeQuest("q-days", { basicSchedule: "weekly", repeatOnDays: ["mon", "thu"] });
    expect(questOccurrenceKey(twiceAWeek, at("2026-10-08T10:00:00"))).toBe("q-days@2026-10-08");
    expect(questOccurrenceKey(twiceAWeek, at("2026-10-12T10:00:00"))).toBe("q-days@2026-10-12");
  });

  it("is nothing on a day the quest is not due", () => {
    const twiceAWeek = makeQuest("q-days", { basicSchedule: "weekly", repeatOnDays: ["mon", "thu"] });
    expect(questOccurrenceKey(twiceAWeek, at("2026-10-09T10:00:00"))).toBeNull();
    expect(
      questOccurrenceKey(makeQuest("q-dish"), at("2026-10-08T10:00:00"), { snoozedOn: { "q-dish": "2026-10-08" } })
    ).toBeNull();
  });

  it("follows a Hook Shot pull-in to a one-day window", () => {
    const twiceAWeek = makeQuest("q-days", { basicSchedule: "weekly", repeatOnDays: ["mon", "thu"] });
    expect(questOccurrenceKey(twiceAWeek, at("2026-10-09T10:00:00"), { pulledInOn: { "q-days": "2026-10-09" } })).toBe(
      "q-days@2026-10-09"
    );
  });
});

describe("questReturnsAt", () => {
  it("is the next midnight for a daily quest", () => {
    expect(questReturnsAt(makeQuest("q-dish"), at("2026-10-08T18:00:00"))).toEqual(at("2026-10-09T00:00:00"));
  });

  it("is the next 7-day window for a weekly quest", () => {
    expect(questReturnsAt(makeQuest("q-week", { basicSchedule: "weekly" }), at("2026-10-09T18:00:00"))).toEqual(
      at("2026-10-15T00:00:00")
    );
  });

  it("is the next listed day for a repeatOnDays quest, from a done day or from a day it is not due", () => {
    const twiceAWeek = makeQuest("q-days", { basicSchedule: "weekly", repeatOnDays: ["mon", "thu"] });
    expect(questReturnsAt(twiceAWeek, at("2026-10-08T18:00:00"))).toEqual(at("2026-10-12T00:00:00"));
    expect(questReturnsAt(twiceAWeek, at("2026-10-09T18:00:00"))).toEqual(at("2026-10-12T00:00:00"));
    expect(questReturnsAt(twiceAWeek, at("2026-10-12T18:00:00"))).toEqual(at("2026-10-15T00:00:00"));
  });

  it("is the next period for a custom quest", () => {
    const fortnightly = makeQuest("q-custom", {
      basicSchedule: "custom",
      customFrequency: 1,
      customPeriodType: "week",
      customPeriodNumber: 2,
    });
    expect(questReturnsAt(fortnightly, at("2026-10-03T10:00:00"))).toEqual(at("2026-10-15T00:00:00"));
  });

  it("is never for a once quest that is under way", () => {
    expect(questReturnsAt(makeQuest("q-once", { basicSchedule: "once" }), at("2026-10-08T10:00:00"))).toBeNull();
  });

  it("is the day after a snooze", () => {
    expect(questReturnsAt(makeQuest("q-dish"), at("2026-10-08T10:00:00"), { snoozedOn: { "q-dish": "2026-10-08" } })).toEqual(
      at("2026-10-09T00:00:00")
    );
  });

  it("is the start day of a quest that has not begun", () => {
    const later = makeQuest("q-later", { startsOn: "2026-11-02T09:00:00" });
    expect(questReturnsAt(later, at("2026-10-08T10:00:00"))).toEqual(at("2026-11-02T00:00:00"));
  });

  it("is never for a quest that has ended", () => {
    const ended = makeQuest("q-ended", { endsOn: "2026-10-08T00:00:00" });
    expect(questReturnsAt(ended, at("2026-10-08T10:00:00"))).toBeNull();
  });
});

describe("sizedRoomOf", () => {
  const goblin = makeQuest("q-dish", { difficulty: 5 });

  it("counts a room's quest by its difficulty", () => {
    const found = resolveRoomQuest(room({ questId: "q-dish" }), HERO, [makeItem(goblin)], [goblin]);
    expect(sizedRoomOf(found)).toEqual({ difficulty: 5 });
  });

  it("counts a dormant room by its template's difficulty and says so", () => {
    const found = resolveRoomQuest(room({ quest: template({ difficulty: 8 }) }), HERO, [], []);
    expect(sizedRoomOf(found)).toEqual({ difficulty: 8, dormant: true });
  });

  it("counts a quest that sleeps for this hero: the temple is the same size for everyone", () => {
    const miasDishes = makeQuest("q-dish", { assignee: [MIA], difficulty: 3 });
    expect(sizedRoomOf(resolveRoomQuest(room({ questId: "q-dish" }), HERO, [], [miasDishes]))).toEqual({ difficulty: 3 });
  });

  it("leaves out classic rooms and empty lairs", () => {
    expect(sizedRoomOf(resolveRoomQuest(room({ beasts: ["b"] }), HERO, [], []))).toBeNull();
    expect(sizedRoomOf(resolveRoomQuest(room({ questId: "q-gone" }), HERO, [], []))).toBeNull();
  });

  it("feeds templeSize", () => {
    const rooms = [
      resolveRoomQuest(room({ questId: "q-dish" }), HERO, [makeItem(goblin)], [goblin]),
      resolveRoomQuest(room({ quest: template({ difficulty: 13 }) }), HERO, [], []),
      resolveRoomQuest(room({ beasts: ["b"] }), HERO, [], []),
    ]
      .map(sizedRoomOf)
      .filter((sized): sized is NonNullable<typeof sized> => sized !== null);
    expect(templeSize(rooms)).toMatchObject({ total: 18, awake: 5, dormant: 13, dormantRooms: 1, isFull: false });
  });
});

describe("roomQuestState", () => {
  it("tells a lurking room's quest, row, beast, tier and occurrence", async () => {
    const dishes = makeQuest("q-dish", { beastId: "beast-dish-goblin", difficulty: 3 });
    const now = at("2026-10-08T17:00:00");
    const board = await boardAt([dishes], [], now);
    const state = roomQuestState(room({ questId: "q-dish" }), HERO, board, now, { liveQuests: [dishes] });
    expect(state).toMatchObject({
      status: "lurking",
      quest: dishes,
      beastId: "beast-dish-goblin",
      difficulty: 3,
      tier: "miniboss",
      occurrence: "q-dish@2026-10-08",
    });
    expect(state.item).toBe(board[0]);
  });

  it("uses the library's suggestion for a quest without a beast", async () => {
    const nameOnly = makeQuest("q-dish", { beastId: "", achievementName: "Banish the Dish Goblin" });
    const now = at("2026-10-08T17:00:00");
    const state = roomQuestState(room({ quest: template() }), HERO, await boardAt([nameOnly], [], now), now);
    expect(state).toMatchObject({ status: "lurking", beastId: "beast-dish-goblin" });
  });

  it("keeps the occurrence of a cleared room until the window closes, then moves on", async () => {
    const dishes = makeQuest("q-dish");
    const entries = [makeEntry("q-dish", "2026-10-08T18:00:00")];
    const cleared = at("2026-10-08T19:00:00");
    const state = roomQuestState(room({ questId: "q-dish" }), HERO, await boardAt([dishes], entries, cleared), cleared, {
      liveQuests: [dishes],
    });
    expect(state).toMatchObject({ status: "cleared", occurrence: "q-dish@2026-10-08" });
    const next = at("2026-10-09T08:00:00");
    const restored = roomQuestState(room({ questId: "q-dish" }), HERO, await boardAt([dishes], entries, next), next, {
      liveQuests: [dishes],
    });
    expect(restored).toMatchObject({ status: "lurking", occurrence: "q-dish@2026-10-09" });
  });

  it("has no occurrence while the quest is away", async () => {
    const twiceAWeek = makeQuest("q-days", { basicSchedule: "weekly", repeatOnDays: ["mon", "thu"] });
    const now = at("2026-10-09T10:00:00");
    const state = roomQuestState(room({ questId: "q-days" }), HERO, await boardAt([twiceAWeek], [], now), now);
    expect(state.status).toBe("away");
    expect(state.occurrence).toBeNull();
  });

  it("tells a dormant room's template beast, difficulty and tier", () => {
    const tpl = template({ beastId: "beast-weed-wyrm", difficulty: 13 });
    const state = roomQuestState(room({ quest: tpl }), HERO, [], at("2026-10-08T10:00:00"));
    expect(state).toMatchObject({ status: "dormant", beastId: "beast-weed-wyrm", difficulty: 13, tier: "boss", occurrence: null });
    expect(state.quest).toBeUndefined();
  });

  it("tells a sleeping beast's quest without an occurrence", () => {
    const miasDishes = makeQuest("q-dish", { assignee: [MIA], difficulty: 8 });
    const state = roomQuestState(room({ questId: "q-dish" }), HERO, [], at("2026-10-08T10:00:00"), { liveQuests: [miasDishes] });
    expect(state).toMatchObject({ status: "notYours", quest: miasDishes, tier: "boss", occurrence: null });
  });

  it("says nothing about a classic room or an empty lair", () => {
    const now = at("2026-10-08T10:00:00");
    expect(roomQuestState(room({ beasts: ["b"] }), HERO, [], now)).toMatchObject({ status: "classic", occurrence: null });
    const empty = roomQuestState(room({ questId: "q-gone" }), HERO, [], now);
    expect(empty).toMatchObject({ status: "emptyLair", occurrence: null });
    expect(empty.quest).toBeUndefined();
    expect(empty.beastId).toBeUndefined();
  });
});
