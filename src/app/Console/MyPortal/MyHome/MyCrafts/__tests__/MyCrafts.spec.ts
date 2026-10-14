import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import MyCrafts from "../MyCrafts.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import XpAppSection from "@/components/organisms/XpApp/XpAppSection.vue";
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";
import XpAppChip from "@/components/organisms/XpApp/XpAppChip.vue";
import XpAppEmpty from "@/components/organisms/XpApp/XpAppEmpty.vue";
import { useGameStore } from "@/lib/store/stores/game";

/**
 * The Workbench app on the phone apps kit: the items are list rows (decoded title, excerpt as subtitle, picture as the
 * leading tile), the search field sits above the dock, the dock keeps its five tabs, and the options menu still opens
 * the Materials Inventory.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

const mockPush = jest.fn();
jest.mock("vue-router", () => ({ useRouter: () => ({ push: mockPush }) }));

const pass = { template: "<div><slot /></div>" };
const stubs = {
  IonPage: { template: "<div class='ion-page'><slot /></div>" },
  IonHeader: pass,
  IonToolbar: pass,
  IonContent: pass,
  IonFooter: pass,
  IonFab: pass,
  IonFabButton: { template: "<button class='fab-stub'><slot /></button>" },
  IonActionSheet: { props: ["isOpen", "header", "buttons"], template: "<div class='action-sheet-stub' />" },
  XpLoading: { template: "<div class='loading-stub' />" },
  XpBackButton: { template: "<button class='back-stub' />" },
  XpAppBottomNav: { props: ["tabs", "modelValue"], template: "<nav class='dock-stub' />" },
};
const components = { XpAppHeader, XpAppSection, XpAppRow, XpAppChip, XpAppEmpty };

const PARAMS = { page: 1, search: "", per_page: 4, order: "asc", orderby: "slug" };

const seed = (items: any[]) => {
  const game = useGameStore();
  items.forEach((item) => game.addEntity("xp_accessory", item));
  game.addEntity("media", { id: 9, source_url: "http://img/sword.png", alt_text: "sword" });
  game.addRequest("xp_accessory", {
    params: { ...PARAMS },
    ids: items.map((i) => i.id),
    total: String(items.length),
    total_pages: "1",
  });
};

const mountPage = () => mount(MyCrafts, { props: { userId: "hero-1" }, global: { stubs, components } });

beforeEach(() => {
  localStorage.clear();
  mockPush.mockClear();
  setActivePinia(createPinia());
});

describe("MyCrafts on the XpApp kit", () => {
  it("lists the items as rows with the workbench accent and the skin class on the page root", () => {
    seed([
      {
        id: 1,
        title: { rendered: "Wooden Sword &amp; Shield" },
        excerpt: { rendered: "<p>A sturdy start.</p>" },
        featured_media: 9,
      },
      { id: 2, title: { rendered: "Rope" } },
    ]);

    const wrapper = mountPage();

    const root = wrapper.find(".ion-page");
    expect(root.classes()).toEqual(expect.arrayContaining(["xp-app", "xp-app--modern", "my-crafts"]));
    expect(root.attributes("style")).toContain("--xp-app-accent: #e08a2e");

    const rows = wrapper.findAll(".xp-app-row");
    expect(rows).toHaveLength(2);
    expect(rows[0].find(".xp-app-row__title").text()).toBe("Wooden Sword & Shield");
    expect(rows[0].find(".xp-app-row__subtitle").text()).toBe("A sturdy start.");
    expect(rows[0].find("img").attributes("src")).toBe("http://img/sword.png");
    expect(rows[1].find(".xp-app-row__subtitle").exists()).toBe(false);
    expect(wrapper.find(".xp-app-header__meta").text()).toBe("2 items");
  });

  it("shows the empty state, and a search-aware line once the hero types", async () => {
    const wrapper = mountPage();

    expect(wrapper.find(".xp-app-row").exists()).toBe(false);
    expect(wrapper.find(".xp-app-empty__text").text()).toContain("workbench is bare");

    await wrapper.find(".xp-app-search input").setValue("anvil");

    expect(wrapper.find(".xp-app-empty__text").text()).toContain("matches that search");
  });

  it("keeps the search above the dock, the dock tabs, and no pager", () => {
    const wrapper = mountPage();

    const footer = wrapper.find(".crafts-footer");
    expect(footer.find(".xp-app-bar .xp-app-search input").exists()).toBe(true);
    const dock = wrapper.findComponent(stubs.XpAppBottomNav);
    expect((dock.props("tabs") as any[]).map((t) => t.label)).toEqual([
      "All",
      "Furniture",
      "Accessories",
      "Weapons",
      "Key",
    ]);
    expect(wrapper.find("ion-searchbar").exists()).toBe(false);
    expect(wrapper.text()).not.toMatch(/page \d+ of/i);
  });

  it("switches the filter from the dock and resets the page", async () => {
    const wrapper = mountPage();
    const dock = wrapper.findComponent(stubs.XpAppBottomNav);

    dock.vm.$emit("change", "mp");
    await wrapper.vm.$nextTick();

    expect((wrapper.vm as any).request.params.filter).toBe("mp");
    expect((wrapper.vm as any).request.params.page).toBe(1);
  });

  it("opens the options sheet from the FAB, with no header menu button, and every option goes somewhere", async () => {
    const wrapper = mountPage();
    const sheet = wrapper.findComponent(stubs.IonActionSheet);
    expect(sheet.props("isOpen")).toBe(false);
    expect(wrapper.find(".xp-app-header .xp-app-btn").exists()).toBe(false);

    const fab = wrapper.find(".fab-stub");
    expect(fab.classes()).toContain("crafts-fab");
    await fab.trigger("click");
    expect(sheet.props("isOpen")).toBe(true);

    const buttons = sheet.props("buttons") as any[];
    expect(buttons.map((b) => b.text)).toEqual(["Materials Inventory", "Open Storage", "Cancel"]);
    buttons.filter((b) => b.role !== "cancel").forEach((b) => expect(typeof b.handler).toBe("function"));

    buttons[0].handler();
    expect(mockPush).toHaveBeenLastCalledWith({ name: "my-inventory", params: { userId: "hero-1" } });
    buttons[1].handler();
    expect(mockPush).toHaveBeenLastCalledWith({ name: "storage", params: { userId: "hero-1" } });
  });
});
