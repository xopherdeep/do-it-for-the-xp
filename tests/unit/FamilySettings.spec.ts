import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { alertController } from "@ionic/vue";
import { profileStorage } from "@/lib/databases/profileStorage";
import { needsRecoveryCodeShown, recoveryCodeMatches } from "@/lib/services/profile/pinRecovery";
import { sealSecret } from "@/lib/services/profile/pinSeal";
import * as prompts from "@/app/SideMenu/SwitchProfile/pinRecoveryPrompts";
import FamilySettings from "@/app/SideMenu/XpSettings/components/FamilySettings.vue";
import { useUserStore } from "@/lib/store/stores/user";

/** How the "Your recovery code" dialog ends: the parent taps "I wrote it down", or the app closes with it still up */
let mockCodeDialog: "tapped" | "appClosed" = "tapped";
/** What the parent answers when asked to confirm a new code */
let mockConfirmRole: "confirm" | "cancel" = "confirm";

jest.mock("@ionic/vue", () => {
  const alertController = {
    create: jest.fn(async (options: { header?: string }) => ({
      options,
      present: jest.fn().mockResolvedValue(undefined),
      onDidDismiss: () => {
        const isCodeDialog = options.header === "Your recovery code";
        if (isCodeDialog) return mockCodeDialog === "tapped" ? Promise.resolve({ role: "confirm" }) : new Promise(() => undefined);
        return Promise.resolve({ role: mockConfirmRole });
      },
    })),
  };
  const toastController = { create: jest.fn().mockResolvedValue({ present: jest.fn() }) };
  // The page's Ionic parts as plain boxes, so the card renders and its button can be tapped
  const boxes: Record<string, unknown> = {};
  for (const name of ["IonPage", "IonHeader", "IonToolbar", "IonButtons", "IonTitle", "IonContent", "IonCard", "IonCardContent", "IonList", "IonItemGroup", "IonItemDivider", "IonItem", "IonLabel", "IonButton", "IonToggle", "IonSelect", "IonSelectOption"]) {
    boxes[name] = { name, template: "<div><slot /></div>" };
  }
  return { __esModule: true, ...boxes, alertController, toastController, modalController: { create: jest.fn(), dismiss: jest.fn() } };
});

jest.mock("@/lib/databases/profileStorage", () => {
  const data = new Map<string, unknown>();
  const memory = {
    data,
    create: async () => memory,
    set: async (key: string, value: unknown) => void data.set(key, value),
    get: async (key: string) => data.get(key),
    keys: async () => Array.from(data.keys()),
    remove: async (key: string) => void data.delete(key),
    clear: async () => data.clear(),
  };
  return { __esModule: true, profileStorage: memory, default: memory };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveProfiles: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/services/multiplayer/gameSignals", () => ({ emitHeroRemoved: jest.fn() }));

const mockLoadUsers = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/store/stores/user", () => {
  const actual = jest.requireActual("@/lib/store/stores/user");
  return { ...actual, useUserStore: jest.fn(() => ({ loadUsers: mockLoadUsers })) };
});

const stored = (): Record<string, any> => (profileStorage as any).data.get("dad");
const shownAlerts = () => (alertController.create as jest.Mock).mock.calls.map(([options]) => options as { header: string; message: string });
const lastShownCode = (): string => {
  const codeDialogs = shownAlerts().filter((options) => options.header === "Your recovery code");
  const match = codeDialogs[codeDialogs.length - 1].message.match(/<strong[^>]*>([^<]+)<\/strong>/);
  return match ? match[1] : "";
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("a Game Master's recovery code hand-over", () => {
  const dad = () => ({ id: "dad", isAdult: true, passcode: sealSecret("4321") });

  beforeEach(async () => {
    mockCodeDialog = "tapped";
    mockConfirmRole = "confirm";
    (alertController.create as jest.Mock).mockClear();
    await (profileStorage as any).clear();
    await (profileStorage as any).set("dad", dad());
  });

  it("saves the first code as pending, shows it, and counts it delivered once 'I wrote it down' is tapped", async () => {
    await prompts.issueAndShowRecoveryCode(dad(), "first");
    const code = lastShownCode();
    expect(code).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}$/);
    expect(recoveryCodeMatches(stored(), code)).toBe(true);
    expect(stored().pinRecoveryPending).toBe(false);
    expect(needsRecoveryCodeShown(stored())).toBe(false);
    expect(JSON.stringify(stored())).not.toContain(code);
  });

  it("leaves the code pending when the app closes before 'I wrote it down', so the next unlock shows a new one", async () => {
    mockCodeDialog = "appClosed";
    void prompts.issueAndShowRecoveryCode(dad(), "first");
    await flush();
    const unseenCode = lastShownCode();
    expect(stored().pinRecoveryPending).toBe(true);
    expect(needsRecoveryCodeShown(stored())).toBe(true);

    mockCodeDialog = "tapped";
    await prompts.issueAndShowRecoveryCode(stored(), "again");
    const freshCode = lastShownCode();
    expect(freshCode).not.toBe(unseenCode);
    expect(recoveryCodeMatches(stored(), unseenCode)).toBe(false);
    expect(recoveryCodeMatches(stored(), freshCode)).toBe(true);
    expect(stored().pinRecoveryPending).toBe(false);
    expect(shownAlerts().pop()?.message).toContain("never marked as written down");
  });

  it("keeps the PIN sealed and untouched while it hands a code over", async () => {
    const pinBefore = stored().passcode;
    await prompts.issueAndShowRecoveryCode(dad(), "first");
    expect(stored().passcode).toBe(pinBefore);
    expect(stored().passcode).not.toContain("4321");
  });
});

describe("a new recovery code from Settings > Family", () => {
  const dad = () => ({ id: "dad", isAdult: true, passcode: sealSecret("4321") });

  beforeEach(async () => {
    mockCodeDialog = "tapped";
    mockConfirmRole = "confirm";
    (alertController.create as jest.Mock).mockClear();
    await (profileStorage as any).clear();
    await (profileStorage as any).set("dad", dad());
    await prompts.issueAndShowRecoveryCode(dad(), "first");
  });

  it("asks first, and a no changes nothing", async () => {
    const before = JSON.stringify(stored());
    const oldCode = lastShownCode();
    (alertController.create as jest.Mock).mockClear();
    mockConfirmRole = "cancel";
    const isMade = await prompts.reissueRecoveryCode(stored());
    expect(isMade).toBe(false);
    expect(shownAlerts().map((options) => options.header)).toEqual(["Make a new recovery code?"]);
    expect(JSON.stringify(stored())).toBe(before);
    expect(recoveryCodeMatches(stored(), oldCode)).toBe(true);
  });

  it("a yes makes a new code, shows it, stops the old one and counts it delivered on 'I wrote it down'", async () => {
    const oldCode = lastShownCode();
    const isMade = await prompts.reissueRecoveryCode(stored());
    const newCode = lastShownCode();
    expect(isMade).toBe(true);
    expect(shownAlerts().pop()?.message).toContain("Your old recovery code no longer works");
    expect(newCode).not.toBe(oldCode);
    expect(recoveryCodeMatches(stored(), oldCode)).toBe(false);
    expect(recoveryCodeMatches(stored(), newCode)).toBe(true);
    expect(stored().pinRecoveryPending).toBe(false);
  });

  it("a new code the parent never confirms stays pending, so the next unlock shows another", async () => {
    mockCodeDialog = "appClosed";
    void prompts.reissueRecoveryCode(stored());
    await flush();
    expect(stored().pinRecoveryPending).toBe(true);
    expect(needsRecoveryCodeShown(stored())).toBe(true);
  });
});

describe("Settings > Family recovery code card", () => {
  const mountFamily = () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    return mount(FamilySettings, {
      global: {
        plugins: [pinia],
        stubs: {
          "xp-back-button": true,
          "xp-profile-item": true,
          "xp-family-phones": true,
        },
      },
    });
  };

  it("shows only to a Game Master signed in as themselves, and the button starts the reissue", async () => {
    const actual = jest.requireActual("@/lib/store/stores/user");
    (useUserStore as unknown as jest.Mock).mockImplementation(actual.useUserStore);
    const reissue = jest.spyOn(prompts, "reissueRecoveryCode").mockResolvedValue(true);

    const wrapper = mountFamily();
    const store = useUserStore();
    store.users["dad"] = { id: "dad", isAdult: true, name: { full: "Dad" } } as any;
    store.users["mia"] = { id: "mia", isAdult: false, name: { full: "Mia" } } as any;
    store.currentUser.id = "mia";
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-cy="recovery-code-settings"]').exists()).toBe(false);

    store.currentUser.id = "dad";
    await wrapper.vm.$nextTick();
    const button = wrapper.find('[data-cy="reissue-recovery-code"]');
    expect(button.exists()).toBe(true);
    await button.trigger("click");
    expect(reissue).toHaveBeenCalledWith(expect.objectContaining({ id: "dad" }));
  });
});
