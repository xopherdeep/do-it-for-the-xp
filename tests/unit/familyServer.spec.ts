import { DEFAULT_LOOK } from "@/lib/hero-look/types";
import { TownHallError, townHallFetch, type TownHallAuth } from "@/lib/services/townhall/townHallClient";
import {
  bindFamily,
  claimDevice,
  fetchEvents,
  familyProblem,
  getFamily,
  listPhones,
  makeLinkCode,
  moveHome,
  removeHero,
  removePhone,
  retryAfterMs,
  saveHero,
  sendEvents,
} from "@/lib/services/multiplayer/familyServer";

jest.mock("@/lib/services/townhall/townHallClient", () => ({
  ...jest.requireActual("@/lib/services/townhall/townHallClient"),
  townHallFetch: jest.fn(),
}));

const fetchMock = townHallFetch as jest.Mock;
const parent: TownHallAuth = { kind: "basic", userLogin: "famparent", appPassword: "abcd efgh" };
const hero: TownHallAuth = { kind: "hero", key: "xph_k" };
const answer = (data: unknown) => fetchMock.mockResolvedValueOnce({ data, headers: { get: () => null } });

beforeEach(() => fetchMock.mockReset());

describe("the family calls", () => {
  it("bindFamily posts the ids and returns the answer", async () => {
    answer({ answer: "created", family_id: "F1" });
    await expect(bindFamily(parent, "F1", "D1")).resolves.toBe("created");
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/family", { auth: parent, method: "POST", body: { family_id: "F1", device_id: "D1" } });
  });

  it("moveHome posts to /family/move", async () => {
    answer({ ok: true });
    await expect(moveHome(parent, "F1", "D2")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/family/move", { auth: parent, method: "POST", body: { family_id: "F1", device_id: "D2" } });
  });

  it("getFamily maps the heroes and their cards", async () => {
    answer({
      family_id: "F1",
      heroes: [
        { hero_id: "h-1", nickname: "Mia", age_group: "child", card: { nickname: "Mia", look: DEFAULT_LOOK, jobClass: "warrior", level: 4, updated_at: "2026-10-13T12:00:00.000Z" } },
        { hero_id: "h-2", nickname: "Bo", card: null },
      ],
    });
    const family = await getFamily(parent);
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/family", { auth: parent });
    expect(family.familyId).toBe("F1");
    expect(family.heroes[0]).toEqual({
      heroId: "h-1",
      nickname: "Mia",
      ageGroup: "child",
      card: { heroId: "h-1", nickname: "Mia", look: DEFAULT_LOOK, jobClass: "warrior", level: 4, updatedAt: "2026-10-13T12:00:00.000Z" },
    });
    expect(family.heroes[1]).toEqual({ heroId: "h-2", nickname: "Bo", ageGroup: undefined, card: null });
  });

  it("getFamily with a hero key reads the same route", async () => {
    answer({ family_id: "F1", heroes: [] });
    await getFamily(hero);
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/family", { auth: hero });
  });

  it("saveHero posts the nickname and the age group", async () => {
    answer({ ok: true });
    await saveHero(parent, "h-1", "Mia", "child");
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/heroes/h-1", { auth: parent, method: "POST", body: { nickname: "Mia", age_group: "child" } });
  });

  it("removeHero deletes the hero", async () => {
    answer({ ok: true });
    await removeHero(parent, "h-1");
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/heroes/h-1", { auth: parent, method: "DELETE" });
  });

  it("escapes a hero id in the path", async () => {
    answer({ ok: true });
    await removeHero(parent, "a b/c");
    expect(fetchMock.mock.calls[0][0]).toBe("xp-family/v1/heroes/a%20b%2Fc");
  });

  it("makeLinkCode returns the code and its expiry", async () => {
    answer({ code: "ABCDEFGH", expires_at: "2026-10-13T12:10:00+00:00" });
    await expect(makeLinkCode(parent, "h-1")).resolves.toEqual({ code: "ABCDEFGH", expiresAt: "2026-10-13T12:10:00+00:00" });
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/heroes/h-1/link-codes", { auth: parent, method: "POST" });
  });

  it("claimDevice asks as nobody and maps the answer", async () => {
    answer({ key: "xph_k", family_id: "F1", hero_id: "h-1", card: { nickname: "Mia", look: DEFAULT_LOOK, jobClass: "warrior", level: 4 } });
    const claimed = await claimDevice("ABCDEFGH", "D3", "Mia's iPhone");
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/devices/claim", {
      auth: { kind: "none" },
      method: "POST",
      body: { code: "ABCDEFGH", device_id: "D3", label: "Mia's iPhone" },
    });
    expect(claimed).toMatchObject({ key: "xph_k", familyId: "F1", heroId: "h-1" });
    expect(claimed.card).toMatchObject({ heroId: "h-1", nickname: "Mia", level: 4 });
  });

  it("listPhones maps the phones", async () => {
    answer([{ id: 3, hero_id: "h-1", label: "Mia's iPhone", created_at: "2026-10-13 12:00:00", last_seen_at: null }]);
    await expect(listPhones(parent)).resolves.toEqual([
      { id: 3, heroId: "h-1", label: "Mia's iPhone", createdAt: "2026-10-13 12:00:00", lastSeenAt: null },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/devices", { auth: parent });
  });

  it("removePhone deletes by id", async () => {
    answer({ ok: true });
    await removePhone(parent, 3);
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/devices/3", { auth: parent, method: "DELETE" });
  });

  it("sendEvents posts the wire shape and maps the result", async () => {
    answer({ accepted: ["e1"], duplicate: ["e2"], rejected: [{ id: "e3", code: "xp_family_event_invalid", message: "bad" }] });
    const result = await sendEvents(parent, [
      { id: "e1", heroId: "h-1", deviceId: "D1", kind: "quest.done", at: "2026-10-13T12:00:00.000Z", data: { xp: 40 } },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/events", {
      auth: parent,
      method: "POST",
      body: { events: [{ id: "e1", hero_id: "h-1", device_id: "D1", kind: "quest.done", at: "2026-10-13T12:00:00.000Z", data: { xp: 40 } }] },
    });
    expect(result).toEqual({ accepted: ["e1"], duplicate: ["e2"], rejected: [{ id: "e3", code: "xp_family_event_invalid", message: "bad" }] });
  });

  it("sendEvents fills the lists a quiet answer leaves out", async () => {
    answer({});
    await expect(sendEvents(parent, [])).resolves.toEqual({ accepted: [], duplicate: [], rejected: [] });
  });

  it("fetchEvents sends since and limit and maps received_at", async () => {
    answer([{ seq: 42, id: "e9", hero_id: "h-1", device_id: "D1", kind: "hero.leveled", scope: "public", at: "2026-10-13T12:00:00.000Z", received_at: "2026-10-13 12:00:01", data: { level: 5 } }]);
    const events = await fetchEvents(hero, 41);
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/events", { auth: hero, query: { since: 41, limit: 100 } });
    expect(events).toEqual([
      {
        seq: 42,
        id: "e9",
        heroId: "h-1",
        deviceId: "D1",
        kind: "hero.leveled",
        scope: "public",
        at: "2026-10-13T12:00:00.000Z",
        receivedAt: "2026-10-13 12:00:01",
        data: { level: 5 },
      },
    ]);
  });

  it("fetchEvents takes a limit", async () => {
    answer([]);
    await fetchEvents(parent, 0, 200);
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/events", { auth: parent, query: { since: 0, limit: 200 } });
  });

  it("lets a failure through for the caller to read", async () => {
    fetchMock.mockRejectedValueOnce(new TownHallError("forbidden", "no", 403, "xp_family_taken"));
    await expect(bindFamily(parent, "F1", "D1")).rejects.toMatchObject({ siteCode: "xp_family_taken" });
  });
});

describe("familyProblem", () => {
  it.each([
    [new TownHallError("offline"), "offline"],
    [new TownHallError("forbidden", "x", 403, "xp_family_not_member"), "not-member"],
    [new TownHallError("forbidden", "x", 403, "xp_family_taken"), "taken"],
    [new TownHallError("server", "x", 409, "xp_family_moved"), "moved"],
    [new TownHallError("server", "x", 404, "xp_family_code_invalid"), "code-invalid"],
    [new TownHallError("unauthorized", "x", 401, "xp_family_key_revoked"), "key-revoked"],
    [new TownHallError("unauthorized", "x", 401), "unlinked"],
    [new TownHallError("unauthorized", "x", 401, "rest_forbidden"), "unlinked"],
    [new TownHallError("server", "x", 429, "xp_family_rate_limited", 600), "rate-limited"],
    [new TownHallError("server", "x", 429), "rate-limited"],
    [new TownHallError("invalid", "x", 400, "xp_family_bad_request"), "invalid"],
    [new TownHallError("server", "x", 500), "server"],
    [new TownHallError("forbidden", "x", 403, "xp_family_forbidden"), "server"],
    [new Error("boom"), "server"],
    ["nope", "server"],
  ])("maps %j to %s", (error, problem) => expect(familyProblem(error)).toBe(problem));
});

describe("retryAfterMs", () => {
  it("is the Retry-After seconds in milliseconds", () => expect(retryAfterMs(new TownHallError("server", "x", 429, "xp_family_rate_limited", 600))).toBe(600000));
  it("is undefined without one", () => expect(retryAfterMs(new TownHallError("server", "x", 500))).toBeUndefined());
  it("is undefined for anything else", () => expect(retryAfterMs(new Error("boom"))).toBeUndefined());
});
