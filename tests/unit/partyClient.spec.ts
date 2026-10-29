import { TownHallError, type TownHallAuth } from "@/lib/services/townhall/townHallClient";
import type { PartyHeroCard } from "@/lib/services/party/partyRules";
import {
  blockCode,
  formParty,
  joinByCode,
  leaveParty,
  myParties,
  partyProblem,
  readFeed,
  resolveRequest,
  rotateCode,
  sendPreset,
  sendStrike,
  startPartyRaid,
  withdrawStrike,
} from "@/lib/services/party/partyClient";

/**
 * The calls to the party routes (`xp-party/v1` in the xophz-compass-xp plugin), through townHallFetch. The site speaks
 * camelCase in its answers and snake_case in what it reads, so this file is the one place that converts.
 */

const mockFetch = jest.fn();
jest.mock("@/lib/services/townhall/townHallClient", () => {
  const actual = jest.requireActual("@/lib/services/townhall/townHallClient");
  return { ...actual, townHallFetch: (...args: unknown[]) => mockFetch(...args) };
});

const AUTH: TownHallAuth = { kind: "basic", userLogin: "mom", appPassword: "x" };
const CARD: PartyHeroCard = { heroId: "ana", nickname: "Ana", level: 4, jobClass: "knight", look: null };

const WIRE_RAID = {
  id: "r1",
  beastId: "beast-fluffalo",
  window: "quick",
  maxHp: 180,
  memberCount: 2,
  startedAt: "2026-10-28T08:00:00Z",
  endsAt: "2026-10-31T08:00:00Z",
  hp: 150,
  status: "active",
  top: { familyId: "f2", heroId: "ben" },
  last: null,
  strikes: [{ key: "k1", familyId: "f2", heroId: "ben", damage: 30, day: "2026-10-28", at: "2026-10-28T09:00:00Z" }],
};

const WIRE_PARTY = {
  id: "p1",
  name: "Raiders",
  emblem: "dragon",
  inviteRule: "leader",
  leader: { familyId: "f1", heroId: "ana" },
  members: [{ familyId: "f1", heroId: "ana", card: CARD, role: "leader", joinedAt: "2026-10-28T08:00:00Z" }],
  raid: WIRE_RAID,
  seq: 3,
  code: "ABCD2345",
};

beforeEach(() => mockFetch.mockReset());

describe("partyClient: forming and joining", () => {
  it("forms a party, sending the rule and the leader card the way the site reads them", async () => {
    mockFetch.mockResolvedValue({ data: { party: WIRE_PARTY, code: "ABCD2345" } });
    const made = await formParty(AUTH, { name: "Raiders", emblem: "dragon", inviteRule: "members", leader: CARD });
    expect(mockFetch).toHaveBeenCalledWith("xp-party/v1/parties", {
      auth: AUTH,
      method: "POST",
      body: { name: "Raiders", emblem: "dragon", invite_rule: "members", leader: CARD },
    });
    expect(made.code).toBe("ABCD2345");
    expect(made.party).toMatchObject({ id: "p1", name: "Raiders", seq: 3, code: "ABCD2345" });
    expect(made.party.raid).toMatchObject({ id: "r1", hp: 150, status: "active", top: { familyId: "f2", heroId: "ben" }, last: null });
  });

  it("asks to join by the code as typed and answers the open request", async () => {
    const request = { id: "q1", partyId: "p1", partyName: "Raiders", familyId: "f2", heroId: "ben", card: CARD, createdAt: "2026-10-28T08:00:00Z" };
    mockFetch.mockResolvedValue({ data: { request } });
    await expect(joinByCode(AUTH, "abcd-2345", CARD)).resolves.toEqual(request);
    expect(mockFetch).toHaveBeenCalledWith("xp-party/v1/parties/join", { auth: AUTH, method: "POST", body: { code: "abcd-2345", card: CARD } });
  });

  it("settles a request", async () => {
    mockFetch.mockResolvedValue({ data: { request: { id: "q1", resolution: "accepted" } } });
    await resolveRequest(AUTH, "p1", "q1", "approve");
    expect(mockFetch).toHaveBeenCalledWith("xp-party/v1/parties/p1/requests/q1", { auth: AUTH, method: "POST", body: { decision: "approve" } });
  });
});

describe("partyClient: leaving, the code and blocking", () => {
  it("leaves by family and hero, escaping both", async () => {
    mockFetch.mockResolvedValue({ data: { left: true, disbanded: false } });
    await expect(leaveParty(AUTH, "p1", "f 2", "be/n")).resolves.toEqual({ disbanded: false });
    expect(mockFetch).toHaveBeenCalledWith("xp-party/v1/parties/p1/members/f%202/be%2Fn", { auth: AUTH, method: "DELETE" });
  });

  it("rotates the code and answers the new one", async () => {
    mockFetch.mockResolvedValue({ data: { code: "WXYZ6789" } });
    await expect(rotateCode(AUTH, "p1")).resolves.toBe("WXYZ6789");
    expect(mockFetch).toHaveBeenCalledWith("xp-party/v1/parties/p1/code/rotate", { auth: AUTH, method: "POST" });
  });

  it("blocks a party by its code", async () => {
    mockFetch.mockResolvedValue({ data: { partyId: "p1" } });
    await blockCode(AUTH, "ABCD2345");
    expect(mockFetch).toHaveBeenCalledWith("xp-party/v1/codes/ABCD2345/block", { auth: AUTH, method: "POST" });
  });
});

describe("partyClient: reading", () => {
  it("reads the parties of the family and its open requests", async () => {
    mockFetch.mockResolvedValue({ data: { parties: [WIRE_PARTY], requests: { incoming: [{ id: "q1", partyId: "p1", partyName: "Raiders", familyId: "f2", heroId: "ben", card: CARD, createdAt: "t" }], outgoing: [] } } });
    const mine = await myParties(AUTH);
    expect(mockFetch).toHaveBeenCalledWith("xp-party/v1/parties/mine", { auth: AUTH });
    expect(mine.parties).toHaveLength(1);
    expect(mine.incoming.map((request) => request.id)).toEqual(["q1"]);
    expect(mine.outgoing).toEqual([]);
  });

  it("reads one party's feed after a number", async () => {
    mockFetch.mockResolvedValue({
      data: { party: WIRE_PARTY, seq: 5, events: [{ seq: 4, kind: "strike", familyId: "f2", heroId: "ben", data: { key: "k1", damage: 30 }, at: "2026-10-28T09:00:00Z" }] },
    });
    const feed = await readFeed(AUTH, "p1", 3, 50);
    expect(mockFetch).toHaveBeenCalledWith("xp-party/v1/parties/p1/feed", { auth: AUTH, query: { since: 3, limit: 50 } });
    expect(feed.seq).toBe(5);
    expect(feed.events).toEqual([{ seq: 4, kind: "strike", familyId: "f2", heroId: "ben", data: { key: "k1", damage: 30 }, at: "2026-10-28T09:00:00Z" }]);
  });

  it("makes sense of an answer with pieces missing or the wrong shape", async () => {
    mockFetch.mockResolvedValue({ data: { parties: "oops", requests: null } });
    await expect(myParties(AUTH)).resolves.toEqual({ parties: [], incoming: [], outgoing: [] });
    mockFetch.mockResolvedValue({ data: { party: { id: "p1" }, events: [null, { seq: "x" }], seq: "nine" } });
    const feed = await readFeed(AUTH, "p1", 0);
    expect(feed.events).toEqual([]);
    expect(feed.seq).toBe(0);
    expect(feed.party).toMatchObject({ id: "p1", name: "", members: [], raid: null });
  });
});

describe("partyClient: raids and words", () => {
  it("starts a raid on a library beast", async () => {
    mockFetch.mockResolvedValue({ data: { raid: WIRE_RAID } });
    const raid = await startPartyRaid(AUTH, "p1", "beast-fluffalo", "quick");
    expect(mockFetch).toHaveBeenCalledWith("xp-party/v1/parties/p1/raids", { auth: AUTH, method: "POST", body: { beast_id: "beast-fluffalo", window: "quick" } });
    expect(raid.maxHp).toBe(180);
  });

  it("sends a strike with the hero and the day, and answers whether it counted", async () => {
    mockFetch.mockResolvedValue({ data: { accepted: true, damage: 30, reason: "", raid: WIRE_RAID } });
    const verdict = await sendStrike(AUTH, "r1", { key: "completion:e1", heroId: "ben", damage: 30, day: "2026-10-28", at: "2026-10-28T09:00:00.000Z" });
    expect(mockFetch).toHaveBeenCalledWith("xp-party/v1/raids/r1/strikes", {
      auth: AUTH,
      method: "POST",
      body: { key: "completion:e1", hero_id: "ben", damage: 30, day: "2026-10-28", at: "2026-10-28T09:00:00.000Z" },
    });
    expect(verdict).toMatchObject({ accepted: true, damage: 30, reason: "" });
    expect(verdict.raid.hp).toBe(150);
  });

  it("takes a strike back by its key, escaping it", async () => {
    mockFetch.mockResolvedValue({ data: { removed: true } });
    await withdrawStrike(AUTH, "r1", "completion:e1");
    expect(mockFetch).toHaveBeenCalledWith("xp-party/v1/raids/r1/strikes/completion%3Ae1", { auth: AUTH, method: "DELETE" });
  });

  it("sends a preset word to the party or to one member", async () => {
    mockFetch.mockResolvedValue({ data: { seq: 7 } });
    await sendPreset(AUTH, "p1", "ben", "gg");
    expect(mockFetch).toHaveBeenLastCalledWith("xp-party/v1/parties/p1/presets", { auth: AUTH, method: "POST", body: { hero_id: "ben", preset: "gg" } });
    await sendPreset(AUTH, "p1", "ben", "cheer", { familyId: "f1", heroId: "ana" });
    expect(mockFetch).toHaveBeenLastCalledWith("xp-party/v1/parties/p1/presets", {
      auth: AUTH,
      method: "POST",
      body: { hero_id: "ben", preset: "cheer", to_family: "f1", to_hero: "ana" },
    });
  });

  it("lets a failure through for the caller to read", async () => {
    mockFetch.mockRejectedValue(new TownHallError("forbidden", "no", 403, "xp_party_forbidden"));
    await expect(rotateCode(AUTH, "p1")).rejects.toBeInstanceOf(TownHallError);
  });
});

describe("partyProblem", () => {
  const fail = (code: ConstructorParameters<typeof TownHallError>[0], status?: number, siteCode?: string) => new TownHallError(code, "x", status, siteCode);

  it("names what the site refused", () => {
    expect(partyProblem(fail("forbidden", 403, "xp_party_pro_required"))).toBe("pro-required");
    expect(partyProblem(fail("server", 404, "xp_party_code_unknown"))).toBe("code-unknown");
    expect(partyProblem(fail("forbidden", 403, "xp_party_blocked"))).toBe("blocked");
    expect(partyProblem(fail("server", 409, "xp_party_already_member"))).toBe("already-member");
    expect(partyProblem(fail("server", 409, "xp_party_request_pending"))).toBe("request-pending");
    expect(partyProblem(fail("forbidden", 403, "xp_party_not_member"))).toBe("not-member");
    expect(partyProblem(fail("forbidden", 403, "xp_party_forbidden"))).toBe("forbidden");
    expect(partyProblem(fail("server", 409, "xp_party_raid_running"))).toBe("raid-running");
    expect(partyProblem(fail("server", 409, "xp_party_too_small"))).toBe("too-small");
    expect(partyProblem(fail("server", 409, "xp_party_strike_stale"))).toBe("stale");
    expect(partyProblem(fail("server", 404, "xp_party_not_found"))).toBe("gone");
    expect(partyProblem(fail("server", 404, "xp_party_raid_not_found"))).toBe("gone");
    expect(partyProblem(fail("server", 503, "xp_party_busy"))).toBe("busy");
  });

  it("falls back to what the status says, and to the family routes' problems", () => {
    expect(partyProblem(fail("offline"))).toBe("offline");
    expect(partyProblem(fail("unauthorized", 401))).toBe("unlinked");
    expect(partyProblem(fail("invalid", 400))).toBe("invalid");
    expect(partyProblem(fail("server", 500))).toBe("server");
    expect(partyProblem(fail("server", 403, "xp_family_not_member"))).toBe("not-member");
    expect(partyProblem(new Error("boom"))).toBe("server");
  });
});
