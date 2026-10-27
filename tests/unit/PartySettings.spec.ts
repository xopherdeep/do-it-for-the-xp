import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PartySettings from "@/app/SideMenu/XpSettings/components/PartySettings.vue";
import { getFamilySettingsDb } from "@/lib/databases/FamilySettingsDb";
import { useUserStore } from "@/lib/store/stores/user";

jest.mock("@ionic/vue", () => {
  // The page's Ionic parts as plain boxes; the toggle is a real checkbox that says ionChange the way Ionic's does
  const boxes: Record<string, unknown> = {};
  for (const name of ["IonPage", "IonHeader", "IonToolbar", "IonButtons", "IonTitle", "IonContent", "IonCard", "IonCardContent", "IonList", "IonItemDivider", "IonItem", "IonLabel", "IonAvatar", "IonImg", "IonBadge"]) {
    boxes[name] = { name, template: "<div><slot /></div>" };
  }
  boxes.IonToggle = {
    name: "IonToggle",
    props: ["checked", "disabled"],
    emits: ["ionChange"],
    template: `<input type="checkbox" :checked="checked" :disabled="disabled" @change="$emit('ionChange', { detail: { checked: $event.target.checked } })" />`,
  };
  return { __esModule: true, ...boxes, toastController: { create: jest.fn() }, alertController: { create: jest.fn() }, modalController: { create: jest.fn(), dismiss: jest.fn() } };
});

jest.mock("@/lib/databases/profileStorage", () => {
  const data = new Map<string, unknown>();
  const memory = { data, create: async () => memory, set: async () => undefined, get: async () => undefined, keys: async () => [], remove: async () => undefined, clear: async () => undefined };
  return { __esModule: true, profileStorage: memory, default: memory };
});
jest.mock("@/lib/services/core/StorageService", () => ({ __esModule: true, default: { saveProfiles: jest.fn().mockResolvedValue(undefined) } }));
jest.mock("@/lib/services/multiplayer/gameSignals", () => ({ emitHeroRemoved: jest.fn() }));

describe("Settings > Party: who may make beasts and quests", () => {
  let saved: Record<string, unknown> | null = null;

  const mountParty = (signedInAs: string) => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const users = useUserStore();
    users.users["dad"] = { id: "dad", isAdult: true, name: { nick: "Dad" } } as any;
    users.users["mia"] = { id: "mia", isAdult: false, name: { nick: "Mia" } } as any;
    users.users["leo"] = { id: "leo", isAdult: false, name: { nick: "Leo" } } as any;
    users.currentUser.id = signedInAs;
    return mount(PartySettings, {
      global: { plugins: [pinia], mocks: { $getUserAvatar: () => "avatar.svg" }, stubs: { "xp-back-button": true, "xp-coming-soon-card": true } },
    });
  };

  beforeEach(() => {
    saved = null;
    const db = getFamilySettingsDb();
    jest.spyOn(db, "getSettings").mockImplementation(async () => saved as any);
    jest.spyOn(db, "saveSettings").mockImplementation(async (settings) => {
      saved = settings as unknown as Record<string, unknown>;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it("lists every hero with a switch, and no switch for a Game Master", async () => {
    const wrapper = mountParty("dad");
    await flushPromises();
    expect(wrapper.find('[data-cy="maker-mia"]').exists()).toBe(true);
    expect(wrapper.find('[data-cy="maker-leo"]').exists()).toBe(true);
    expect(wrapper.find('[data-cy="maker-dad"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Mia");
    expect(wrapper.text()).toContain("Leo");
  });

  it("shows the saved Makers as on", async () => {
    saved = { makers: ["mia"] };
    const wrapper = mountParty("dad");
    await flushPromises();
    expect((wrapper.find('[data-cy="maker-mia"]').element as HTMLInputElement).checked).toBe(true);
    expect((wrapper.find('[data-cy="maker-leo"]').element as HTMLInputElement).checked).toBe(false);
  });

  it("saves a hero as a Maker when a Game Master flips the switch", async () => {
    const wrapper = mountParty("dad");
    await flushPromises();
    await wrapper.find('[data-cy="maker-leo"]').setValue(true);
    await flushPromises();
    expect(saved).toMatchObject({ makers: ["leo"] });
  });

  it("locks the switches for a hero, so a kid's phone cannot flip them", async () => {
    const wrapper = mountParty("mia");
    await flushPromises();
    expect((wrapper.find('[data-cy="maker-leo"]').element as HTMLInputElement).disabled).toBe(true);
  });
});
