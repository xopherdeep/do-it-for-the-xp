import { reactive } from "vue";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PartySettings from "@/app/SideMenu/XpSettings/components/PartySettings.vue";
import { getFamilySettingsDb } from "@/lib/databases/FamilySettingsDb";
import { usePartyStore } from "@/lib/store/stores/party";
import { useUserStore } from "@/lib/store/stores/user";

jest.mock("@ionic/vue", () => {
  // The page's Ionic parts as plain boxes; the toggle is a real checkbox that says ionChange the way Ionic's does
  const boxes: Record<string, unknown> = {};
  for (const name of ["IonPage", "IonHeader", "IonToolbar", "IonButtons", "IonTitle", "IonContent", "IonCard", "IonCardContent", "IonCardHeader", "IonCardSubtitle", "IonCardTitle", "IonList", "IonItemDivider", "IonItem", "IonLabel", "IonAvatar", "IonImg", "IonBadge"]) {
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
// The rest of the signals stay real: the record signals (family sync) are made with makeSignal when the user store loads
jest.mock("@/lib/services/multiplayer/gameSignals", () => ({ ...jest.requireActual("@/lib/services/multiplayer/gameSignals"), emitHeroRemoved: jest.fn() }));

const mockFamily = reactive({ isKidMode: false });
jest.mock("@/lib/store/stores/family", () => ({ __esModule: true, useFamilyStore: () => mockFamily }));

const mockMembership = { removeHeroFromParties: jest.fn() };
jest.mock("@/hooks/usePartyMembership", () => ({ usePartyMembership: () => mockMembership }));

const mockSaveState = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/databases/PartyDb", () => ({
  __esModule: true,
  getPartyDb: () => ({
    getState: async () => null,
    saveState: (...args: unknown[]) => mockSaveState(...args),
  }),
}));

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
      global: { plugins: [pinia], mocks: { $getUserAvatar: () => "avatar.svg" }, stubs: { "xp-back-button": true, "xp-coming-soon-card": true, "party-hero-modes": true, "party-outside": true, "raid-window-picker": true } },
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

describe("Settings, Party", () => {
  let wrapper: VueWrapper | null = null;

  /** A household of one Game Master and two kids, with `viewerId` signed in */
  const open = async (viewerId: string): Promise<VueWrapper> => {
    const users = useUserStore();
    // The roster and the signed-in hero are reactive objects the store's getters close over: fill them in place
    Object.assign(users.users, {
      dad: { id: "dad", isAdult: true, name: { nick: "Dad" } },
      ana: { id: "ana", isAdult: false, name: { nick: "Ana" } },
      ben: { id: "ben", isAdult: false, name: { nick: "Ben" } },
    });
    users.currentUser.id = viewerId;
    wrapper = mount(PartySettings, { global: { stubs: { "xp-back-button": true, PartyOutside: true } } });
    await flushPromises();
    return wrapper;
  };

  const pressed = (page: VueWrapper, selector: string): string | undefined => page.find(selector).attributes("aria-pressed");

  beforeEach(() => {
    setActivePinia(createPinia());
    mockFamily.isKidMode = false;
    mockSaveState.mockClear();
    mockMembership.removeHeroFromParties.mockReset().mockResolvedValue({ ok: true, value: 0 });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("says the household is always a party", async () => {
    const page = await open("dad");
    expect(page.text()).toContain("Your household is always a party");
  });

  it("lists every hero with how they may party: kids ask first, grown-ups open", async () => {
    const page = await open("dad");
    expect(page.find('[data-cy="party-hero-modes"]').exists()).toBe(true);
    expect(pressed(page, '[data-cy="party-mode-ana-ask"]')).toBe("true");
    expect(pressed(page, '[data-cy="party-mode-ben-ask"]')).toBe("true");
    expect(pressed(page, '[data-cy="party-mode-dad-open"]')).toBe("true");
    expect(pressed(page, '[data-cy="party-mode-ana-open"]')).toBe("false");
  });

  it("lets a Game Master change a hero's mode, and saves it", async () => {
    const page = await open("dad");
    await page.find('[data-cy="party-mode-ana-home"]').trigger("click");
    expect(usePartyStore().modeOf("ana")).toBe("home");
    expect(pressed(page, '[data-cy="party-mode-ana-home"]')).toBe("true");
    expect(pressed(page, '[data-cy="party-mode-ana-ask"]')).toBe("false");
    expect(pressed(page, '[data-cy="party-mode-ben-ask"]')).toBe("true");
    expect(mockSaveState).toHaveBeenLastCalledWith(expect.objectContaining({ heroModes: { ana: "home" } }));
  });

  it("takes a hero out of the parties with other families when a Game Master sets Home only, and says how many", async () => {
    mockMembership.removeHeroFromParties.mockResolvedValue({ ok: true, value: 2 });
    const page = await open("dad");
    await page.find('[data-cy="party-mode-ana-home"]').trigger("click");
    await flushPromises();
    expect(mockMembership.removeHeroFromParties).toHaveBeenCalledWith("ana");
    expect(page.find('[data-cy="party-home-note"]').text()).toContain("Ana left 2 parties");
  });

  it("says so when a hero set to stay home could not leave a party, and where to leave it by hand", async () => {
    mockMembership.removeHeroFromParties.mockResolvedValue({ ok: false, problem: "offline" });
    const page = await open("dad");
    await page.find('[data-cy="party-mode-ana-home"]').trigger("click");
    await flushPromises();
    const note = page.find('[data-cy="party-home-note"]').text();
    expect(note).toContain("Ana is set to stay home");
    expect(note).toContain("No connection");
    expect(note).toContain("Leave");
    expect(usePartyStore().modeOf("ana")).toBe("home");
  });

  it("leaves the parties alone for every other mode", async () => {
    const page = await open("dad");
    await page.find('[data-cy="party-mode-ana-open"]').trigger("click");
    await flushPromises();
    expect(mockMembership.removeHeroFromParties).not.toHaveBeenCalled();
    expect(page.find('[data-cy="party-home-note"]').exists()).toBe(false);
  });

  it("tells the parties panel whether the viewer may change anything in it", async () => {
    expect((await open("dad")).findComponent({ name: "PartyOutside" }).props("canEdit")).toBe(true);
    await wrapper!.unmount();
    setActivePinia(createPinia());
    expect((await open("ana")).findComponent({ name: "PartyOutside" }).props("canEdit")).toBe(false);
  });

  it("describes the modes as they work: a Game Master adds the hero, and Home only takes them out of other parties", async () => {
    const text = (await open("dad")).find('[data-cy="party-hero-modes"]').text();
    expect(text).toContain("heroes cannot ask from their own phones yet");
    expect(text).toContain("takes them out of any other party");
    expect(text).not.toContain("waits for a Game Master");
  });

  it("shows a hero the modes but does not let them change one", async () => {
    const page = await open("ana");
    const button = page.find('[data-cy="party-mode-ana-open"]');
    expect(button.attributes("disabled")).toBeDefined();
    await button.trigger("click");
    expect(usePartyStore().modeOf("ana")).toBe("ask");
    expect(page.text()).toContain("Only a Game Master");
  });

  it("sets the usual raid length for a Game Master only", async () => {
    const page = await open("dad");
    expect(pressed(page, '[data-cy="party-default-window-standard"]')).toBe("true");
    await page.find('[data-cy="party-default-window-epic"]').trigger("click");
    expect(usePartyStore().defaultWindow).toBe("epic");
    expect(mockSaveState).toHaveBeenLastCalledWith(expect.objectContaining({ defaultWindow: "epic" }));

    await wrapper!.unmount();
    setActivePinia(createPinia());
    const heroPage = await open("ana");
    expect(heroPage.find('[data-cy="party-default-window-quick"]').attributes("disabled")).toBeDefined();
  });

  it("keeps only what is not built under Coming soon, and shows the parties, requests and codes", async () => {
    const page = await open("dad");
    const planned = page.findAll(".xp-coming-soon__item h2").map((title) => title.text());
    expect(planned).toEqual(["Family circle posts", "Raid alerts"]);
    expect(page.findComponent({ name: "PartyOutside" }).exists()).toBe(true);
  });
});
