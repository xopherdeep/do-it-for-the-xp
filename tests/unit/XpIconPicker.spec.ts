import { mount } from "@vue/test-utils";
import XpIconPicker from "@/components/atoms/Icon/XpIconPicker.vue";
import ionic from "@/lib/mixins/ionic";

/**
 * The icon picker the Power form (and the Powers list) opens: pick an icon, Confirm, and `select` brings back its name
 * and the family it was picked in. The Ionic frame is a stub; the lists, the search and the category are real.
 */

const slot = { template: "<div><slot /></div>" };
const stubs = {
  IonContent: slot,
  IonSegment: slot,
  IonSegmentButton: slot,
  IonLabel: { template: "<span><slot /></span>" },
  IonIcon: { template: "<i />" },
  IonButton: { template: "<button class='confirm'><slot /></button>" },
  IonSearchbar: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: "<input class='search' :value='modelValue' @input=\"$emit('update:modelValue', $event.target.value)\" />",
  },
};

const mountPicker = (props: Record<string, unknown> = {}) => mount(XpIconPicker, { props, global: { stubs } });

const tile = (wrapper: ReturnType<typeof mountPicker>, name: string, prefix: string) =>
  wrapper.findAll(".icon-item").find((each) => each.find("i").classes().includes(prefix) && each.find(".icon-name").text() === name);

describe("XpIconPicker", () => {
  it("lists icons with their names", () => {
    const wrapper = mountPicker();
    expect(wrapper.findAll(".icon-item").length).toBeGreaterThan(50);
    expect(tile(wrapper, "dragon", "fas")).toBeDefined();
  });

  it("lists an icon once in each family, though two of its lists carry it (the dragon is a game icon and an RPG icon)", () => {
    const wrapper = mountPicker();
    const dragons = wrapper.findAll(".icon-item").filter((each) => each.find("i").classes().includes("fas") && each.find(".icon-name").text() === "dragon");
    expect(dragons).toHaveLength(1);
  });

  it("has no Confirm until an icon is picked", () => {
    const wrapper = mountPicker();
    expect(wrapper.find(".selection-footer").exists()).toBe(false);
  });

  it("brings back the name and the family of the icon that was tapped, on Confirm", async () => {
    const wrapper = mountPicker();
    await tile(wrapper, "dragon", "fas")?.trigger("click");
    await wrapper.get(".confirm").trigger("click");
    expect(wrapper.emitted("select")).toEqual([[{ iconName: "dragon", iconPrefix: "fas" }]]);
  });

  it("brings back the family of the tile that was tapped when the same name is in two families", async () => {
    const wrapper = mountPicker();
    await tile(wrapper, "address-book", "fal")?.trigger("click");
    await wrapper.get(".confirm").trigger("click");
    expect(wrapper.emitted("select")).toEqual([[{ iconName: "address-book", iconPrefix: "fal" }]]);
    await tile(wrapper, "address-book", "far")?.trigger("click");
    await wrapper.get(".confirm").trigger("click");
    expect(wrapper.emitted("select")?.[1]).toEqual([{ iconName: "address-book", iconPrefix: "far" }]);
  });

  it("opens on the icon it was given, in the family it was given, and confirms that as it was", async () => {
    const wrapper = mountPicker({ initialIcon: "hand-holding-magic", initialPrefix: "fad" });
    expect(wrapper.find(".selection-footer").exists()).toBe(true);
    await wrapper.get(".confirm").trigger("click");
    expect(wrapper.emitted("select")).toEqual([[{ iconName: "hand-holding-magic", iconPrefix: "fad" }]]);
  });

  it("opens on the first family that has the icon when it is given no family (the Powers list)", async () => {
    const wrapper = mountPicker({ initialIcon: "dragon" });
    await wrapper.get(".confirm").trigger("click");
    expect(wrapper.emitted("select")).toEqual([[{ iconName: "dragon", iconPrefix: "fas" }]]);
  });

  it("narrows the grid to the icons whose name has the search words in it", async () => {
    const wrapper = mountPicker();
    await wrapper.get(".search").setValue("dragon");
    const names = wrapper.findAll(".icon-name").map((each) => each.text());
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((name) => name.includes("dragon"))).toBe(true);
  });

  it("says so when nothing matches", async () => {
    const wrapper = mountPicker();
    await wrapper.get(".search").setValue("zzzzzz");
    expect(wrapper.findAll(".icon-item")).toHaveLength(0);
    expect(wrapper.find(".empty-state").text()).toContain("zzzzzz");
  });

  it("marks only the tile that was picked, not the same name in another family", async () => {
    const wrapper = mountPicker();
    await tile(wrapper, "address-book", "fal")?.trigger("click");
    const picked = wrapper.findAll(".icon-item.selected");
    expect(picked).toHaveLength(1);
    expect(picked[0].find("i").classes()).toContain("fal");
  });
});

describe("XpIconPicker in the app", () => {
  it("brings its own Ionic components: without them the searchbar and the segment are plain tags that v-model cannot reach", () => {
    expect((XpIconPicker as unknown as { mixins?: unknown[] }).mixins).toContain(ionic);
  });
});
