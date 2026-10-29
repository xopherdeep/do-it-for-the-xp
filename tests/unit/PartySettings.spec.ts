import { reactive } from "vue";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PartySettings from "@/app/SideMenu/XpSettings/components/PartySettings.vue";
import { usePartyStore } from "@/lib/store/stores/party";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * Settings > Party is the Game Master's control room: how each hero may party (open, ask first, home only), the usual raid
 * length, and the planned items. Everyone else may read it, not change it.
 */

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

describe("Settings, Party", () => {
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
