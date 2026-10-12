import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { HARDWARE_BACK_PRIORITY, useBack, useHardwareBack } from "@/hooks/useBack";

// Ionic's router and hardware-button hook are faked: the specs are about what useBack decides, not about Ionic
const mockIonRouter = { canGoBack: jest.fn(), back: jest.fn(), navigate: jest.fn() };
const mockUnregister = jest.fn();
const mockBackButton = jest.fn((_priority: number, _handler: (next: () => void) => void) => ({ unregister: mockUnregister }));
let mockSignedInHero: string | null = null;

jest.mock("@ionic/vue", () => ({
  useIonRouter: () => mockIonRouter,
  useBackButton: (priority: number, handler: (next: () => void) => void) => mockBackButton(priority, handler),
}));
jest.mock("@/lib/store/stores/user", () => ({
  useUserStore: () => ({ currentUser: { id: mockSignedInHero } }),
}));

const page = { render: () => null };
const routes = [
  { path: "/shop/:merchant?/:userId?", name: "shop", component: page },
  { path: "/bank/:userId?", name: "bank", component: page },
  { path: "/xp-profile", name: "xp-profile", component: page },
];

/** Mounts a probe on `path` inside a real (memory) router, with or without Ionic's router around it. */
const mountAt = async (path: string, setup: () => unknown, { insideIonic = true } = {}) => {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const probe = defineComponent({ setup, render: () => h("div") });
  return mount(probe, { global: { plugins: [router], provide: insideIonic ? { navManager: {} } : {} } });
};

const mountBack = (path: string, extra?: Parameters<typeof useBack>[0], options?: { insideIonic?: boolean }) =>
  mountAt(path, () => useBack(extra), options);

beforeEach(() => {
  jest.clearAllMocks();
  mockSignedInHero = null;
  setActivePinia(createPinia());
});

describe("useBack", () => {
  it("follows the history when there is some", async () => {
    mockIonRouter.canGoBack.mockReturnValue(true);
    const wrapper = await mountBack("/shop/wrecked-ship/hero-1");
    (wrapper.vm as any).back();
    expect(mockIonRouter.back).toHaveBeenCalledTimes(1);
    expect(mockIonRouter.navigate).not.toHaveBeenCalled();
  });

  it("goes up to the world the shop stands in, sliding back and replacing the shop, when there is no history", async () => {
    mockIonRouter.canGoBack.mockReturnValue(false);
    const wrapper = await mountBack("/shop/wrecked-ship/hero-1");
    (wrapper.vm as any).back();
    expect(mockIonRouter.navigate).toHaveBeenCalledWith("/my-portal/hero-1/islands", "back", "replace");
    expect(mockIonRouter.back).not.toHaveBeenCalled();
  });

  it("goes up from the bank to Home Town", async () => {
    mockIonRouter.canGoBack.mockReturnValue(false);
    const wrapper = await mountBack("/bank/hero-1");
    (wrapper.vm as any).back();
    expect(mockIonRouter.navigate).toHaveBeenCalledWith("/my-portal/hero-1/home-town", "back", "replace");
  });

  it("uses the signed-in hero when the address names none", async () => {
    mockIonRouter.canGoBack.mockReturnValue(false);
    mockSignedInHero = "hero-9";
    const wrapper = await mountBack("/bank");
    (wrapper.vm as any).back();
    expect(mockIonRouter.navigate).toHaveBeenCalledWith("/my-portal/hero-9/home-town", "back", "replace");
  });

  it("lets the page name what only it knows, like the world a shop stands in", async () => {
    mockIonRouter.canGoBack.mockReturnValue(false);
    const wrapper = await mountBack("/shop/hermits-tent/hero-1", () => ({ shopWorld: "swamps" }));
    expect((wrapper.vm as any).backHref).toBe("/my-portal/hero-1/swamps");
    (wrapper.vm as any).back();
    expect(mockIonRouter.navigate).toHaveBeenCalledWith("/my-portal/hero-1/swamps", "back", "replace");
  });

  it("offers the parent as a back button's default-href", async () => {
    const wrapper = await mountBack("/shop/wrecked-ship/hero-1");
    expect((wrapper.vm as any).backHref).toBe("/my-portal/hero-1/islands");
    expect((wrapper.vm as any).parentHref).toBe("/my-portal/hero-1/islands");
  });

  it("does nothing on a page that is the top of its stack, and offers no default-href", async () => {
    mockIonRouter.canGoBack.mockReturnValue(false);
    const wrapper = await mountBack("/xp-profile");
    (wrapper.vm as any).back();
    expect(mockIonRouter.navigate).not.toHaveBeenCalled();
    expect(mockIonRouter.back).not.toHaveBeenCalled();
    expect((wrapper.vm as any).backHref).toBeUndefined();
  });

  it("still goes back from a top page when there is history", async () => {
    mockIonRouter.canGoBack.mockReturnValue(true);
    const wrapper = await mountBack("/xp-profile");
    (wrapper.vm as any).back();
    expect(mockIonRouter.back).toHaveBeenCalledTimes(1);
  });

  it("is quiet outside an Ionic router (a page mounted on its own)", async () => {
    const wrapper = await mountBack("/bank/hero-1", undefined, { insideIonic: false });
    expect(() => (wrapper.vm as any).back()).not.toThrow();
    expect((wrapper.vm as any).backHref).toBe("/my-portal/hero-1/home-town");
    expect(mockIonRouter.navigate).not.toHaveBeenCalled();
  });
});

describe("useHardwareBack", () => {
  const handlerFor = async (path: string) => {
    const wrapper = await mountAt(path, () => useHardwareBack());
    const [priority, handler] = mockBackButton.mock.calls[0];
    return { wrapper, priority, handler };
  };

  it("sits below Ionic's overlays and menu and the battle's prompt (100, 99) and above the router's own handler (0)", async () => {
    const { priority } = await handlerFor("/bank/hero-1");
    expect(HARDWARE_BACK_PRIORITY).toBe(priority);
    expect(priority).toBeGreaterThan(0);
    expect(priority).toBeLessThan(99);
  });

  it("hands over to the router when there is history behind the page", async () => {
    mockIonRouter.canGoBack.mockReturnValue(true);
    const { handler } = await handlerFor("/shop/wrecked-ship/hero-1");
    const next = jest.fn();
    handler(next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockIonRouter.navigate).not.toHaveBeenCalled();
  });

  it("goes up instead of leaving the app when the page has no history behind it", async () => {
    mockIonRouter.canGoBack.mockReturnValue(false);
    const { handler } = await handlerFor("/shop/wrecked-ship/hero-1");
    const next = jest.fn();
    handler(next);
    expect(mockIonRouter.navigate).toHaveBeenCalledWith("/my-portal/hero-1/islands", "back", "replace");
    expect(next).not.toHaveBeenCalled();
  });

  it("leaves a page with no 'up' to the system", async () => {
    mockIonRouter.canGoBack.mockReturnValue(false);
    const { handler } = await handlerFor("/xp-profile");
    const next = jest.fn();
    handler(next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockIonRouter.navigate).not.toHaveBeenCalled();
  });

  it("unregisters when the app shell goes", async () => {
    const { wrapper } = await handlerFor("/bank/hero-1");
    wrapper.unmount();
    expect(mockUnregister).toHaveBeenCalledTimes(1);
  });
});
