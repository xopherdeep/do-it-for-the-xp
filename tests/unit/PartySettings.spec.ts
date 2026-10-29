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
