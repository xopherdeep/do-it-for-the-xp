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

/** The XP Pro page tells only what is built: two-phone play is a core feature now, not a perk to come */
describe("the XP Pro page copy", () => {
  beforeEach(() => {
    mockNative.value = false;
    Object.assign(mockPro, { isPro: false, plan: null, expiresAt: null, licenseKey: "" });
  });

  it("no longer promises Family Sync as a coming perk", () => {
    const text = mountPage().text();
    expect(text).not.toContain("Family Sync");
    expect(text).not.toContain("across devices");
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
});
