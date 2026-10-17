import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import XpClassCodex from "@/app/Console/MyPortal/UserHud/components/ClassCodex/XpClassCodex.vue";
import { play$fx } from "@/assets/fx";

/**
 * Choose Your Class (XpClassCodex) on the real class tables. Only Ionic's overlay and content (plain divs) and the
 * sound board are replaced. The screen asks once before it changes class, celebrates, then closes itself.
 */
jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

const Plain = (name: string) =>
  defineComponent({
    name,
    props: { isOpen: Boolean },
    render() {
      return h("div", this.$slots.default?.());
    },
  });

type Hero = { jobClass?: string; stats?: { classes?: Record<string, { level?: number }> } };

let wrapper: VueWrapper | undefined;
const open = (user: Hero = { jobClass: "Warrior", stats: { classes: { Warrior: { level: 3 } } } }) => {
  setActivePinia(createPinia());
  wrapper = mount(XpClassCodex, {
    props: { isOpen: true, user },
    global: { stubs: { IonModal: Plain("IonModal"), IonContent: Plain("IonContent"), XpCloseButton: true } },
  });
  return wrapper;
};
const name = () => wrapper!.find(".cs-name").text();
const confirmButton = () => wrapper!.find("[data-cy=class-confirm]");

beforeEach(() => {
  jest.useFakeTimers();
  (play$fx as jest.Mock).mockClear();
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  jest.useRealTimers();
});

describe("Choose Your Class", () => {
  it("opens on the hero's own class, in its tier, with the button saying so", () => {
    open();
    expect(name()).toBe("Warrior");
    expect(wrapper!.find("[data-cy=class-tier-1]").classes()).toContain("is-active");
    expect(confirmButton().text()).toBe("This is your class");
    expect(confirmButton().attributes("disabled")).toBeDefined();
  });

  it("draws the five pillars as bars", () => {
    open();
    expect(wrapper!.findAll(".cs-bar").map((bar) => bar.find(".cs-bar-name").text())).toEqual([
      "Body",
      "Mind",
      "Spirit",
      "Heart",
      "Legend",
    ]);
  });

  it("the arrows browse the tier and wrap round", async () => {
    open();
    await wrapper!.find("[data-cy=class-next]").trigger("click");
    expect(name()).toBe("Mage");
    await wrapper!.find("[data-cy=class-prev]").trigger("click");
    await wrapper!.find("[data-cy=class-prev]").trigger("click");
    expect(name()).toBe("Monk");
    expect(play$fx).toHaveBeenCalledWith("cursor");
  });

  it("a sideways swipe on the stage pages it, a vertical one does not", async () => {
    open();
    const stage = wrapper!.find(".cs-stage");
    await stage.trigger("touchstart", { touches: [{ clientX: 300, clientY: 200 }] });
    await stage.trigger("touchend", { changedTouches: [{ clientX: 180, clientY: 210 }] });
    expect(name()).toBe("Mage");
    await stage.trigger("touchstart", { touches: [{ clientX: 200, clientY: 100 }] });
    await stage.trigger("touchend", { changedTouches: [{ clientX: 150, clientY: 300 }] });
    expect(name()).toBe("Mage");
  });

  it("asks before changing class, then emits the pick, celebrates and closes", async () => {
    open();
    await wrapper!.find("[data-cy=class-next]").trigger("click");
    await confirmButton().trigger("click");
    expect(wrapper!.find("[data-cy=class-confirm-dialog]").text()).toContain("Become a Mage?");
    expect(wrapper!.emitted("chosen")).toBeUndefined();

    await wrapper!.find("[data-cy=class-confirm-yes]").trigger("click");
    expect(wrapper!.emitted("chosen")).toEqual([["Mage"]]);
    expect(play$fx).toHaveBeenCalledWith("levelUp");
    expect(wrapper!.find("[data-cy=class-celebration]").text()).toContain("Mage!");
    expect(wrapper!.emitted("close")).toBeUndefined();

    jest.runAllTimers();
    await flushPromises();
    expect(wrapper!.emitted("close")).toHaveLength(1);
  });

  it("Not yet backs out and changes nothing", async () => {
    open();
    await wrapper!.find("[data-cy=class-next]").trigger("click");
    await confirmButton().trigger("click");
    await wrapper!.find("[data-cy=class-confirm-no]").trigger("click");
    expect(wrapper!.find("[data-cy=class-confirm-dialog]").exists()).toBe(false);
    expect(wrapper!.emitted("chosen")).toBeUndefined();
  });

  it("a sealed class shows what unlocks it and refuses to be picked", async () => {
    open();
    await wrapper!.find("[data-cy=class-tier-2]").trigger("click");
    expect(name()).toBe("Knight");
    expect(wrapper!.find("[data-cy=class-unlock]").text()).toContain("Warrior Lv 10");
    expect(wrapper!.find("[data-cy=class-unlock]").text()).toContain("3/10");
    expect(confirmButton().text()).toContain("Sealed · Warrior 10");

    await confirmButton().trigger("click");
    expect(play$fx).toHaveBeenCalledWith("no");
    expect(wrapper!.find("[data-cy=class-confirm-dialog]").exists()).toBe(false);
    expect(wrapper!.emitted("chosen")).toBeUndefined();
  });

  it("an advanced class opens once its parent reaches level 10", async () => {
    open({ jobClass: "Warrior", stats: { classes: { Warrior: { level: 10 } } } });
    await wrapper!.find("[data-cy=class-tier-2]").trigger("click");
    expect(wrapper!.find("[data-cy=class-tier-2]").text()).toContain("2/8");
    expect(confirmButton().text()).toBe("Become a Knight");
  });
});
