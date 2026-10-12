import { claim, validate, askAi, manage, ProClientError } from "@/lib/services/pro/proClient";

const reply = (status: number, body: unknown) =>
  jest.fn(() => Promise.resolve({ status, ok: status < 400, json: () => Promise.resolve(body) }));

const server = {
  pro: true,
  license_key: "XP-PRO-AAAA-BBBB-CCCC",
  plan: "yearly",
  expires_at: "2027-01-01T00:00:00Z",
  env: "production",
  family_id: "3f6c2a1e-8b4d-4c7a-9e2f-1a2b3c4d5e6f",
};

describe("proClient", () => {
  afterEach(() => {
    delete (global as any).fetch;
  });

  it("claim returns null on 404", async () => {
    (global as any).fetch = reply(404, { pro: false });
    expect(await claim(server.family_id, "devicetest01")).toBeNull();
  });

  it("claim maps a 200 to a ProStatus and posts to the Gatekeeper route", async () => {
    const f = reply(200, server);
    (global as any).fetch = f;
    expect(await claim(server.family_id, "devicetest01")).toEqual({
      pro: true,
      licenseKey: "XP-PRO-AAAA-BBBB-CCCC",
      plan: "yearly",
      expiresAt: "2027-01-01T00:00:00Z",
      env: "production",
      familyId: server.family_id,
    });
    const [url, init] = (f.mock.calls[0] as unknown) as [string, RequestInit];
    expect(url).toBe("https://doit.forthexp.com/wp-json/compass/v1/gatekeeper/xp-pro/claim");
    expect(JSON.parse(init.body as string)).toEqual({ family_id: server.family_id, device_id: "devicetest01" });
  });

  it("maps 409 to device_limit", async () => {
    (global as any).fetch = reply(409, { error: "device_limit" });
    await expect(validate("XP-PRO-AAAA-BBBB-CCCC", "devicetest01")).rejects.toMatchObject({
      name: "ProClientError",
      code: "device_limit",
    });
  });

  it("maps a rejected fetch to network", async () => {
    (global as any).fetch = jest.fn(() => Promise.reject(new TypeError("offline")));
    const err = await claim(server.family_id, "devicetest01").catch((e) => e);
    expect(err).toBeInstanceOf(ProClientError);
    expect(err.code).toBe("network");
  });

  it("maps the AI and manage status codes", async () => {
    (global as any).fetch = reply(402, { error: "pro_required" });
    await expect(askAi("checklist", {}, "K", "d")).rejects.toMatchObject({ code: "pro_required" });
    (global as any).fetch = reply(429, { error: "daily_limit" });
    await expect(askAi("checklist", {}, "K", "d")).rejects.toMatchObject({ code: "daily_limit" });
    (global as any).fetch = reply(429, { error: "rate_limited" });
    await expect(manage("K", "https://x")).rejects.toMatchObject({ code: "rate_limited" });
    (global as any).fetch = reply(400, { error: "invalid_input" });
    await expect(manage("K", "https://x")).rejects.toMatchObject({ code: "invalid_input" });
    (global as any).fetch = reply(502, { error: "ai_unavailable" });
    await expect(askAi("schedule", {}, "K", "d")).rejects.toMatchObject({ code: "server" });
    (global as any).fetch = reply(200, { name: "Gloop" });
    expect(await askAi("monster_name", {}, "K", "d")).toEqual({ name: "Gloop" });
  });
});
