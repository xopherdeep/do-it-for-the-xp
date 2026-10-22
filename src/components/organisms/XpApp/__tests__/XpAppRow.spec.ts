import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { h } from "vue";
import XpAppRow from "../XpAppRow.vue";
import XpAppChip from "../XpAppChip.vue";
import { appIconClass, useAppSkin, XP_APP_ACCENTS } from "../useAppSkin";
import { useGameStore } from "@/lib/store/stores/game";
import { play$fx } from "@/assets/fx";

/**
 * The phone apps kit row: title and subtitle, one `click` per tap or key press with the cursor sound, a disabled row
 * that stays quiet, an inner button that answers on its own, and the ▶ cursor that only the retro skin draws.
 * The skin comes from the real game store; only the sound board is a spy.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

const playFx = play$fx as jest.Mock;

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  playFx.mockClear();
});

describe("XpAppRow", () => {
  it("renders the title and the subtitle", () => {
    const wrapper = mount(XpAppRow, { props: { title: "Wash the dishes", subtitle: "Kitchen, before dinner" } });

    expect(wrapper.find(".xp-app-row__title").text()).toBe("Wash the dishes");
    expect(wrapper.find(".xp-app-row__subtitle").text()).toBe("Kitchen, before dinner");
  });

  it("leaves out the subtitle, the chips and the leading tile when there is nothing to show", () => {
    const wrapper = mount(XpAppRow, { props: { title: "Plain" } });

    expect(wrapper.find(".xp-app-row__subtitle").exists()).toBe(false);
    expect(wrapper.find(".xp-app-row__chips").exists()).toBe(false);
    expect(wrapper.find(".xp-app-row__tile").exists()).toBe(false);
  });

  it("emits click with the cursor sound when tapped", async () => {
    const wrapper = mount(XpAppRow, { props: { title: "Open me" } });

    await wrapper.trigger("click");

    expect(wrapper.emitted("click")).toHaveLength(1);
    expect(playFx).toHaveBeenCalledTimes(1);
    expect(playFx).toHaveBeenCalledWith("cursor");
  });

  it("emits click for Enter and Space on the focused row", async () => {
    const wrapper = mount(XpAppRow, { props: { title: "Open me" } });

    await wrapper.trigger("keydown", { key: "Enter" });
    await wrapper.trigger("keydown", { key: " " });

    expect(wrapper.emitted("click")).toHaveLength(2);
  });

  it("stays quiet when disabled", async () => {
    const wrapper = mount(XpAppRow, { props: { title: "Locked", disabled: true } });

    await wrapper.trigger("click");
    await wrapper.trigger("keydown", { key: "Enter" });

    expect(wrapper.emitted("click")).toBeUndefined();
    expect(playFx).not.toHaveBeenCalled();
    expect(wrapper.attributes("aria-disabled")).toBe("true");
    expect(wrapper.classes()).toContain("is-disabled");
  });

  it("lets a trailing button answer on its own without firing the row", async () => {
    const onCast = jest.fn();
    const wrapper = mount(XpAppRow, {
      props: { title: "Stop", chevron: false },
      slots: { trailing: () => h("button", { class: "xp-app-btn", onClick: onCast }, "Cast") },
    });

    await wrapper.find("button").trigger("click");

    expect(onCast).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("click")).toBeUndefined();
    expect(playFx).not.toHaveBeenCalled();
  });

  it("marks the active row", () => {
    const wrapper = mount(XpAppRow, { props: { title: "Now", active: true } });

    expect(wrapper.classes()).toContain("is-active");
    expect(wrapper.attributes("aria-current")).toBe("true");
  });

  it("shows the chevron by default and drops it with chevron=false", () => {
    expect(mount(XpAppRow, { props: { title: "A" } }).find(".xp-app-row__chevron").exists()).toBe(true);
    expect(mount(XpAppRow, { props: { title: "A", chevron: false } }).find(".xp-app-row__chevron").exists()).toBe(false);
  });

  it("draws the leading tile from the slot, the image or the icon, in that order", () => {
    const icon = mount(XpAppRow, { props: { title: "A", icon: "scroll" } });
    expect(icon.find(".xp-app-row__tile i").classes()).toEqual(expect.arrayContaining(["fad", "fa-scroll"]));
    expect(icon.classes()).toContain("xp-app-row--tile");

    const image = mount(XpAppRow, { props: { title: "A", icon: "scroll", image: "beast.png" } });
    expect(image.find(".xp-app-row__tile img").attributes("src")).toBe("beast.png");
    expect(image.find(".xp-app-row__tile i").exists()).toBe(false);

    const slot = mount(XpAppRow, {
      props: { title: "A", image: "beast.png" },
      slots: { leading: () => h("span", { class: "sprite" }, "S") },
    });
    expect(slot.find(".xp-app-row__tile .sprite").exists()).toBe(true);
    expect(slot.find(".xp-app-row__tile img").exists()).toBe(false);
  });

  it("renders the chips slot", () => {
    const wrapper = mount(XpAppRow, {
      props: { title: "A" },
      slots: { chips: () => [h(XpAppChip, { kind: "xp", value: 12 }), h(XpAppChip, { kind: "gp", value: 5 })] },
    });

    expect(wrapper.findAll(".xp-app-row__chips .xp-app-chip")).toHaveLength(2);
  });

  describe("skins", () => {
    it("draws the ▶ cursor in the retro skin", () => {
      useGameStore().setFabStyle("retro");

      const wrapper = mount(XpAppRow, { props: { title: "A" } });

      expect(wrapper.find(".xp-app-row__cursor").exists()).toBe(true);
      expect(wrapper.find(".xp-app-row__cursor").text()).toBe("▶");
    });

    it("leaves the cursor out of the modern skin", () => {
      useGameStore().setFabStyle("modern");

      const wrapper = mount(XpAppRow, { props: { title: "A" } });

      expect(wrapper.find(".xp-app-row__cursor").exists()).toBe(false);
    });
  });
});

describe("XpAppChip", () => {
  it("writes the unit after the value for currencies and stats", () => {
    expect(mount(XpAppChip, { props: { kind: "xp", value: 12 } }).text()).toBe("12 XP");
    expect(mount(XpAppChip, { props: { kind: "gp", value: 5 } }).text()).toBe("5 GP");
    expect(mount(XpAppChip, { props: { kind: "mp", value: 30 } }).text()).toBe("30 MP");
  });

  it("writes a quantity as x3 and a tag as its plain text", () => {
    const qty = mount(XpAppChip, { props: { kind: "qty", value: 3 } });
    expect(qty.text()).toBe("×3");
    expect(qty.classes()).toContain("xp-app-chip--qty");
    expect(mount(XpAppChip, { props: { kind: "tag", value: "Daily" } }).text()).toBe("Daily");
  });
});

describe("useAppSkin", () => {
  it("follows the Retro / Modern toggle and gives the page its root class", () => {
    const store = useGameStore();
    const { skin, rootClass } = useAppSkin();

    store.setFabStyle("retro");
    expect(skin.value).toBe("retro");
    expect(rootClass.value).toEqual(["xp-app", "xp-app--retro"]);

    store.setFabStyle("modern");
    expect(skin.value).toBe("modern");
    expect(rootClass.value).toEqual(["xp-app", "xp-app--modern"]);
  });

  it("puts the accent in --xp-app-accent, by colour or by app name", () => {
    expect(useAppSkin("#123456").rootStyle.value).toEqual({ "--xp-app-accent": "#123456" });
    expect(useAppSkin("quests").rootStyle.value).toEqual({ "--xp-app-accent": XP_APP_ACCENTS.quests });
    expect(useAppSkin().rootStyle.value["--xp-app-accent"]).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("appIconClass", () => {
  it("takes a bare name, an fa- name or a whole class list", () => {
    expect(appIconClass("scroll")).toBe("fa-scroll");
    expect(appIconClass("fa-scroll")).toBe("fa-scroll");
    expect(appIconClass("fad fa-scroll")).toBe("fa-scroll");
    expect(appIconClass("fas fa-hat-wizard fa-flip")).toBe("fa-hat-wizard fa-flip");
    expect(appIconClass(undefined)).toBe("");
  });

  it("renames a Font Awesome 6 name to the glyph the vendored FA 5 font has", () => {
    expect(appIconClass("flask-round-potion")).toBe("fa-flask-potion");
    expect(appIconClass("fad fa-flask-round-potion")).toBe("fa-flask-potion");
  });
});
