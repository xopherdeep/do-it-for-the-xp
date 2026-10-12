import {
  attacksLines,
  autoLine,
  blockedPathLines,
  bracesLines,
  choreUsedLines,
  damageTakenLines,
  fallenLines,
  frozenStrikeLine,
  runAwayLines,
  shadowStrikeLine,
  stepsForwardLines,
  stunnedStrikeLine,
} from "@/lib/services/battle/battleService/dialogLines";
import type { Enemy } from "@/lib/services/battle/battleService/types";

const beast = (name: string): Enemy => ({
  id: name,
  name,
  type: "monster",
  isBoss: false,
  health: 10,
  maxHealth: 10,
  attack: 10,
  defense: 1,
  speed: 1,
});

describe("dialogLines (characterization)", () => {
  const bunny = beast("Dust Bunny");

  it("autoLine types out and moves on by itself", () => {
    expect(autoLine("Hi")).toEqual({ text: "Hi", auto: true });
  });

  it("choreUsedLines is one auto line", () => {
    expect(choreUsedLines("Ada", "Sweep", bunny, 3)).toEqual([
      { text: "Ada used Sweep! Dust Bunny took 3 damage!", auto: true },
    ]);
  });

  it("stepsForwardLines names the fallen and the next beast", () => {
    expect(stepsForwardLines(bunny, beast("Sock Wraith"))).toEqual([
      "Dust Bunny was defeated!",
      "Sock Wraith steps forward!",
    ]);
  });

  it("bracesLines and attacksLines announce the move", () => {
    expect(bracesLines("Ada")).toEqual(["Ada braces!"]);
    expect(attacksLines(bunny)).toEqual(["Dust Bunny attacks!"]);
  });

  it("runAwayLines types the first line and waits on the second", () => {
    expect(runAwayLines()).toEqual([{ text: "Running away...", auto: true }, "Got away safely!"]);
  });

  it("blockedPathLines names the beast, or 'The enemy' with none", () => {
    expect(blockedPathLines(bunny)).toEqual(["Couldn't escape!", "Dust Bunny blocks your path!"]);
    expect(blockedPathLines(null)).toEqual(["Couldn't escape!", "The enemy blocks your path!"]);
  });

  it("explains each strike that does not land", () => {
    expect(shadowStrikeLine(bunny, "Ada")).toBe("Dust Bunny strikes at a shadow! Ada is already elsewhere.");
    expect(frozenStrikeLine(bunny)).toBe("Dust Bunny is frozen solid and cannot strike!");
    expect(stunnedStrikeLine(bunny)).toBe("Dust Bunny is stunned and misses its strike!");
  });

  it("damageTakenLines says whether the brace helped", () => {
    expect(damageTakenLines("Ada", 6, true)).toEqual(["Ada braced: only 6 damage!"]);
    expect(damageTakenLines("Ada", 12, false)).toEqual(["Ada takes 12 damage!"]);
  });

  it("fallenLines ends the fight with the blackout", () => {
    expect(fallenLines("Ada")).toEqual(["Ada has fallen!", "You blacked out..."]);
  });
});
