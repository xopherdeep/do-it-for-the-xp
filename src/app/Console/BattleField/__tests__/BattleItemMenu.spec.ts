import { mount } from "@vue/test-utils";
import BattleItemMenu from "../components/BattleItemMenu.vue";
import { play$fx } from "@/assets/fx";
import type { BattleItemCard } from "@/lib/services/battle/BattleItems";

/**
 * The Item sheet on its own: two hands, each with its name, MP and one line of effect; greyed with a reason
 * when it cannot be used; "Nothing equipped" when both hands are empty. Only the sound board is a spy.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("@ionic/vue", () => {
  throw new Error("BattleItemMenu must not import @ionic/vue");
});

const playFx = play$fx as jest.Mock;

const card = (overrides: Partial<BattleItemCard> = {}): BattleItemCard => ({
  name: "Ice Wand",
  faIcon: "wand-magic ice",
  mp: 50,
  effect: "+10 minutes on the clock",
  reason: null,
  ...overrides,
});

let heard: string[] = [];

const open = (left: BattleItemCard | null, right: BattleItemCard | null) =>
  mount(BattleItemMenu, {
    props: {
      left,
      right,
      onCancel: () => heard.push("cancel"),
      onUse: (used: BattleItemCard) => heard.push(`use ${used.name}`),
    },
  });

describe("BattleItemMenu", () => {
  let mounted: ReturnType<typeof open> | undefined;

  beforeEach(() => {
    heard = [];
    playFx.mockClear();
  });
  afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
  });

  it("lists the two hands with name, MP and effect, and a tap uses the item once", async () => {
    mounted = open(card(), card({ name: "Bottles", faIcon: "flask-potion", mp: 0, effect: "Heals 25% of max HP" }));
    const rows = mounted.findAll(".battle-item");
    expect(rows).toHaveLength(2);
    expect(rows[0].find(".item-name").text()).toBe("Ice Wand");
    expect(rows[0].find(".item-mp").text()).toBe("50 MP");
    expect(rows[0].find(".item-effect").text()).toBe("+10 minutes on the clock");
    expect(rows[0].find(".item-icon").classes()).toEqual(expect.arrayContaining(["fad", "fa-wand-magic", "ice"]));
    expect(rows[1].find(".item-mp").exists()).toBe(false); // the bottles cost nothing
    expect(mounted.find("ion-button").exists()).toBe(false);

    await rows[0].trigger("click");
    await rows[1].trigger("click"); // the sheet is busy: one use per opening
    expect(heard).toEqual(["use Ice Wand"]);
  });

  it("greys an item with its reason and does not let it be used", async () => {
    mounted = open(card({ reason: "Not enough MP" }), card({ name: "Lantern", faIcon: "flashlight", mp: 0, effect: "Does nothing here.", reason: "Does nothing here." }));
    const rows = mounted.findAll(".battle-item");
    expect(rows[0].classes()).toContain("is-unusable");
    expect(rows[0].attributes("disabled")).toBeDefined();
    expect(rows[0].find(".item-reason").text()).toBe("Not enough MP");
    // When the reason is the effect itself it is said once, not twice
    expect(rows[1].find(".item-effect").text()).toBe("Does nothing here.");
    expect(rows[1].find(".item-reason").exists()).toBe(false);

    await rows[0].trigger("click");
    expect(heard).toEqual([]);
  });

  it("says what to do when both hands are empty, and names an empty hand next to a full one", () => {
    mounted = open(null, null);
    expect(mounted.find(".empty-state").text()).toBe("Nothing equipped. Visit the Area tab.");
    mounted.unmount();

    mounted = open(null, card());
    expect(mounted.find(".empty-state").exists()).toBe(false);
    const rows = mounted.findAll(".battle-item");
    expect(rows[0].find(".item-name").text()).toBe("Empty hand");
    expect(rows[0].attributes("disabled")).toBeDefined();
    expect(rows[1].find(".item-name").text()).toBe("Ice Wand");
  });

  it("Back and the backdrop close the sheet with the close sound", async () => {
    mounted = open(card(), null);
    await mounted.find("[data-cy=item-back]").trigger("click");
    await mounted.find(".sheet-backdrop").trigger("click");
    expect(heard).toEqual(["cancel", "cancel"]);
    expect(playFx).toHaveBeenCalledWith("closeTask");
  });
});
