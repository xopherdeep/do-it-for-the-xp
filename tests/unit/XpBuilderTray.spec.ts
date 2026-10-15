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
  it("asks for the top tiles last so they draw first", () => {
    // The thumbnailer draws the newest request first, so the tiles at the top of the grid are asked for last
    const { thumbnails } = show({ tabId: "hair", mode: "style" });
    const options = tabById("hair").styles!.options;
    const asked = thumbnails.get.mock.calls.map((call) => (call as unknown as [HeroLook])[0].hair);

    expect(asked).toHaveLength(options.length);
    expect(asked[asked.length - 1]).toBe(options[0]);
    expect(asked[0]).toBe(options[options.length - 1]);
    expect(asked).toEqual([...options].reverse());
  });

  it("fills Body with 18 face tiles and no switch", () => {
    const { wrapper, thumbnails } = show({ tabId: "body", mode: "style" });

    expect(wrapper.find("[data-cy=tray-mode]").exists()).toBe(false);
    expect(tiles(wrapper)).toHaveLength(18);
    expect(tiles(wrapper).map((tile) => tile.attributes("data-option"))).toEqual(Object.keys(SKIN_TONES));
    tiles(wrapper).forEach((tile) => expect(tile.attributes("type")).toBe("button"));

    // Each tile is the player's own hero in that tone, framed on the face, at 96 pixels
    expect(thumbnails.get).toHaveBeenCalledTimes(18);
    // (the tray asks bottom tile first, so the call for tile i is i-th from the end)
    tiles(wrapper).forEach((tile, i) => {
      const call = thumbnails.get.mock.calls[17 - i] as unknown[];
      expect((call[0] as HeroLook).skin).toBe(tile.attributes("data-option"));
      expect(call[1]).toBe("bust");
      expect(call[2]).toBe(96);
    });
    expect(thumbnails.get).toHaveBeenCalledWith(expect.objectContaining({ skin: "frost" }), "bust", 96);

    // The current tone (the default hero is a Peach) rings and no other; there is no colour group
    const pressed = tiles(wrapper).filter((tile) => tile.attributes("aria-pressed") === "true");
    expect(pressed.map((tile) => tile.attributes("data-option"))).toEqual(["peach"]);
    expect(pressed[0].classes()).toContain("active");
    expect(wrapper.findAll("[role=group]")).toHaveLength(0);
  });

  it("names skin tiles and paints them when there is no picture", () => {
    const { wrapper } = show({ tabId: "body", thumbnails: fakeThumbnails("") });

    const frost = tiles(wrapper).find((tile) => tile.attributes("data-option") === "frost")!;
    expect(frost.attributes("aria-label")).toBe("Frost Blue");
    expect(frost.text()).toBe("Frost Blue");
    expect(frost.find("img").exists()).toBe(false);
    expect((frost.element as HTMLElement).style.backgroundColor).toBe("rgb(156, 199, 230)");
    expect(tiles(wrapper)[0].attributes("aria-label")).toBe("Porcelain");

    // With a picture the colour still frames the face
    const picture = show({ tabId: "body" });
    const tile = tiles(picture.wrapper).find((t) => t.attributes("data-option") === "frost")!;
    expect(tile.find("img").exists()).toBe(true);
    expect((tile.element as HTMLElement).style.backgroundColor).toBe("rgb(156, 199, 230)");

    // Other tabs keep their plain look
    expect(tiles(show({ tabId: "hair" }).wrapper)[0].attributes("style")).toBeUndefined();
  });

  it("emits the skin key when a tone is tapped", async () => {
    const draft: HeroLook = { ...DEFAULT_LOOK };
    const { wrapper } = show({ tabId: "body", modelValue: draft });

    await tiles(wrapper)
      .find((tile) => tile.attributes("data-option") === "ember")!
      .trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([[{ ...draft, skin: "ember" }]]);
  });

  it("letters light tones dark and deep tones light, so a nameless tile still reads", () => {
    const { wrapper } = show({ tabId: "body", thumbnails: fakeThumbnails("") });
    const tile = (option: string) => tiles(wrapper).find((t) => t.attributes("data-option") === option)!;

    expect(tile("porcelain").classes()).toContain("light-swatch");
    expect(tile("frost").classes()).toContain("light-swatch");
    expect(tile("ebony").classes()).not.toContain("light-swatch");
    expect(tile("umber").classes()).not.toContain("light-swatch");
  });

  it("shows only the side a tab has", async () => {
    // Body has styles and no colours: the style tiles show even if the parent asks for the Colour side
    const body = show({ tabId: "body", mode: "colour" });
    expect(tiles(body.wrapper)).toHaveLength(18);
    expect(body.wrapper.find("[data-cy=tray-mode]").exists()).toBe(false);

    // A tab with colours and no styles shows its colour groups and no switch
    const colours = tabById("hat");
    const only = mount(XpBuilderTray, {
      props: {
        modelValue: { ...DEFAULT_LOOK },
        tab: { ...colours, styles: undefined },
        mode: "style",
        thumbnails: fakeThumbnails(),
      },
    });
    expect(only.findAll("[data-cy=look-tile]")).toHaveLength(0);
    expect(only.find("[data-cy=tray-mode]").exists()).toBe(false);
    expect(group(only, "Hat colour")).toBeDefined();
  });

  it("puts a Fantasy heading before the fantasy tones", () => {
    const { wrapper } = show({ tabId: "body" });

    const headings = wrapper.findAll("[data-cy=tray-heading]");
    expect(headings).toHaveLength(1);
    expect(headings[0].text()).toBe("Fantasy");

    // The heading sits in the grid right before the Orc Green tile
    const orc = tiles(wrapper).find((tile) => tile.attributes("data-option") === "orc")!;
    expect(orc.element.previousElementSibling).toBe(headings[0].element);
    expect(tiles(wrapper).findIndex((tile) => tile.attributes("data-option") === "orc")).toBe(12);

    // Tabs without headings render none
    expect(show({ tabId: "hair" }).wrapper.findAll("[data-cy=tray-heading]")).toHaveLength(0);
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
