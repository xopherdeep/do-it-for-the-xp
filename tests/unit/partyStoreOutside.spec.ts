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

  it("saves none of it to the device", () => {
    const store = usePartyStore();
    store.applyServer({ parties: [party("p1")], incoming: [request("q1")], outgoing: [] });
    store.appendEvents("p1", [event(1)]);
    store.clearServer();
    expect(mockSaveState).not.toHaveBeenCalled();
  });
});
