import { createPinia, setActivePinia } from "pinia";
import { useProStore } from "@/lib/store/stores/pro";
import * as proClient from "@/lib/services/pro/proClient";
import { ProClientError } from "@/lib/services/pro/proClient";
import { adoptFamily } from "@/lib/services/pro/familyIdentity";
import { openProUpsell, proToast, DEVICE_LIMIT_MESSAGE } from "@/lib/services/pro/proUi";
import type { ProState } from "@/lib/databases/ProDb";

const FAMILY = "3f6c2a1e-8b4d-4c7a-9e2f-1a2b3c4d5e6f";
const OTHER_FAMILY = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d";
const KEY = "XP-PRO-AAAA-BBBB-CCCC";

let mockNative = false;
jest.mock("@capacitor/core", () => ({ __esModule: true, Capacitor: { isNativePlatform: () => mockNative } }));

let mockHash = false;
jest.mock("@/router/historyMode", () => ({ __esModule: true, usesHashHistory: () => mockHash }));

let mockStored: ProState | null = null;
jest.mock("@/lib/databases/ProDb", () => ({
  __esModule: true,
  getProDb: () => ({
    getState: jest.fn(async () => mockStored),
    saveState: jest.fn(async (s: ProState) => {
      mockStored = JSON.parse(JSON.stringify(s));
    }),
  }),
}));
jest.mock("@/lib/services/pro/familyIdentity", () => ({
  __esModule: true,
  ensureIdentity: jest.fn(async () => ({ familyId: "3f6c2a1e-8b4d-4c7a-9e2f-1a2b3c4d5e6f", deviceId: "devicetest01" })),
  adoptFamily: jest.fn(async () => undefined),
}));
jest.mock("@/lib/services/pro/proClient", () => {
  const actual = jest.requireActual("@/lib/services/pro/proClient");
  return {
    __esModule: true,
    ProClientError: actual.ProClientError,
    claim: jest.fn(),
    validate: jest.fn(),
    recover: jest.fn(),
    manage: jest.fn(),
  };
});
jest.mock("@/lib/services/pro/proUi", () => ({
  __esModule: true,
  DEVICE_LIMIT_MESSAGE: "This key is on 10 devices already; contact support to reset them.",
  proToast: jest.fn(async () => undefined),
  openProUpsell: jest.fn(async () => undefined),
}));

const claim = proClient.claim as jest.Mock;
const validate = proClient.validate as jest.Mock;

const status = (over: Record<string, unknown> = {}) => ({
  pro: true,
  licenseKey: KEY,
  plan: "yearly",
  expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  env: "production",
  familyId: FAMILY,
  ...over,
});

const cached = (over: Record<string, unknown> = {}) => ({
  key: KEY,
  plan: "yearly",
  expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  env: "production",
  pro: true,
  lastValidatedAt: new Date().toISOString(),
  ...over,
});

describe("pro store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockStored = null;
    jest.resetAllMocks();
    (require("@/lib/services/pro/familyIdentity").ensureIdentity as jest.Mock).mockResolvedValue({ familyId: FAMILY, deviceId: "devicetest01" });
    (require("@/lib/services/pro/proUi").proToast as jest.Mock).mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("init with no key claims, and a 200 stores the license and sets isPro", async () => {
    claim.mockResolvedValue(status());
    const store = useProStore();
    await store.init();
    expect(claim).toHaveBeenCalledWith(FAMILY, "devicetest01");
    expect(store.isPro).toBe(true);
    expect(mockStored?.license?.key).toBe(KEY);
  });

  it("keeps the member-since date across rechecks of the same key, and restarts it for a new key", async () => {
    const since = "2025-03-01T00:00:00.000Z";
    mockStored = {
      familyId: FAMILY,
      deviceId: "devicetest01",
      license: cached({ since, lastValidatedAt: new Date(Date.now() - 2 * 86400000).toISOString() }) as any,
    };
    validate.mockResolvedValue(status());
    const store = useProStore();
    await store.init();
    await store.recheck();
    expect(store.memberSince).toBe(since);

    validate.mockResolvedValue(status({ licenseKey: "XP-PRO-DDDD-EEEE-FFFF" }));
    await store.recheck();
    expect(store.memberSince).not.toBe(since);
    expect(mockStored?.license?.since).toBe(store.memberSince);
  });

  it("init with a fresh license does not call the network", async () => {
    mockStored = { familyId: FAMILY, deviceId: "devicetest01", license: cached() as any };
    const store = useProStore();
    await store.init();
    expect(claim).not.toHaveBeenCalled();
    expect(validate).not.toHaveBeenCalled();
    expect(store.isPro).toBe(true);
  });

  it("a network error during init keeps the cached Pro", async () => {
    mockStored = {
      familyId: FAMILY,
      deviceId: "devicetest01",
      license: cached({ lastValidatedAt: new Date(Date.now() - 2 * 86400000).toISOString() }) as any,
    };
    validate.mockRejectedValue(new ProClientError("network"));
    const store = useProStore();
    await store.init();
    expect(validate).toHaveBeenCalledWith(KEY, "devicetest01");
    expect(store.isPro).toBe(true);
  });

  it("a 404 on validate turns Pro off but keeps the key", async () => {
    mockStored = {
      familyId: FAMILY,
      deviceId: "devicetest01",
      license: cached({ lastValidatedAt: new Date(Date.now() - 2 * 86400000).toISOString() }) as any,
    };
    validate.mockResolvedValue(null);
    const store = useProStore();
    await store.init();
    expect(store.isPro).toBe(false);
    expect(store.licenseKey).toBe(KEY);
    expect(mockStored?.license?.key).toBe(KEY);
  });

  // jest 27 has no advanceTimersByTimeAsync: let pending promises settle, then move the clock
  const tick = async (ms: number) => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
    jest.advanceTimersByTime(ms);
    for (let i = 0; i < 20; i++) await Promise.resolve();
  };

  it("claimWithRetry stops at the first 200 and gives up at the timeout", async () => {
    claim.mockResolvedValue(null);
    const store = useProStore();
    await store.init();
    jest.useFakeTimers();

    claim.mockReset();
    claim.mockResolvedValueOnce(null).mockResolvedValueOnce(status());
    const won = store.claimWithRetry({ intervalMs: 2000, timeoutMs: 30000 });
    await tick(2000);
    expect(await won).toBe(true);
    expect(claim).toHaveBeenCalledTimes(2);
    expect(store.isPro).toBe(true);

    setActivePinia(createPinia());
    mockStored = null;
    claim.mockReset();
    claim.mockResolvedValue(null);
    jest.useRealTimers();
    const store2 = useProStore();
    await store2.init();
    jest.useFakeTimers();
    claim.mockClear();
    const lost = store2.claimWithRetry({ intervalMs: 2000, timeoutMs: 30000 });
    for (let i = 0; i < 16; i++) await tick(2000);
    expect(await lost).toBe(false);
    expect(claim).toHaveBeenCalledTimes(16);
  });

  it("a lapsed family's claim keeps polling until pro is true", async () => {
    claim.mockResolvedValue(null);
    const store = useProStore();
    await store.init();
    jest.useFakeTimers();
    claim.mockReset();
    claim
      .mockResolvedValueOnce(status({ pro: false }))
      .mockResolvedValueOnce(status({ pro: false }))
      .mockResolvedValueOnce(status());
    const won = store.claimWithRetry({ intervalMs: 2000, timeoutMs: 30000 });
    await tick(2000);
    await tick(2000);
    expect(await won).toBe(true);
    expect(claim).toHaveBeenCalledTimes(3);
    expect(store.isPro).toBe(true);
  });

  it("init resolves from cache before the recheck finishes", async () => {
    mockStored = {
      familyId: FAMILY,
      deviceId: "devicetest01",
      license: cached({ lastValidatedAt: new Date(Date.now() - 2 * 86400000).toISOString() }) as any,
    };
    let release: (v: unknown) => void = () => undefined;
    validate.mockReturnValue(new Promise((r) => (release = r)));
    const store = useProStore();
    await store.init();
    expect(store.isPro).toBe(true);
    expect(validate).toHaveBeenCalledTimes(1);
    release(status({ plan: "monthly" }));
    for (let i = 0; i < 20; i++) await Promise.resolve();
    expect(store.plan).toBe("monthly");
    store.$dispose();
  });

  it("a Return timeout keeps claiming in the background and unlocks", async () => {
    claim.mockResolvedValue(null);
    const store = useProStore();
    await store.init();
    jest.useFakeTimers();
    claim.mockReset();
    claim.mockResolvedValue(null);
    const lost = store.claimWithRetry({ intervalMs: 2000, timeoutMs: 4000, keepClaiming: true });
    for (let i = 0; i < 4; i++) await tick(2000);
    expect(await lost).toBe(false);
    expect(store.isPro).toBe(false);
    claim.mockClear();
    claim.mockResolvedValueOnce(null).mockResolvedValueOnce(status());
    await tick(15000);
    await tick(15000);
    expect(claim).toHaveBeenCalledTimes(2);
    expect(store.isPro).toBe(true);
    await tick(15000);
    expect(claim).toHaveBeenCalledTimes(2);
    store.$dispose();
  });

  it("isPro turns off after expiry plus 3 days without a reload", async () => {
    jest.useFakeTimers();
    mockStored = {
      familyId: FAMILY,
      deviceId: "devicetest01",
      license: cached({ expiresAt: new Date(Date.now() + 86400000).toISOString() }) as any,
    };
    validate.mockRejectedValue(new ProClientError("network"));
    const store = useProStore();
    await store.init();
    expect(store.isPro).toBe(true);
    for (let h = 0; h < 24 * 3; h++) await tick(3600 * 1000);
    expect(store.isPro).toBe(true); // inside the 3-day grace
    for (let h = 0; h < 24 * 1 + 2; h++) await tick(3600 * 1000);
    expect(store.isPro).toBe(false);
    expect(validate).toHaveBeenCalled(); // the expiry triggered a background recheck
    store.$dispose();
  });

  it("restoreWithKey adopts the returned family", async () => {
    claim.mockResolvedValue(null);
    validate.mockResolvedValue(status({ familyId: OTHER_FAMILY }));
    const store = useProStore();
    await store.restoreWithKey(` ${KEY.toLowerCase()} `);
    expect(validate).toHaveBeenCalledWith(KEY, "devicetest01");
    expect(adoptFamily).toHaveBeenCalledWith(OTHER_FAMILY);
    expect(store.familyId).toBe(OTHER_FAMILY);
    expect(store.isPro).toBe(true);
  });

  it("a device that joins another family (a phone linked) claims that family's licence at once, without a restart", async () => {
    claim.mockResolvedValueOnce(null);
    const store = useProStore();
    await store.init();
    expect(store.isPro).toBe(false);

    claim.mockResolvedValueOnce(status({ familyId: OTHER_FAMILY }));
    await store.adoptedFamily(OTHER_FAMILY.toUpperCase());

    expect(claim).toHaveBeenLastCalledWith(OTHER_FAMILY, "devicetest01");
    expect(store.familyId).toBe(OTHER_FAMILY);
    expect(store.isPro).toBe(true);
    expect(mockStored?.familyId).toBe(OTHER_FAMILY);
  });

  it("a licence cached for the family a device leaves is not carried into the new one", async () => {
    mockStored = { familyId: FAMILY, deviceId: "devicetest01", license: cached() as any };
    const store = useProStore();
    await store.init();
    expect(store.isPro).toBe(true);

    claim.mockResolvedValueOnce(null);
    await store.adoptedFamily(OTHER_FAMILY);

    expect(validate).not.toHaveBeenCalled();
    expect(claim).toHaveBeenLastCalledWith(OTHER_FAMILY, "devicetest01");
    expect(store.isPro).toBe(false);
  });

  it("restoreWithKey on an 11th device shows the device-limit message", async () => {
    claim.mockResolvedValue(null);
    validate.mockRejectedValue(new ProClientError("device_limit"));
    const store = useProStore();
    await store.restoreWithKey(KEY);
    expect(DEVICE_LIMIT_MESSAGE).toBe("This key is on 10 devices already; contact support to reset them.");
    expect(proToast).toHaveBeenCalledWith("This key is on 10 devices already; contact support to reset them.");
    expect(adoptFamily).not.toHaveBeenCalled();
    expect(store.isPro).toBe(false);
  });

  it("restoreWithKey on a malformed key says it does not look like a key", async () => {
    claim.mockResolvedValue(null);
    validate.mockRejectedValue(new ProClientError("invalid_input"));
    const store = useProStore();
    await store.restoreWithKey("nope");
    expect(proToast).toHaveBeenCalledWith("That doesn't look like an XP Pro key.");
  });

  it("requirePro returns true without a modal when Pro, and opens the upsell when not", async () => {
    claim.mockResolvedValue(status());
    const store = useProStore();
    expect(await store.requirePro("templeCreator")).toBe(true);
    expect(openProUpsell).not.toHaveBeenCalled();

    setActivePinia(createPinia());
    mockStored = null;
    claim.mockResolvedValue(null);
    const free = useProStore();
    expect(await free.requirePro("aiHelpers")).toBe(false);
    expect(openProUpsell).toHaveBeenCalledWith("aiHelpers");
  });

  const purchaseUrl = async (hash: boolean, pathname = "/") => {
    mockHash = hash;
    claim.mockResolvedValue(null);
    const assign = jest.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "http://localhost:8100", pathname, assign },
    });
    try {
      await useProStore().purchase("yearly");
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
    expect(assign).toHaveBeenCalledTimes(1);
    return new URL(assign.mock.calls[0][0]);
  };

  it("purchase (web history) sends the browser to the Bazaar resolver and returns to /pro/return", async () => {
    const url = await purchaseUrl(false);
    expect(url.origin + url.pathname).toBe("https://doit.forthexp.com/buy/doitforthexp/yearly");
    expect(url.searchParams.get("family_id")).toBe(FAMILY);
    expect(url.searchParams.get("device_id")).toBe("devicetest01");
    expect(url.searchParams.get("return_url")).toBe("http://localhost:8100/pro/return");
  });

  it("purchase on a native build refuses and never opens Bazaar", async () => {
    mockNative = true;
    try {
      claim.mockResolvedValue(null);
      const assign = jest.fn();
      const original = window.location;
      Object.defineProperty(window, "location", { configurable: true, value: { origin: "http://localhost", pathname: "/", assign } });
      try {
        await useProStore().purchase("yearly");
      } finally {
        Object.defineProperty(window, "location", { configurable: true, value: original });
      }
      expect(assign).not.toHaveBeenCalled();
    } finally {
      mockNative = false;
    }
  });

  it("purchase (hash history) returns to the hash route under the current path", async () => {
    const url = await purchaseUrl(true, "/app/index.html");
    expect(url.searchParams.get("return_url")).toBe("http://localhost:8100/app/index.html#/pro/return");
  });
});
