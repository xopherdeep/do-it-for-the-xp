/**
 * The Drops picker of the Temple Creator's room editor: what a beaten monster, mini-boss or boss leaves behind. It owns
 * no state of its own, so each spec hands it the drop the room holds and reads what it asks the room to hold next
 * (`update:drops`): a Dungeon Item, a row of consumables (the Bomb among them), some gold, or nothing at all (null).
 */
import { mount, VueWrapper } from "@vue/test-utils";
import RoomDropsConfig from "../RoomDropsConfig.vue";
import type { RoomDrops } from "@/lib/engine/core/dungeons/types";

const SMALL_KEY: RoomDrops = { chest: "dungeon", dungeon: "small-key" };

const mountPicker = (drops: RoomDrops | null) => mount(RoomDropsConfig, { props: { drops } });

/** The tile with this label: the dungeon item and consumable tiles are buttons, and "None" is the first of them */
const tile = (wrapper: VueWrapper, label: string) => {
  const found = wrapper.findAll("button").find((button) => button.text() === label);
  if (!found) throw new Error(`No "${label}" tile in the Drops picker`);
  return found;
};

/** The last drop the picker asked the room to hold, or undefined when it asked for nothing */
const asked = (wrapper: VueWrapper): unknown[] | undefined => wrapper.emitted("update:drops")?.slice(-1)[0];

describe("RoomDropsConfig: what a fight room drops", () => {
  it("picking Small Key asks for a Dungeon Item drop of the small key", async () => {
    const wrapper = mountPicker(null);
    await tile(wrapper, "Small Key").trigger("click");
    expect(asked(wrapper)).toEqual([{ chest: "dungeon", dungeon: "small-key" }]);
  });

  it("picking None with no gold or items asks for no drop at all (null)", async () => {
    const wrapper = mountPicker(SMALL_KEY);
    await tile(wrapper, "None").trigger("click");
    expect(asked(wrapper)).toEqual([null]);
  });

  it("typing 30 gold onto a key drop keeps the key and adds the gold", async () => {
    const wrapper = mountPicker(SMALL_KEY);
    await wrapper.find("input[type='number']").setValue("30");
    expect(asked(wrapper)).toEqual([{ chest: "dungeon", dungeon: "small-key", gold: 30 }]);
  });

  it("ticking Bomb asks for a drop holding the Bomb, named as the solver and the bag know it", async () => {
    const wrapper = mountPicker(null);
    await tile(wrapper, "Bomb").trigger("click");
    expect(asked(wrapper)).toEqual([{ chest: "consumable", items: ["Bomb"] }]);
  });

  it("unticking the only Bomb asks for no drop; unticking one of two keeps the other", async () => {
    const lone = mountPicker({ chest: "consumable", items: ["Bomb"] });
    await tile(lone, "Bomb").trigger("click");
    expect(asked(lone)).toEqual([null]);

    const pair = mountPicker({ chest: "consumable", items: ["potion", "Bomb"] });
    await tile(pair, "Bomb").trigger("click");
    expect(asked(pair)).toEqual([{ chest: "consumable", items: ["potion"] }]);
  });

  it("ticking Bomb on a key drop keeps the key beside it", async () => {
    const wrapper = mountPicker(SMALL_KEY);
    await tile(wrapper, "Bomb").trigger("click");
    expect(asked(wrapper)).toEqual([{ chest: "dungeon", dungeon: "small-key", items: ["Bomb"] }]);
  });

  it("picking None keeps the gold and the items the drop also holds", async () => {
    const wrapper = mountPicker({ chest: "dungeon", dungeon: "master-key", items: ["Bomb"], gold: 30 });
    await tile(wrapper, "None").trigger("click");
    expect(asked(wrapper)).toEqual([{ chest: "consumable", items: ["Bomb"], gold: 30 }]);
  });

  it("clearing the gold field takes the gold off, and a drop with nothing else left is null", async () => {
    const wrapper = mountPicker({ chest: "gold", gold: 30 });
    await wrapper.find("input[type='number']").setValue("");
    expect(asked(wrapper)).toEqual([null]);
  });

  it("never asks for negative or fractional gold, nor more than a chest holds", async () => {
    const wrapper = mountPicker(null);
    const field = wrapper.find("input[type='number']");
    await field.setValue("-5");
    expect(asked(wrapper)).toEqual([null]);
    await field.setValue("12.7");
    expect(asked(wrapper)).toEqual([{ chest: "gold", gold: 12 }]);
    await field.setValue("9000");
    expect(asked(wrapper)).toEqual([{ chest: "gold", gold: 500 }]);
  });

  it("leaving the gold field shows the gold the drop holds, not the number that was cut to fit", async () => {
    const wrapper = mountPicker({ chest: "gold", gold: 500 });
    const field = wrapper.find("input[type='number']");
    await field.setValue("9000");
    await field.trigger("change");
    expect((field.element as HTMLInputElement).value).toBe("500");
  });

  it("marks what the drop holds: the key's tile, the Bomb's tile and the gold in the field", () => {
    const wrapper = mountPicker({ chest: "dungeon", dungeon: "master-key", items: ["Bomb"], gold: 40 });
    expect(tile(wrapper, "Boss Key").attributes("aria-pressed")).toBe("true");
    expect(tile(wrapper, "Small Key").attributes("aria-pressed")).toBe("false");
    expect(tile(wrapper, "None").attributes("aria-pressed")).toBe("false");
    expect(tile(wrapper, "Bomb").attributes("aria-pressed")).toBe("true");
    expect(tile(wrapper, "Potion").attributes("aria-pressed")).toBe("false");
    expect((wrapper.find("input[type='number']").element as HTMLInputElement).value).toBe("40");
  });

  it("reads the key as the temples spell it: a drop of 'key' lights the Small Key tile", () => {
    const wrapper = mountPicker({ chest: "dungeon", dungeon: "key" });
    expect(tile(wrapper, "Small Key").attributes("aria-pressed")).toBe("true");
  });

  it("an empty drop lights None", () => {
    const wrapper = mountPicker(null);
    expect(tile(wrapper, "None").attributes("aria-pressed")).toBe("true");
  });

  it("offers the temple's four items after None, and the Bomb among the consumables", () => {
    const labels = mountPicker(null)
      .findAll("button")
      .map((button) => button.text());
    expect(labels.slice(0, 5)).toEqual(["None", "Small Key", "Boss Key", "Map", "Compass"]);
    expect(labels).toContain("Bomb");
  });
});
