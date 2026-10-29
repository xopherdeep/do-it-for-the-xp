import { createPinia, setActivePinia } from "pinia";
import { emitQuestClaimed, emitQuestPaid, type QuestPaid } from "@/lib/services/multiplayer/gameSignals";
import { listenForRaidStrikes, recordPaidStrike } from "@/lib/services/party/strikeCapture";
import { toDayKey } from "@/lib/services/party/partyStats";
import type { WireParty } from "@/lib/services/party/partyWire";
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

const mockFlush = jest.fn();
jest.mock("@/lib/services/party/strikeOutbox", () => ({ flushOutbox: (...args: unknown[]) => mockFlush(...args) }));
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => ({ familyId: "fam-1", isPro: true }) }));
jest.mock("@/lib/services/temples/templeQuestRows", () => ({ libraryEntryOf: () => undefined }));

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

describe("recordPaidStrike: a raid with other families", () => {
  const card = (heroId: string, nickname: string) => ({ heroId, nickname, level: 3, jobClass: "knight", look: null });
  const outsideParty = (over: { status?: "active" | "defeated" | "retreated"; strikers?: [string, string][]; startedAgoMs?: number; members?: [string, string][] } = {}): WireParty => {
    const now = Date.now();
    const members = (over.members ?? [["fam-1", "ana"], ["fam-2", "ben"]]).map(([familyId, heroId]) => ({
      familyId,
      heroId,
      card: card(heroId, heroId),
      role: "member" as const,
      joinedAt: "",
    }));
    return {
      id: "p1",
      name: "Raiders",
      emblem: "dragon",
      inviteRule: "leader",
      leader: { familyId: "fam-1", heroId: "ana" },
      members,
      raid: {
        id: "r1",
        beastId: "beast-fluffalo",
        window: "quick",
        maxHp: 180,
        memberCount: 2,
        startedAt: new Date(now - (over.startedAgoMs ?? 60_000)).toISOString(),
        endsAt: new Date(now + 3 * 86_400_000).toISOString(),
        hp: 180,
        status: over.status ?? "active",
        top: null,
        last: null,
        strikes: (over.strikers ?? []).map(([familyId, heroId], i) => ({ key: `s${i}`, familyId, heroId, damage: 10, day: toDayKey(new Date()), at: new Date(now - 1000).toISOString() })),
      },
      seq: 1,
    };
  };
  const open = async (party: WireParty) => {
    const store = usePartyStore();
    await store.load();
    store.applyServer({ parties: [party], incoming: [], outgoing: [] });
    return store;
  };

  beforeEach(() => mockFlush.mockReset().mockResolvedValue(undefined));

  it("queues the strike for the site instead of counting it here, and sends it", async () => {
    const store = await open(outsideParty());
    await recordPaidStrike(paid());
    expect(store.outbox).toEqual([expect.objectContaining({ raidId: "r1", key: "completion:e1", heroId: "ana", damage: 50, day: toDayKey(new Date()) })]);
    expect(store.raidsOf("p1")[0].strikes).toEqual([]);
    expect(mockFlush).toHaveBeenCalledTimes(1);
  });

  it("hits a little harder when another hero of the party struck today", async () => {
    const store = await open(outsideParty({ strikers: [["fam-2", "ben"]] }));
    await recordPaidStrike(paid());
    expect(store.outbox[0].damage).toBe(55);
  });

  it("counts a payment once however often it is heard", async () => {
    const store = await open(outsideParty());
    await recordPaidStrike(paid());
    await recordPaidStrike(paid());
    expect(store.outbox).toHaveLength(1);
  });

  it("queues nothing for a hero who is not in the party, or whose family only shares a hero's name", async () => {
    const store = await open(outsideParty({ members: [["fam-2", "ana"], ["fam-2", "ben"]] }));
    await recordPaidStrike(paid({ heroId: "ana" }));
    expect(store.outbox).toEqual([]);
    expect(mockFlush).not.toHaveBeenCalled();
  });

  it("queues nothing once the beast has fallen or fled", async () => {
    const retreated = await open(outsideParty({ startedAgoMs: 10 * 86_400_000 }));
    await recordPaidStrike(paid());
    expect(retreated.outbox).toEqual([]);
  });

  it("queues nothing for a chore with no size", async () => {
    const store = await open(outsideParty());
    await recordPaidStrike(paid({ difficulty: undefined }));
    expect(store.outbox).toEqual([]);
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
