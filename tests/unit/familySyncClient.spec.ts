import { TownHallError, townHallFetch, type TownHallAuth } from "@/lib/services/townhall/townHallClient";
import { familyProblem } from "@/lib/services/multiplayer/familyServer";
import {
  fetchRecords,
  MAX_BATCH_BYTES,
  MAX_RECORD_BATCH,
  MAX_RECORD_BYTES,
  playHero,
  putRecords,
  restHero,
} from "@/lib/services/sync/familySyncClient";

jest.mock("@/lib/services/townhall/townHallClient", () => ({
  ...jest.requireActual("@/lib/services/townhall/townHallClient"),
  townHallFetch: jest.fn(),
}));

const fetchMock = townHallFetch as jest.Mock;
const parent: TownHallAuth = { kind: "basic", userLogin: "famparent", appPassword: "abcd efgh" };
const hero: TownHallAuth = { kind: "hero", key: "xph_k" };
const answer = (data: unknown) => fetchMock.mockResolvedValueOnce({ data, headers: { get: () => null } });

beforeEach(() => fetchMock.mockReset());

describe("the limits", () => {
  it("are the ones the site enforces", () => {
    expect([MAX_RECORD_BATCH, MAX_BATCH_BYTES, MAX_RECORD_BYTES]).toEqual([50, 1_000_000, 524_288]);
  });
});

describe("putRecords", () => {
  it("putRecords sends snake_case and reads accepted and refused", async () => {
    answer({
      accepted: [{ store: "__questLog", key: "q1", seq: 1041 }],
      refused: [{ store: "__profiles", key: "h-1", code: "xp_family_turn", message: "Not your turn" }],
    });
    const body = JSON.stringify({ userId: "h-1", questId: "a1" });
    const result = await putRecords(hero, "D1", [
      { store: "__questLog", key: "q1", heroId: "h-1", deleted: false, body },
      { store: "__profiles", key: "h-1", heroId: "h-1", deleted: false, body: "{}" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/records", {
      auth: hero,
      method: "PUT",
      body: {
        device_id: "D1",
        records: [
          { store: "__questLog", key: "q1", hero_id: "h-1", deleted: false, body },
          { store: "__profiles", key: "h-1", hero_id: "h-1", deleted: false, body: "{}" },
        ],
      },
    });
    expect(result).toEqual({
      accepted: [{ store: "__questLog", key: "q1", seq: 1041 }],
      refused: [{ store: "__profiles", key: "h-1", code: "xp_family_turn", message: "Not your turn" }],
    });
  });

  it("sends the body string as it is, and a family record's null hero id", async () => {
    answer({ accepted: [], refused: [] });
    const body = '{"name":"Dishes","note":"line\\nbreak"}';
    await putRecords(parent, "D1", [{ store: "__achievements", key: "a1", heroId: null, deleted: false, body }]);
    const sent = fetchMock.mock.calls[0][1].body.records[0];
    expect(sent.body).toBe(body);
    expect(sent.hero_id).toBeNull();
  });

  it("sends a tombstone without a body", async () => {
    answer({ accepted: [{ store: "__achievements", key: "a1", seq: 7 }], refused: [] });
    await putRecords(parent, "D1", [{ store: "__achievements", key: "a1", heroId: null, deleted: true }]);
    const sent = fetchMock.mock.calls[0][1].body.records[0];
    expect(sent).toEqual({ store: "__achievements", key: "a1", hero_id: null, deleted: true });
    expect(JSON.stringify(fetchMock.mock.calls[0][1].body)).not.toContain('"body"');
  });

  it("fills the lists a quiet answer leaves out", async () => {
    answer({});
    await expect(putRecords(parent, "D1", [])).resolves.toEqual({ accepted: [], refused: [] });
  });

  it("lets a failure through for the caller to read", async () => {
    fetchMock.mockRejectedValueOnce(new TownHallError("server", "x", 409, "xp_family_moved"));
    await expect(putRecords(parent, "D1", [])).rejects.toMatchObject({ siteCode: "xp_family_moved" });
  });
});

describe("fetchRecords", () => {
  it("fetchRecords passes since and limit and converts rows", async () => {
    answer([
      { seq: 42, store: "__questLog", key: "q1", hero_id: "h-1", deleted: false, body: '{"userId":"h-1"}', device_id: "D1", saved_at: "2026-10-22 12:00:01" },
      { seq: 43, store: "__achievements", key: "a1", hero_id: null, deleted: true, body: "", device_id: "D2", saved_at: "2026-10-22 12:00:02" },
    ]);
    const rows = await fetchRecords(hero, 41);
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/records", { auth: hero, query: { since: 41, limit: 100 } });
    expect(rows).toEqual([
      { seq: 42, store: "__questLog", key: "q1", heroId: "h-1", deleted: false, body: '{"userId":"h-1"}', deviceId: "D1", savedAt: "2026-10-22 12:00:01" },
      { seq: 43, store: "__achievements", key: "a1", heroId: null, deleted: true, body: "", deviceId: "D2", savedAt: "2026-10-22 12:00:02" },
    ]);
  });

  it("takes a limit", async () => {
    answer([]);
    await fetchRecords(parent, 0, 200);
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/records", { auth: parent, query: { since: 0, limit: 200 } });
  });

  it("reads a tombstone the site marks with 1, and a row without a body", async () => {
    answer([{ seq: "9", store: "__beasts", key: "b1", hero_id: "", deleted: 1, device_id: "D1", saved_at: "2026-10-22 12:00:03" }]);
    const [row] = await fetchRecords(parent, 8);
    expect(row).toEqual({ seq: 9, store: "__beasts", key: "b1", heroId: null, deleted: true, body: undefined, deviceId: "D1", savedAt: "2026-10-22 12:00:03" });
  });

  it("reads a quiet answer as no rows", async () => {
    answer(null);
    await expect(fetchRecords(parent, 0)).resolves.toEqual([]);
  });
});

describe("playHero", () => {
  it("playHero reads granted and busy", async () => {
    answer({ answer: "granted" });
    await expect(playHero(hero, "h-1", "D1", "Mia's iPhone")).resolves.toEqual({ answer: "granted" });
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/heroes/h-1/play", {
      auth: hero,
      method: "POST",
      body: { device_id: "D1", label: "Mia's iPhone", force: false },
    });

    answer({ answer: "busy", device: { label: "the family tablet", last_seen_at: "2026-10-22 11:59:00" } });
    await expect(playHero(parent, "h-1", "D2", "the family phone")).resolves.toEqual({
      answer: "busy",
      device: { label: "the family tablet", lastSeenAt: "2026-10-22 11:59:00" },
    });
  });

  it("reads a busy device that was never seen", async () => {
    answer({ answer: "busy", device: { label: "Mia's iPhone", last_seen_at: null } });
    await expect(playHero(parent, "h-1", "D2", "the family phone")).resolves.toEqual({ answer: "busy", device: { label: "Mia's iPhone", lastSeenAt: null } });
  });

  it("sends force when asked to take the turn over", async () => {
    answer({ answer: "granted" });
    await playHero(parent, "h-1", "D2", "the family phone", true);
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/heroes/h-1/play", {
      auth: parent,
      method: "POST",
      body: { device_id: "D2", label: "the family phone", force: true },
    });
  });

  it("escapes a hero id in the path", async () => {
    answer({ answer: "granted" });
    await playHero(parent, "a b/c", "D2", "the family phone");
    expect(fetchMock.mock.calls[0][0]).toBe("xp-family/v1/heroes/a%20b%2Fc/play");
  });

  it("does not take an answer it does not know for a grant", async () => {
    answer({ answer: "maybe" });
    const rejection = playHero(parent, "h-1", "D2", "the family phone");
    await expect(rejection).rejects.toBeInstanceOf(TownHallError);
    await expect(rejection.catch(familyProblem)).resolves.toBe("server");
  });
});

describe("restHero", () => {
  it("posts the device id and returns nothing", async () => {
    answer({ ok: true });
    await expect(restHero(hero, "h-1", "D1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("xp-family/v1/heroes/h-1/rest", { auth: hero, method: "POST", body: { device_id: "D1" } });
  });
});

describe("the Pro gate", () => {
  it("a 403 xp_family_pro_required reads as pro-required", async () => {
    fetchMock.mockRejectedValue(new TownHallError("forbidden", "Family Sync is a Pro feature", 403, "xp_family_pro_required"));
    const calls = [putRecords(parent, "D1", []), fetchRecords(parent, 0), playHero(parent, "h-1", "D1", "the family phone"), restHero(parent, "h-1", "D1")];
    const problems = await Promise.all(calls.map((call) => call.catch(familyProblem)));
    expect(problems).toEqual(["pro-required", "pro-required", "pro-required", "pro-required"]);
  });
});
