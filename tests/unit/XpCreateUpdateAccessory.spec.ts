import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import XpCreateUpdateAccessory from "@/app/Admin/XpCompendium/views/XpAccessories/components/XpCreateUpdateAccessory.vue";
import { AccessoryType, Rarity } from "@/lib/databases/AccessoriesDb";
import type { Accessory } from "@/lib/databases/AccessoriesDb";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The Game Master's shop item through the shared wizard shell (board #1405): new starts on step one, an edit opens the
 * saved item on its summary (the route now passes the id), Gear stats are skipped for a Real Life item, a name and a
 * price are required, and the item is saved once, over its own id, on "Stock it". The Ionic frame, the speech engine,
 * the toast and the database are stubs; the user store, the shell and the steps are real.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn(), default: {} }));
jest.mock("@/lib/engine/audio/speech", () => ({
  __esModule: true,
  speak: jest.fn(() => true),
  stop: jest.fn(),
  hasReadingVoice: () => false,
  onReadingVoiceChange: () => () => undefined,
}));
jest.mock("@/hooks/useToast", () => ({ __esModule: true, useToast: () => ({ showToast: jest.fn() }) }));
jest.mock("@/lib/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/databases/ProfileDb", () => ({ __esModule: true, ProfileDb: class { setProfile() { return Promise.resolve(); } }, default: class {} }));
jest.mock("@/lib/databases/profileStorage", () => ({ __esModule: true, profileStorage: {}, default: {} }));
jest.mock("@/lib/services/gp/GPService", () => ({ getGPService: () => ({ syncGP: jest.fn() }) }));
jest.mock("@/lib/services/notifications/notify", () => ({ notify: jest.fn() }));

const mockBack = jest.fn();
jest.mock("@/hooks/useBack", () => ({ __esModule: true, useBack: () => ({ stepBack: mockBack }) }));

const mockToast = jest.fn((_options: unknown) => Promise.resolve({ present: jest.fn() }));
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  toastController: { create: (options: unknown) => mockToast(options) },
}));

const mockSet = jest.fn((_accessory: Accessory) => Promise.resolve());
const mockGet = jest.fn();
jest.mock("@/lib/databases/AccessoriesDb", () => ({
  ...jest.requireActual("@/lib/databases/AccessoriesDb"),
  __esModule: true,
  default: class {
    setAccessory(accessory: Accessory) {
      return mockSet(accessory);
    }
    getAccessoryById(id: string) {
      return mockGet(id);
    }
  },
}));

const slot = { template: "<div><slot /></div>" };
const stubs = {
  IonPage: slot,
  IonHeader: slot,
  IonToolbar: slot,
  IonFooter: slot,
  IonContent: slot,
  IonAvatar: slot,
  XpCloseButton: { template: "<button class='close-stub' data-test='wizard-close'></button>" },
  XpSpeakButton: { props: ["text"], template: "<button class='speak-stub' :data-text='text'></button>" },
};

const saved: Accessory = {
  id: "item-1",
  name: "Lego Set",
  description: "A big one",
  basePrice: 60,
  url: "",
  imageUrl: "",
  rarity: Rarity.Rare,
  rewardCount: 2,
  isLayaway: false,
  type: AccessoryType.Virtual,
  availableToMembers: [""],
  requiresApproval: true,
  tags: ["toy"],
  bonusStats: { attack: 3 },
  inventory: { total: 4, available: 3, reserved: 1 },
  expiryDate: "2026-12-31",
  purchaseHistory: [{ userId: "hero-1", purchaseDate: "2026-10-01", amount: 1 }],
};

const mountForm = async (id?: string) => {
  localStorage.clear();
  setActivePinia(createPinia());
  const store = useUserStore();
  store.addUser({ id: "hero-1", name: { first: "Ava" } });
  store.addUser({ id: "hero-2", name: { first: "Ben" } });
  const wrapper = mount(XpCreateUpdateAccessory, { props: id ? { id } : {}, global: { stubs } });
  await flushPromises();
  return wrapper;
};

type Form = Awaited<ReturnType<typeof mountForm>>;

const tap = async (wrapper: Form, test: string) => {
  await wrapper.get(`[data-test="${test}"]`).trigger("click");
  await flushPromises();
};

const type = async (wrapper: Form, test: string, text: string) => {
  await wrapper.get(`[data-test="${test}"]`).setValue(text);
  await flushPromises();
};

const meta = (wrapper: Form) => wrapper.get(".xp-app-header__meta").text();
const title = (wrapper: Form) => wrapper.get(".xp-app-header__title").text();
const isShut = (wrapper: Form, test: string) => wrapper.get(`[data-test="${test}"]`).attributes("disabled") !== undefined;

beforeEach(() => {
  mockBack.mockReset();
  mockSet.mockReset();
  mockSet.mockResolvedValue(undefined);
  mockGet.mockReset();
  mockToast.mockClear();
});

describe("a new item", () => {
  it("opens on What is it?, 1 / 5, with Close, and Next shut until the item has a name", async () => {
    const wrapper = await mountForm();
    expect(title(wrapper)).toBe("What is it?");
    expect(meta(wrapper)).toBe("1 / 5");
    expect(wrapper.find('[data-test="step-what"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="back"]').text()).toBe("Close");
    expect(isShut(wrapper, "next")).toBe(true);
    expect(wrapper.get('[data-test="why"]').text()).toBe("Give it a name");
    expect(mockGet).not.toHaveBeenCalled();

    await type(wrapper, "name", "Pizza night");
    expect(isShut(wrapper, "next")).toBe(false);
    expect(wrapper.find('[data-test="why"]').exists()).toBe(false);
  });

  it("holds the cost step shut until a price is set, with the one-line reason", async () => {
    const wrapper = await mountForm();
    await type(wrapper, "name", "Pizza night");
    await tap(wrapper, "next");
    expect(title(wrapper)).toBe("What does it cost?");
    expect(isShut(wrapper, "next")).toBe(true);
    expect(wrapper.get('[data-test="why"]').text()).toBe("Set a price");

    await tap(wrapper, "price-25");
    expect(isShut(wrapper, "next")).toBe(false);
    expect(wrapper.get('[data-test="price-plate"]').text()).toContain("25");
  });

  it("takes a typed price as digits only", async () => {
    const wrapper = await mountForm();
    await type(wrapper, "name", "Pizza night");
    await tap(wrapper, "next");
    await type(wrapper, "price", "4a2");
    expect(wrapper.get('[data-test="price-plate"]').text()).toContain("42");
    expect((wrapper.get('[data-test="price"]').element as HTMLInputElement).value).toBe("42");
  });

  it("skips Gear stats for a Real Life item: four steps, Who goes straight to Stock it", async () => {
    const wrapper = await mountForm();
    await tap(wrapper, `type-${AccessoryType.RealLife}`);
    expect(meta(wrapper)).toBe("1 / 4");
    await type(wrapper, "name", "Pizza night");
    await tap(wrapper, "next");
    await tap(wrapper, "price-25");
    await tap(wrapper, "next");
    expect(title(wrapper)).toBe("Who can buy it?");
    await tap(wrapper, "next");
    expect(title(wrapper)).toBe("Stock it");
    expect(meta(wrapper)).toBe("4 / 4");
  });

  it("asks Gear stats for a Virtual item, and steps a stat up and down", async () => {
    const wrapper = await mountForm();
    await type(wrapper, "name", "Iron sword");
    await tap(wrapper, "next");
    await tap(wrapper, "price-50");
    await tap(wrapper, "next");
    await tap(wrapper, "next");
    expect(title(wrapper)).toBe("Gear stats");
    expect(meta(wrapper)).toBe("4 / 5");
    await tap(wrapper, "stat-attack-more");
    await tap(wrapper, "stat-attack-more");
    await tap(wrapper, "stat-hp-more");
    expect(wrapper.get('[data-test="stat-attack"]').text()).toContain("+2");
    expect(wrapper.get('[data-test="stat-hp"]').text()).toContain("+5");
    await tap(wrapper, "stat-attack-less");
    expect(wrapper.get('[data-test="stat-attack"]').text()).toContain("+1");
  });

  it("limits who can buy it to the heroes tapped, and 'Every hero' puts it back", async () => {
    const wrapper = await mountForm();
    await type(wrapper, "name", "Pizza night");
    await tap(wrapper, "next");
    await tap(wrapper, "price-25");
    await tap(wrapper, "next");
    expect(wrapper.get('[data-test="who-note"]').text()).toContain("Every hero");
    await wrapper.findAll(".hero-card")[0].trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-test="who-note"]').text()).toMatch(/^Only .* can buy it\.$/);
    await tap(wrapper, "every-hero");
    expect(wrapper.get('[data-test="who-note"]').text()).toContain("Every hero");
  });

  it("saves once on Stock it, as a new item for every hero, and goes back", async () => {
    const wrapper = await mountForm();
    await tap(wrapper, `type-${AccessoryType.RealLife}`);
    await type(wrapper, "name", "  Pizza night ");
    await tap(wrapper, "next");
    await tap(wrapper, "price-25");
    await tap(wrapper, "next");
    await tap(wrapper, "next");
    expect(wrapper.get('[data-test="submit"]').text()).toContain("Stock it");

    await tap(wrapper, "submit");
    expect(mockSet).toHaveBeenCalledTimes(1);
    const record = mockSet.mock.calls[0][0];
    expect(record.id).toBeUndefined();
    expect(record.name).toBe("Pizza night");
    expect(record.basePrice).toBe(25);
    expect(record.type).toBe(AccessoryType.RealLife);
    expect(record.availableToMembers).toEqual([]);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it("takes the tags typed with commas", async () => {
    const wrapper = await mountForm();
    await type(wrapper, "tag-input", "clothing, book");
    await tap(wrapper, "tag-add");
    expect(wrapper.findAll('[data-test="tag"]').map((tag) => tag.text())).toEqual(["clothing", "book"]);
    await wrapper.findAll('[data-test="tag"]')[0].trigger("click");
    expect(wrapper.findAll('[data-test="tag"]').map((tag) => tag.text())).toEqual(["book"]);
  });

  it("does not save when the save fails: it stays open and says so", async () => {
    mockSet.mockRejectedValueOnce(new Error("disk full"));
    const wrapper = await mountForm();
    await tap(wrapper, `type-${AccessoryType.RealLife}`);
    await type(wrapper, "name", "Pizza night");
    await tap(wrapper, "next");
    await tap(wrapper, "price-25");
    await tap(wrapper, "next");
    await tap(wrapper, "next");
    await tap(wrapper, "submit");
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(isShut(wrapper, "submit")).toBe(false);
  });
});

describe("editing a saved item (the route passes the id)", () => {
  it("opens the saved item on its summary, not an empty form", async () => {
    mockGet.mockResolvedValue(saved);
    const wrapper = await mountForm("item-1");
    expect(mockGet).toHaveBeenCalledWith("item-1");
    expect(wrapper.find('[data-test="step-stock"]').exists()).toBe(true);
    expect(title(wrapper)).toBe("Stock it");
    expect(wrapper.get('[data-test="card"]').text()).toContain("Lego Set");
    expect(wrapper.get('[data-test="row-cost"]').text()).toContain("60 GP");
    expect(wrapper.get('[data-test="row-cost"]').text()).toContain("you approve it");
    expect(wrapper.get('[data-test="row-gear"]').text()).toContain("+3 Attack");
    // The old [""] default reads as every hero
    expect(wrapper.get('[data-test="row-who"]').text()).toContain("Every hero");
  });

  it("lets the dots go back, and a tap on a summary row goes to the step that owns the answer", async () => {
    mockGet.mockResolvedValue(saved);
    const wrapper = await mountForm("item-1");
    for (const dot of wrapper.findAll(".xp-wiz-dot:not(.is-here)")) expect(dot.attributes("disabled")).toBeUndefined();
    await tap(wrapper, "row-cost");
    expect(wrapper.find('[data-test="step-cost"]').exists()).toBe(true);
    expect((wrapper.get('[data-test="price"]').element as HTMLInputElement).value).toBe("60");
  });

  it("saves over the same id, keeping the stock and history the wizard does not ask", async () => {
    mockGet.mockResolvedValue(saved);
    const wrapper = await mountForm("item-1");
    await tap(wrapper, "row-what");
    await type(wrapper, "name", "Lego Castle");
    await tap(wrapper, "dot-stock");
    await tap(wrapper, "submit");
    expect(mockSet).toHaveBeenCalledTimes(1);
    const record = mockSet.mock.calls[0][0];
    expect(record.id).toBe("item-1");
    expect(record.name).toBe("Lego Castle");
    expect(record.availableToMembers).toEqual([]);
    expect(record.inventory).toEqual({ total: 4, available: 3, reserved: 1 });
    expect(record.expiryDate).toBe("2026-12-31");
    expect(record.purchaseHistory).toHaveLength(1);
    expect(record.rewardCount).toBe(2);
  });

  it("starts a new item, and says so, when the id is not in the shop any more", async () => {
    mockGet.mockResolvedValue({ ...saved, id: "a-fresh-blank-id" });
    const wrapper = await mountForm("gone");
    expect(title(wrapper)).toBe("What is it?");
    expect(meta(wrapper)).toBe("1 / 5");
    expect((wrapper.get('[data-test="name"]').element as HTMLInputElement).value).toBe("");
    expect(mockToast).toHaveBeenCalledTimes(1);
  });
});
