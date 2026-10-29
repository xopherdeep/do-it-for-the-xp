import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { alertController } from "@ionic/vue";
import { profileStorage } from "@/lib/databases/profileStorage";
import { needsRecoveryCodeShown, recoveryCodeMatches } from "@/lib/services/profile/pinRecovery";
import { sealSecret } from "@/lib/services/profile/pinSeal";
import * as prompts from "@/app/SideMenu/SwitchProfile/pinRecoveryPrompts";
import FamilySettings from "@/app/SideMenu/XpSettings/components/FamilySettings.vue";
import { useUserStore } from "@/lib/store/stores/user";
import { getFamilySettingsDb } from "@/lib/databases/FamilySettingsDb";
import { DEFAULT_FAMILY_SETTINGS, canMake, loadFamilySettings } from "@/lib/services/family/familySettings";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { ProfileDb } from "@/lib/databases";
import * as creations from "@/lib/services/creations/myCreations";

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
// The real signal maker stays (the family-sync signals are built with it); only the hero-removed signal is watched
jest.mock("@/lib/services/multiplayer/gameSignals", () => ({ ...jest.requireActual("@/lib/services/multiplayer/gameSignals"), emitHeroRemoved: jest.fn() }));

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

describe("the Maker setting: which kids may draw beasts and suggest quests", () => {
  let stored: Record<string, unknown> | null = null;
  const spies: jest.SpyInstance[] = [];

  /** The family settings record in memory, so a read gives back whatever the last save (or the test) put there */
  beforeEach(() => {
    stored = null;
    const db = getFamilySettingsDb();
    spies.push(
      jest.spyOn(db, "getSettings").mockImplementation(async () => stored as any),
      jest.spyOn(db, "saveSettings").mockImplementation(async (settings) => {
        stored = settings as unknown as Record<string, unknown>;
      })
    );
  });

  afterEach(() => {
    while (spies.length) spies.pop()?.mockRestore();
  });

  it("starts with no Makers", async () => {
    expect(DEFAULT_FAMILY_SETTINGS.makers).toEqual([]);
    expect((await loadFamilySettings()).makers).toEqual([]);
  });

  it("keeps only real ids from a saved list, as strings", async () => {
    stored = { makers: ["hero-1", 7, "", null] };
    expect((await loadFamilySettings()).makers).toEqual(["hero-1", "7"]);
  });

  it("reads a list that is not a list as no Makers", async () => {
    stored = { makers: "hero-1" };
    expect((await loadFamilySettings()).makers).toEqual([]);
  });

  it("lets a listed hero make things, not another, and a Game Master always", () => {
    const settings = { makers: ["hero-1"] };
    expect(canMake("hero-1", settings)).toBe(true);
    expect(canMake("hero-2", settings)).toBe(false);
    expect(canMake("hero-2", settings, true)).toBe(true);
  });

  it("matches a number id to its string, and lets nobody make things without an id", () => {
    const settings = { makers: ["7"] };
    expect(canMake(7, settings)).toBe(true);
    expect(canMake(null, settings)).toBe(false);
    expect(canMake(undefined, settings)).toBe(false);
    expect(canMake("", { makers: [""] })).toBe(false);
  });

  it("saves a hero as a Maker once, and takes them off again", async () => {
    setActivePinia(createPinia());
    const rules = useGameRulesStore();

    await rules.setMaker("hero-1", true);
    await rules.setMaker("hero-1", true);
    await rules.setMaker("hero-2", true);
    expect(rules.makers).toEqual(["hero-1", "hero-2"]);
    expect((stored as any).makers).toEqual(["hero-1", "hero-2"]);

    await rules.setMaker("hero-1", false);
    expect(rules.makers).toEqual(["hero-2"]);
    expect((stored as any).makers).toEqual(["hero-2"]);
  });

  it("leaves the other family rules as they were when it saves a Maker", async () => {
    stored = { streaks: false, approveAllPurchases: true };
    setActivePinia(createPinia());
    await useGameRulesStore().setMaker("hero-1", true);
    expect(stored).toMatchObject({ streaks: false, approveAllPurchases: true, makers: ["hero-1"] });
  });
});

describe("Settings > Family: deleting a profile", () => {
  const mountFamily = () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    return mount(FamilySettings, {
      global: { plugins: [pinia], stubs: { "xp-back-button": true, "xp-profile-item": true, "xp-family-phones": true } },
    });
  };

  const mia = { id: "mia", isAdult: false, name: { full: "Mia" } } as any;
  let removed: jest.SpyInstance;
  let orphaned: jest.SpyInstance;

  beforeEach(() => {
    const actual = jest.requireActual("@/lib/store/stores/user");
    (useUserStore as unknown as jest.Mock).mockImplementation(actual.useUserStore);
    removed = jest.spyOn(ProfileDb.prototype, "removeProfile").mockResolvedValue(undefined);
    jest.spyOn(ProfileDb.prototype, "showDeleteToast").mockResolvedValue(undefined as never);
    orphaned = jest.spyOn(creations, "orphanCreations").mockResolvedValue(2);
  });

  afterEach(() => jest.restoreAllMocks());

  const signedInAsDad = (wrapper: ReturnType<typeof mountFamily>) => {
    const store = useUserStore();
    store.users["dad"] = { id: "dad", isAdult: true, name: { full: "Dad" } } as any;
    store.users["mia"] = mia;
    store.currentUser.id = "dad";
    return wrapper;
  };

  it("sends the deleted hero's waiting creations back as 'maker gone' once the profile is removed", async () => {
    const wrapper = signedInAsDad(mountFamily());

    await (wrapper.vm as any).deleteProfile(mia);

    expect(removed).toHaveBeenCalledWith("mia");
    expect(orphaned).toHaveBeenCalledWith("mia", expect.any(Date));
    expect(removed.mock.invocationCallOrder[0]).toBeLessThan(orphaned.mock.invocationCallOrder[0]);
  });

  it("deletes the profile all the same when the creations cannot be sent back", async () => {
    orphaned.mockRejectedValue(new Error("storage"));
    const wrapper = signedInAsDad(mountFamily());

    await expect((wrapper.vm as any).deleteProfile(mia)).resolves.toBeUndefined();

    expect(removed).toHaveBeenCalledWith("mia");
  });

  it("sends nothing back when the delete is refused (a hero cannot delete a profile, only a Game Master)", async () => {
    const wrapper = signedInAsDad(mountFamily());
    useUserStore().currentUser.id = "mia";

    await (wrapper.vm as any).deleteProfile(mia);

    expect(removed).not.toHaveBeenCalled();
    expect(orphaned).not.toHaveBeenCalled();
  });
});
