import { mount } from "@vue/test-utils";
import XpBuilderStage from "@/components/organisms/HeroModel/builder/XpBuilderStage.vue";
import { DEFAULT_LOOK } from "@/lib/hero-look/types";

/**
 * The hero builder's stage in jsdom: the voxel hero is stubbed (no WebGL, no three.js), so these specs only watch
 * what the stage hands the hero and what the three corner buttons emit. The stage plays no sounds.
 */

jest.mock("@/components/organisms/HeroModel/XpHeroModel.vue", () => {
  const { defineComponent, h } = jest.requireActual("vue");
  return {
    __esModule: true,
    default: defineComponent({
      name: "xp-hero-model",
      props: {
        look: { type: Object, default: () => ({}) },
        animation: { type: String, default: "idle" },
        interactive: Boolean,
        focus: { type: String, default: "full" },
      },
      setup(_props: unknown, { expose }: { expose: (exposed: Record<string, unknown>) => void }) {
        expose({
          snapshot: (size = 256) => `data:image/png;snapshot-${size}`,
          flick: jest.fn(),
        });
        return () => h("div", { class: "hero-stub" });
      },
    }),
  };
});

const show = (props: Record<string, unknown> = {}) =>
  mount(XpBuilderStage, {
    props: { look: { ...DEFAULT_LOOK }, focus: "full", animation: "idle", canUndo: true, ...props },
  });

const hero = (wrapper: ReturnType<typeof show>) => wrapper.findComponent({ name: "xp-hero-model" });

describe("XpBuilderStage", () => {
  it("draws the look it is given with the focus and animation", async () => {
    const look = { ...DEFAULT_LOOK, hair: "mohawk" as const };
    const wrapper = show({ look, focus: "bust", animation: "wave" });

    expect(hero(wrapper).props("look")).toEqual(look);
    expect(hero(wrapper).props("focus")).toBe("bust");
    expect(hero(wrapper).props("animation")).toBe("wave");
    expect(hero(wrapper).props("interactive")).toBe(true);

    await wrapper.setProps({ focus: "full", animation: "dance" });
    expect(hero(wrapper).props("focus")).toBe("full");
    expect(hero(wrapper).props("animation")).toBe("dance");
  });

  it("stands the hero on the sliding checker", () => {
    const stage = show().find("[data-cy=builder-stage]");

    expect(stage.classes()).toEqual(expect.arrayContaining(["bg-slide", "bg-slide-equipment"]));
    expect(stage.find(".hero-stub").exists()).toBe(true);
  });

  it("emits undo, random and pose from the corner buttons", async () => {
    const wrapper = show();

    await wrapper.find("[data-cy=builder-undo]").trigger("click");
    await wrapper.find("[data-cy=builder-random]").trigger("click");
    await wrapper.find("[data-cy=builder-pose]").trigger("click");

    expect(wrapper.emitted("undo")).toHaveLength(1);
    expect(wrapper.emitted("random")).toHaveLength(1);
    expect(wrapper.emitted("pose")).toHaveLength(1);
  });

  it("labels the corner buttons and gives each its icon", () => {
    const wrapper = show();

    const undo = wrapper.find("[data-cy=builder-undo]");
    const random = wrapper.find("[data-cy=builder-random]");
    const pose = wrapper.find("[data-cy=builder-pose]");

    expect(undo.attributes("aria-label")).toBe("Undo");
    expect(undo.find("i.fad.fa-undo").exists()).toBe(true);
    expect(random.attributes("aria-label")).toBe("Random hero");
    expect(random.find("i.fad.fa-dice").exists()).toBe(true);
    expect(pose.attributes("aria-label")).toBe("Change pose");
    expect(pose.find("i.fad.fa-running").exists()).toBe(true);
  });

  it("dims Undo when there is nothing to undo", async () => {
    const wrapper = show({ canUndo: true });
    expect(wrapper.find("[data-cy=builder-undo]").classes()).not.toContain("is-dim");

    await wrapper.setProps({ canUndo: false });
    expect(wrapper.find("[data-cy=builder-undo]").classes()).toContain("is-dim");
  });

  it("still emits undo when there is nothing to undo", async () => {
    const wrapper = show({ canUndo: false });

    await wrapper.find("[data-cy=builder-undo]").trigger("click");

    expect(wrapper.emitted("undo")).toHaveLength(1);
  });

  it("hands out the model's snapshot", () => {
    const wrapper = show();

    expect(wrapper.vm.snapshot()).toBe("data:image/png;snapshot-256");
    expect(wrapper.vm.snapshot(128)).toBe("data:image/png;snapshot-128");
  });

  it("passes a flick on to the model", () => {
    const wrapper = show();
    const model = hero(wrapper).vm as unknown as { flick: jest.Mock };

    wrapper.vm.flick();

    expect(model.flick).toHaveBeenCalledTimes(1);
  });
});
