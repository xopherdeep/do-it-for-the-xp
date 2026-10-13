import { ref } from "vue";
import { mount } from "@vue/test-utils";
import XpStarterLineup from "@/components/organisms/HeroModel/builder/XpStarterLineup.vue";
import { starterLineup, type Rng } from "@/components/organisms/HeroModel/lookEditor";

/**
 * The starter lineup in jsdom: nine random heroes for a brand-new profile, a roll button and, when allowed, a way
 * out to a 2D portrait. The thumbnailer is faked (no WebGL); the lineup only emits and plays no sounds.
 */

const PICTURE = "data:image/png;t";

const fakeThumbnails = (picture = PICTURE) => ({
  supported: ref(true),
  get: jest.fn(() => picture),
  dispose: jest.fn(),
});

/** A small seeded random source (mulberry32): the same seed deals the same heroes */
const seeded = (seed: number): Rng => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const show = (props: Record<string, unknown> = {}) => {
  const thumbnails = (props.thumbnails as ReturnType<typeof fakeThumbnails>) || fakeThumbnails();
  const wrapper = mount(XpStarterLineup, {
    props: { allowPortrait: false, rng: seeded(11), ...props, thumbnails },
  });
  return { wrapper, thumbnails };
};

const heroes = (wrapper: ReturnType<typeof show>["wrapper"]) => wrapper.findAll("[data-cy=starter-hero]");

describe("XpStarterLineup", () => {
  it("deals nine heroes and picks the tapped one", async () => {
    const { wrapper, thumbnails } = show({ rng: seeded(11) });
    const expected = starterLineup(9, seeded(11));

    expect(heroes(wrapper)).toHaveLength(9);
    expect(heroes(wrapper).map((hero) => hero.attributes("aria-label"))).toEqual(
      Array.from({ length: 9 }, (_, i) => `Hero ${i + 1}`),
    );

    // Every card is the whole hero, drawn at 128 pixels
    expect(thumbnails.get).toHaveBeenCalledWith(expected[0], "full", 128);
    expect(thumbnails.get).toHaveBeenCalledWith(expected[8], "full", 128);
    const picture = heroes(wrapper)[0].find("img");
    expect(picture.attributes("src")).toBe(PICTURE);
    expect(picture.attributes("alt")).toBe("");

    await heroes(wrapper)[4].trigger("click");

    expect(wrapper.emitted("pick")).toEqual([[expected[4]]]);
    expect(wrapper.emitted("portrait")).toBeUndefined();
  });

  it("rolls nine new heroes", async () => {
    // The lineup keeps drawing from the same random source, so the second deal is the next nine of that sequence
    const { wrapper } = show({ rng: seeded(23) });
    const sameSequence = seeded(23);
    const first = starterLineup(9, sameSequence);
    const second = starterLineup(9, sameSequence);

    const roll = wrapper.find("[data-cy=starter-roll]");
    expect(roll.text()).toBe("Roll 9 more");
    expect(roll.find("i.fad.fa-dice").exists()).toBe(true);

    await heroes(wrapper)[0].trigger("click");
    await roll.trigger("click");
    await heroes(wrapper)[0].trigger("click");
    await heroes(wrapper)[8].trigger("click");

    expect(heroes(wrapper)).toHaveLength(9);
    expect(wrapper.emitted("pick")).toEqual([[first[0]], [second[0]], [second[8]]]);
    expect(second[0]).not.toEqual(first[0]);
  });

  it("offers the 2D portrait only when allowed", async () => {
    const { wrapper } = show({ allowPortrait: false });
    expect(wrapper.find("[data-cy=look-use-portrait]").exists()).toBe(false);

    await wrapper.setProps({ allowPortrait: true });
    const portrait = wrapper.find("[data-cy=look-use-portrait]");
    expect(portrait.exists()).toBe(true);
    expect(portrait.text()).toBe("Use a 2D portrait instead");

    await portrait.trigger("click");
    expect(wrapper.emitted("portrait")).toHaveLength(1);
    expect(wrapper.emitted("pick")).toBeUndefined();
  });

  it("shows labels when there are no pictures", () => {
    const { wrapper } = show({ thumbnails: fakeThumbnails("") });

    expect(heroes(wrapper)).toHaveLength(9);
    expect(heroes(wrapper).every((hero) => !hero.find("img").exists())).toBe(true);
    expect(heroes(wrapper).map((hero) => hero.text())).toEqual(Array.from({ length: 9 }, (_, i) => `Hero ${i + 1}`));
  });
});
