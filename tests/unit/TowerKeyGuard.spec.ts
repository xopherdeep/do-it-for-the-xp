/**
 * The last phase's floor boss in a project tower is a sealed mini-boss that drops the Boss Key (towerRecord.ts keyGuard),
 * and the Boss Key opens the finale on the roof. The Game Master may delete every chore the boss holds: the lair is then
 * empty (questRooms: emptyLair), and the key must still be reachable or the project could never finish. These pin that
 * the empty lair opens its doors and still offers the drop, and that a boss with a live chore keeps its fight.
 */
import { createPinia, setActivePinia } from "pinia";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Room } from "@/lib/engine/core/dungeons/types";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { roomActions, resetVisitMemory } from "@/lib/services/temples/RoomInteractions";
import { BOSS_KEY_ID } from "@/lib/services/temples/roomGrants";
import { addHero, contextAt, dungeons, enter, HERO, makeTemple, temples } from "./templeFixtures";

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

const KEY_GUARD: Room = {
  type: "miniboss",
  content: { questIds: ["gone-1", "gone-2"], difficulty: "boss", lockOnEnter: true, drops: { chest: "dungeon", dungeon: BOSS_KEY_ID } },
};

const chore = (id: string): Achievement =>
  ({
    id,
    achievementName: "Wash the dishes",
    type: "individual",
    assignee: [HERO],
    basicSchedule: "once",
    startsOn: "2026-01-01T00:00:00",
    endsOn: "",
    dueByTime: "18:00",
    difficulty: 8,
    beastId: "beast-dish-goblin",
  }) as unknown as Achievement;

const rowOf = (quest: Achievement): QuestBoardItem =>
  ({ quest, status: "open", progress: null, pending: false, overdue: false }) as QuestBoardItem;

/** A one-row temple with the key guard at column 1, the hero standing in it, and the board the run keeps */
const withKeyGuard = (board: QuestBoardItem[], liveQuests: Achievement[]) => {
  const id = makeTemple({ E: { type: "entrance" }, X: KEY_GUARD }, [["E", "X"]]);
  enter(id, [0, 1]);
  jest.spyOn(temples, "getQuestBoard").mockImplementation((templeId: string) => (templeId === id ? { heroId: HERO, board, liveQuests } : undefined));
  return { id, room: dungeons.getRoom(id, [0, 1])!, ctx: { ...contextAt(id, [0, 1]), now: NOW } };
};

const labels = (sheet: { actions: Array<{ label: string }> }) => sheet.actions.map((action) => action.label);

beforeEach(() => {
  setActivePinia(createPinia());
  resetVisitMemory();
  addHero();
});
afterEach(() => jest.restoreAllMocks());

describe("a tower's key guard whose chores were all deleted", () => {
  it("is an empty lair with no fight, and the Boss Key is still there to take", async () => {
    const { room, ctx } = withKeyGuard([], []);

    const sheet = roomActions(room, ctx);

    expect(sheet.header).toBe("An empty lair.");
    expect(labels(sheet)).toEqual(["Take it"]);
    expect(sheet.drop).toBe("waiting");
    expect(await sheet.actions[0].run()).toEqual({ intent: "takeDrop" });
  });

  it("does not seal its doors: the empty lair counts as cleared once the run reads the board", () => {
    const { id } = withKeyGuard([], []);
    // The run is the hero's (the temple screen opens it for them)
    (temples as unknown as { heroByTemple: Map<string, string> }).heroByTemple.set(id, HERO);

    temples.syncQuestRooms(id, { heroId: HERO, board: [], liveQuests: [] }, NOW);

    expect(temples.isRoomCleared(id, "1F", [0, 1])).toBe(true);
  });

  it("keeps the fight, and offers no key, while one of its chores is alive", () => {
    const alive = chore("gone-2");
    const { room, ctx } = withKeyGuard([rowOf(alive)], [alive]);

    const sheet = roomActions(room, ctx);

    expect(labels(sheet)).toEqual(["Fight"]);
    expect(sheet.drop).toBeUndefined();
  });
});
