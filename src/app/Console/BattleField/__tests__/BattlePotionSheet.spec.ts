import { mount } from "@vue/test-utils";
import BattlePotionSheet from "../components/BattlePotionSheet.vue";
import { play$fx } from "@/assets/fx";
import type { PotionCard } from "@/lib/services/battle/BattlePotions";

/**
 * The potion sheet on its own: the bottles in the pack with name, count and effect, greyed with the reason
 * when one cannot be drunk, the empty line, one drink per opening, and Back. Only the sound board is a spy.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("@ionic/vue", () => {
  throw new Error("BattlePotionSheet must not import @ionic/vue");
});

const playFx = play$fx as jest.Mock;

const potion = (overrides: Partial<PotionCard> = {}): PotionCard => ({
  id: "health-potion",
  name: "Health Potion",
  qty: 2,
  faIcon: "flask-potion",
  effect: "Restores 50 HP",
  reason: null,
  ...overrides,
});

let heard: string[] = [];

const open = (potions: PotionCard[]) =>
  mount(BattlePotionSheet, {
    props: {
      potions,
      onCancel: () => heard.push("cancel"),
      onDrink: (id: string) => heard.push(`drink ${id}`),
    },
  });

describe("BattlePotionSheet", () => {
  let mounted: ReturnType<typeof open> | undefined;

  beforeEach(() => {
    heard = [];
    playFx.mockClear();
  });
  afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
  });

  it("lists potions with counts and greys the useless ones", async () => {
    mounted = open([
      potion(),
      potion({ id: "ether", name: "Ether", qty: 1, effect: "Restores 50 MP", reason: "Your MP is full." }),
    ]);
    expect(mounted.find("[data-cy=potion-sheet]").exists()).toBe(true);
    expect(mounted.find(".sheet-title").text()).toBe("Bottles");
    expect(mounted.find(".sheet-subtitle").text()).toBe("Drinking one keeps your move.");

    const rows = mounted.findAll(".battle-item");
    expect(rows).toHaveLength(2);
    expect(rows[0].attributes("data-cy")).toBe("potion-health-potion");
    expect(rows[0].find(".item-name").text()).toBe("Health Potion");
    expect(rows[0].find(".item-qty").text()).toBe("x2");
    expect(rows[0].find(".item-effect").text()).toBe("Restores 50 HP");
    expect(rows[0].find(".item-icon").classes()).toEqual(expect.arrayContaining(["fad", "fa-flask-potion"]));
    expect(rows[0].find(".item-reason").exists()).toBe(false);
    expect(rows[0].attributes("disabled")).toBeUndefined();

    expect(rows[1].classes()).toContain("is-unusable");
    expect(rows[1].attributes("disabled")).toBeDefined();
    expect(rows[1].find(".item-reason").text()).toBe("Your MP is full.");

    await rows[1].trigger("click");
    expect(heard).toEqual([]);
    await rows[0].trigger("click");
    expect(heard).toEqual(["drink health-potion"]);
  });

  it("shows the empty line", () => {
    mounted = open([]);
    expect(mounted.find(".empty-state").text()).toBe("Your bottles are empty. Temple shops brew potions.");
    expect(mounted.find(".battle-item").exists()).toBe(false);
  });

  it("a double tap drinks once", async () => {
    mounted = open([potion(), potion({ id: "elixir", name: "Elixir", qty: 1 })]);
    const rows = mounted.findAll(".battle-item");
    await rows[0].trigger("click");
    await rows[0].trigger("click");
    await rows[1].trigger("click");
    await mounted.find("[data-cy=potion-sheet-back]").trigger("click"); // the page closes the sheet next
    expect(heard).toEqual(["drink health-potion"]);
  });

  it("Back cancels", async () => {
    mounted = open([potion()]);
    await mounted.find("[data-cy=potion-sheet-back]").trigger("click");
    await mounted.find(".sheet-backdrop").trigger("click");
    expect(heard).toEqual(["cancel", "cancel"]);
    expect(playFx).toHaveBeenCalledWith("closeTask");
  });
});
