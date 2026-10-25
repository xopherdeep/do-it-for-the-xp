import { mount } from "@vue/test-utils";
import ProSettings from "@/app/SideMenu/XpSettings/components/ProSettings.vue";

const KEY = "XP-PRO-AAAA-BBBB-CCCC";

const mockPro: any = {
  isPro: false,
  plan: null,
  expiresAt: null,
  licenseKey: "",
  memberSince: undefined,
  env: undefined,
  lastError: undefined,
  loading: false,
  init: jest.fn(async () => undefined),
  manage: jest.fn(),
  recover: jest.fn(),
  restoreWithKey: jest.fn(),
};
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));
jest.mock("@/lib/services/pro/proUi", () => ({ __esModule: true, proToast: jest.fn(async () => undefined) }));
jest.mock("@ionic/vue", () => {
  const stub = (name: string) => ({ name, template: "<div class='ion-stub'><slot /></div>" });
  const names = [
    "IonPage", "IonHeader", "IonToolbar", "IonButtons", "IonTitle", "IonContent", "IonCard", "IonCardContent",
    "IonCardHeader", "IonCardTitle", "IonInput",
  ];
  const mod: Record<string, unknown> = { __esModule: true };
  names.forEach((n) => (mod[n] = stub(n)));
  mod.IonButton = { name: "IonButton", template: "<button class='ion-button'><slot /></button>" };
  return mod;
});

const mountPage = () => mount(ProSettings, { global: { stubs: { "router-link": true, "xp-back-button": true } } });

/** The XP Pro settings page, where "Restore with key" lives, says why Pro is off too */
describe("the XP Pro settings page says why Pro is off", () => {
  beforeEach(() => {
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

  const reason = () => mountPage().find('[data-cy="pro-reason"]');

  it("shows no reason for a family that never had Pro", () => {
    expect(reason().exists()).toBe(false);
  });

  it("says the trial ended, under the status, when a lapsed key is on file", () => {
    Object.assign(mockPro, {
      plan: "monthly",
      licenseKey: KEY,
      memberSince: "2020-10-13T12:00:00.000Z",
      expiresAt: "2020-10-20T12:00:00.000Z",
      env: "production",
    });
    expect(reason().text()).toBe("Your trial ended Oct 20, 2020");
  });

  it("says the shopkeeper could not be reached after a failed check", () => {
    Object.assign(mockPro, { lastError: "network" });
    expect(reason().text()).toBe("The shopkeeper could not be reached; showing the last known state");
  });

  it("shows no reason while Pro is on", () => {
    Object.assign(mockPro, {
      isPro: true,
      plan: "yearly",
      licenseKey: KEY,
      expiresAt: "2099-01-01T12:00:00.000Z",
      lastError: "network",
    });
    expect(reason().exists()).toBe(false);
  });
});
