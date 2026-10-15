import { mount } from "@vue/test-utils";
import BattlePowersSheet from "../components/BattlePowersSheet.vue";
import { play$fx } from "@/assets/fx";
import type { Ability } from "@/types/abilities";
import type { HeroAbilitySnapshot } from "@/lib/services/abilities/heroAbilityStatus";
import type { BattlePowerEntry } from "@/lib/services/battle/BattlePowers";

/**
 * The Powers sheet on its own: one battle XpPowerCard per Power (MP and effect instead of the AP meter),
 * greyed with the reason when it cannot be cast, the empty line, one cast per opening, and Back.
 * The card is presentational and is mounted for real; only the sound board is a spy.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));
jest.mock("@ionic/vue", () => {
  throw new Error("BattlePowersSheet must not import @ionic/vue");
});

const playFx = play$fx as jest.Mock;

const ability = (overrides: Partial<Ability> = {}): Ability => ({
  id: "stop",
  name: "Stop",
  description: "Time stands still.",
  type: "in-game",
  frequency: "flat",
  mpCost: 25,
  apRequirement: { amount: 5, period: "flat" },
  prerequisites: [],
  icon: "fa-hourglass",
  isPreset: true,
  position: { x: 0, y: 0 },
  ...overrides,
});

const entry = (overrides: Partial<Ability> = {}, card: Partial<BattlePowerEntry["card"]> = {}): BattlePowerEntry => ({
  ability: ability(overrides),
  card: { mp: 25, effect: "Pauses the clock for 15 minutes", reason: null, ...card },
});

const snapshot: HeroAbilitySnapshot = {
  level: 3,
  mp: 40,
  ap: { total: 9, daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0 },
  classes: {},
};

let heard: string[] = [];

const open = (powers: BattlePowerEntry[]) =>
  mount(BattlePowersSheet, {
    props: {
      powers,
      snapshot,
      onCancel: () => heard.push("cancel"),
      onCast: (id: string) => heard.push(`cast ${id}`),
    },
  });

describe("BattlePowersSheet", () => {
  let mounted: ReturnType<typeof open> | undefined;

  beforeEach(() => {
    heard = [];
    playFx.mockClear();
  });
  afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
  });

  it("renders a battle XpPowerCard per Power", async () => {
    mounted = open([
      entry(),
      entry({ id: "heal", name: "System Restore", mpCost: 40 }, { mp: 40, effect: "Heals you", reason: "Your HP is full." }),
    ]);
    expect(mounted.find("[data-cy=powers-sheet]").exists()).toBe(true);
    expect(mounted.find(".sheet-title").text()).toBe("Powers");
    expect(mounted.find(".sheet-subtitle").text()).toBe("Casting one keeps your move.");

    const cards = mounted.findAll(".power-card");
    expect(cards).toHaveLength(2);
    expect(mounted.find(".power-ap").exists()).toBe(false);
    expect(cards[0].find(".power-name").text()).toBe("Stop");
    expect(cards[0].find(".power-cost").text()).toBe("25 MP · Pauses the clock for 15 minutes");
    expect(cards[0].find(".power-state").exists()).toBe(false);
    expect(cards[0].find(".cast-btn").attributes("disabled")).toBeUndefined();
    expect(cards[1].find(".power-state").text()).toBe("Your HP is full.");
    expect(cards[1].find(".cast-btn").attributes("disabled")).toBeDefined();

    await cards[1].find(".cast-btn").trigger("click");
    expect(heard).toEqual([]);
    await cards[0].find(".cast-btn").trigger("click");
    expect(heard).toEqual(["cast stop"]);
  });

  it("shows the empty line", () => {
    mounted = open([]);
    expect(mounted.find(".empty-state").text()).toBe("No battle Powers yet. Earn AP to unlock them.");
    expect(mounted.find(".power-card").exists()).toBe(false);
  });

  it("a double tap casts once", async () => {
    mounted = open([entry(), entry({ id: "slow", name: "Slow" })]);
    const buttons = mounted.findAll(".cast-btn");
    await buttons[0].trigger("click");
    await buttons[0].trigger("click");
    await buttons[1].trigger("click");
    await mounted.find("[data-cy=powers-sheet-back]").trigger("click"); // the page closes the sheet next
    expect(heard).toEqual(["cast stop"]);
  });

  it("Back cancels", async () => {
    mounted = open([entry()]);
    await mounted.find("[data-cy=powers-sheet-back]").trigger("click");
    await mounted.find(".sheet-backdrop").trigger("click");
    expect(heard).toEqual(["cancel", "cancel"]);
    expect(playFx).toHaveBeenCalledWith("closeTask");
  });
});
