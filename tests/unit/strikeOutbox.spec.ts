import { reactive } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { flushOutbox, settleStrikes } from "@/lib/services/party/strikeOutbox";
import { usePartyStore } from "@/lib/store/stores/party";
import { TownHallError } from "@/lib/services/townhall/townHallClient";
import type { QueuedStrike } from "@/lib/services/party/partyState";

/**
 * Strikes for raids with other families wait in an outbox until the site takes them: kept across a bad connection,
 * dropped when the site will never take them, and sent once however often they are sent again.
 */

const AUTH = { kind: "basic", userLogin: "mom", appPassword: "x" };
const mockTownHall = reactive({ isLinked: true, auth: AUTH as unknown });
jest.mock("@/lib/store/stores/townHall", () => ({ __esModule: true, useTownHallStore: () => mockTownHall }));
const mockPro = reactive({ isPro: true, familyId: "fam-1" });
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));
jest.mock("@/lib/databases/PartyDb", () => ({
  __esModule: true,
  getPartyDb: () => ({ getState: async () => null, saveState: async () => undefined }),
}));

const mockSendStrike = jest.fn();
const mockMyParties = jest.fn();
jest.mock("@/lib/services/party/partyClient", () => {
  const actual = jest.requireActual("@/lib/services/party/partyClient");
  return {
    ...actual,
    sendStrike: (...args: unknown[]) => mockSendStrike(...args),
    myParties: (...args: unknown[]) => mockMyParties(...args),
  };
});

const item = (key: string): QueuedStrike => ({ raidId: "r1", key, heroId: "ana", damage: 30, day: "2026-10-28", at: "2026-10-28T09:00:00.000Z" });
const fail = (code: ConstructorParameters<typeof TownHallError>[0], status?: number, siteCode?: string) => new TownHallError(code, "x", status, siteCode);

beforeEach(() => {
  setActivePinia(createPinia());
  mockTownHall.isLinked = true;
  mockPro.isPro = true;
  mockSendStrike.mockReset().mockResolvedValue({ accepted: true, damage: 30, reason: "", raid: {} });
  mockMyParties.mockReset().mockResolvedValue({ parties: [], incoming: [], outgoing: [] });
});

describe("settleStrikes", () => {
  it("sends the queue in order and leaves nothing when the site takes it all", async () => {
    const sent: string[] = [];
    const result = await settleStrikes([item("k1"), item("k2")], async (queued) => void sent.push(queued.key));
    expect(sent).toEqual(["k1", "k2"]);
    expect(result).toEqual({ left: [], sent: 2 });
  });

  it("counts a strike the site answered as not counted (a resend, a closed raid) as done", async () => {
    mockSendStrike.mockResolvedValue({ accepted: false, damage: 0, reason: "duplicate", raid: {} });
    const result = await settleStrikes([item("k1")], async () => undefined);
    expect(result.left).toEqual([]);
  });

  it("drops a strike the site will never take, and goes on with the rest", async () => {
    const send = jest
      .fn()
      .mockRejectedValueOnce(fail("server", 404, "xp_party_raid_not_found"))
      .mockRejectedValueOnce(fail("server", 409, "xp_party_strike_stale"))
      .mockRejectedValueOnce(fail("forbidden", 403, "xp_party_not_member"))
      .mockResolvedValueOnce(undefined);
    const result = await settleStrikes([item("k1"), item("k2"), item("k3"), item("k4")], send);
    expect(result).toEqual({ left: [], sent: 1 });
    expect(send).toHaveBeenCalledTimes(4);
  });

  it("keeps a strike when the site cannot be reached, and sends nothing after it", async () => {
    const send = jest.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(fail("offline")).mockResolvedValue(undefined);
    const result = await settleStrikes([item("k1"), item("k2"), item("k3")], send);
    expect(result.left.map((queued) => queued.key)).toEqual(["k2", "k3"]);
    expect(result.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("keeps a strike when the site is busy or has trouble", async () => {
    for (const trouble of [fail("server", 503, "xp_party_busy"), fail("server", 500)]) {
      const result = await settleStrikes([item("k1")], async () => Promise.reject(trouble));
      expect(result.left).toHaveLength(1);
    }
  });
});

describe("flushOutbox", () => {
  it("sends the queued strikes with the parent's auth, empties the queue and refreshes the parties", async () => {
    const store = usePartyStore();
    store.queueStrike(item("k1"));
    store.queueStrike(item("k2"));
    await flushOutbox();
    expect(mockSendStrike).toHaveBeenCalledTimes(2);
    expect(mockSendStrike).toHaveBeenCalledWith(mockTownHall.auth, "r1", { key: "k1", heroId: "ana", damage: 30, day: "2026-10-28", at: "2026-10-28T09:00:00.000Z" });
    expect(store.outbox).toEqual([]);
    expect(mockMyParties).toHaveBeenCalledTimes(1);
  });

  it("sends nothing for a family without XP Pro or an account that is not linked, and keeps the queue", async () => {
    const store = usePartyStore();
    store.queueStrike(item("k1"));
    mockPro.isPro = false;
    await flushOutbox();
    mockPro.isPro = true;
    mockTownHall.isLinked = false;
    await flushOutbox();
    expect(mockSendStrike).not.toHaveBeenCalled();
    expect(store.outbox).toHaveLength(1);
  });

  it("keeps what could not be sent and does not refresh when nothing went", async () => {
    const store = usePartyStore();
    store.queueStrike(item("k1"));
    mockSendStrike.mockRejectedValue(fail("offline"));
    await flushOutbox();
    expect(store.outbox).toHaveLength(1);
    expect(mockMyParties).not.toHaveBeenCalled();
  });

  it("does nothing for an empty queue", async () => {
    await flushOutbox();
    expect(mockSendStrike).not.toHaveBeenCalled();
    expect(mockMyParties).not.toHaveBeenCalled();
  });

  it("does not start a second flush while one is under way", async () => {
    const store = usePartyStore();
    store.queueStrike(item("k1"));
    let finish: (value: unknown) => void = () => undefined;
    mockSendStrike.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const first = flushOutbox();
    const second = flushOutbox();
    finish({ accepted: true, damage: 30, reason: "", raid: {} });
    await Promise.all([first, second]);
    expect(mockSendStrike).toHaveBeenCalledTimes(1);
  });

  it("sends a strike queued while another was on its way, and loses neither", async () => {
    const store = usePartyStore();
    store.queueStrike(item("k1"));
    let finish: (value: unknown) => void = () => undefined;
    mockSendStrike.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const first = flushOutbox();
    store.queueStrike(item("k2"));
    await flushOutbox(); // refused: one flush at a time, so the first must carry k2 as well
    finish({ accepted: true, damage: 30, reason: "", raid: {} });
    await first;
    expect(mockSendStrike.mock.calls.map(([, , sent]) => sent.key)).toEqual(["k1", "k2"]);
    expect(store.outbox).toEqual([]);
  });

  it("keeps a strike queued while another was on its way when the connection drops after that one", async () => {
    const store = usePartyStore();
    store.queueStrike(item("k1"));
    let finish: (value: unknown) => void = () => undefined;
    mockSendStrike.mockReturnValueOnce(new Promise((resolve) => (finish = resolve))).mockRejectedValue(fail("offline"));
    const first = flushOutbox();
    store.queueStrike(item("k2"));
    finish({ accepted: true, damage: 30, reason: "", raid: {} });
    await first;
    expect(store.outbox.map((queued) => queued.key)).toEqual(["k2"]);
  });
});
