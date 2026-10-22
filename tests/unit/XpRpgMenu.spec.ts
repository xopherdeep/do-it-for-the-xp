import { mount } from "@vue/test-utils";
import XpRpgMenu from "@/components/molecules/RpgMenu/XpRpgMenu.vue";

const action = (id: string, extra = {}) => ({ id, label: id, faIcon: "fist-raised", click: jest.fn(), ...extra });

describe("XpRpgMenu", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("renders a note on the row that has one and none on the others", () => {
    const w = mount(XpRpgMenu, { props: { actions: [action("attack", { note: "3 chores" }), action("defend")] } });
    expect(w.find("#attack .item-note").text()).toBe("3 chores");
    expect(w.find("#defend .item-note").exists()).toBe(false);
  });

  it("a disabled row is greyed, says so to screen readers and never fires", async () => {
    const powers = action("powers", { disabled: true, note: "no MP" });
    const w = mount(XpRpgMenu, { props: { actions: [powers] } });
    const row = w.find("#powers");
    expect(row.attributes("aria-disabled")).toBe("true");
    expect(row.attributes("disabled")).toBeDefined();
    await row.trigger("click");
    await row.trigger("keydown.enter");
    // The browser swallows a click on a disabled button, so call the handler itself: it refuses too
    (w.vm as any).handleAction(powers);
    expect(powers.click).not.toHaveBeenCalled();
    expect(w.emitted("action-click")).toBeUndefined();
  });

  it("a tapped row is current for 150 ms, then not", async () => {
    const w = mount(XpRpgMenu, { props: { actions: [action("attack")] } });
    await w.find("#attack").trigger("click");
    expect(w.find("#attack").classes()).toContain("is-current");
    jest.advanceTimersByTime(150);
    await w.vm.$nextTick();
    expect(w.find("#attack").classes()).not.toContain("is-current");
  });

  it("clears the current-row timer on unmount", async () => {
    const w = mount(XpRpgMenu, { props: { actions: [action("attack")] } });
    await w.find("#attack").trigger("click");
    expect(jest.getTimerCount()).toBe(1);
    w.unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("a fullWidth action spans both columns", () => {
    const w = mount(XpRpgMenu, { props: { actions: [action("attack", { fullWidth: true }), action("defend")] } });
    expect((w.find("#attack").element.parentElement as HTMLElement).style.gridColumn).toBe("1 / -1");
  });
});
