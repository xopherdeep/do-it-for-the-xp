import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { initialTurn, maySend, turnReducer } from "@/lib/services/sync/heroTurn";
import type { HeroTurn, TurnEvent } from "@/lib/services/sync/heroTurn";

/**
 * bookHeroReminders: one hero's board becomes that hero's phone reminders, without touching the feed or the penalties.
 * Under Family Sync (spec section 5) the hero signed in here keeps their reminders unless the device knows another device
 * holds them, because their turn rests and is asked for again on every hide and show of the app and starts empty on a cold
 * start; any other hero on the device is booked only while this device holds their turn; and a hero the device does not
 * watch has nothing booked and what was booked before taken back, so the reminder rings on the phone in the hero's hand.
 * The turns move through the real reducer (heroTurn.ts), so a spec says what the sync did and not what the store answers.
 */
const NOON = new Date(2026, 9, 18, 12, 0, 0);

let mockSyncOn = false;
let mockTurns: Record<string, HeroTurn> = {};
let mockSignedIn: string | null = "kid-1";
const mockHolds = (id: string): boolean => (mockTurns[id] ? maySend(mockTurns[id]) : false);
jest.mock("@/lib/store/stores/sync", () => ({
  useSyncStore: () => ({
    get isOn() {
      return mockSyncOn;
    },
    holds: (id: string) => mockHolds(id),
    stateOf: (id: string) => mockTurns[id]?.state ?? null,
  }),
}));

const mockBoardFor = jest.fn();
const mockSchedule = jest.fn(async (..._args: unknown[]) => ({ scheduled: 1 }));
const mockPush = jest.fn();

jest.mock("@/lib/engine/quests/QuestEngine", () => ({
  ...jest.requireActual("@/lib/engine/quests/QuestEngine"),
  getQuestEngine: () => ({ getQuestBoardForUser: mockBoardFor }),
}));
jest.mock("@/lib/store/stores/user", () => ({
  useUserStore: () => ({
    currentUser: { id: mockSignedIn },
    getUserById: (id: string) => (id === "kid-1" ? { id, questEffects: undefined } : undefined),
  }),
}));
jest.mock("@/lib/store/stores/notifications", () => ({
  useNotificationsStore: () => ({ push: mockPush, load: jest.fn() }),
}));
jest.mock("@/lib/services/notifications/deviceReminders", () => ({
  ...jest.requireActual("@/lib/services/notifications/deviceReminders"),
  scheduleDueReminders: (...args: unknown[]) => mockSchedule(...args),
}));

import { bookHeroReminders } from "@/lib/services/notifications/questWatch";

const quest = (id: string, dueByTime: string, name = `Quest ${id}`) =>
  ({ id, achievementName: name, dueByTime } as QuestBoardItem["quest"]);
const row = (q: QuestBoardItem["quest"], extra: Partial<QuestBoardItem> = {}): QuestBoardItem => ({
  quest: q,
  status: "open",
  progress: null,
  pending: false,
  overdue: false,
  ...extra,
});

describe("bookHeroReminders", () => {
  beforeEach(() => {
    mockSyncOn = false;
    mockTurns = {};
    mockSignedIn = "kid-1";
    mockBoardFor.mockReset();
    mockSchedule.mockClear();
    mockPush.mockClear();
  });

  it("reads the hero's own board and books only the quests still ahead, under that hero", async () => {
    mockBoardFor.mockResolvedValue([row(quest("soon", "13:30", "Dishes")), row(quest("late", "11:00"), { overdue: true })]);
    const result = await bookHeroReminders("kid-1", NOON);
    expect(mockBoardFor).toHaveBeenCalledWith("kid-1", NOON, undefined, undefined);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const [heroId, reminders, now] = mockSchedule.mock.calls[0] as [string, Array<{ questId: string }>, Date];
    expect(heroId).toBe("kid-1");
    expect(reminders.map((r) => r.questId)).toEqual(["soon"]);
    expect(now).toBe(NOON);
    expect(result).toEqual({ scheduled: 1 });
  });

  it("still asks the scheduler with an empty list when nothing is ahead, so booked reminders are taken back", async () => {
    mockBoardFor.mockResolvedValue([row(quest("done", "13:30"), { status: "done" })]);
    await bookHeroReminders("kid-1", NOON);
    expect(mockSchedule).toHaveBeenCalledWith("kid-1", [], NOON);
  });

  it("books a hero who is not in the roster by id alone and leaves the feed untouched", async () => {
    mockBoardFor.mockResolvedValue([]);
    await bookHeroReminders("stranger", NOON);
    expect(mockSchedule).toHaveBeenCalledWith("stranger", [], NOON);
    expect(mockPush).not.toHaveBeenCalled();
  });

  describe("with Family Sync", () => {
    const BUSY: TurnEvent = { type: "busy", device: { label: "Dad's tablet", lastSeenAt: null } };
    /** What the sync did with a hero's turn, one event after the other through the real reducer */
    const turnSees = (heroId: string, ...events: TurnEvent[]) => {
      for (const event of events) mockTurns[heroId] = turnReducer(mockTurns[heroId] ?? initialTurn(), event);
    };
    const SIGN_IN: TurnEvent = { type: "signIn" };
    const GRANTED: TurnEvent = { type: "granted" };
    const SIGN_OUT: TurnEvent = { type: "signOut" };
    const REFUSED: TurnEvent = { type: "refused" };

    /** The ids of the quests booked by a call (the reminders handed to the scheduler) */
    const bookedQuests = (call = 0): string[] => (mockSchedule.mock.calls[call][1] as Array<{ questId: string }>).map((r) => r.questId);

    beforeEach(() => {
      mockSyncOn = true;
      mockBoardFor.mockResolvedValue([row(quest("soon", "13:30", "Dishes"))]);
    });

    it("with sync off, every hero gets reminders, whatever the turns say", async () => {
      mockSyncOn = false;
      turnSees("kid-1", SIGN_IN, BUSY);
      await bookHeroReminders("kid-1", NOON);
      await bookHeroReminders("kid-2", NOON);

      expect(bookedQuests(0)).toEqual(["soon"]);
      expect(bookedQuests(1)).toEqual(["soon"]);
    });

    describe("the hero signed in here", () => {
      it.each([
        ["held", [SIGN_IN, GRANTED]],
        ["being asked for, as the app comes to the front", [SIGN_IN]],
        ["resting, as the app goes to the background", [SIGN_IN, GRANTED, SIGN_OUT]],
        ["unknown, on a cold start", []],
      ] as Array<[string, TurnEvent[]]>)("keeps their reminders while the turn is %s", async (_label, events) => {
        turnSees("kid-1", ...events);
        await bookHeroReminders("kid-1", NOON);

        expect(bookedQuests()).toEqual(["soon"]);
      });

      it("keeps their reminders every time the app is opened and closed", async () => {
        for (const events of [[SIGN_IN, GRANTED], [SIGN_OUT], [SIGN_IN], [GRANTED], [SIGN_OUT]]) {
          turnSees("kid-1", ...events);
          await bookHeroReminders("kid-1", NOON);
        }

        expect(mockSchedule).toHaveBeenCalledTimes(5);
        for (let call = 0; call < 5; call++) expect(bookedQuests(call)).toEqual(["soon"]);
      });

      it.each([
        ["busy", [SIGN_IN, BUSY]],
        ["taken over", [SIGN_IN, GRANTED, REFUSED]],
      ] as Array<[string, TurnEvent[]]>)("has nothing booked, and the booked reminders taken back, once the device knows another device holds them (%s)", async (_label, events) => {
        turnSees("kid-1", ...events);
        const result = await bookHeroReminders("kid-1", NOON);

        expect(mockBoardFor).not.toHaveBeenCalled();
        expect(mockSchedule).toHaveBeenCalledTimes(1);
        expect(mockSchedule).toHaveBeenCalledWith("kid-1", [], NOON);
        expect(result).toEqual({ scheduled: 1 });
        expect(mockPush).not.toHaveBeenCalled();
      });

      it("books them again when the player plays here anyway", async () => {
        turnSees("kid-1", SIGN_IN, BUSY);
        await bookHeroReminders("kid-1", NOON);
        turnSees("kid-1", { type: "force" }, GRANTED);
        await bookHeroReminders("kid-1", NOON);

        expect(mockSchedule.mock.calls[0][1]).toEqual([]);
        expect(bookedQuests(1)).toEqual(["soon"]);
      });
    });

    describe("another hero on the device", () => {
      it("is booked only while this device holds their turn", async () => {
        turnSees("kid-2", SIGN_IN, GRANTED);
        await bookHeroReminders("kid-2", NOON);

        expect(bookedQuests()).toEqual(["soon"]);
      });

      it.each([
        ["resting", []],
        ["being asked for", [SIGN_IN]],
        ["busy", [SIGN_IN, BUSY]],
      ] as Array<[string, TurnEvent[]]>)("has nothing booked, and the booked reminders taken back, while the turn is %s", async (_label, events) => {
        turnSees("kid-2", ...events);
        await bookHeroReminders("kid-2", NOON);

        expect(mockBoardFor).not.toHaveBeenCalled();
        expect(mockSchedule).toHaveBeenCalledWith("kid-2", [], NOON);
      });

      it("is not booked when nobody is signed in and the device holds no turn", async () => {
        mockSignedIn = null;
        await bookHeroReminders("kid-1", NOON);

        expect(mockSchedule).toHaveBeenCalledWith("kid-1", [], NOON);
      });
    });
  });
});
