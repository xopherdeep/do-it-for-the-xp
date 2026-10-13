import { mount } from "@vue/test-utils";
import XpBuilderNav from "@/components/organisms/HeroModel/builder/XpBuilderNav.vue";
import { TABS } from "@/components/organisms/HeroModel/lookEditor";

/**
 * The hero builder's own bottom nav in jsdom: one tab per look category and the Done button after them.
 * It is plain HTML (no Ionic, no hero model) and it only emits; the builder screen decides what a tap does.
 */

const show = (props: Record<string, unknown> = {}) => mount(XpBuilderNav, { props: { modelValue: "body", ...props } });

const tabButton = (wrapper: ReturnType<typeof show>, label: string) =>
  wrapper.findAll("[role=tab]").find((tab) => tab.text() === label)!;

describe("XpBuilderNav", () => {
  it("has one tab per category in order, then Done", () => {
    const wrapper = show();
    const tablist = wrapper.find("[role=tablist]");

    expect(tablist.attributes("aria-label")).toBe("What to change");
    expect(wrapper.findAll("[role=tab]").map((tab) => tab.text())).toEqual(["Body", "Hair", "Face", "Outfit", "Hat"]);
    expect(wrapper.findAll("[role=tab]").map((tab) => tab.text())).toEqual(TABS.map((tab) => tab.label));

    const done = wrapper.find("[data-cy=builder-done]");
    expect(done.exists()).toBe(true);
    expect(done.text()).toBe("Done");
    expect(done.attributes("aria-label")).toBe("Done, save my hero");
    expect(done.find("i.fad.fa-check-circle").exists()).toBe(true);
    // Done is a button of its own, not one of the tabs
    expect(tablist.find("[data-cy=builder-done]").exists()).toBe(false);
    expect(done.attributes("role")).toBeUndefined();
  });

  it("draws an icon over each tab label", () => {
    const wrapper = show();
    TABS.forEach((tab) => {
      const button = tabButton(wrapper, tab.label);
      expect(button.find(`i.fad.${tab.icon}`).exists()).toBe(true);
    });
  });

  it("marks the active tab and emits the new one", async () => {
    const wrapper = show({ modelValue: "body" });

    expect(tabButton(wrapper, "Body").attributes("aria-selected")).toBe("true");
    expect(tabButton(wrapper, "Body").classes()).toContain("active");
    expect(tabButton(wrapper, "Hair").attributes("aria-selected")).toBe("false");
    expect(tabButton(wrapper, "Hair").classes()).not.toContain("active");

    await tabButton(wrapper, "Hair").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["hair"]]);

    // The parent owns the value: it follows the prop, not the tap
    await wrapper.setProps({ modelValue: "hair" });
    expect(tabButton(wrapper, "Hair").attributes("aria-selected")).toBe("true");
    expect(tabButton(wrapper, "Body").attributes("aria-selected")).toBe("false");

    await tabButton(wrapper, "Hair").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["hair"]]);
  });

  it("emits done", async () => {
    const wrapper = show();

    await wrapper.find("[data-cy=builder-done]").trigger("click");

    expect(wrapper.emitted("done")).toHaveLength(1);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
