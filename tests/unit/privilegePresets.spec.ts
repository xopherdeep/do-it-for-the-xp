import fs from "fs";
import path from "path";
import { AbilityType } from "@/hooks/abilities/abilityConstants";
import { PRIVILEGE_PRESETS, FAMILY_PRIVILEGES } from "@/lib/services/abilities/privilegePresets";
import { REAL_LIFE_PRESETS } from "@/lib/services/abilities/AbilityPresets";
import { timerMinutesOf } from "@/lib/services/abilities/PowerTimers";
import { BUILT_IN_PACKS } from "@/lib/services/core/packs/catalog";

/** The timed privileges the packs seed: each one is a real-life Power with a clock, a cost and an icon that draws. */

const DUOTONE = path.resolve(__dirname, "../../src/assets/fonts/font-awesome/svgs/duotone");

describe("timed privilege presets", () => {
  it("are real-life Powers with minutes on the clock and an MP cost", () => {
    for (const power of PRIVILEGE_PRESETS) {
      expect(power.type).toBe(AbilityType.RealLife);
      expect(timerMinutesOf(power)).toBeGreaterThan(0);
      expect(power.mpCost).toBeGreaterThan(0);
      expect(power.apRequirement.period).toBe(power.frequency);
    }
  });

  it("have ids no other preset uses, so a pack can own them", () => {
    const ids = [...PRIVILEGE_PRESETS, ...REAL_LIFE_PRESETS].map((power) => power.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("use duotone icons the app ships", () => {
    const missing = PRIVILEGE_PRESETS.filter((power) => !fs.existsSync(path.join(DUOTONE, `${power.icon}.svg`)));
    expect(missing.map((power) => power.icon)).toEqual([]);
  });

  it("put the screen-time privileges on the old screen-time presets' clock too", () => {
    const minutes = (id: string) => timerMinutesOf(REAL_LIFE_PRESETS.find((power) => power.id === id));
    expect(minutes("irl-gaming-hour")).toBe(60);
    expect(minutes("irl-app-extension")).toBe(30);
    expect(minutes("irl-night-owl")).toBe(30);
    expect(minutes("irl-car-dj")).toBe(15);
  });

  it("are seeded into every built-in pack", () => {
    for (const pack of BUILT_IN_PACKS) {
      const timed = (pack.content.abilities ?? []).filter((power) => timerMinutesOf(power) > 0);
      expect({ pack: pack.id, timed: timed.length >= 3 }).toEqual({ pack: pack.id, timed: true });
    }
    const family = BUILT_IN_PACKS.find((pack) => pack.id === "family");
    const familyIds = (family?.content.abilities ?? []).map((power) => power.id);
    expect(familyIds).toEqual(expect.arrayContaining(FAMILY_PRIVILEGES.map((power) => power.id)));
  });
});
