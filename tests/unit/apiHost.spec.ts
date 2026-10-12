import { resolveApiConfig } from "@/lib/api/apiHost";
import Api from "@/lib/api/api.class";

describe("resolveApiConfig", () => {
  it("uses the hosting WordPress site's REST root and nonce when XP serves the app", () => {
    expect(resolveApiConfig({ root: "/wp-json/", nonce: "abc123" })).toEqual({
      url: "/wp-json",
      base: "wp/v2",
      nonce: "abc123",
    });
  });

  it("falls back to doit.forthexp.com when no site hosts it (native builds, ionic serve)", () => {
    expect(resolveApiConfig(undefined)).toEqual({
      protocol: "https",
      url: "doit.forthexp.com",
      base: "wp-json/wp/v2",
    });
    expect(resolveApiConfig({ nonce: "orphan" })).toEqual({
      protocol: "https",
      url: "doit.forthexp.com",
      base: "wp-json/wp/v2",
    });
  });
});

describe("Api with a nonce", () => {
  const fetchMock = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve([]), headers: new Headers() })
  );

  beforeEach(() => {
    fetchMock.mockClear();
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
  });

  it("sends X-WP-Nonce to the hosting site", async () => {
    await new Api({ url: "/wp-json", base: "wp/v2", nonce: "abc123" }).get("xp_achievement");
    expect(fetchMock).toHaveBeenCalledWith("/wp-json/wp/v2/xp_achievement", {
      method: "GET",
      headers: { "X-WP-Nonce": "abc123" },
    });
  });

  it("sends no nonce header to doit.forthexp.com", async () => {
    await new Api({ protocol: "https", url: "doit.forthexp.com", base: "wp-json/wp/v2" }).get("xp_achievement");
    expect(fetchMock).toHaveBeenCalledWith("https://doit.forthexp.com/wp-json/wp/v2/xp_achievement", {
      method: "GET",
    });
  });
});
