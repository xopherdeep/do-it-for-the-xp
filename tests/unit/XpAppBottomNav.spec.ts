import { mount } from "@vue/test-utils";
import XpAppBottomNav from "@/components/organisms/BottomNav/XpAppBottomNav.vue";
import type { AppNavTab } from "@/components/organisms/BottomNav/appBottomNav";

describe("XpAppBottomNav", () => {
  const tabs: AppNavTab[] = [
    { id: "all", label: "All", icon: "box", badge: 5 },
    { id: "potions", label: "Potions", icon: "flask", badge: 2 },
    { id: "keys", label: "Keys", icon: "key", badge: 0 },
  ];

  it("renders all tabs with labels", () => {
    const wrapper = mount(XpAppBottomNav, {
      props: {
        tabs,
        modelValue: "all",
      },
    });

    const buttons = wrapper.findAll(".xp-bottom-nav__slot");
    expect(buttons.length).toBe(3);
    expect(wrapper.text()).toContain("All");
    expect(wrapper.text()).toContain("Potions");
    expect(wrapper.text()).toContain("Keys");
  });

  it("marks the active tab with is-active class", () => {
    const wrapper = mount(XpAppBottomNav, {
      props: {
        tabs,
        modelValue: "potions",
      },
    });

    const buttons = wrapper.findAll(".xp-bottom-nav__slot");
    expect(buttons[0].classes()).not.toContain("is-active");
    expect(buttons[1].classes()).toContain("is-active");
  });

  it("displays badge only when badge value is greater than zero", () => {
    const wrapper = mount(XpAppBottomNav, {
      props: {
        tabs,
        modelValue: "all",
      },
    });

    const badges = wrapper.findAll(".xp-app-bottom-nav__badge");
    // Tab 1 has badge 5, Tab 2 has badge 2, Tab 3 has badge 0 (suppressed)
    expect(badges.length).toBe(2);
    expect(badges[0].text()).toBe("5");
    expect(badges[1].text()).toBe("2");
  });

  it("emits update:modelValue and change when an inactive tab is clicked", async () => {
    const wrapper = mount(XpAppBottomNav, {
      props: {
        tabs,
        modelValue: "all",
      },
    });

    const buttons = wrapper.findAll(".xp-bottom-nav__slot");
    await buttons[1].trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["potions"]);
    expect(wrapper.emitted("change")?.[0]).toEqual(["potions"]);
  });

  it("does not re-emit when the active tab is clicked", async () => {
    const wrapper = mount(XpAppBottomNav, {
      props: {
        tabs,
        modelValue: "all",
      },
    });

    const buttons = wrapper.findAll(".xp-bottom-nav__slot");
    await buttons[0].trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeFalsy();
  });
});
