import { mount } from "@vue/test-utils";
import XpMerchantStall from "@/components/organisms/TravelingMerchant/XpMerchantStall.vue";
import { STALL_PALETTE, STALL_SPRITES, spriteRuns, spriteSize } from "@/components/organisms/TravelingMerchant/merchantStallSprites";

describe("merchant stall sprites", () => {
  it("draws every sprite as a true rectangle in colours the palette knows", () => {
    for (const [name, rows] of Object.entries(STALL_SPRITES)) {
      const { w } = spriteSize(rows);
      expect(rows.every((row) => row.length === w)).toBe(true);
      const unknown = rows.join("").replace(/\./g, "").split("").filter((key) => !STALL_PALETTE[key]);
      expect({ name, unknown }).toEqual({ name, unknown: [] });
    }
  });

  it("merges a row's same-coloured pixels into one run and skips the empty ones", () => {
    expect(spriteRuns(["..kkr", "rr..."], { k: "#000", r: "#f00" })).toEqual([
      { x: 2, y: 0, w: 2, fill: "#000" },
      { x: 4, y: 0, w: 1, fill: "#f00" },
      { x: 0, y: 1, w: 2, fill: "#f00" },
    ]);
  });
});

describe("XpMerchantStall", () => {
  const stall = (props = {}) =>
    mount(XpMerchantStall, { props: { shopkeeper: "Boobeedeedle", line: "Hullo, hullo!", ...props } });

  it("sets out the peddler, his lantern and his blanket in front of the world he visits", () => {
    const wrapper = stall({ backdrop: "/img/world-swamps.webp" });
    expect(wrapper.find(".xp-merchant-stall__peddler svg").exists()).toBe(true);
    expect(wrapper.find(".xp-merchant-stall__post").exists()).toBe(true);
    expect(wrapper.find(".xp-merchant-stall__blanket svg").exists()).toBe(true);
    expect(wrapper.find(".xp-merchant-stall__backdrop").attributes("style")).toContain("world-swamps.webp");
  });

  it("calls out his line, and tapping it starts a talk", async () => {
    const wrapper = stall();
    const line = wrapper.find("[data-test=merchant-line]");
    expect(line.text()).toContain("Boobeedeedle");
    expect(line.text()).toContain("Hullo, hullo!");
    await line.trigger("click");
    expect(wrapper.emitted("talk")).toHaveLength(1);
  });

  it("keeps quiet while he is already talking or the stall is shut", () => {
    expect(stall({ quiet: true }).find("[data-test=merchant-line]").exists()).toBe(false);
  });
});
