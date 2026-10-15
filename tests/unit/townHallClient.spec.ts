import { authHeaders, errorCodeFor, townHallFetch, TownHallError } from "@/lib/services/townhall/townHallClient";

/** jsdom has no Response, so the site answers with the four members the client may touch. */
const reply = (status: number, body: unknown, headers: Record<string, string> = {}) => ({
  status,
  ok: status < 400,
  json: async () => body,
  headers: { get: (name: string) => headers[name] ?? null },
});

const ROOT = "https://doit.test/wp-json";

describe("townHallClient", () => {
  it("maps statuses to error codes", () => {
    expect([400, 401, 403, 404, 500, 502].map(errorCodeFor)).toEqual(["invalid", "unauthorized", "forbidden", "server", "server", "server"]);
  });

  it("encodes Basic auth as UTF-8", () => {
    const h = authHeaders({ kind: "basic", userLogin: "josé", appPassword: "abcd efgh" });
    expect(h.Authorization).toBe("Basic " + Buffer.from("josé:abcd efgh", "utf8").toString("base64"));
  });

  it("sends the nonce header", () => {
    expect(authHeaders({ kind: "nonce", nonce: "n1" })).toEqual({ "X-WP-Nonce": "n1" });
  });

  it("sends no auth header for a guest", () => {
    expect(authHeaders({ kind: "none" })).toEqual({});
  });

  it("builds the URL and skips empty query values", async () => {
    const fetchImpl = jest.fn(async (_url: string) => reply(200, [{ id: 1 }], { "X-WP-TotalPages": "3" }));
    const res = await townHallFetch<{ id: number }[]>("wp/v2/posts", {
      root: ROOT,
      query: { per_page: 5, categories_exclude: undefined },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://doit.test/wp-json/wp/v2/posts?per_page=5");
    expect(res.data).toEqual([{ id: 1 }]);
    expect(res.headers.get("X-WP-TotalPages")).toBe("3");
  });

  it("posts JSON", async () => {
    const fetchImpl = jest.fn(async (_url: string, _init?: RequestInit) => reply(201, {}));
    await townHallFetch("wp/v2/comments", {
      root: ROOT,
      method: "POST",
      body: { post: 1 },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ post: 1 }));
  });

  it("sends the auth headers it was given", async () => {
    const fetchImpl = jest.fn(async (_url: string, _init?: RequestInit) => reply(200, {}));
    await townHallFetch("wp/v2/users/me", {
      root: ROOT,
      auth: { kind: "nonce", nonce: "n1" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-WP-Nonce"]).toBe("n1");
    expect(init.body).toBeUndefined();
  });

  it("reads a body that is not JSON as null", async () => {
    const fetchImpl = jest.fn(async () => ({
      ...reply(200, null),
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    }));
    const res = await townHallFetch("wp/v2/posts", { root: ROOT, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(res.data).toBeNull();
  });

  it("turns a timeout while reading the body into offline", async () => {
    const fetchImpl = jest.fn(
      (_url: string, init?: RequestInit) =>
        Promise.resolve({
          ...reply(200, null),
          json: () => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
        }),
    );
    await expect(townHallFetch("wp/v2/posts", { fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 10 })).rejects.toMatchObject({
      code: "offline",
    });
  });

  it("turns a network failure into offline", async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(townHallFetch("wp/v2/posts", { fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toMatchObject({ code: "offline" });
  });

  it("turns a timeout into offline", async () => {
    const fetchImpl = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
    );
    await expect(townHallFetch("wp/v2/posts", { fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 10 })).rejects.toMatchObject({
      code: "offline",
    });
  });

  it("carries the site's message and status", async () => {
    const fetchImpl = jest.fn(async () => reply(403, { code: "rest_cannot_create", message: "Sorry" }));
    const failure = townHallFetch("wp/v2/cafeteria_topic", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      method: "POST",
      body: {},
    });
    await expect(failure).rejects.toMatchObject({ code: "forbidden", message: "Sorry", status: 403 });
    await expect(failure).rejects.toBeInstanceOf(TownHallError);
  });

  it("sends a hero's key in its own header", () => {
    expect(authHeaders({ kind: "hero", key: "xph_k" })).toEqual({ "X-XP-Hero-Key": "xph_k" });
  });

  it("carries the site's error code and the Retry-After seconds", async () => {
    const fetchImpl = jest.fn(async () => reply(429, { code: "xp_family_rate_limited", message: "Slow down" }, { "Retry-After": "600" }));
    await expect(townHallFetch("xp-family/v1/events", { fetchImpl: fetchImpl as unknown as typeof fetch, method: "POST", body: {} })).rejects.toMatchObject({
      code: "server",
      status: 429,
      siteCode: "xp_family_rate_limited",
      retryAfterSec: 600,
    });
  });

  it("leaves siteCode and retryAfterSec empty when the site sends neither", async () => {
    const fetchImpl = jest.fn(async () => reply(403, { message: "Sorry" }));
    const err = await townHallFetch("xp-family/v1/family", { fetchImpl: fetchImpl as unknown as typeof fetch }).catch((e) => e);
    expect(err.siteCode).toBeUndefined();
    expect(err.retryAfterSec).toBeUndefined();
  });

  it("ignores a Retry-After that is not a number of seconds", async () => {
    const fetchImpl = jest.fn(async () => reply(503, null, { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" }));
    const err = await townHallFetch("xp-family/v1/events", { fetchImpl: fetchImpl as unknown as typeof fetch }).catch((e) => e);
    expect(err.retryAfterSec).toBeUndefined();
  });

  it("builds an error with the new fields", () => {
    const err = new TownHallError("server", "msg", 409, "xp_family_moved", 5);
    expect(err).toMatchObject({ code: "server", message: "msg", status: 409, siteCode: "xp_family_moved", retryAfterSec: 5 });
  });

  it("names the code when the site sends no message", async () => {
    const fetchImpl = jest.fn(async () => reply(404, null));
    await expect(townHallFetch("compass/v1/nope", { fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toMatchObject({
      code: "server",
      message: "server",
      status: 404,
    });
  });
});
