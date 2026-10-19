import { flushPromises, mount, VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, nextTick } from "vue";
import MyFoods from "../MyFoods.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import { useUserStore } from "@/lib/store/stores/user";
import { useGameStore } from "@/lib/store/stores/game";

/**
 * The Kitchen as a phone app on the XpApp kit. Its food list was mock data, so the room shows the game's Coming soon
 * card instead (GitHub issue 140). The app's own dock and the FAB with its two real options stay.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

const mockSheet = { present: jest.fn(async () => undefined) };
const mockCreateSheet = jest.fn(async (_options: unknown) => mockSheet);
jest.mock("@ionic/vue", () => ({
  ...jest.requireActual("@ionic/vue"),
  actionSheetController: { create: (options: unknown) => mockCreateSheet(options) },
}));

const routerPush = jest.fn();

const BackButtonStub = defineComponent({ render: () => h("button", { class: "back-stub" }) });

const mountKitchen = (userId = "hero-1"): VueWrapper<any> =>
  mount(MyFoods, {
    props: { userId },
    global: {
      mocks: { $router: { push: routerPush } },
      components: {
        "xp-app-header": XpAppHeader,
        "xp-back-button": BackButtonStub,
      },
    },
  });

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  routerPush.mockClear();
  mockCreateSheet.mockClear();
  mockSheet.present.mockClear();
});

interface SheetButton {
  text: string;
  role?: string;
  handler?: () => void;
}

// Taps the kitchen's FAB and hands back what the action sheet was built with
const openSheet = async (wrapper: VueWrapper<any>) => {
  await wrapper.find("ion-fab-button").trigger("click");
  await flushPromises();
  return mockCreateSheet.mock.calls[0][0] as { header: string; buttons: SheetButton[] };
};

describe("MyFoods", () => {
  it("shows the Coming soon card in the kitchen's own words, in place of a food list", () => {
    const wrapper = mountKitchen();

    expect(wrapper.find('[data-cy="coming-soon"]').exists()).toBe(true);
    expect(wrapper.find(".xp-coming-soon__badge").text()).toBe("Coming soon");
    expect(wrapper.findAll(".xp-coming-soon__item h2").map((title) => title.text())).toEqual([
      "Recipe book",
      "Pantry shelf",
    ]);
    expect(wrapper.find(".xp-app-header__title").text()).toBe("Kitchen");
  });

  it("has no mock foods, no food rows, no count in the header and no search strip", () => {
    const wrapper = mountKitchen();

    expect(wrapper.vm.mockFoods).toBeUndefined();
    expect(wrapper.find(".xp-app-row").exists()).toBe(false);
    expect(wrapper.find(".xp-app-header__meta").exists()).toBe(false);
    expect(wrapper.find(".xp-app-search").exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/Pizza|Burger|Ice Cream|Cookies/);
  });

  it("takes the skin and the kitchen accent from the profile toggle", async () => {
    const wrapper = mountKitchen();
    expect(wrapper.classes()).toEqual(expect.arrayContaining(["xp-app", "xp-app--modern"]));
    expect(wrapper.element.style.getPropertyValue("--xp-app-accent")).toBe("#c9971f");

    useGameStore().setFabStyle("retro");
    await nextTick();

    expect(wrapper.classes()).toContain("xp-app--retro");
  });

  it("keeps the dock's six tabs as they were", () => {
    const wrapper = mountKitchen();

    expect(wrapper.vm.foodTabs.map((tab: { label: string }) => tab.label)).toEqual([
      "All",
      "Favorites",
      "Meals",
      "Snacks",
      "Desserts",
      "Pantry",
    ]);
  });

  it("opens the kitchen actions from the FAB and has no second button for them in the app bar", async () => {
    const wrapper = mountKitchen();

    expect(wrapper.findAll("ion-fab")).toHaveLength(1);
    expect(wrapper.find("ion-fab-button .fa-hat-chef").exists()).toBe(true);
    expect(wrapper.find(".xp-app-header__end").exists()).toBe(false);

    const sheet = await openSheet(wrapper);

    expect(sheet.header).toBe("Kitchen Actions");
    expect(mockSheet.present).toHaveBeenCalledTimes(1);
  });

  it("offers only options that lead somewhere: the Feast Decree Power, the Market and Cancel", async () => {
    const sheet = await openSheet(mountKitchen());

    expect(sheet.buttons.map((button) => button.text)).toEqual([
      "Feast Decree",
      "Buy a Treat at the Market",
      "Cancel",
    ]);
    const live = sheet.buttons.filter((button) => button.role !== "cancel");
    expect(live.every((button) => typeof button.handler === "function")).toBe(true);
  });

  it("takes the hero to the Powers page for the Feast Decree and to the Market for a treat", async () => {
    const sheet = await openSheet(mountKitchen("hero-1"));

    sheet.buttons[0].handler?.();
    expect(routerPush).toHaveBeenLastCalledWith({ name: "my-abilities", params: { userId: "hero-1" } });

    sheet.buttons[1].handler?.();
    expect(routerPush).toHaveBeenLastCalledWith({ name: "shop", params: { userId: "hero-1" } });
  });

  it("falls back to the signed-in hero when the page is opened without an id", async () => {
    (useUserStore() as any).currentUser = { id: "hero-2" };
    const sheet = await openSheet(mountKitchen(""));

    sheet.buttons[1].handler?.();

    expect(routerPush).toHaveBeenLastCalledWith({ name: "shop", params: { userId: "hero-2" } });
  });
});
