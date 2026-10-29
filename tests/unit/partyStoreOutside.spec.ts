import { createPinia, setActivePinia } from "pinia";
import { usePartyStore } from "@/lib/store/stores/party";
import type { WireEvent, WireParty, WireRequest } from "@/lib/services/party/partyWire";

/**
 * Parties with other families are the site's to keep: the store only holds what the site last said, so the screens can
 * draw it (and keep drawing it while the phone is offline). None of it is saved to the device.
 */

const mockSaveState = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/databases/PartyDb", () => ({
  __esModule: true,
  getPartyDb: () => ({ getState: async () => null, saveState: (...args: unknown[]) => mockSaveState(...args) }),
}));

const party = (id: string, over: Partial<WireParty> = {}): WireParty => ({
  id,
  name: `Party ${id}`,
  emblem: "dragon",
  inviteRule: "leader",
  leader: { familyId: "f1", heroId: "ana" },
  members: [],
  raid: null,
  seq: 1,
  ...over,
});

const request = (id: string): WireRequest => ({
  id,
  partyId: "p1",
  partyName: "Raiders",
  familyId: "f2",
  heroId: "ben",
  card: { heroId: "ben", nickname: "Ben", level: 3, jobClass: "knight", look: null },
  createdAt: "2026-10-28T08:00:00Z",
});

const event = (seq: number, kind = "strike"): WireEvent => ({ seq, kind, familyId: "f1", heroId: "ana", data: {}, at: "2026-10-28T08:00:00Z" });

beforeEach(() => {
  setActivePinia(createPinia());
  mockSaveState.mockClear();
});

describe("party store: outside parties", () => {
  it("holds the parties and requests the site last named, and replaces them whole next time", () => {
    const store = usePartyStore();
    store.applyServer({ parties: [party("p1"), party("p2")], incoming: [request("q1")], outgoing: [] });
    expect(store.outside.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(store.incoming.map((r) => r.id)).toEqual(["q1"]);
    store.applyServer({ parties: [party("p2")], incoming: [], outgoing: [request("q2")] });
    expect(store.outside.map((p) => p.id)).toEqual(["p2"]);
    expect(store.incoming).toEqual([]);
    expect(store.outgoing.map((r) => r.id)).toEqual(["q2"]);
  });

  it("finds one party by id", () => {
    const store = usePartyStore();
    store.applyServer({ parties: [party("p1"), party("p2", { name: "Second" })], incoming: [], outgoing: [] });
    expect(store.outsideParty("p2")?.name).toBe("Second");
    expect(store.outsideParty("nope")).toBeUndefined();
  });

  it("swaps in a fresher copy of one party and leaves the others, and does not invent a party it never heard of", () => {
    const store = usePartyStore();
    store.applyServer({ parties: [party("p1"), party("p2")], incoming: [], outgoing: [] });
    store.replaceOutside(party("p2", { name: "Fresher", seq: 9 }));
    store.replaceOutside(party("p9"));
    expect(store.outside.map((p) => [p.id, p.name, p.seq])).toEqual([
      ["p1", "Party p1", 1],
      ["p2", "Fresher", 9],
    ]);
  });

  it("forgets all of it, which is what a family without XP Pro sees", () => {
    const store = usePartyStore();
    store.applyServer({ parties: [party("p1")], incoming: [request("q1")], outgoing: [request("q2")] });
    store.appendEvents("p1", [event(1)]);
    store.clearServer();
    expect(store.outside).toEqual([]);
    expect(store.incoming).toEqual([]);
    expect(store.outgoing).toEqual([]);
    expect(store.eventsOf("p1")).toEqual([]);
  });

  it("keeps a party's events in order, each once, and only the newest fifty", () => {
    const store = usePartyStore();
    store.appendEvents("p1", [event(2), event(1)]);
    store.appendEvents("p1", [event(2), event(3)]);
    expect(store.eventsOf("p1").map((e) => e.seq)).toEqual([1, 2, 3]);
    store.appendEvents("p1", Array.from({ length: 60 }, (_, i) => event(10 + i)));
    const seqs = store.eventsOf("p1").map((e) => e.seq);
    expect(seqs).toHaveLength(50);
    expect(seqs[0]).toBe(20);
    expect(seqs[49]).toBe(69);
  });

  it("answers the newest event number it holds, or 0", () => {
    const store = usePartyStore();
    expect(store.lastSeq("p1")).toBe(0);
    store.appendEvents("p1", [event(4), event(7)]);
    expect(store.lastSeq("p1")).toBe(7);
  });

  describe("the raids of those parties", () => {
    const withRaid = (id: string, raidId: string, hp = 150): WireParty =>
      party(id, {
        members: [{ familyId: "f1", heroId: "ana", card: { heroId: "ana", nickname: "Ana", level: 3, jobClass: "knight", look: null }, role: "leader", joinedAt: "" }],
        raid: {
          id: raidId,
          beastId: "beast-fluffalo",
          window: "quick",
          maxHp: 180,
          memberCount: 2,
          startedAt: "2026-10-28T08:00:00Z",
          endsAt: "2026-10-31T08:00:00Z",
          hp,
          status: "active",
          top: null,
          last: null,
          strikes: [{ key: "k1", familyId: "f1", heroId: "ana", damage: 180 - hp, day: "2026-10-28", at: "2026-10-28T09:00:00Z" }],
        },
      });

    it("keeps a copy of each party's raid with the household's own, and saves that copy to the device", () => {
      const store = usePartyStore();
      store.applyServer({ parties: [withRaid("p1", "r1")], incoming: [], outgoing: [] });
      expect(store.raidsOf("p1").map((raid) => [raid.id, raid.memberIds, raid.strikes[0].heroId])).toEqual([["r1", ["f1|ana"], "f1|ana"]]);
      expect(mockSaveState).toHaveBeenCalledWith(expect.objectContaining({ raids: [expect.objectContaining({ id: "r1" })] }));
    });

    it("replaces a copy with the site's fresher one, and keeps an older raid that is no longer the party's newest", () => {
      const store = usePartyStore();
      store.applyServer({ parties: [withRaid("p1", "r1", 150)], incoming: [], outgoing: [] });
      store.applyServer({ parties: [withRaid("p1", "r1", 90)], incoming: [], outgoing: [] });
      expect(store.raidsOf("p1")[0].strikes[0].damage).toBe(90);
      store.applyServer({ parties: [withRaid("p1", "r2", 150)], incoming: [], outgoing: [] });
      expect(store.raidsOf("p1").map((raid) => raid.id).sort()).toEqual(["r1", "r2"]);
    });

    it("drops the copies of a party the family is no longer in, and never touches the household's raids", () => {
      const store = usePartyStore();
      store.startHomeRaid({ beastId: "b1", window: "quick", memberIds: ["ana", "ben"] });
      store.applyServer({ parties: [withRaid("p1", "r1")], incoming: [], outgoing: [] });
      store.applyServer({ parties: [], incoming: [], outgoing: [] });
      expect(store.raids.map((raid) => raid.partyId)).toEqual(["home"]);
    });
  });

  describe("the strike outbox", () => {
    const item = (key: string, raidId = "r1") => ({ raidId, key, heroId: "ana", damage: 30, day: "2026-10-28", at: "2026-10-28T09:00:00.000Z" });

    it("queues a strike once however often it is queued, and saves the queue", () => {
      const store = usePartyStore();
      store.queueStrike(item("k1"));
      store.queueStrike(item("k1"));
      store.queueStrike(item("k1", "r2"));
      expect(store.outbox.map((queued) => [queued.raidId, queued.key])).toEqual([["r1", "k1"], ["r2", "k1"]]);
      expect(mockSaveState).toHaveBeenLastCalledWith(expect.objectContaining({ outbox: expect.any(Array) }));
    });

    it("takes the queue the sender leaves, and saves it", () => {
      const store = usePartyStore();
      store.queueStrike(item("k1"));
      store.queueStrike(item("k2"));
      store.setOutbox([item("k2")]);
      expect(store.outbox.map((queued) => queued.key)).toEqual(["k2"]);
    });
  });

  it("saves none of the party list, requests or events to the device", () => {
    const store = usePartyStore();
    store.applyServer({ parties: [party("p1")], incoming: [request("q1")], outgoing: [] });
    store.appendEvents("p1", [event(1)]);
    store.clearServer();
    expect(mockSaveState).not.toHaveBeenCalled();
  });
});
