import { mount } from "@vue/test-utils";
import XpGoPro from "@/app/SideMenu/XpPro/XpGoPro/XpGoPro.vue";

const mockNative = { value: false };
jest.mock("@capacitor/core", () => ({
  __esModule: true,
  Capacitor: { isNativePlatform: () => mockNative.value },
}));

const mockPro = { isPro: false, loading: false, purchase: jest.fn(async () => undefined) };
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
  return {
    __esModule: true,
    IonPage: stub("IonPage"),
    IonHeader: stub("IonHeader"),
    IonToolbar: stub("IonToolbar"),
    IonButtons: stub("IonButtons"),
    IonMenuButton: stub("IonMenuButton"),
    IonTitle: stub("IonTitle"),
    IonContent: stub("IonContent"),
    IonCard: stub("IonCard"),
    IonCardContent: stub("IonCardContent"),
    IonButton: { name: "IonButton", template: "<button class='ion-button'><slot /></button>" },
  };
});

const mountPage = () =>
  mount(XpGoPro, { global: { stubs: { "router-link": { template: "<a class='rl'><slot /></a>" } } } });

describe("Go Pro on a native build", () => {
  it("hides the buy buttons and points to Restore with key", async () => {
    mockNative.value = true;
    const wrapper = mountPage();
    expect(wrapper.findAll(".buy-button")).toHaveLength(0);
    expect(wrapper.find('[data-cy="native-coming-soon"]').text()).toBe(
      "Purchases on this device are coming soon. Already bought XP Pro? Restore with your key in Settings > XP Pro."
    );
    expect(wrapper.find('[data-cy="restore-link"]').exists()).toBe(true);
  });

  it("shows the three plans with buy buttons on the web", async () => {
    mockNative.value = false;
    const wrapper = mountPage();
    expect(wrapper.findAll(".buy-button").length).toBeGreaterThan(0);
    expect(wrapper.find('[data-cy="native-coming-soon"]').exists()).toBe(false);
  });
});
