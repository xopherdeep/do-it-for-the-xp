import { mount } from "@vue/test-utils";
import XpHeroFanfare from "@/components/organisms/HeroFanfare/XpHeroFanfare.vue";

jest.mock("@/assets/fx", () => ({
  __esModule: true,
  default: {
    ui: { nintendo: {} },
    rpg: { earthbound: { BGM: {} } },
    theme: { ui: "nintendo", rpg: "earthbound" },
  },
  play$fx: jest.fn(),
}));

jest.mock("@/lib/services/feedback/haptics", () => ({
  feel: jest.fn(),
}));

describe("XpHeroFanfare", () => {
  it("renders with default hero announcement line and button", () => {
    const wrapper = mount(XpHeroFanfare, {
      props: {
        open: true,
        name: "Test Hero",
        jobClass: "Warrior",
      },
      global: {
        stubs: {
          Transition: false,
          XpConfettiBurst: true,
        },
      },
    });

    expect(wrapper.find("[data-cy=hero-fanfare]").exists()).toBe(true);
    expect(wrapper.find("[data-cy=hero-fanfare-card]").text()).toContain("Test Hero");
    expect(wrapper.find("[data-cy=hero-fanfare-begin]").text()).toContain("Begin your adventure");
  });

  it("supports custom title, subtitle, and actionText for quest creation fanfare", () => {
    const wrapper = mount(XpHeroFanfare, {
      props: {
        open: true,
        name: "Clean the Castle",
        subtitle: "Dusty Dragon",
        title: "A new quest joins the log!",
        actionText: "Accept quest",
        portrait: "/img/beasts/001.webp",
      },
      global: {
        stubs: {
          Transition: false,
          XpConfettiBurst: true,
        },
      },
    });

    expect(wrapper.find("[data-cy=hero-fanfare]").exists()).toBe(true);
    expect(wrapper.find("[data-cy=hero-fanfare-card]").text()).toContain("Clean the Castle");
    expect(wrapper.find("[data-cy=hero-fanfare-card]").text()).toContain("Dusty Dragon");
    expect(wrapper.find("[data-cy=hero-fanfare-begin]").text()).toContain("Accept quest");
  });
});
