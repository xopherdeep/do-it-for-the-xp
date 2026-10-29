import { reactive } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { usePartyFeed } from "@/hooks/usePartyFeed";
import { usePartyStore } from "@/lib/store/stores/party";
import { TownHallError } from "@/lib/services/townhall/townHallClient";
import type { WireParty } from "@/lib/services/party/partyWire";

/**
 * The poll that keeps the outside parties fresh: ask the site who the family's parties are, and read a party's feed
 * after the last event held. A family without XP Pro, or an account that is not linked, asks nothing at all.
 */

const mockTownHall = reactive({ isLinked: true, auth: { kind: "basic", userLogin: "mom", appPassword: "x" } as unknown });
jest.mock("@/lib/store/stores/townHall", () => ({ __esModule: true, useTownHallStore: () => mockTownHall }));

const mockPro = reactive({ isPro: true });
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));

jest.mock("@/lib/databases/PartyDb", () => ({
  __esModule: true,
  getPartyDb: () => ({ getState: async () => null, saveState: async () => undefined }),
}));

const mockMyParties = jest.fn();
const mockReadFeed = jest.fn();
jest.mock("@/lib/services/party/partyClient", () => {
  const actual = jest.requireActual("@/lib/services/party/partyClient");
  return {
    ...actual,
    myParties: (...args: unknown[]) => mockMyParties(...args),
    readFeed: (...args: unknown[]) => mockReadFeed(...args),
  };
});

const party = (id: string, seq = 1): WireParty => ({
  id,
  name: `Party ${id}`,
  emblem: "dragon",
  inviteRule: "leader",
  leader: { familyId: "f1", heroId: "ana" },
  members: [],
  raid: null,
  seq,
});

const ANSWER = { parties: [party("p1")], incoming: [], outgoing: [] };
const event = (seq: number) => ({ seq, kind: "strike", familyId: "f1", heroId: "ana", data: {}, at: "2026-10-28T08:00:00Z" });
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  setActivePinia(createPinia());
  mockTownHall.isLinked = true;
  mockPro.isPro = true;
  mockMyParties.mockReset().mockResolvedValue(ANSWER);
  mockReadFeed.mockReset();
});

describe("usePartyFeed: refresh", () => {
  it("asks the site for the family's parties and hands them to the store", async () => {
    const feed = usePartyFeed();
    await feed.refresh();
    expect(mockMyParties).toHaveBeenCalledWith(mockTownHall.auth);
    expect(usePartyStore().outside.map((p) => p.id)).toEqual(["p1"]);
    expect(feed.problem.value).toBeNull();
  });

  it("asks nothing of a family without XP Pro, and forgets what it knew", async () => {
    const store = usePartyStore();
    store.applyServer(ANSWER);
    mockPro.isPro = false;
    const feed = usePartyFeed();
    await feed.refresh();
    expect(mockMyParties).not.toHaveBeenCalled();
    expect(store.outside).toEqual([]);
    expect(feed.problem.value).toBe("pro-required");
  });

  it("asks nothing while no account is linked", async () => {
    mockTownHall.isLinked = false;
    const feed = usePartyFeed();
    await feed.refresh();
    expect(mockMyParties).not.toHaveBeenCalled();
    expect(feed.problem.value).toBe("unlinked");
  });

  it("keeps what it knew when the site cannot be reached, and says why", async () => {
    const store = usePartyStore();
    const feed = usePartyFeed();
    await feed.refresh();
    mockMyParties.mockRejectedValue(new TownHallError("offline", "no network"));
    await feed.refresh();
    expect(feed.problem.value).toBe("offline");
    expect(store.outside.map((p) => p.id)).toEqual(["p1"]);
    mockMyParties.mockRejectedValue(new TownHallError("server", "busy", 503, "xp_party_busy"));
    await feed.refresh();
    expect(feed.problem.value).toBe("busy");
  });

  it("does not ask twice while an answer is on its way", async () => {
    let finish: (value: unknown) => void = () => undefined;
    mockMyParties.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const feed = usePartyFeed();
    const first = feed.refresh();
    const second = feed.refresh();
    finish(ANSWER);
    await Promise.all([first, second]);
    expect(mockMyParties).toHaveBeenCalledTimes(1);
    await feed.refresh();
    expect(mockMyParties).toHaveBeenCalledTimes(2);
  });
});

describe("usePartyFeed: one party", () => {
  it("reads a party's feed after the last event it holds, and keeps the party and the events", async () => {
    const store = usePartyStore();
    store.applyServer(ANSWER);
    store.appendEvents("p1", [event(1), event(2)]);
    mockReadFeed.mockResolvedValue({ party: party("p1", 4), events: [event(3), event(4)], seq: 4 });
    const feed = usePartyFeed();
    await feed.refreshParty("p1");
    expect(mockReadFeed).toHaveBeenCalledWith(mockTownHall.auth, "p1", 2);
    expect(store.eventsOf("p1").map((e) => e.seq)).toEqual([1, 2, 3, 4]);
    expect(store.outsideParty("p1")?.seq).toBe(4);
  });

  it("says why when a party cannot be read, and changes nothing", async () => {
    const store = usePartyStore();
    store.applyServer(ANSWER);
    mockReadFeed.mockRejectedValue(new TownHallError("server", "gone", 404, "xp_party_not_found"));
    const feed = usePartyFeed();
    await feed.refreshParty("p1");
    expect(feed.problem.value).toBe("gone");
    expect(store.outside.map((p) => p.id)).toEqual(["p1"]);
  });

  it("reads no feed for a family without XP Pro", async () => {
    mockPro.isPro = false;
    const feed = usePartyFeed();
    await feed.refreshParty("p1");
    expect(mockReadFeed).not.toHaveBeenCalled();
  });
});

describe("usePartyFeed: start", () => {
  afterEach(() => jest.useRealTimers());

  it("refreshes now and on every beat until stopped", async () => {
    jest.useFakeTimers();
    const stop = usePartyFeed().start(1000);
    await flush();
    expect(mockMyParties).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    await flush();
    expect(mockMyParties).toHaveBeenCalledTimes(2);
    stop();
    jest.advanceTimersByTime(5000);
    await flush();
    expect(mockMyParties).toHaveBeenCalledTimes(2);
  });
});
