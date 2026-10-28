import { mount } from "@vue/test-utils";
import XpMembership from "@/app/SideMenu/XpMembership/XpMembership.vue";

const mockNative = { value: false };
jest.mock("@capacitor/core", () => ({
  __esModule: true,
  Capacitor: { isNativePlatform: () => mockNative.value },
}));

const mockPro: any = {
  isPro: false,
  plan: null,
  expiresAt: null,
  licenseKey: "",
  loading: false,
  init: jest.fn(async () => undefined),
  manage: jest.fn(),
  purchase: jest.fn(async () => undefined),
};
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));
jest.mock("@/assets/fx", () => ({ __esModule: true, default: {}, play$fx: jest.fn() }));
jest.mock("@/lib/services/pro/proClient", () => ({
  __esModule: true,
  fetchPlans: jest.fn(async () => {
    throw new Error("offline");
  }),
}));
jest.mock("@ionic/vue", () => {
  const stub = (name: string) => ({ name, template: "<div class='ion-stub'><slot /></div>" });
  const names = [
    "IonPage", "IonHeader", "IonToolbar", "IonButtons", "IonMenuButton", "IonTitle", "IonContent", "IonCard",
    "IonCardContent", "IonCardHeader", "IonCardTitle", "IonCardSubtitle", "IonGrid", "IonRow", "IonCol", "IonList",
    "IonItem", "IonLabel", "IonIcon", "IonChip", "IonText",
  ];
  const mod: Record<string, unknown> = { __esModule: true };
  names.forEach((n) => (mod[n] = stub(n)));
  mod.IonButton = { name: "IonButton", template: "<button class='ion-button'><slot /></button>" };
  return mod;
});

const mountPage = () =>
  mount(XpMembership, { global: { stubs: { "router-link": { template: "<a class='rl'><slot /></a>" } } } });

/** The XP Pro page tells only what is built: two-phone play is free and core, Family Sync (the whole game on a hero's phone) is the perk */
describe("the XP Pro page copy", () => {
  beforeEach(() => {
    mockNative.value = false;
    Object.assign(mockPro, {
      isPro: false,
      plan: null,
      expiresAt: null,
      licenseKey: "",
      memberSince: undefined,
      env: undefined,
      lastError: undefined,
    });
  });

  it("lists Family Sync as a perk now that it is built", () => {
    const perks = mountPage()
      .findAll('[data-cy="perk"]')
      .map((perk) => perk.text());
    expect(perks.some((perk) => perk.includes("Family Sync"))).toBe(true);
  });

  it("still lists what is coming that is not built yet", () => {
    const text = mountPage().find(".coming-soon").text();
    expect(text).toContain("parent reports");
    expect(text).toContain("hero cosmetics");
  });

  it("on a native build says purchases happen on the web for now and nothing is charged here", () => {
    mockNative.value = true;
    const note = mountPage().find('[data-cy="native-coming-soon"]').text();
    expect(note).toContain("coming soon");
    expect(note).toContain("For now, purchases happen on the web");
    expect(note).toContain("nothing is charged here");
    expect(note).toContain("Settings > XP Pro");
  });

  it("keeps the prices as they were", () => {
    const wrapper = mountPage();
    const prices = wrapper.findAll('[data-cy="plan-price"]').map((price) => price.text());
    expect(prices).toEqual(["$4.99 / month", "$39.99 / year"]);
  });

  it("uses no em dashes", () => {
    mockNative.value = true;
    expect(mountPage().text()).not.toContain("\u2014");
  });

  describe("the status card says why Pro is off", () => {
    const reason = () => mountPage().find('[data-cy="pro-reason"]');
    const lapsed = {
      isPro: false,
      plan: "monthly",
      licenseKey: "XP-PRO-AAAA-BBBB-CCCC",
      memberSince: "2020-10-13T12:00:00.000Z",
      expiresAt: "2020-10-20T12:00:00.000Z",
      env: "production",
    };

    it("shows no reason line for a family that never had Pro", () => {
      expect(reason().exists()).toBe(false);
    });

    it("shows no reason line while Pro is on", () => {
      Object.assign(mockPro, { ...lapsed, isPro: true, expiresAt: "2099-01-01T12:00:00.000Z", lastError: "network" });
      expect(reason().exists()).toBe(false);
    });

    it("says the trial ended, with the date, under the status", () => {
      Object.assign(mockPro, lapsed);
      expect(reason().text()).toBe("Your trial ended Oct 20, 2020");
    });

    it("says the plan ended after a paid period", () => {
      Object.assign(mockPro, { ...lapsed, plan: "yearly", memberSince: "2019-10-20T12:00:00.000Z" });
      expect(reason().text()).toBe("Your plan ended Oct 20, 2020");
    });

    it("says a test-mode license only works in development builds", () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      try {
        Object.assign(mockPro, { ...lapsed, env: "sandbox" });
        expect(reason().text()).toBe("This is a test-mode license; it only works in development builds");
      } finally {
        process.env.NODE_ENV = original;
      }
    });

    it("says the key is already on 10 devices", () => {
      Object.assign(mockPro, { ...lapsed, expiresAt: null, lastError: "device_limit" });
      expect(reason().text()).toBe("This key is already on 10 devices");
    });

    it("says the shopkeeper could not be reached", () => {
      Object.assign(mockPro, { ...lapsed, expiresAt: null, lastError: "network" });
      expect(reason().text()).toBe("The shopkeeper could not be reached; showing the last known state");
    });
  });
});
