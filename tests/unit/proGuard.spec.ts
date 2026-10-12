import { handleProGuard } from "@/router/_Guards/pro.guard";

const mockStore = { isPro: false, init: jest.fn(async () => undefined), requirePro: jest.fn(async () => false) };
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockStore }));

const route = (meta: Record<string, unknown>) => ({ meta } as any);

describe("pro guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.isPro = false;
  });

  it("refuses a meta.pro route when not Pro, and opens the upsell for that gate", async () => {
    expect(await handleProGuard(route({ pro: "templeCreator" }))).toBe(false);
    expect(mockStore.requirePro).toHaveBeenCalledWith("templeCreator");
  });

  it("redirects a first navigation (deep link) to Go Pro without opening the upsell", async () => {
    const result = await handleProGuard(route({ pro: "templeCreator" }), { matched: [] } as any);
    expect(result).toEqual({ name: "xp-pro" });
    expect(mockStore.requirePro).not.toHaveBeenCalled();
  });

  it("keeps next(false) plus the upsell for in-app navigation", async () => {
    expect(await handleProGuard(route({ pro: "aiHelpers" }), { matched: [{}] } as any)).toBe(false);
    expect(mockStore.requirePro).toHaveBeenCalledWith("aiHelpers");
  });

  it("allows a meta.pro route when Pro", async () => {
    mockStore.isPro = true;
    expect(await handleProGuard(route({ pro: "templeCreator" }))).toBeUndefined();
    expect(mockStore.requirePro).not.toHaveBeenCalled();
  });

  it("ignores routes without a pro gate", async () => {
    expect(await handleProGuard(route({}))).toBeUndefined();
    expect(await handleProGuard(route({ pro: "bogus" }))).toBeUndefined();
    expect(mockStore.init).not.toHaveBeenCalled();
  });
});
