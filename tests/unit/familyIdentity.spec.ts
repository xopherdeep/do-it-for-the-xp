import { ensureIdentity, adoptFamily, resetIdentityCache } from "@/lib/services/pro/familyIdentity";
import type { ProState } from "@/lib/databases/ProDb";

let stored: ProState | null = null;
const mockDb = {
  getState: jest.fn(async () => stored),
  saveState: jest.fn(async (s: ProState) => {
    stored = JSON.parse(JSON.stringify(s));
  }),
};
jest.mock("@/lib/databases/ProDb", () => ({
  __esModule: true,
  getProDb: () => mockDb,
}));

describe("family identity", () => {
  beforeEach(() => {
    stored = null;
    resetIdentityCache();
    jest.clearAllMocks();
  });

  it("creates a lowercase v4 family id and a 16 char device id once, and keeps them", async () => {
    const first = await ensureIdentity();
    expect(first.familyId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(first.deviceId).toMatch(/^[A-Za-z0-9]{16}$/);

    const second = await ensureIdentity();
    expect(second).toEqual(first);

    resetIdentityCache(); // a new app launch reads the disk
    expect(await ensureIdentity()).toEqual(first);
    expect(mockDb.saveState).toHaveBeenCalledTimes(1);
  });

  it("adoptFamily changes the family id and keeps the device id and license", async () => {
    const first = await ensureIdentity();
    stored = { ...(stored as ProState), license: { key: "K" } as any };
    resetIdentityCache();
    await adoptFamily("3F6C2A1E-8B4D-4C7A-9E2F-1A2B3C4D5E6F");
    const after = await ensureIdentity();
    expect(after.familyId).toBe("3f6c2a1e-8b4d-4c7a-9e2f-1a2b3c4d5e6f");
    expect(after.deviceId).toBe(first.deviceId);
    expect(stored?.license).toEqual({ key: "K" });
  });
});
