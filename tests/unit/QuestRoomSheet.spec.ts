/**
 * The temple screen speaks quest rooms (docs/Quest-Rooms-Spec.md 5.3, 7 step 3, 8): what each status says, the doors it
 * leaves open and whether the room offers a fight or a search. The words are pure (questRoomWords, backLabel,
 * ownersLabel); roomActions reads the board the run keeps (TempleSystem.getQuestBoard) and builds the sheet with them.
 */
import { createPinia, setActivePinia } from "pinia";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Room, RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { roomQuestState } from "@/lib/services/temples/questRooms";
import { roomActions, resetVisitMemory, type RoomOutcome } from "@/lib/services/temples/RoomInteractions";
import { useUserStore } from "@/lib/store/stores/user";
import {
  backLabel,
  ownersLabel,
  questRoomStateFor,
  questRoomWords,
} from "@/lib/services/temples/roomInteractions/questSheet";
import { addHero, contextAt, dice, dungeons, enter, HERO, makeTemple, temples, wallet } from "./templeFixtures";

jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: () => Promise.resolve(null),
    saveProgress: (progress: unknown) => Promise.resolve(progress),
  }),
}));

// Monday 12 October 2026, ten in the morning
const NOW = new Date(2026, 9, 12, 10, 0, 0);

const quest = (id: string, overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id,
    achievementName: "Wash the dishes",
    type: "individual",
    assignee: [HERO],
    basicSchedule: "daily",
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    repeatOnDays: [],
    startsOn: "2026-01-01T00:00:00",
    endsOn: "",
    dueByTime: "18:00",
    difficulty: 2,
    beastId: "beast-dish-goblin",
    ...overrides,
  }) as unknown as Achievement;

const item = (
  q: Achievement,
  status: QuestBoardItem["status"] = "open",
  extra: Partial<QuestBoardItem> = {}
): QuestBoardItem => ({ quest: q, status, progress: null, pending: false, overdue: false, ...extra }) as QuestBoardItem;

const roomOf = (questId = "q1"): Room => ({ type: "monster", content: { lockOnEnter: true, questId } });

/** The state a room is in for the hero, from one board row (or none) */
const stateOf = (
  q: Achievement,
  row?: QuestBoardItem,
  options: { room?: Room; liveQuests?: Achievement[]; heroId?: string } = {}
) =>
  roomQuestState(options.room ?? roomOf(String(q.id)), options.heroId ?? HERO, row ? [row] : [], NOW, {
    liveQuests: options.liveQuests ?? [q],
  });

describe("backLabel", () => {
  it("says tomorrow for the next day", () => {
    expect(backLabel(new Date(2026, 9, 13), NOW)).toBe("Back tomorrow.");
  });

  it("names the weekday within the week", () => {
    expect(backLabel(new Date(2026, 9, 17), NOW)).toBe("Back Sat.");
  });

  it("names the day and date from a week out", () => {
    expect(backLabel(new Date(2026, 9, 19), NOW)).toBe("Back Mon 19 Oct.");
  });

  it("says today for a return the same day, and nothing for a beast that never returns", () => {
    expect(backLabel(new Date(2026, 9, 12), NOW)).toBe("Back today.");
    expect(backLabel(null, NOW)).toBeNull();
  });
});

describe("ownersLabel", () => {
  it.each([
    [[], "Someone's"],
    [["Mia"], "Mia's"],
    [["Mia", "Leo"], "Mia and Leo's"],
    [["Mia", "Leo", "Zed"], "The party's"],
  ])("%j reads %s", (names, expected) => {
    expect(ownersLabel(names)).toBe(expected);
  });
});

describe("a lurking room (the board item is open)", () => {
  const dishes = quest("q1");

  it("announces the monster with the chore and when it is due, and offers the fight", () => {
    const words = questRoomWords({ state: stateOf(dishes, item(dishes)), now: NOW });

    expect(words).toMatchObject({
      status: "lurking",
      header: "A Monster approaches!",
      body: "Wash the dishes · Due 6:00pm",
      beastId: "beast-dish-goblin",
      fight: true,
      search: false,
    });
    // the beast's own name is the line under the title: the screen fills it in
    expect(words?.subHeader).toBeUndefined();
  });

  it.each([
    [1, "A Monster approaches!"],
    [2, "A Monster approaches!"],
    [3, "A fierce foe blocks the way!"],
    [5, "A fierce foe blocks the way!"],
    [8, "A Powerful Boss appears!"],
    [13, "A Powerful Boss appears!"],
  ])("a difficulty %i quest makes the room speak as its tier: %s", (difficulty, header) => {
    const hard = quest("q1", { difficulty });
    expect(questRoomWords({ state: stateOf(hard, item(hard)), now: NOW })?.header).toBe(header);
  });

  it("writes a deadline on another day with the board's own day words", () => {
    const weekly = quest("q1", { basicSchedule: "weekly", repeatOnDays: [], dueByTime: "17:30" });
    const words = questRoomWords({ state: stateOf(weekly, item(weekly)), now: NOW });
    // a weekly quest with no listed weekdays is due on the last day of its window (QuestList.dueFor)
    expect(words?.body).toMatch(/^Wash the dishes · Due (.+ )?5:30pm$/);
  });

  it("says Anytime when the chore has no due time", () => {
    const loose = quest("q1", { dueByTime: "" });
    expect(questRoomWords({ state: stateOf(loose, item(loose)), now: NOW })?.body).toBe("Wash the dishes · Anytime");
  });

  it("owns up to a chore that is late", () => {
    const late = questRoomWords({ state: stateOf(dishes, item(dishes, "open", { overdue: true })), now: NOW });
    expect(late?.body).toBe("Wash the dishes · Was due 6:00pm");

    const noClock = quest("q1", { dueByTime: "" });
    const lateAnytime = questRoomWords({ state: stateOf(noClock, item(noClock, "open", { overdue: true })), now: NOW });
    expect(lateAnytime?.body).toBe("Wash the dishes · Overdue");
  });

  it("counts the grudge marks the hero carries, three at most, and says nothing for none", () => {
    const marked = (grudge: number) => questRoomWords({ state: stateOf(dishes, item(dishes)), now: NOW, grudge })?.body;
    expect(marked(0)).toBe("Wash the dishes · Due 6:00pm");
    expect(marked(1)).toBe("Wash the dishes · Due 6:00pm · Grudge x1");
    expect(marked(2)).toBe("Wash the dishes · Due 6:00pm · Grudge x2");
    expect(marked(9)).toBe("Wash the dishes · Due 6:00pm · Grudge x3");
    expect(marked(-1)).toBe("Wash the dishes · Due 6:00pm");
  });

  it("puts the chore under the title when the quest has no beast, and keeps the due time as the line", () => {
    const bare = quest("q1", { beastId: undefined, noBeast: true } as Partial<Achievement>);
    const words = questRoomWords({ state: stateOf(bare, item(bare)), now: NOW });

    expect(words).toMatchObject({ status: "lurking", fight: true, subHeader: "Wash the dishes", body: "Due 6:00pm" });
    expect(words?.beastId).toBeUndefined();
  });
});

describe("a room whose claim is waiting for the Game Master (pending)", () => {
  const dishes = quest("q1");
  const words = questRoomWords({ state: stateOf(dishes, item(dishes, "done", { pending: true })), now: NOW });

  it("is tied up: no fight, no search", () => {
    expect(words).toMatchObject({
      status: "pending",
      header: "Tied up. The Game Master is checking.",
      body: "Wash the dishes",
      beastId: "beast-dish-goblin",
      fight: false,
      search: false,
    });
  });
});

describe("a room whose chore is done (cleared)", () => {
  it("leaves the smell and a search, and says when the beast is back", () => {
    const dishes = quest("q1");
    const words = questRoomWords({ state: stateOf(dishes, item(dishes, "done")), now: NOW });

    expect(words).toMatchObject({
      status: "cleared",
      header: "Nothing left here but the smell.",
      body: "Wash the dishes · Back tomorrow.",
      beastId: "beast-dish-goblin",
      fight: false,
      search: true,
    });
  });

  it("uses the next window of the schedule: the next listed day for a weekday quest", () => {
    // done on its Monday; it comes back on Thursday
    const weekdays = quest("q1", { basicSchedule: "weekly", repeatOnDays: ["mon", "thu"] });
    const words = questRoomWords({ state: stateOf(weekdays, item(weekdays, "done")), now: NOW });
    expect(words?.body).toBe("Wash the dishes · Back Thu.");
  });

  it("says a one-time chore is gone for good", () => {
    const once = quest("q1", { basicSchedule: "once", startsOn: "2026-10-12T00:00:00" });
    const words = questRoomWords({ state: stateOf(once, item(once, "done")), now: NOW });
    expect(words).toMatchObject({ status: "cleared", body: "Wash the dishes · Gone for good.", search: true });
  });
});

describe("a room whose chore is not due (away)", () => {
  it("is empty and says the day the beast is back", () => {
    // a Saturday-only chore, on a Monday
    const saturdays = quest("q1", { basicSchedule: "weekly", repeatOnDays: ["sat"] });
    const words = questRoomWords({ state: stateOf(saturdays, item(saturdays, "notDue")), now: NOW });

    expect(words).toMatchObject({
      status: "away",
      header: "The lair is empty.",
      body: "Wash the dishes · Back Sat.",
      fight: false,
      search: false,
    });
  });

  it("reads the same while Gale's Wind hides the board (the quest has no row)", () => {
    const dishes = quest("q1");
    const words = questRoomWords({ state: stateOf(dishes, undefined), now: NOW });
    expect(words).toMatchObject({ status: "away", header: "The lair is empty.", fight: false });
  });

  it("says a chore that has ended is gone for good", () => {
    const ended = quest("q1", { endsOn: "2026-10-01T00:00:00" });
    const words = questRoomWords({ state: stateOf(ended, item(ended, "notDue")), now: NOW });
    expect(words).toMatchObject({ status: "away", header: "The lair is empty.", body: "Wash the dishes · Gone for good." });
  });
});

describe("a room whose quest is someone else's (not yours)", () => {
  const mias = quest("q1", { assignee: ["hero-2"] });
  const state = () => stateOf(mias, undefined, { liveQuests: [mias] });

  it("lets the hero walk past a sleeping beast, named for its owner", () => {
    const words = questRoomWords({ state: state(), now: NOW, owners: ["Mia"], beastName: "Dish Goblin" });

    expect(words).toMatchObject({
      status: "notYours",
      header: "Mia's Dish Goblin sleeps here.",
      subHeader: "",
      body: "Wash the dishes",
      beastId: "beast-dish-goblin",
      fight: false,
      search: false,
    });
  });

  it("settles for 'beast' when the name is unknown, and for 'Someone's' when nobody owns it", () => {
    expect(questRoomWords({ state: state(), now: NOW, owners: ["Mia"] })?.header).toBe("Mia's beast sleeps here.");
    expect(questRoomWords({ state: state(), now: NOW, beastName: "Dish Goblin" })?.header).toBe(
      "Someone's Dish Goblin sleeps here."
    );
  });
});

describe("rooms that keep the classic rules, and an empty lair", () => {
  it("speaks for no classic room and no dormant room", () => {
    const classic = roomQuestState({ type: "monster", content: { beasts: ["beast-socktopus"] } }, HERO, [], NOW);
    expect(questRoomWords({ state: classic, now: NOW })).toBeNull();

    const template: RoomQuestTemplate = { beastId: "beast-dish-goblin", difficulty: 2, basicSchedule: "daily" };
    const dormant = roomQuestState({ type: "monster", content: { quest: template } }, HERO, [], NOW);
    expect(dormant.status).toBe("dormant");
    expect(questRoomWords({ state: dormant, now: NOW })).toBeNull();
  });

  it("has no fight and no search for a quest that is gone", () => {
    const gone = roomQuestState(roomOf("deleted"), HERO, [], NOW, { liveQuests: [] });
    expect(questRoomWords({ state: gone, now: NOW })).toMatchObject({
      status: "emptyLair",
      header: "An empty lair.",
      body: "Whatever lived here is gone.",
      fight: false,
      search: false,
    });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The sheet roomActions builds from the board the run keeps
// ---------------------------------------------------------------------------------------------------------------------

describe("roomActions in a quest room", () => {
  const dishes = quest("q1");
  const labels = (sheet: { actions: Array<{ label: string }> }) => sheet.actions.map((a) => a.label);

  /** A one-row temple with the quest room at column 1, the hero standing in it, and the board the run keeps */
  const withQuestRoom = (
    row: QuestBoardItem | undefined,
    options: { room?: Room; heroId?: string; liveQuests?: Achievement[] } = {}
  ) => {
    const id = makeTemple({ E: { type: "entrance" }, X: options.room ?? roomOf("q1") }, [["E", "X"]]);
    enter(id, [0, 1]);
    jest.spyOn(temples, "getQuestBoard").mockImplementation((templeId: string) =>
      templeId === id
        ? { heroId: options.heroId ?? HERO, board: row ? [row] : [], liveQuests: options.liveQuests ?? [dishes] }
        : undefined
    );
    return { id, room: dungeons.getRoom(id, [0, 1])!, ctx: { ...contextAt(id, [0, 1]), now: NOW } };
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    resetVisitMemory();
    addHero();
  });
  afterEach(() => jest.restoreAllMocks());

  it("shows a lurking quest's beast, the chore and when it is due, and offers the fight", async () => {
    const { room, ctx } = withQuestRoom(item(dishes));

    const sheet = roomActions(room, ctx);

    expect(sheet.header).toBe("A Monster approaches!");
    expect(sheet.body).toBe("Wash the dishes · Due 6:00pm");
    expect(sheet.beastId).toBe("beast-dish-goblin");
    expect(sheet.questBeast).toBe(true);
    expect(labels(sheet)).toEqual(["Fight"]);
    expect(await sheet.actions[0].run()).toEqual({ intent: "fight" });
  });

  it("speaks the quest's tier, not the room's type", () => {
    const boss = quest("q1", { difficulty: 13 });
    const { room, ctx } = withQuestRoom(item(boss), { liveQuests: [boss] });
    expect(roomActions(room, ctx).header).toBe("A Powerful Boss appears!");
  });

  it("is tied up while the claim waits: nothing to do", () => {
    const { room, ctx } = withQuestRoom(item(dishes, "done", { pending: true }));
    const sheet = roomActions(room, ctx);
    expect(sheet.header).toBe("Tied up. The Game Master is checking.");
    expect(sheet.actions).toEqual([]);
  });

  it("leaves the smell once the chore is done, with the one search and a day for the beast to come back", async () => {
    const { room, ctx } = withQuestRoom(item(dishes, "done"));

    const sheet = roomActions(room, { ...ctx, rng: dice(0.2, 0.5) });
    expect(sheet.header).toBe("Nothing left here but the smell.");
    expect(sheet.body).toBe("Wash the dishes · Back tomorrow.");
    expect(labels(sheet)).toEqual(["Search the room"]);

    const outcome: RoomOutcome = await sheet.actions[0].run();
    expect(outcome.message).toBe("You found 5 GP in the mess.");
    expect(wallet()).toBe(105);
    expect(roomActions(room, ctx).actions).toEqual([]);
  });

  it("is empty when the chore is not due, and offers nothing", () => {
    const saturdays = quest("q1", { basicSchedule: "weekly", repeatOnDays: ["sat"] });
    const { room, ctx } = withQuestRoom(item(saturdays, "notDue"), { liveQuests: [saturdays] });

    const sheet = roomActions(room, ctx);

    expect(sheet.header).toBe("The lair is empty.");
    expect(sheet.body).toBe("Wash the dishes · Back Sat.");
    expect(sheet.actions).toEqual([]);
  });

  it("lets a hero walk past another hero's sleeping beast, by the beast's library name", () => {
    const mias = quest("q1", { assignee: ["hero-2"] });
    useUserStore().users["hero-2"] = { id: "hero-2", name: { nick: "Mia", full: "Mia" }, stats: {} };
    const { room, ctx } = withQuestRoom(undefined, { liveQuests: [mias] });

    const sheet = roomActions(room, ctx);

    expect(sheet.header).toBe("Mia's Dish Goblin sleeps here.");
    expect(sheet.actions).toEqual([]);
  });

  it("goes by the board, not by the cleared rooms: a stale cleared key cannot hide a lurking beast", () => {
    const { id, room, ctx } = withQuestRoom(item(dishes));
    temples.markRoomCleared(id, "1F", [0, 1]);

    expect(labels(roomActions(room, ctx))).toEqual(["Fight"]);
  });

  it("keeps the classic sheet for a classic room, a dormant room and a run with no board yet", () => {
    const classic = withQuestRoom(item(dishes), { room: { type: "monster", content: { beasts: ["beast-socktopus"] } } });
    expect(roomActions(classic.room, classic.ctx)).toMatchObject({
      header: "A Monster approaches!",
      beastId: "beast-socktopus",
    });
    expect(roomActions(classic.room, classic.ctx).body).toBeUndefined();

    const template: RoomQuestTemplate = { beastId: "beast-dish-goblin", difficulty: 2, basicSchedule: "daily" };
    const dormant = withQuestRoom(undefined, { room: { type: "monster", content: { quest: template } }, liveQuests: [] });
    expect(roomActions(dormant.room, dormant.ctx)).toMatchObject({ header: "A Monster approaches!" });
    expect(roomActions(dormant.room, dormant.ctx).body).toBeUndefined();

    // a quest room before the run has read the board: the old rules, nothing invented
    const unread = makeTemple({ E: { type: "entrance" }, X: roomOf("q1") }, [["E", "X"]]);
    enter(unread, [0, 1]);
    jest.spyOn(temples, "getQuestBoard").mockReturnValue(undefined);
    expect(roomActions(dungeons.getRoom(unread, [0, 1])!, contextAt(unread, [0, 1])).header).toBe("A Monster approaches!");
  });

  it("answers for another hero's board with the classic rules (a board is only read for the run's hero)", () => {
    const { room, ctx } = withQuestRoom(item(dishes, "done"), { heroId: "somebody-else" });
    expect(labels(roomActions(room, ctx))).toEqual(["Fight"]);
  });
});

describe("questRoomStateFor", () => {
  const dishes = quest("q1");

  beforeEach(() => {
    setActivePinia(createPinia());
    addHero();
  });
  afterEach(() => jest.restoreAllMocks());

  it("reads a room's state against the board the run keeps", () => {
    jest.spyOn(temples, "getQuestBoard").mockReturnValue({ heroId: HERO, board: [item(dishes)], liveQuests: [dishes] });
    expect(questRoomStateFor(roomOf(), "any-temple", HERO, NOW)).toMatchObject({
      status: "lurking",
      beastId: "beast-dish-goblin",
    });
  });

  it("has no state for a classic room, a hero without the board, or a run with no board", () => {
    jest.spyOn(temples, "getQuestBoard").mockReturnValue({ heroId: HERO, board: [item(dishes)], liveQuests: [dishes] });
    expect(questRoomStateFor({ type: "monster", content: { beasts: ["b"] } }, "any-temple", HERO, NOW)).toBeNull();
    expect(questRoomStateFor(roomOf(), "any-temple", "somebody-else", NOW)).toBeNull();
    expect(questRoomStateFor(undefined, "any-temple", HERO, NOW)).toBeNull();

    jest.spyOn(temples, "getQuestBoard").mockReturnValue(undefined);
    expect(questRoomStateFor(roomOf(), "any-temple", HERO, NOW)).toBeNull();
  });
});

