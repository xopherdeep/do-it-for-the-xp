import { mount } from "@vue/test-utils";
import XpTravelingMerchant from "@/components/organisms/TravelingMerchant/XpTravelingMerchant.vue";
import {
  isMerchantIn,
  MERCHANT_WORLDS,
  merchantWorldOn,
} from "@/lib/services/shops/travelingMerchant";

const day = (offset: number) => new Date(2026, 9, 12 + offset, 9, 30);

describe("travelingMerchant", () => {
  it("can turn up in any of the nine worlds", () => {
    expect([...MERCHANT_WORLDS].sort()).toEqual(
      ["clouds", "desert", "forest", "ice", "islands", "moon", "mountains", "plains", "swamps"].sort()
    );
  });

  it("stays in one world all day, morning to night, and the same for every hero", () => {
    const morning = new Date(2026, 9, 12, 0, 1);
    const night = new Date(2026, 9, 12, 23, 59);
    expect(merchantWorldOn(morning)).toBe(merchantWorldOn(night));
    expect(merchantWorldOn(day(0))).toBe(merchantWorldOn(new Date(day(0).getTime())));
  });

  it("visits every world once in each nine-day stretch, in no fixed order", () => {
    const stretches: string[] = [];
    for (let start = -45; start < 45; start += 1) {
      const nine = Array.from({ length: 9 }, (_, i) => merchantWorldOn(day(start + i)));
      if (new Set(nine).size === 9) stretches.push(nine.join(","));
    }
    // Stretches line up with the rotation every ninth day, and they are not all the same order
    expect(stretches.length).toBeGreaterThanOrEqual(10);
    expect(new Set(stretches).size).toBeGreaterThan(1);
  });

  it("never stays in the same world two days running", () => {
    for (let offset = -400; offset < 400; offset += 1) {
      expect(merchantWorldOn(day(offset + 1))).not.toBe(merchantWorldOn(day(offset)));
    }
  });

  it("does not keep to a weekday: the same weekday finds them in different worlds", () => {
    const mondays = Array.from({ length: 12 }, (_, week) => merchantWorldOn(day(week * 7)));
    expect(new Set(mondays).size).toBeGreaterThan(2);
  });

  it("answers whether the merchant is in a world today, by world id or by its page's area name", () => {
    const today = merchantWorldOn(day(0));
    expect(isMerchantIn(today, day(0))).toBe(true);
    expect(isMerchantIn(`world-${today}`, day(0))).toBe(true);
    const elsewhere = MERCHANT_WORLDS.find((world) => world !== today) as string;
    expect(isMerchantIn(elsewhere, day(0))).toBe(false);
  });
});

describe("XpTravelingMerchant", () => {
  const buildingStub = { template: "<div class='balloon-stub' />", props: ["buildingId", "label", "sublabel", "size"] };
  const mountOn = (world: string) =>
    mount(XpTravelingMerchant, { props: { world }, global: { stubs: { XpBuildingModel: buildingStub } } });

  it("floats the balloon wagon over the world the merchant visits today", () => {
    const wrapper = mountOn(merchantWorldOn());
    const balloon = wrapper.findComponent(buildingStub);
    expect(balloon.exists()).toBe(true);
    expect(balloon.props("buildingId")).toBe("traveling-merchant");
    expect(balloon.props("label")).toBe("Boobeedeedle");
    wrapper.unmount();
  });

  it("leaves every other world empty", () => {
    const elsewhere = MERCHANT_WORLDS.find((world) => world !== merchantWorldOn()) as string;
    const wrapper = mountOn(elsewhere);
    expect(wrapper.findComponent(buildingStub).exists()).toBe(false);
    wrapper.unmount();
  });
});
