import { mount } from "@vue/test-utils";
import XpLookEditor from "@/components/organisms/HeroModel/XpLookEditor.vue";
import { HAIR_STYLES, DEFAULT_LOOK, type HeroLook } from "@/lib/hero-look/types";
import { TABS, handIcon, styleLabel, withHands, withoutHands } from "@/components/organisms/HeroModel/lookEditor";

/**
 * The look editor in jsdom: the voxel hero is stubbed (no WebGL, no three.js), so these specs only watch what
 * the editor hands the hero and what it emits when a chip is tapped. The editor is plain HTML, no Ionic.
 */

jest.mock("@/components/organisms/HeroModel/XpHeroModel.vue", () => {
  const { defineComponent, h } = jest.requireActual("vue");
  return {
    __esModule: true,
    default: defineComponent({
      name: "xp-hero-model",
      props: { look: { type: Object, default: () => ({}) }, animation: { type: String, default: "idle" }, interactive: Boolean },
      setup(_props: unknown, { expose }: { expose: (exposed: Record<string, unknown>) => void }) {
        expose({ snapshot: (size = 256) => `data:image/png;snapshot-${size}` });
        return () => h("div", { class: "hero-stub" });
      },
    }),
  };
});

const show = (props: Record<string, unknown> = {}) =>
  mount(XpLookEditor, { props: { modelValue: { ...DEFAULT_LOOK }, ...props } });

const hero = (wrapper: ReturnType<typeof show>) => wrapper.findComponent({ name: "xp-hero-model" });
const tabButton = (wrapper: ReturnType<typeof show>, label: string) =>
  wrapper.findAll("[role=tab]").find((tab) => tab.text() === label)!;
const styleButtons = (wrapper: ReturnType<typeof show>) => wrapper.findAll("button.style-button");
const lastEmitted = (wrapper: ReturnType<typeof show>): HeroLook => {
  const events = wrapper.emitted("update:modelValue") as HeroLook[][];
  return events[events.length - 1][0];
};

describe("XpLookEditor", () => {
  it("draws the hero from the draft look and the preview animation", () => {
    const look = { ...DEFAULT_LOOK, hair: "mohawk" as const };
    const wrapper = show({ modelValue: look, preview: "dance" });

    expect(hero(wrapper).props("look")).toMatchObject({ hair: "mohawk", skin: DEFAULT_LOOK.skin });
    expect(hero(wrapper).props("animation")).toBe("dance");
  });

  it("idles by default", () => {
    expect(hero(show()).props("animation")).toBe("idle");
  });

  describe("picking", () => {
    it("emits the look with just that key changed when a style chip is tapped", async () => {
      const draft = { ...DEFAULT_LOOK };
      const wrapper = show({ modelValue: draft });

      await tabButton(wrapper, "Hair").trigger("click");
      const spiky = styleButtons(wrapper).find((button) => button.text() === "Spiky")!;
      await spiky.trigger("click");

      expect(lastEmitted(wrapper)).toEqual({ ...DEFAULT_LOOK, hair: "spiky" });
      expect(draft.hair).toBe(DEFAULT_LOOK.hair); // the prop is the page's: the editor never edits it in place
    });

    it("emits the colour key when a swatch is tapped", async () => {
      const wrapper = show();

      // Body: skin tones
      const deep = wrapper.get("button.swatch[aria-label=deep]");
      await deep.trigger("click");

      expect(lastEmitted(wrapper)).toEqual({ ...DEFAULT_LOOK, skin: "deep" });
    });

    it("marks the chip that matches the draft and moves the mark with the draft", async () => {
      const wrapper = show({ modelValue: { ...DEFAULT_LOOK, hat: "crown" } });

      await tabButton(wrapper, "Hat").trigger("click");
      const pressed = () => styleButtons(wrapper).filter((b) => b.attributes("aria-pressed") === "true").map((b) => b.text());
      expect(pressed()).toEqual(["Crown"]);

      await wrapper.setProps({ modelValue: { ...DEFAULT_LOOK, hat: "wizard" } });
      expect(pressed()).toEqual(["Wizard"]);
    });

    it("does not carry the hands into what it emits", async () => {
      const wrapper = show({ equipment: { leftHand: [{ faIcon: "fa-sword" }] } });

      await wrapper.get("button.swatch[aria-label=tan]").trigger("click");

      expect(lastEmitted(wrapper)).not.toHaveProperty("leftHand");
      expect(lastEmitted(wrapper).skin).toBe("tan");
    });
  });

  describe("the tab strip", () => {
    it("has one tab per category, starting on the first, in a tablist", () => {
      const wrapper = show();
      const tabs = wrapper.findAll("[role=tab]");

      expect(wrapper.find("[role=tablist]").exists()).toBe(true);
      expect(tabs.map((tab) => tab.text())).toEqual(TABS.map((tab) => tab.label));
      expect(tabs.map((tab) => tab.attributes("aria-selected"))).toEqual(["true", "false", "false", "false", "false"]);
    });

    it("sits at the bottom of the editor, under the options", () => {
      const panel = show().get(".look-panel").element;

      expect(panel.lastElementChild?.getAttribute("role")).toBe("tablist");
    });

    it("shows only the options of the chosen category", async () => {
      const wrapper = show();

      // Body: skin tones, no styles
      expect(styleButtons(wrapper)).toHaveLength(0);
      expect(wrapper.findAll("button.swatch")).toHaveLength(TABS[0].colors[0].swatches.length);

      await tabButton(wrapper, "Hair").trigger("click");
      expect(styleButtons(wrapper).map((button) => button.text())).toEqual(HAIR_STYLES.map(styleLabel));
      expect(tabButton(wrapper, "Hair").attributes("aria-selected")).toBe("true");
      expect(tabButton(wrapper, "Body").attributes("aria-selected")).toBe("false");
      expect(wrapper.text()).toContain("Hair colour");
      expect(wrapper.text()).not.toContain("Skin tone");

      await tabButton(wrapper, "Outfit").trigger("click");
      expect(wrapper.text()).toContain("Outfit colour");
      expect(wrapper.text()).toContain("Trim colour");
    });
  });

  describe("the hands", () => {
    it("mirror the equipped items on the hero", () => {
      const wrapper = show({
        equipment: { leftHand: [{ faIcon: "fa-shield" }], rightHand: [{ faIcon: "fa-sword" }, { faIcon: "fa-axe" }] },
      });

      expect(hero(wrapper).props("look")).toMatchObject({ leftHand: "fa-shield", rightHand: "fa-sword" });
    });

    it("leave an empty hand empty, and need no equipment at all", () => {
      const empty = show({ equipment: { leftHand: [], rightHand: undefined } });
      expect(hero(empty).props("look")).toMatchObject({ leftHand: undefined, rightHand: undefined });

      const none = show({ equipment: null });
      expect(hero(none).props("look").leftHand).toBeUndefined();
    });

    it("follow a change of equipment", async () => {
      const wrapper = show({ equipment: { rightHand: [{ faIcon: "fa-sword" }] } });
      await wrapper.setProps({ equipment: { rightHand: [{ faIcon: "fa-wand-magic" }] } });

      expect(hero(wrapper).props("look")).toMatchObject({ rightHand: "fa-wand-magic" });
    });
  });

  it("hands out a snapshot of the hero at the size asked for", () => {
    const wrapper = show();
    const vm = wrapper.vm as unknown as { snapshot: (size?: number) => string };

    expect(vm.snapshot(128)).toBe("data:image/png;snapshot-128");
    expect(vm.snapshot()).toBe("data:image/png;snapshot-256");
  });

  it("has a flat variant for the full-screen modals and a boxed one for the page", () => {
    expect(show().classes()).not.toContain("is-flat");
    expect(show({ flat: true }).classes()).toContain("is-flat");
  });

  it("lets the page slot things over the hero and between the hero and the options", () => {
    const wrapper = mount(XpLookEditor, {
      props: { modelValue: { ...DEFAULT_LOOK } },
      slots: { stage: '<span class="over-hero">Unsaved</span>', default: '<div class="between">chips</div>' },
    });

    expect(wrapper.get(".look-stage .over-hero").text()).toBe("Unsaved");
    const order = Array.from(wrapper.get(".look-editor").element.children).map((el) => el.className);
    expect(order).toEqual(["look-stage", "between", "look-panel"]);
  });
});

describe("lookEditor helpers", () => {
  it("handIcon reads the first item's icon and nothing else", () => {
    expect(handIcon([{ faIcon: "fa-sword" }, { faIcon: "fa-axe" }])).toBe("fa-sword");
    expect(handIcon([])).toBeUndefined();
    expect(handIcon([{ name: "no icon" }])).toBeUndefined();
    expect(handIcon("fa-sword")).toBeUndefined();
    expect(handIcon(undefined)).toBeUndefined();
  });

  it("withHands adds the hands and withoutHands takes them off again", () => {
    const held = withHands(DEFAULT_LOOK, { leftHand: [{ faIcon: "fa-shield" }] });
    expect(held.leftHand).toBe("fa-shield");
    expect(withoutHands(held)).toEqual(DEFAULT_LOOK);
    expect("leftHand" in withoutHands(held)).toBe(false);
  });
});
