import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { questListCounts, questListFor, type QuestListRow } from "@/lib/services/quests/QuestList";
import { WIDGET_PAYLOAD_VERSION, type WidgetHeroPayload } from "@/lib/services/widgets/widgetCatalog";
import {
  buildWidgetSyncPayload,
  extractWidgetHeroPayload,
  extractWidgetQuestPayload,
  MAX_WIDGET_QUESTS,
} from "@/lib/services/widgets/widgetDataExtractor";

// 2026-10-10 is a Saturday; the hero reads the list at noon.
const NOON = new Date(2026, 9, 10, 12, 0, 0);
/** A fixed `now` for the payload, so its timestamp is never the clock's business. */
const SYNCED_AT = NOON.getTime();

/**
 * Max as the app really stores him: tests/e2e/fixtures/battle-backup.json, profile "hero-1".
 * The shape is nested (stats.hp.now, stats.gp.wallet, name.nick) and the avatar is a slug. The
 * spec this replaced invented a flat hero, which is how the NaN bug reached a release.
 */
const maxProfile = (overrides: Record<string, unknown> = {}) => ({
  id: "hero-1",
  name: { full: "Max Power", first: "Max", last: "Power", middle: "", nick: "Max" },
  avatar: "003-gamer",
  jobClass: "warrior",
  stats: {
    level: 3,
    xp: { now: 300, next_level: 900, ledger: [] },
    gp: { limit: 100, debt: 0, wallet: 40, savings: 100, ledger: [] },
    hp: { now: 20, max: 42, min: 0 },
    mp: { now: 300, max: 300, min: 0 },
    ap: { total: 4, ledger: [] },
  },
  ...overrides,
});

const makeQuest = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: "quest-1",
  achievementName: "Clean the kitchen",
  categoryId: "",
  bonusAchievement: false,
  requiresApproval: false,
  type: "individual",
  assignee: ["hero-1"],
  basicSchedule: "daily",
  scheduleType: "basic",
  customFrequency: 1,
  customPeriodType: "day",
  customPeriodNumber: 1,
  dueByTime: "",
  endsOn: "",
  startsOn: "2026-10-01T09:00:00",
  repeatOnDays: [],
  showDailyUntilComplete: false,
  difficulty: 1,
  xp: 100,
  gp: 10,
  ap: 1,
  adventureType: "simple",
  ...overrides,
});

const onBoard = (
  quest: Achievement,
  status: QuestBoardItem["status"] = "open",
  flags: Partial<Pick<QuestBoardItem, "pending" | "overdue">> = {}
): QuestBoardItem => ({
  quest,
  status,
  progress: status === "notDue" ? null : { done: status === "done" ? 1 : 0, allowance: 1, isOpen: status === "open" },
  pending: false,
  overdue: false,
  ...flags,
});

const users = { "hero-1": { id: "hero-1", name: { nick: "Max", first: "Maxwell" } } };

const rowsFor = (board: QuestBoardItem[]): QuestListRow[] => questListFor("hero-1", NOON, board, users);

/** Max's board at noon: one quest of every status the list can hand a widget. */
const everyStatusBoard = (): QuestBoardItem[] => [
  onBoard(makeQuest({ id: "late", achievementName: "Make the bed", dueByTime: "08:00" }), "open", { overdue: true }),
  onBoard(makeQuest({ id: "evening", achievementName: "Dishes", dueByTime: "18:00" })),
  onBoard(makeQuest({ id: "anytime", achievementName: "Water plants" })),
  onBoard(
    makeQuest({ id: "upcoming", achievementName: "Pack for camp", basicSchedule: "once", startsOn: "2026-10-12T00:00:00" }),
    "notDue"
  ),
  onBoard(makeQuest({ id: "waiting", achievementName: "Homework", requiresPhoto: true }), "done", { pending: true }),
  onBoard(makeQuest({ id: "tamed", achievementName: "Feed the cat" }), "done"),
];

/** Every number a widget draws. A null in any of these is a hardcoded native default on the home screen. */
const NUMERIC_FIELDS: readonly (keyof WidgetHeroPayload)[] = [
  "level",
  "hp",
  "maxHp",
  "mp",
  "maxMp",
  "xp",
  "nextLevelXp",
  "gp",
  "savings",
  "ap",
  "streak",
  "nextChestDay",
  "nextChestXp",
  "nextChestGp",
];

describe("extractWidgetHeroPayload", () => {
  it("reads the nested profile the app actually stores", () => {
    const payload = extractWidgetHeroPayload(maxProfile(), [], 4);

    expect(payload).toMatchObject({
      id: "hero-1",
      name: "Max",
      avatar: "003-gamer",
      className: "warrior",
      level: 3,
      hp: 20,
      maxHp: 42,
      mp: 300,
      maxMp: 300,
      xp: 300,
      nextLevelXp: 900,
      gp: 40,
      savings: 100,
      ap: 4,
      streak: 4,
      // a 4-day run is walking toward the 7-day chest
      nextChestDay: 7,
      nextChestXp: 40,
      nextChestGp: 50,
    });
  });

  // The regression that matters: reading the profile flat made every one of these NaN, which
  // JSON.stringify writes as null, which Java's optInt swaps for a hardcoded default. The widget
  // then looked perfectly fine and was lying.
  it("never hands the native side a number it cannot draw", () => {
    const payload = extractWidgetHeroPayload(maxProfile(), rowsFor(everyStatusBoard()), 9);

    for (const field of NUMERIC_FIELDS) {
      expect({ field, finite: Number.isFinite(payload[field]) }).toEqual({ field, finite: true });
    }
    for (const count of Object.values(payload.counts)) {
      expect(Number.isFinite(count)).toBe(true);
    }
    expect(JSON.stringify(payload)).not.toContain("null");
  });

  it("degrades to safe defaults when the profile has no stats at all", () => {
    const payload = extractWidgetHeroPayload({ id: "hero-9" });

    expect(payload).toMatchObject({
      id: "hero-9",
      name: "Hero",
      className: "Novice",
      avatar: "",
      level: 1,
      hp: 0,
      maxHp: 1,
      mp: 0,
      maxMp: 1,
      xp: 0,
      nextLevelXp: 1,
      gp: 0,
      savings: 0,
      ap: 0,
      streak: 0,
      nextChestDay: 3,
    });
    for (const field of NUMERIC_FIELDS) {
      expect({ field, finite: Number.isFinite(payload[field]) }).toEqual({ field, finite: true });
    }
  });

  it("counts the rows the way the quest list itself does", () => {
    const rows = rowsFor(everyStatusBoard());

    const payload = extractWidgetHeroPayload(maxProfile(), rows);

    expect(payload.counts).toEqual(questListCounts(rows));
    expect(payload.counts).toEqual({ overdue: 1, open: 2, later: 1, pending: 1, done: 1 });
  });
});

describe("extractWidgetQuestPayload", () => {
  it("leaves the tamed quests behind and carries what a row needs before a tap", () => {
    const rows = rowsFor(everyStatusBoard());

    const payload = extractWidgetQuestPayload(rows);

    expect(payload.map((row) => row.id)).toEqual(["late", "evening", "anytime", "upcoming", "waiting"]);
    expect(payload.find((row) => row.id === "waiting")).toMatchObject({
      title: "Homework",
      status: "pending",
      requiresApproval: true,
      requiresPhoto: true,
    });
    expect(payload[0]).toMatchObject({ xpReward: 100, gpReward: 10, requiresApproval: false, requiresPhoto: false });
  });

  it("sends the deadline as epoch ms, and null only when the quest has none", () => {
    const rows = rowsFor([
      onBoard(makeQuest({ id: "evening", achievementName: "Dishes", dueByTime: "18:00" })),
      onBoard(makeQuest({ id: "anytime", achievementName: "Water plants" })),
    ]);

    const payload = extractWidgetQuestPayload(rows);

    expect(payload.find((row) => row.id === "evening")).toMatchObject({
      dueAt: new Date(2026, 9, 10, 18, 0, 0).getTime(),
      dueLabel: "6:00pm",
    });
    expect(payload.find((row) => row.id === "anytime")).toMatchObject({ dueAt: null, dueLabel: "Anytime" });
  });

  it("stops at MAX_WIDGET_QUESTS, because nobody scrolls a home screen", () => {
    const board = Array.from({ length: MAX_WIDGET_QUESTS + 4 }, (_, index) =>
      onBoard(makeQuest({ id: `quest-${index}`, achievementName: `Chore ${index}` }))
    );

    expect(extractWidgetQuestPayload(rowsFor(board))).toHaveLength(MAX_WIDGET_QUESTS);
    expect(extractWidgetQuestPayload(rowsFor(board), 3)).toHaveLength(3);
  });

  it("survives a caller with no rows to give", () => {
    expect(extractWidgetQuestPayload(null as unknown as QuestListRow[])).toEqual([]);
    expect(extractWidgetQuestPayload([])).toEqual([]);
  });
});

describe("the streak reward a widget shows", () => {
  // The widget used to advertise a 1.2x/1.5x XP multiplier that the engine never pays. The real
  // reward is a chest, so the payload carries the chest the run is walking toward.
  it("names the next chest on the ladder, not an XP bonus", () => {
    expect(extractWidgetHeroPayload(maxProfile(), [], 0)).toMatchObject({ nextChestDay: 3, nextChestXp: 15 });
    expect(extractWidgetHeroPayload(maxProfile(), [], 3)).toMatchObject({ nextChestDay: 7, nextChestXp: 40 });
    expect(extractWidgetHeroPayload(maxProfile(), [], 13)).toMatchObject({ nextChestDay: 14, nextChestGp: 100 });
    expect(extractWidgetHeroPayload(maxProfile(), [], 30)).toMatchObject({ nextChestDay: 60 });
  });
});

describe("buildWidgetSyncPayload", () => {
  it("keys the whole family by hero id and names the signed-in one", () => {
    const rows = rowsFor(everyStatusBoard());
    const zoe = maxProfile({ id: "hero-2", name: { nick: "Zoe" }, avatar: "012-wizard" });

    const payload = buildWidgetSyncPayload("hero-1", [{ user: maxProfile(), rows, streak: 7 }, { user: zoe }], SYNCED_AT);

    expect(payload.version).toBe(WIDGET_PAYLOAD_VERSION);
    expect(payload.primaryHeroId).toBe("hero-1");
    expect(payload.timestamp).toBe(SYNCED_AT);
    expect(Object.keys(payload.heroes)).toEqual(["hero-1", "hero-2"]);
    expect(payload.heroes["hero-1"]).toMatchObject({ name: "Max", streak: 7, nextChestDay: 14 });
    expect(payload.heroes["hero-2"]).toMatchObject({ name: "Zoe", streak: 0, nextChestDay: 3 });
    expect(payload.questsByHero["hero-1"]).toEqual(extractWidgetQuestPayload(rows));
    expect(payload.questsByHero["hero-2"]).toEqual([]);
  });

  it("includes gameStyle when provided", () => {
    const payload = buildWidgetSyncPayload("hero-1", [{ user: maxProfile() }], SYNCED_AT, "finalfantasy");
    expect(payload.gameStyle).toBe("finalfantasy");
  });

  it("skips a profile with no id: no widget could ever bind to it", () => {
    const payload = buildWidgetSyncPayload("hero-1", [{ user: maxProfile({ id: "" }) }, { user: maxProfile() }], SYNCED_AT);

    expect(Object.keys(payload.heroes)).toEqual(["hero-1"]);
    expect(Object.keys(payload.questsByHero)).toEqual(["hero-1"]);
  });
});
