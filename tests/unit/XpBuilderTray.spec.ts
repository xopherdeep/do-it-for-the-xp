import { ref } from "vue";
import { mount } from "@vue/test-utils";
import XpBuilderTray from "@/components/organisms/HeroModel/builder/XpBuilderTray.vue";
import { tabById, type LookTabId } from "@/components/organisms/HeroModel/lookEditor";
import { DEFAULT_LOOK, SKIN_TONES, type HeroLook } from "@/lib/hero-look/types";

/**
 * The hero builder's tray in jsdom: a Style | Colour switch, picture tiles (one per option) or colour swatches.
 * The thumbnailer is faked (no WebGL, no three.js); the tray only emits, it plays no sounds.
 */

const PICTURE = "data:image/png;t";

const fakeThumbnails = (picture = PICTURE) => ({
  supported: ref(true),
  get: jest.fn(() => picture),
  dispose: jest.fn(),
});

const show = (props: Record<string, unknown> = {}) => {
  const thumbnails = (props.thumbnails as ReturnType<typeof fakeThumbnails>) || fakeThumbnails();
  const tabId = (props.tabId as LookTabId) || "hair";
  const wrapper = mount(XpBuilderTray, {
    props: {
      modelValue: { ...DEFAULT_LOOK },
      tab: tabById(tabId),
      mode: "style",
      ...props,
      thumbnails,
    },
  });
  return { wrapper, thumbnails };
};

const tiles = (wrapper: ReturnType<typeof show>["wrapper"]) => wrapper.findAll("[data-cy=look-tile]");

const switchButton = (wrapper: ReturnType<typeof show>["wrapper"], label: string) =>
  wrapper.findAll("[data-cy=tray-mode]").find((button) => button.text() === label)!;

const group = (wrapper: ReturnType<typeof show>["wrapper"], label: string) =>
  wrapper.findAll("[role=group]").find((el) => el.attributes("aria-label") === label)!;

describe("XpBuilderTray", () => {
  it("hides the Style/Colour switch on Body and shows the skin tones", () => {
    const { wrapper } = show({ tabId: "body", mode: "style" });

    expect(wrapper.find("[data-cy=tray-mode]").exists()).toBe(false);
    expect(tiles(wrapper)).toHaveLength(0);

    const skin = group(wrapper, "Skin tone");
    const swatches = skin.findAll("button");
    expect(swatches.map((swatch) => swatch.attributes("aria-label"))).toEqual(Object.keys(SKIN_TONES));
    swatches.forEach((swatch) => expect(swatch.attributes("type")).toBe("button"));
    expect(swatches[0].attributes("aria-pressed")).toBe("true");
    expect(swatches[1].attributes("aria-pressed")).toBe("false");
  });

  it("shows one picture tile per hair style, drawn bare-headed at head framing", () => {
    const { wrapper, thumbnails } = show({
      tabId: "hair",
      modelValue: { ...DEFAULT_LOOK, hat: "wizard", hair: "bob" },
    });

    expect(tiles(wrapper)).toHaveLength(10);
    expect(tiles(wrapper).map((tile) => tile.attributes("data-option"))).toEqual(tabById("hair").styles!.options);
    expect(tiles(wrapper)[0].attributes("aria-label")).toBe("None");
    expect(tiles(wrapper)[4].attributes("aria-label")).toBe("Ponytail");

    // Each tile is the player's own hero with that hair, the hat off, framed on the head, at 96 pixels
    expect(thumbnails.get).toHaveBeenCalledWith(expect.objectContaining({ hair: "ponytail", hat: "none" }), "bust", 96);
    thumbnails.get.mock.calls.forEach((call: unknown[]) => {
      expect((call[0] as HeroLook).hat).toBe("none");
      expect(call[1]).toBe("bust");
      expect(call[2]).toBe(96);
    });

    const picture = tiles(wrapper)[0].find("img");
    expect(picture.attributes("src")).toBe(PICTURE);
    expect(picture.attributes("alt")).toBe("");

    // The chosen style rings; the others do not
    const chosen = tiles(wrapper).find((tile) => tile.attributes("data-option") === "bob")!;
    expect(chosen.attributes("aria-pressed")).toBe("true");
    expect(chosen.classes()).toContain("active");
    expect(tiles(wrapper).filter((tile) => tile.attributes("aria-pressed") === "true")).toHaveLength(1);
  });

  it("frames outfit tiles on the whole body and keeps the hat on", () => {
    const { wrapper, thumbnails } = show({
      tabId: "outfit",
      modelValue: { ...DEFAULT_LOOK, hat: "crown" },
    });

    expect(tiles(wrapper)).toHaveLength(8);
    expect(thumbnails.get).toHaveBeenCalledWith(expect.objectContaining({ outfit: "robe", hat: "crown" }), "full", 96);
  });

  it("emits the draft with only that key changed when a tile is tapped", async () => {
    const draft: HeroLook = { ...DEFAULT_LOOK, hair: "short", hat: "cap" };
    const { wrapper } = show({ tabId: "hair", modelValue: draft });

    await tiles(wrapper)
      .find((tile) => tile.attributes("data-option") === "mohawk")!
      .trigger("click");

    // The hat the tile was drawn without is still the player's: only `hair` changed
    expect(wrapper.emitted("update:modelValue")).toEqual([[{ ...draft, hair: "mohawk" }]]);
    expect(wrapper.emitted("update:mode")).toBeUndefined();
  });

  it("emits the colour key from the Colour side", async () => {
    const draft: HeroLook = { ...DEFAULT_LOOK };
    const { wrapper } = show({ tabId: "outfit", mode: "colour", modelValue: draft });

    // On the Colour side there are no picture tiles, only a labelled group per colour
    expect(tiles(wrapper)).toHaveLength(0);
    expect(group(wrapper, "Main")).toBeDefined();

    const trim = group(wrapper, "Trim");
    const swatches = trim.findAll("button");
    expect(swatches).toHaveLength(16);
    expect(swatches[0].attributes("aria-label")).toBe("#b8342b");
    expect(swatches[0].attributes("style")).toContain("background-color");

    await swatches[5].trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([[{ ...draft, outfitAccent: "#2f5fb3" }]]);
  });

  it("marks the swatch of the current colour", () => {
    const { wrapper } = show({
      tabId: "outfit",
      mode: "colour",
      modelValue: { ...DEFAULT_LOOK, outfitColor: "#6b3fa0" },
    });

    const pressed = group(wrapper, "Main")
      .findAll("button")
      .filter((swatch) => swatch.attributes("aria-pressed") === "true");
    expect(pressed.map((swatch) => swatch.attributes("aria-label"))).toEqual(["#6b3fa0"]);
    expect(pressed[0].classes()).toContain("active");
  });

  it("falls back to the option names when there is no picture", () => {
    const { wrapper } = show({ tabId: "face", thumbnails: fakeThumbnails("") });

    expect(tiles(wrapper)).toHaveLength(6);
    expect(tiles(wrapper).every((tile) => !tile.find("img").exists())).toBe(true);
    expect(tiles(wrapper).map((tile) => tile.text())).toEqual([
      "Smile",
      "Grin",
      "Determined",
      "Sleepy",
      "Wink",
      "Surprised",
    ]);
  });

  it("switches sides through update:mode", async () => {
    const { wrapper } = show({ tabId: "hat", mode: "style" });

    expect(wrapper.find("[data-cy=tray-mode]").exists()).toBe(true);
    expect(switchButton(wrapper, "Style").attributes("aria-pressed")).toBe("true");
    expect(switchButton(wrapper, "Colour").attributes("aria-pressed")).toBe("false");

    await switchButton(wrapper, "Colour").trigger("click");
    expect(wrapper.emitted("update:mode")).toEqual([["colour"]]);

    // The parent owns the side: the tray follows the prop, not the tap
    expect(tiles(wrapper)).toHaveLength(9);
    await wrapper.setProps({ mode: "colour" });
    expect(tiles(wrapper)).toHaveLength(0);
    expect(group(wrapper, "Hat colour")).toBeDefined();
    expect(switchButton(wrapper, "Colour").attributes("aria-pressed")).toBe("true");
    expect(switchButton(wrapper, "Style").attributes("aria-pressed")).toBe("false");

    await switchButton(wrapper, "Style").trigger("click");
    expect(wrapper.emitted("update:mode")).toEqual([["colour"], ["style"]]);
  });
});
