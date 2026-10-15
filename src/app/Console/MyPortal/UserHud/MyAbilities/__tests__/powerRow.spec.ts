import { buildPowerRow, fmtAp } from "../powerRow";
import type { Ability, AbilityStatus } from "@/types/abilities";
import type { HeroAbilitySnapshot } from "@/lib/services/abilities/heroAbilityStatus";

/**
 * What a Power row of the Powers app says: the kind, the AP meter, the one line that explains why Cast is off, and
 * whether Cast works. Pure (no store, router or sounds), so nothing is mocked.
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

const row = (
  status: AbilityStatus,
  ability: Ability = makeAbility(),
  snapshot: HeroAbilitySnapshot = makeSnapshot(),
  options: { groundedReason?: string | null; casting?: boolean; timerLeft?: string | null } = {}
) => buildPowerRow(ability, status, snapshot, options);

describe("buildPowerRow", () => {
  it("names the kind of Power and the cost and frequency chips", () => {
    expect(row("available").typeLabel).toBe("Privilege");
    expect(row("available", makeAbility({ type: "in-game" })).typeLabel).toBe("Spell");
    const r = row("available");
    expect(r.mpCost).toBe(5);
    expect(r.frequencyLabel).toBe("once a week");
  });

  it("draws the icon in either spelling and falls back to sparkles only when there is none", () => {
    expect(row("available").icon).toBe("fa-film");
    expect(row("available", makeAbility({ icon: "bolt" })).icon).toBe("fa-bolt");
    expect(row("available", makeAbility({ icon: "hand-holding-magic" })).icon).toBe("fa-hand-holding-magic");
    expect(row("available", makeAbility({ icon: "" })).icon).toBe("fa-sparkles");
    expect(row("available", makeAbility({ icon: undefined })).icon).toBe("fa-sparkles");
  });

  it("reads the AP window of the requirement and fills the meter", () => {
    const r = row("locked", makeAbility(), makeSnapshot({ daily: 4, total: 99 }));
    expect(r.needed).toBe(10);
    expect(r.earned).toBe(4);
    expect(r.apText).toBe("4/10 AP today");
    expect(r.meterWidth).toBe("40%");
  });

  it("reads the lifetime total for a flat requirement and never overfills the meter", () => {
    const r = row("available", makeAbility({ apRequirement: { amount: 10, period: "flat" } }), makeSnapshot({ total: 30 }));
    expect(r.apText).toBe("30/10 AP in all");
    expect(r.meterWidth).toBe("100%");
  });

  it("shows fractions of AP with one decimal", () => {
    expect(fmtAp(3)).toBe("3");
    expect(fmtAp(2.55)).toBe("2.6");
    expect(row("locked", makeAbility(), makeSnapshot({ daily: 2.5 })).stateLine).toBe("7.5 AP to go");
  });

  it("explains each state that keeps Cast off", () => {
    expect(row("locked").stateLine).toBe("10 AP to go");
    expect(row("locked", makeAbility(), makeSnapshot({ daily: 10 })).stateLine).toBe("Locked");
    expect(row("unlocked").stateLine).toBe("Need 5 MP");
    expect(row("cooling").stateLine).toBe("Cooling · back next week");
    expect(row("used").stateLine).toBe("Used");
    expect(row("active").stateLine).toBe("Active");
    expect(row("available").stateLine).toBe("");
  });

  it("casts only an available Power", () => {
    expect(row("available").canCast).toBe(true);
    (["locked", "unlocked", "cooling", "used", "active"] as AbilityStatus[]).forEach((status) => {
      expect(row(status).canCast).toBe(false);
    });
  });

  it("keeps Cast off while casting", () => {
    expect(row("available", makeAbility(), makeSnapshot(), { casting: true }).canCast).toBe(false);
  });

  it("a grounded hero cannot cast and the reason speaks for the Powers that were ready", () => {
    const grounded = { groundedReason: "Visit the Hospital first" };
    const ready = row("available", makeAbility(), makeSnapshot(), grounded);
    expect(ready.canCast).toBe(false);
    expect(ready.stateLine).toBe("Visit the Hospital first");
    // A Power that was already locked or short of MP keeps its own line
    expect(row("locked", makeAbility(), makeSnapshot(), grounded).stateLine).toBe("10 AP to go");
    expect(row("unlocked", makeAbility(), makeSnapshot(), grounded).stateLine).toBe("Need 5 MP");
  });

  it("marks a locked Power so the row can sit dimmer", () => {
    expect(row("locked").locked).toBe(true);
    expect(row("available").locked).toBe(false);
  });

  it("names a timed privilege's minutes, and has no timer chip for one without", () => {
    expect(row("available", makeAbility({ timerMinutes: 30 })).timerLabel).toBe("30 min");
    expect(row("available").timerLabel).toBe("");
  });

  it("says how long is left while the timer runs, and keeps Cast off until it ends", () => {
    const running = row("available", makeAbility({ timerMinutes: 30 }), makeSnapshot(), { timerLeft: "24:13" });
    expect(running.running).toBe(true);
    expect(running.stateLine).toBe("Running · 24:13 left");
    expect(running.canCast).toBe(false);
  });
});
