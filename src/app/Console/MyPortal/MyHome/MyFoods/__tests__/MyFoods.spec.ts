import { flushPromises, mount, VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, nextTick } from "vue";
import MyFoods from "../MyFoods.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import XpAppSection from "@/components/organisms/XpApp/XpAppSection.vue";
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";
import XpAppChip from "@/components/organisms/XpApp/XpAppChip.vue";
import XpAppEmpty from "@/components/organisms/XpApp/XpAppEmpty.vue";
import { useUserStore } from "@/lib/store/stores/user";
import { useGameStore } from "@/lib/store/stores/game";

/**
 * The Kitchen as a phone app on the XpApp kit: foods as grouped list rows with a sprite and a favourites star, the
 * search field in the strip above the dock, and the empty line. The skin comes from the real game store.
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
        "xp-app-section": XpAppSection,
        "xp-app-row": XpAppRow,
        "xp-app-chip": XpAppChip,
        "xp-app-empty": XpAppEmpty,
        "xp-back-button": BackButtonStub,
      },
    },
  });

const rowTitles = (wrapper: VueWrapper<any>): string[] =>
  wrapper.findAll(".xp-app-row__title").map((title) => title.text());

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
  it("lists the foods as kit rows under their kind of food, with no cards", () => {
    const wrapper = mountKitchen();

    expect(wrapper.findAll(".xp-app-section__label").map((label) => label.text())).toEqual([
      "Meals",
      "Snacks",
      "Desserts",
    ]);
    expect(rowTitles(wrapper)).toEqual(["Pizza", "Burger", "Salad", "Pasta", "Apple", "Cookies", "Ice Cream"]);
    expect(wrapper.find("ion-card").exists()).toBe(false);
    expect(wrapper.find(".xp-app-header__title").text()).toBe("Kitchen");
    expect(wrapper.find(".xp-app-header__meta").text()).toBe("7 items");
  });

  it("gives every row a sprite tile and a kind tag", () => {
    const wrapper = mountKitchen();
    const pizza = wrapper.findAll(".xp-app-row")[0];

    expect(pizza.find(".xp-app-row__tile .fa-pizza-slice").exists()).toBe(true);
    expect(pizza.find(".xp-app-chip").text()).toBe("Meal");
    expect(pizza.find(".xp-app-row__subtitle").text()).toBe("Cheesy and delicious");
  });

  it("takes the skin and the kitchen accent from the profile toggle", async () => {
    const wrapper = mountKitchen();
    expect(wrapper.classes()).toEqual(expect.arrayContaining(["xp-app", "xp-app--retro"]));
    expect(wrapper.element.style.getPropertyValue("--xp-app-accent")).toBe("#c9971f");

    useGameStore().setFabStyle("modern");
    await nextTick();

    expect(wrapper.classes()).toContain("xp-app--modern");
  });

  it("narrows the list as the hero types in the search field above the dock", async () => {
    const wrapper = mountKitchen();

    await wrapper.find(".xp-app-search input").setValue("pizza");

    expect(rowTitles(wrapper)).toEqual(["Pizza"]);
  });

  it("filters by the dock's category tab", async () => {
    const wrapper = mountKitchen();

    wrapper.vm.selectedCategory = "dessert";
    await nextTick();

    expect(rowTitles(wrapper)).toEqual(["Ice Cream"]);
    expect(wrapper.find(".xp-app-header__meta").text()).toBe("1 item");
  });

  it("tells a hero without a favourite food to set one in the profile", async () => {
    const wrapper = mountKitchen();

    wrapper.vm.selectedCategory = "favorites";
    await nextTick();

    expect(wrapper.find(".xp-app-row").exists()).toBe(false);
    expect(wrapper.find(".xp-app-empty__text").text()).toBe("You haven't set a favorite food in your profile!");
  });

  it("stars the favourite food of the hero's profile and shows only it under Favorites", async () => {
    (useUserStore().users as Record<string, any>)["hero-1"] = { id: "hero-1", favoriteFood: "pizza" };
    const wrapper = mountKitchen("hero-1");

    expect(wrapper.findAll(".food-star")).toHaveLength(1);
    expect(wrapper.findAll(".xp-app-row")[0].find(".food-star").exists()).toBe(true);

    wrapper.vm.selectedCategory = "favorites";
    await nextTick();

    expect(rowTitles(wrapper)).toEqual(["Pizza"]);
  });

  it("shows the empty line when the search matches nothing", async () => {
    const wrapper = mountKitchen();

    await wrapper.find(".xp-app-search input").setValue("zzz");

    expect(wrapper.find(".xp-app-empty__text").text()).toBe("No food items found matching your criteria.");
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
