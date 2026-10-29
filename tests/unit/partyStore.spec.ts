import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { HOME_PARTY_ID } from "@/lib/services/party/partyRules";
import { RAID_BASE_REWARD, raidMaxHp } from "@/lib/services/party/raidRules";
import { usePartyStore } from "@/lib/store/stores/party";
import { useUserStore } from "@/lib/store/stores/user";

const mockSaveState = jest.fn().mockResolvedValue(undefined);
const mockGetState = jest.fn().mockResolvedValue(null);
jest.mock("@/lib/databases/PartyDb", () => ({
  __esModule: true,
  getPartyDb: () => ({
    getState: (...args: unknown[]) => mockGetState(...args),
    saveState: (...args: unknown[]) => mockSaveState(...args),
  }),
}));

const DAY_MS = 24 * 60 * 60 * 1000;
/** A moment `days` from now, as the ISO time a strike carries */
const inDays = (days: number): string => new Date(Date.now() + days * DAY_MS).toISOString();

const addHeroes = (): void => {
  const users = useUserStore().users as Record<string, any>;
  users.ana = { id: "ana", isAdult: false, name: { nick: "Ana" } };
  users.ben = { id: "ben", isAdult: false, name: { nick: "Ben" } };
  users.cam = { id: "cam", isAdult: true, name: { nick: "Cam" } };
};

const startRaid = (store: ReturnType<typeof usePartyStore>, memberIds = ["ana", "ben"]) =>
  store.startHomeRaid({ beastId: "beast-1", window: "quick", memberIds });

beforeEach(() => {
  setActivePinia(createPinia());
  addHeroes();
  mockSaveState.mockClear();
  mockGetState.mockReset().mockResolvedValue(null);
});

describe("party store: hero settings", () => {
  it("starts kids on ask first and grown-ups open", () => {
    const store = usePartyStore();
    expect(store.modeOf("ana")).toBe("ask");
    expect(store.modeOf("cam")).toBe("open");
  });

  it("keeps a chosen mode and saves it", async () => {
    const store = usePartyStore();
    await store.load();
    store.setMode("ana", "home");
    expect(store.modeOf("ana")).toBe("home");
    expect(mockSaveState).toHaveBeenCalledWith(expect.objectContaining({ heroModes: { ana: "home" } }));
  });

  it("remembers a party a Game Master approved, once, for that hero only", () => {
    const store = usePartyStore();
    store.approveParty("ana", "party-9");
    store.approveParty("ana", "party-9");
    expect(store.isApproved("ana", "party-9")).toBe(true);
    expect(store.isApproved("ben", "party-9")).toBe(false);
    expect(store.approvedParties.ana).toEqual(["party-9"]);
  });

  it("starts with the standard window and saves a change", async () => {
    const store = usePartyStore();
    await store.load();
    expect(store.defaultWindow).toBe("standard");
    store.setDefaultWindow("epic");
    expect(mockSaveState).toHaveBeenLastCalledWith(expect.objectContaining({ defaultWindow: "epic" }));
  });
});

describe("party store: home raids", () => {
  it("starts a raid for the household, sized to its members", async () => {
    const store = usePartyStore();
    await store.load();
    const raid = startRaid(store, ["ana", "ben", "ana"]);
    expect(raid).toMatchObject({ partyId: HOME_PARTY_ID, beastId: "beast-1", window: "quick", memberIds: ["ana", "ben"] });
    expect(raid.maxHp).toBe(raidMaxHp("quick", 2));
    expect(raid.strikes).toEqual([]);
    expect(mockSaveState).toHaveBeenCalled();
  });

  it("answers the raid already running instead of starting a second", () => {
    const store = usePartyStore();
    const first = startRaid(store);
    const second = store.startHomeRaid({ beastId: "beast-2", window: "epic", memberIds: ["ana"] });
    expect(second.id).toBe(first.id);
    expect(store.raids).toHaveLength(1);
  });

  it("counts a member's strike once and ignores a hero who is not in the raid", () => {
    const store = usePartyStore();
    const raid = startRaid(store);
    const at = new Date().toISOString();
    store.strike(raid.id, { key: "k1", heroId: "ana", damage: 30, at });
    store.strike(raid.id, { key: "k1", heroId: "ana", damage: 30, at });
    store.strike(raid.id, { key: "k2", heroId: "cam", damage: 30, at });
    expect(store.raids[0].strikes.map((strike) => strike.key)).toEqual(["k1"]);
  });

  it("ignores a strike for a raid it does not know", () => {
    const store = usePartyStore();
    expect(store.strike("nope", { key: "k1", heroId: "ana", damage: 30, at: new Date().toISOString() })).toBeNull();
    expect(mockSaveState).not.toHaveBeenCalled();
  });

  it("lists a hero's active raids, and not those that ended or are not theirs", () => {
    const store = usePartyStore();
    const raid = startRaid(store, ["ana", "ben"]);
    expect(store.activeRaidsFor("ana").map((active) => active.id)).toEqual([raid.id]);
    expect(store.activeRaidsFor("cam")).toEqual([]);
    expect(store.activeRaidsFor("ana", new Date(Date.now() + 4 * DAY_MS))).toEqual([]);
  });

  it("stops listing a raid once the beast is down", () => {
    const store = usePartyStore();
    const raid = startRaid(store);
    store.strike(raid.id, { key: "k1", heroId: "ana", damage: 60, at: inDays(0) });
    store.strike(raid.id, { key: "k2", heroId: "ben", damage: 60, at: inDays(0) });
    store.strike(raid.id, { key: "k3", heroId: "ana", damage: 60, at: inDays(1) });
    expect(store.activeRaidsFor("ana")).toEqual([]);
  });
});

describe("party store: rewards", () => {
  const felled = (store: ReturnType<typeof usePartyStore>) => {
    const raid = startRaid(store, ["ana", "ben", "cam"]);
    store.strike(raid.id, { key: "k1", heroId: "ana", damage: 60, at: inDays(0) });
    store.strike(raid.id, { key: "k2", heroId: "ben", damage: 60, at: inDays(0) });
    store.strike(raid.id, { key: "k3", heroId: "ana", damage: 60, at: inDays(1) });
    store.strike(raid.id, { key: "k4", heroId: "ben", damage: 60, at: inDays(1) });
    store.strike(raid.id, { key: "k5", heroId: "ana", damage: 60, at: inDays(2) });
    return raid;
  };

  it("pays a striker the base reward once, and a second claim gets nothing", async () => {
    const store = usePartyStore();
    await store.load();
    const raid = felled(store);
    expect(store.claimReward(raid.id, "ana")).toEqual(RAID_BASE_REWARD);
    expect(store.claimReward(raid.id, "ana")).toBeNull();
    expect(store.paid).toEqual([`raid:${raid.id}:ana`]);
    expect(mockSaveState).toHaveBeenLastCalledWith(expect.objectContaining({ paid: [`raid:${raid.id}:ana`] }));
  });

  it("pays a member who never struck nothing", () => {
    const store = usePartyStore();
    const raid = felled(store);
    expect(store.claimReward(raid.id, "cam")).toBeNull();
    expect(store.paid).toEqual([]);
  });

  it("pays nothing for a raid that is unknown or still standing", () => {
    const store = usePartyStore();
    const raid = startRaid(store);
    store.strike(raid.id, { key: "k1", heroId: "ana", damage: 30, at: inDays(0) });
    expect(store.claimReward(raid.id, "ana")).toBeNull();
    expect(store.claimReward("nope", "ana")).toBeNull();
    expect(store.paid).toEqual([]);
  });
});

describe("party store: load", () => {
  it("restores what was saved", async () => {
    mockGetState.mockResolvedValue({
      heroModes: { ana: "home" },
      approvedParties: { ana: ["p1"] },
      raids: [],
      paid: ["raid:r1:ana"],
      defaultWindow: "epic",
    });
    const store = usePartyStore();
    await store.load();
    expect(store.modeOf("ana")).toBe("home");
    expect(store.isApproved("ana", "p1")).toBe(true);
    expect(store.paid).toEqual(["raid:r1:ana"]);
    expect(store.defaultWindow).toBe("epic");
  });

  it("reads the saved record once however often it is asked", async () => {
    const store = usePartyStore();
    await Promise.all([store.load(), store.load()]);
    await store.load();
    expect(mockGetState).toHaveBeenCalledTimes(1);
  });

  it("tries again after a read that failed", async () => {
    mockGetState.mockRejectedValueOnce(new Error("disk")).mockResolvedValue(null);
    const store = usePartyStore();
    await expect(store.load()).rejects.toThrow("disk");
    await expect(store.load()).resolves.toBeUndefined();
    expect(mockGetState).toHaveBeenCalledTimes(2);
  });

  it("keeps the defaults when nothing was saved", async () => {
    const store = usePartyStore();
    await store.load();
    expect(store.defaultWindow).toBe("standard");
    expect(store.raids).toEqual([]);
  });

  it("drops whatever in a saved record is the wrong shape", async () => {
    mockGetState.mockResolvedValue({
      heroModes: "oops",
      approvedParties: [],
      raids: [{ id: 5 }, "nope", null],
      paid: { not: "a list" },
      defaultWindow: "forever",
    });
    const store = usePartyStore();
    await store.load();
    expect(store.raids).toEqual([]);
    expect(store.paid).toEqual([]);
    expect(store.defaultWindow).toBe("standard");
    expect(store.modeOf("ana")).toBe("ask");
  });
});

describe("party store: a change made before the saved record is read", () => {
  const raidOf = (id: string, strikes: unknown[] = []) => ({
    id,
    partyId: "p9",
    beastId: "beast-1",
    window: "quick",
    startedAt: new Date().toISOString(),
    maxHp: 180,
    memberIds: ["fam-1|ana"],
    strikes,
  });
  const queued = (key: string) => ({ raidId: "r1", key, heroId: "ana", damage: 20, day: "2026-10-28", at: new Date().toISOString() });
  const saved = {
    heroModes: { ana: "home" },
    approvedParties: { ana: ["p1"] },
    raids: [raidOf("old")],
    paid: ["raid:r1:ana"],
    defaultWindow: "epic",
    outbox: [queued("saved")],
  };

  it("never saves an empty record over the saved one (the party feed answers before anything reads it)", async () => {
    mockGetState.mockResolvedValue(saved);
    const store = usePartyStore();
    store.setMode("ben", "open");
    await flushPromises();
    expect(mockSaveState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        heroModes: { ana: "home", ben: "open" },
        approvedParties: { ana: ["p1"] },
        paid: ["raid:r1:ana"],
        defaultWindow: "epic",
        outbox: [expect.objectContaining({ key: "saved" })],
      })
    );
    expect(mockSaveState.mock.calls.every(([state]) => state.raids.length === 1)).toBe(true);
  });

  it("keeps what it changed over what was saved once the read lands, and everything else that was saved", async () => {
    mockGetState.mockResolvedValue(saved);
    const store = usePartyStore();
    store.setMode("ana", "open");
    store.setDefaultWindow("quick");
    store.approveParty("ana", "p2");
    await store.load();
    expect(store.modeOf("ana")).toBe("open");
    expect(store.defaultWindow).toBe("quick");
    expect(store.approvedParties.ana).toEqual(["p1", "p2"]);
    expect(store.paid).toEqual(["raid:r1:ana"]);
  });

  it("folds raids and queued strikes by what names them, the one changed here winning", async () => {
    mockGetState.mockResolvedValue({ ...saved, raids: [raidOf("old"), raidOf("same")], outbox: [queued("saved"), queued("both")] });
    const store = usePartyStore();
    store.queueStrike(queued("both"));
    store.queueStrike(queued("fresh"));
    store.applyServer({
      parties: [{ id: "p9", name: "Raiders", emblem: "dragon", inviteRule: "leader", leader: { familyId: "fam-1", heroId: "ana" }, members: [], raid: { id: "same", beastId: "beast-fluffalo", window: "quick", maxHp: 180, memberCount: 1, startedAt: new Date().toISOString(), endsAt: new Date(Date.now() + DAY_MS).toISOString(), hp: 180, status: "active", top: null, last: null, strikes: [] }, seq: 1 }],
      incoming: [],
      outgoing: [],
    });
    await store.load();
    expect(store.raids.map((raid) => raid.id).sort()).toEqual(["old", "same"]);
    expect(store.raids.find((raid) => raid.id === "same")?.beastId).toBe("beast-fluffalo");
    expect(store.outbox.map((item) => item.key).sort()).toEqual(["both", "fresh", "saved"]);
  });

  it("saves at once when the record has been read", async () => {
    const store = usePartyStore();
    await store.load();
    mockSaveState.mockClear();
    store.setMode("ana", "home");
    expect(mockSaveState).toHaveBeenCalledTimes(1);
  });

  it("saves nothing when the record could not be read, so what it could not see is not erased", async () => {
    mockGetState.mockRejectedValue(new Error("disk"));
    const store = usePartyStore();
    store.setMode("ana", "home");
    await flushPromises();
    expect(mockSaveState).not.toHaveBeenCalled();
  });
});
