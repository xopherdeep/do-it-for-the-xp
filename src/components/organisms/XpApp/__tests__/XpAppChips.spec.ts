import { mount } from "@vue/test-utils";
import XpAppChips from "../XpAppChips.vue";
import XpAppChip from "../XpAppChip.vue";
import { rewardChips } from "../appChips";

/**
 * A row's chips line built from descriptors: the reward chips leave out what a quest does not pay, and the list draws
 * one XpAppChip per descriptor, in order, with no wrapper and the descriptor's class on its chip.
 */

describe("rewardChips", () => {
  it("lists the rewards a quest pays in XP, GP, AP order", () => {
    expect(rewardChips({ ap: 3, xp: 12, gp: 0 })).toEqual([
      { kind: "xp", value: 12 },
      { kind: "ap", value: 3 },
    ]);
  });

  it("is empty when the quest pays nothing", () => {
    expect(rewardChips({})).toEqual([]);
  });
});

describe("XpAppChips", () => {
  it("draws one chip per descriptor, in order, with its class", () => {
    const wrapper = mount(
      { components: { XpAppChips }, template: `<div class="row"><XpAppChips :chips="chips" /></div>` },
      {
        data: () => ({ chips: [{ kind: "mp", value: 25 }, { kind: "tag", value: "Too tired", class: "goods-reason" }] }),
        global: { components: { "xp-app-chip": XpAppChip } },
      }
    );

    const chips = wrapper.findAll(".row > .xp-app-chip");
    expect(chips.map((chip) => chip.text())).toEqual(["25 MP", "Too tired"]);
    expect(chips[1].classes()).toContain("goods-reason");
  });
});
