import { createPinia, setActivePinia } from "pinia";
import { emitQuestClaimed, emitQuestPaid, type QuestPaid } from "@/lib/services/multiplayer/gameSignals";
import { listenForRaidStrikes, recordPaidStrike } from "@/lib/services/party/strikeCapture";
import { DAILY_STRIKE_CAP } from "@/lib/services/party/raidRules";
import { usePartyStore } from "@/lib/store/stores/party";

const mockSaveState = jest.fn().mockResolvedValue(undefined);
const mockGetState = jest.fn().mockResolvedValue(null);
jest.mock("@/lib/databases/PartyDb", () => ({
  __esModule: true,
  getPartyDb: () => ({
    getState: (...args: unknown[]) => mockGetState(...args),
    saveState: (...args: unknown[]) => mockSaveState(...args),
  }),
}));

const paid = (over: Partial<QuestPaid> = {}): QuestPaid => ({
  heroId: "ana",
  questId: "q1",
  xp: 500,
  fight: false,
  difficulty: 5,
  entryId: "e1",
  ...over,
});

/** The raid, started on a store that has already read its saved record (so the capture's own read changes nothing) */
const startedRaid = async () => {
  const store = usePartyStore();
  await store.load();
  const raid = store.startHomeRaid({ beastId: "beast-1", window: "quick", memberIds: ["ana", "ben"] });
  return { store, raid };
};

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  setActivePinia(createPinia());
  mockSaveState.mockClear();
  mockGetState.mockReset().mockResolvedValue(null);
});

describe("recordPaidStrike", () => {
  it("strikes the household raid with the size of the chore", async () => {
    const { store } = await startedRaid();
    await recordPaidStrike(paid());
    expect(store.raids[0].strikes).toEqual([
      expect.objectContaining({ key: "completion:e1", heroId: "ana", damage: 50 }),
    ]);
  });

  it("counts one payment once however often it is heard", async () => {
    const { store } = await startedRaid();
    await recordPaidStrike(paid());
    await recordPaidStrike(paid());
    expect(store.raids[0].strikes).toHaveLength(1);
  });

  it("counts a repeating chore finished twice the same day as two completions", async () => {
    const { store } = await startedRaid();
    await recordPaidStrike(paid({ entryId: "e1", difficulty: 2 }));
    await recordPaidStrike(paid({ entryId: "e2", difficulty: 2 }));
    expect(store.raids[0].strikes.map((strike) => strike.damage)).toEqual([20, 20]);
  });

  it("strikes nothing for a chore with no size", async () => {
    const { store } = await startedRaid();
    await recordPaidStrike(paid({ difficulty: undefined }));
    await recordPaidStrike(paid({ difficulty: 0, entryId: "e2" }));
    expect(store.raids[0].strikes).toEqual([]);
  });

  it("strikes nothing for a hero outside the raid, or when no raid is running", async () => {
    const { store } = await startedRaid();
    await recordPaidStrike(paid({ heroId: "cam" }));
    expect(store.raids[0].strikes).toEqual([]);
    setActivePinia(createPinia());
    const bare = usePartyStore();
    await expect(recordPaidStrike(paid())).resolves.toBeUndefined();
    expect(bare.raids).toEqual([]);
  });

  it("hits a little harder when two heroes finish chores the same day", async () => {
    const { store } = await startedRaid();
    await recordPaidStrike(paid({ heroId: "ana", entryId: "e1" }));
    await recordPaidStrike(paid({ heroId: "ben", entryId: "e2" }));
    expect(store.raids[0].strikes.map((strike) => [strike.heroId, strike.damage])).toEqual([
      ["ana", 50],
      ["ben", 55],
    ]);
  });

  it("holds a hero to the daily cap", async () => {
    const { store } = await startedRaid();
    await recordPaidStrike(paid({ difficulty: 13, entryId: "e1" }));
    await recordPaidStrike(paid({ difficulty: 13, entryId: "e2" }));
    expect(store.raids[0].strikes.map((strike) => strike.damage)).toEqual([DAILY_STRIKE_CAP]);
  });

  it("waits for the saved raids before it strikes, so the read cannot erase the blow", async () => {
    const now = new Date();
    mockGetState.mockResolvedValue({
      raids: [
        {
          id: "saved",
          partyId: "home",
          beastId: "beast-1",
          window: "quick",
          startedAt: new Date(now.getTime() - 1000).toISOString(),
          maxHp: 180,
          memberIds: ["ana", "ben"],
          strikes: [],
        },
      ],
    });
    const store = usePartyStore();
    await recordPaidStrike(paid(), now);
    expect(store.raids[0].id).toBe("saved");
    expect(store.raids[0].strikes).toHaveLength(1);
  });
});

describe("listenForRaidStrikes", () => {
  it("strikes when a quest is paid and stops when told to", async () => {
    const { store } = await startedRaid();
    const stop = listenForRaidStrikes();
    emitQuestPaid(paid());
    await flush();
    expect(store.raids[0].strikes).toHaveLength(1);
    stop();
    emitQuestPaid(paid({ entryId: "e2" }));
    await flush();
    expect(store.raids[0].strikes).toHaveLength(1);
  });

  it("does not strike for a claim still waiting on a Game Master", async () => {
    const { store } = await startedRaid();
    const stop = listenForRaidStrikes();
    emitQuestClaimed({ heroId: "ana", questId: "q1", difficulty: 5, requiresApproval: true });
    await flush();
    expect(store.raids[0].strikes).toEqual([]);
    stop();
  });
});
