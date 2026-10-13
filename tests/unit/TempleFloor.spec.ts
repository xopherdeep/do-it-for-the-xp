import { mount } from "@vue/test-utils";
import TempleFloor from "@/app/Console/TempleGrounds/TempleFloor.vue";
import type { Room } from "@/lib/engine/core/dungeons/types";

describe("TempleFloor", () => {
  const mountFloor = (props: Record<string, unknown> = {}) =>
    mount(TempleFloor, {
      props: {
        element: "wind",
        temple: "",
        ...props,
      },
    });

  describe("The Old House (moving-house)", () => {
    it("renders hardwood plank floor for living areas, halls and bedrooms", () => {
      const room = { type: "monster", content: { name: "Front hall" } } as Room;
      const wrapper = mountFloor({ temple: "moving-house", room });
      expect(wrapper.classes()).toContain("temple-floor--house");
      expect(wrapper.classes()).toContain("temple-floor--wood");
    });

    it("renders ceramic checkerboard tiles for kitchen, pantry and bathroom", () => {
      const kitchenRoom = { type: "miniboss", content: { name: "Kitchen" } } as Room;
      const wrapper = mountFloor({ temple: "moving-house", room: kitchenRoom });
      expect(wrapper.classes()).toContain("temple-floor--house");
      expect(wrapper.classes()).toContain("temple-floor--tile");

      const bathRoom = { type: "monster", content: { name: "Upstairs Bathroom" } } as Room;
      const bathWrapper = mountFloor({ temple: "moving-house", room: bathRoom });
      expect(bathWrapper.classes()).toContain("temple-floor--tile");
    });

    it("renders outdoor wood decking for porch and deck", () => {
      const porchRoom = { type: "entrance", content: { name: "Front porch" } } as Room;
      const wrapper = mountFloor({ temple: "moving-house", room: porchRoom });
      expect(wrapper.classes()).toContain("temple-floor--house");
      expect(wrapper.classes()).toContain("temple-floor--deck");
    });

    it("renders stone/concrete slabs for garage and basement", () => {
      const garageRoom = { type: "monster", content: { name: "Garage" } } as Room;
      const wrapper = mountFloor({ temple: "moving-house", room: garageRoom });
      expect(wrapper.classes()).toContain("temple-floor--house");
      expect(wrapper.classes()).toContain("temple-floor--slab");
    });
  });

  describe("custom and generated temples", () => {
    it("renders elemental dungeon tiles matching the temple element", () => {
      const fireWrapper = mountFloor({ temple: "gen-volcano-12", element: "fire" });
      expect(fireWrapper.classes()).toContain("temple-floor--dungeon");
      expect(fireWrapper.classes()).toContain("temple-floor--fire");

      const iceWrapper = mountFloor({ temple: "gen-frost-99", element: "ice" });
      expect(iceWrapper.classes()).toContain("temple-floor--ice");

      const waterWrapper = mountFloor({ temple: "custom-sea-sanctum", element: "water" });
      expect(waterWrapper.classes()).toContain("temple-floor--water");
    });

    it("falls back to wind element when element is not specified", () => {
      const wrapper = mountFloor({ temple: "gen-mystery" });
      expect(wrapper.classes()).toContain("temple-floor--dungeon");
      expect(wrapper.classes()).toContain("temple-floor--wind");
    });
  });

  describe("special room emblems and structural layers", () => {
    it("renders boss emblem in boss rooms", () => {
      const bossRoom = { type: "boss", content: { name: "Lair of Titan" } } as Room;
      const wrapper = mountFloor({ room: bossRoom });
      expect(wrapper.classes()).toContain("temple-floor--boss");
      expect(wrapper.find(".temple-floor__emblem").exists()).toBe(true);
    });

    it("renders entrance threshold in entrance rooms", () => {
      const entranceRoom = { type: "entrance", content: { name: "Front porch" } } as Room;
      const wrapper = mountFloor({ room: entranceRoom });
      expect(wrapper.classes()).toContain("temple-floor--entrance");
      expect(wrapper.find(".temple-floor__emblem").exists()).toBe(true);
    });

    it("always renders surface and shade layers", () => {
      const wrapper = mountFloor();
      expect(wrapper.find(".temple-floor__surface").exists()).toBe(true);
      expect(wrapper.find(".temple-floor__shade").exists()).toBe(true);
    });
  });
});
