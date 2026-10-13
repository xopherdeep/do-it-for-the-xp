import { mount } from "@vue/test-utils";
import XpPowerCard from "@/app/Console/MyPortal/UserHud/MyAbilities/components/XpPowerCard.vue";
import type { Ability, AbilityStatus } from "@/types/abilities";
import type { HeroAbilitySnapshot } from "@/lib/services/abilities/heroAbilityStatus";
import type { BattlePowerCard } from "@/lib/services/battle/BattlePowers";

/**
 * The Power card in jsdom: the requirement and meter, the one line that says why a Power cannot be cast yet,
 * and the Cast button, which only works when the Power is available. In a fight (`battle` set) the AP meter
 * gives way to the MP and effect, and the battle reason decides Cast. The card is presentational (no store,
 * router or sounds), so nothing is mocked.
 */

const makeAbility = (overrides: Partial<Ability> = {}): Ability => ({
  id: "power-1",
  name: "Movie Night",
  description: "Pick the family movie.",
  type: "real-life",
  frequency: "weekly",
  mpCost: 5,
  apRequirement: { amount: 10, period: "daily" },
  prerequisites: [],
  icon: "fa-film",
  isPreset: false,
  position: { x: 0, y: 0 },
  ...overrides,
});

const makeSnapshot = (ap: Partial<HeroAbilitySnapshot["ap"]> = {}): HeroAbilitySnapshot => ({
  level: 3,
  mp: 20,
  ap: { total: 0, daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0, ...ap },
  classes: {},
});

const show = (
  props: {
    ability?: Ability;
    status?: AbilityStatus;
    unlocked?: boolean;
    snapshot?: HeroAbilitySnapshot;
    casting?: boolean;
    battle?: BattlePowerCard;
    groundedReason?: string | null;
  } = {}
) =>
  mount(XpPowerCard, {
    props: {
      ability: makeAbility(),
      status: "available",
      unlocked: true,
      snapshot: makeSnapshot({ daily: 10 }),
      ...props,
    },
  });

describe("XpPowerCard", () => {
  it("lets an available Power be cast: the button is on and a tap says which Power", async () => {
    const card = show();
    const button = card.get("button.cast-btn");

    expect(button.attributes("disabled")).toBeUndefined();
    expect(card.find(".power-state").exists()).toBe(false);

    await button.trigger("click");
    expect(card.emitted("cast")).toEqual([["power-1"]]);
  });

  it("keeps the Cast button off while a cast is already on its way", async () => {
    const card = show({ casting: true });
    const button = card.get("button.cast-btn");

    expect(button.attributes("disabled")).toBeDefined();
    await button.trigger("click");
    expect(card.emitted("cast")).toBeUndefined();
  });

  it("tells a locked Power how many AP are still missing and cannot be cast", async () => {
    const card = show({ status: "locked", unlocked: false, snapshot: makeSnapshot({ daily: 7 }) });

    expect(card.text()).toContain("3 AP to go");
    expect(card.text()).toContain("7/10 AP");
    expect(card.text()).toContain("10 AP today");
    expect(card.get(".power-meter-fill").attributes("style")).toContain("width: 70%");
    expect(card.get("button.cast-btn").attributes("disabled")).toBeDefined();

    await card.get("button.cast-btn").trigger("click");
    expect(card.emitted("cast")).toBeUndefined();
  });

  it("says plain Locked when the AP is there but something else (level, class, prerequisite) is not", () => {
    const card = show({ status: "locked", unlocked: false, snapshot: makeSnapshot({ daily: 12 }) });

    expect(card.get(".power-state").text()).toBe("Locked");
    expect(card.get(".power-meter-fill").attributes("style")).toContain("width: 100%");
  });

  it("says when a cooling Power is back, by how often it can be cast", () => {
    const card = show({ status: "cooling", ability: makeAbility({ frequency: "daily" }) });

    expect(card.text()).toContain("Cooling");
    expect(card.text()).toContain("tomorrow");
    expect(card.text()).toContain("5 MP · once a day");
    expect(card.get("button.cast-btn").attributes("disabled")).toBeDefined();
  });

  it("names the MP a hero is short of on an unlocked Power", () => {
    const card = show({ status: "unlocked", ability: makeAbility({ mpCost: 5 }) });

    expect(card.get(".power-state").text()).toBe("Need 5 MP");
    expect(card.get("button.cast-btn").attributes("disabled")).toBeDefined();
  });

  it("marks a used Power as used", () => {
    const card = show({ status: "used" });

    expect(card.get(".power-state").text()).toBe("Used");
    expect(card.get("button.cast-btn").attributes("disabled")).toBeDefined();
  });

  it("reads the AP window that matches the period, and the lifetime total for the rest", () => {
    const snapshot = makeSnapshot({ total: 40, daily: 1, weekly: 6, monthly: 15 });
    const weekly = show({ snapshot, ability: makeAbility({ apRequirement: { amount: 8, period: "weekly" } }) });
    const flat = show({ snapshot, ability: makeAbility({ apRequirement: { amount: 50, period: "flat" } }) });
    const biannual = show({ snapshot, ability: makeAbility({ apRequirement: { amount: 50, period: "biannual" } }) });

    expect(weekly.text()).toContain("8 AP this week");
    expect(weekly.text()).toContain("6/8 AP");
    expect(flat.text()).toContain("50 AP in all");
    expect(flat.text()).toContain("40/50 AP");
    expect(biannual.text()).toContain("50 AP in all");
  });

  it("fills the meter when a Power asks for no AP", () => {
    const card = show({ ability: makeAbility({ apRequirement: { amount: 0, period: "flat" } }) });

    expect(card.get(".power-meter-fill").attributes("style")).toContain("width: 100%");
  });

  it("shows the name, description, the Privilege or Spell chip, and an icon", () => {
    const privilege = show();
    const spell = show({ ability: makeAbility({ type: "in-game", icon: "not-a-fa-class", frequency: "flat" }) });

    expect(privilege.text()).toContain("Movie Night");
    expect(privilege.text()).toContain("Pick the family movie.");
    expect(privilege.get(".power-chip").text()).toBe("Privilege");
    expect(privilege.get("i.power-icon").classes()).toEqual(expect.arrayContaining(["fad", "fa-film"]));
    expect(spell.get(".power-chip").text()).toBe("Spell");
    expect(spell.get("i.power-icon").classes()).toEqual(expect.arrayContaining(["fad", "fa-sparkles"]));
    expect(spell.text()).toContain("5 MP · anytime");
  });

  it("battle prop hides the AP meter and shows MP and effect", async () => {
    const card = show({
      ability: makeAbility({ type: "in-game", mpCost: 30 }),
      battle: { mp: 25, effect: "Pauses the clock for 15 minutes", reason: null },
    });

    expect(card.find(".power-ap").exists()).toBe(false);
    expect(card.get(".power-cost").text()).toBe("25 MP · Pauses the clock for 15 minutes");
    expect(card.find(".power-state").exists()).toBe(false);

    await card.get("button.cast-btn").trigger("click");
    expect(card.emitted("cast")).toEqual([["power-1"]]);
  });

  it("battle reason disables Cast", async () => {
    const card = show({ battle: { mp: 25, effect: "Pauses the clock for 15 minutes", reason: "Not enough MP" } });

    expect(card.get(".power-state").text()).toBe("Not enough MP");
    expect(card.get("button.cast-btn").attributes("disabled")).toBeDefined();

    await card.get("button.cast-btn").trigger("click");
    expect(card.emitted("cast")).toBeUndefined();
  });

  it("keeps Cast off and says why while the hero is grounded, even for a Power that was ready", async () => {
    const card = show({ groundedReason: "Grounded: pay your hospital bill at the Gold Bank." });
    const button = card.get("button.cast-btn");

    expect(button.attributes("disabled")).toBeDefined();
    expect(card.get(".power-state").text()).toBe("Grounded: pay your hospital bill at the Gold Bank.");
    await button.trigger("click");
    expect(card.emitted("cast")).toBeUndefined();
  });

  it("still says what a locked Power lacks while grounded", () => {
    const card = show({
      status: "locked",
      unlocked: false,
      snapshot: makeSnapshot({ daily: 7 }),
      groundedReason: "Grounded: pay your hospital bill at the Gold Bank.",
    });
    expect(card.text()).toContain("3 AP to go");
  });

  it("does not ground a battle spell: a fight's Cast works whenever the battle has no reason", async () => {
    const battle = { mp: 4, effect: "Heals 20 HP", reason: null } as unknown as BattlePowerCard;
    const card = show({ battle, groundedReason: "Grounded: pay your hospital bill at the Gold Bank." });
    expect(card.get("button.cast-btn").attributes("disabled")).toBeUndefined();
  });
});
