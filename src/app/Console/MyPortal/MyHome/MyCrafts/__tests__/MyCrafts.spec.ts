import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import MyCrafts from "../MyCrafts.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";

/**
 * The Workbench app on the phone apps kit. It read a WordPress feed that no longer answers, so the room shows the
 * game's Coming soon card instead (GitHub issue 140). The dock keeps its five tabs and the options menu still opens
 * the Materials Inventory and Storage.
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
  XpBackButton: { template: "<button class='back-stub' />" },
  XpAppBottomNav: { props: ["tabs", "modelValue"], template: "<nav class='dock-stub' />" },
};
const components = { XpAppHeader };

const mountPage = () => mount(MyCrafts, { props: { userId: "hero-1" }, global: { stubs, components } });

beforeEach(() => {
  localStorage.clear();
  mockPush.mockClear();
  setActivePinia(createPinia());
});

describe("MyCrafts on the XpApp kit", () => {
  it("shows the Coming soon card in the workbench's own words, with the workbench accent and skin on the page root", () => {
    const wrapper = mountPage();

    const root = wrapper.find(".ion-page");
    expect(root.classes()).toEqual(expect.arrayContaining(["xp-app", "xp-app--modern", "my-crafts"]));
    expect(root.attributes("style")).toContain("--xp-app-accent: #e08a2e");

    expect(wrapper.find('[data-cy="coming-soon"]').exists()).toBe(true);
    expect(wrapper.find(".xp-coming-soon__badge").text()).toBe("Coming soon");
    expect(wrapper.findAll(".xp-coming-soon__item h2").map((title) => title.text())).toEqual([
      "Crafting",
      "Repairs",
    ]);
    expect(wrapper.find(".xp-app-header__title").text()).toBe("Workbench");
  });

  it("no longer reads the dead feed: no bare-bench line, no rows, no loader, no count in the header", () => {
    const wrapper = mountPage();

    expect((wrapper.vm as any).request).toBeUndefined();
    expect((wrapper.vm as any).listItems).toBeUndefined();
    expect(wrapper.find(".xp-app-row").exists()).toBe(false);
    expect(wrapper.find(".xp-app-empty").exists()).toBe(false);
    expect(wrapper.find(".loading-stub").exists()).toBe(false);
    expect(wrapper.find(".xp-app-header__meta").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("workbench is bare");
  });

  it("keeps the dock's five tabs, with no search strip and no pager", () => {
    const wrapper = mountPage();

    const footer = wrapper.find(".crafts-footer");
    expect(footer.find(".xp-app-search").exists()).toBe(false);
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

  it("moves the dock's highlight when a tab is picked", async () => {
    const wrapper = mountPage();
    const dock = wrapper.findComponent(stubs.XpAppBottomNav);
    expect(dock.props("modelValue")).toBe("all");

    dock.vm.$emit("update:modelValue", "mp");
    await wrapper.vm.$nextTick();

    expect(dock.props("modelValue")).toBe("mp");
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
