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

describe("the XP Pro page", () => {
  beforeEach(() => {
    mockNative.value = false;
    Object.assign(mockPro, { isPro: false, plan: null, expiresAt: null, licenseKey: "" });
  });

  it("shows Free, the plans and the four perks for a free family", () => {
    const wrapper = mountPage();
    expect(wrapper.find('[data-cy="pro-state"]').text()).toBe("Free");
    expect(wrapper.findAll(".buy-button").length).toBe(2);
    expect(wrapper.findAll('[data-cy="perk"]')).toHaveLength(4);
    expect(wrapper.text()).toContain("Heroes, custom quests and custom beasts stay free forever.");
    expect(wrapper.find('[data-cy="manage-button"]').exists()).toBe(false);
  });

  it("hides the buy buttons on a native build and points to Restore", () => {
    mockNative.value = true;
    const wrapper = mountPage();
    expect(wrapper.findAll(".buy-button")).toHaveLength(0);
    expect(wrapper.find('[data-cy="native-coming-soon"]').exists()).toBe(true);
    expect(wrapper.find('[data-cy="restore-link"]').exists()).toBe(true);
  });

  it("shows the renew date, the masked key and Manage for a yearly subscriber", () => {
    Object.assign(mockPro, { isPro: true, plan: "yearly", expiresAt: "2099-01-10T12:00:00Z", licenseKey: "XP-PRO-AAAA-BBBB-CCCC" });
    const wrapper = mountPage();
    expect(wrapper.find('[data-cy="pro-state"]').text()).toBe("Active");
    expect(wrapper.find('[data-cy="pro-date"]').text()).toBe("Renews Jan 10, 2099");
    expect(wrapper.find('[data-cy="pro-masked-key"]').text()).toContain("XP-PRO-****-****-CCCC");
    expect(wrapper.find('[data-cy="manage-button"]').exists()).toBe(true);
  });

  it("hides the plans for a lifetime family", () => {
    Object.assign(mockPro, { isPro: true, plan: "lifetime", expiresAt: null, licenseKey: "XP-PRO-AAAA-BBBB-CCCC" });
    const wrapper = mountPage();
    expect(wrapper.find('[data-cy="pro-state"]').text()).toBe("Lifetime");
    expect(wrapper.findAll(".buy-button")).toHaveLength(0);
    expect(wrapper.find('[data-cy="manage-button"]').exists()).toBe(false);
  });
});
