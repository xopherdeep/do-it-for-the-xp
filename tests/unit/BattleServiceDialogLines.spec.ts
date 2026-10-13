import {
  attacksLines,
  autoLine,
  bracesLines,
  choreUsedLines,
  damageTakenLines,
  fallenLines,
  frozenStrikeLine,
  nimbleDodgeLine,
  partingDodgeLine,
  partingStrikeLines,
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

  it("runAwayLines slips the parting strike's lines between the run and the getaway", () => {
    expect(runAwayLines(["Dust Bunny strikes as Ada flees! Ada takes 4 damage!"])).toEqual([
      { text: "Running away...", auto: true },
      "Dust Bunny strikes as Ada flees! Ada takes 4 damage!",
      "Got away safely!",
    ]);
  });

  it("there is no 'Couldn't escape' line any more: a run cannot fail", () => {
    const lines = jest.requireActual("@/lib/services/battle/battleService/dialogLines");
    expect(lines.blockedPathLines).toBeUndefined();
  });

  it("partingStrikeLines says what the strike cost, and who softened it", () => {
    expect(partingStrikeLines(bunny, "Ada", 4, null)).toEqual(["Dust Bunny strikes as Ada flees! Ada takes 4 damage!"]);
    expect(partingStrikeLines(bunny, "Ada", 2, "brace")).toEqual([
      "Dust Bunny strikes as Ada flees! Ada braced: only 2 damage!",
    ]);
    expect(partingStrikeLines(bunny, "Ada", 2, "slip")).toEqual([
      "Dust Bunny strikes as Ada flees! Ada slips most of it: only 2 damage!",
    ]);
  });

  it("partingStrikeLines says so when the strike emptied the hero's HP: they wake up in the Hospital", () => {
    expect(partingStrikeLines(bunny, "Ada", 5, null, true)).toEqual([
      "Dust Bunny strikes as Ada flees! Ada staggers away... and wakes up in the Hospital.",
    ]);
  });

  it("runAwayLines leaves out the getaway when the hero ended up in the Hospital", () => {
    expect(runAwayLines(["Ada staggers away... and wakes up in the Hospital."], false)).toEqual([
      { text: "Running away...", auto: true },
      "Ada staggers away... and wakes up in the Hospital.",
    ]);
  });

  it("nimbleDodgeLine is the agility dodge", () => {
    expect(nimbleDodgeLine(bunny, "Ada")).toBe("Dust Bunny lunges, but Ada is too quick to catch!");
  });

  it("partingDodgeLine says why the strike missed, by what dodged it", () => {
    expect(partingDodgeLine("shadow", bunny, "Ada")).toBe(shadowStrikeLine(bunny, "Ada"));
    expect(partingDodgeLine("frozen", bunny, "Ada")).toBe(frozenStrikeLine(bunny));
    expect(partingDodgeLine("hammer", bunny, "Ada")).toBe(stunnedStrikeLine(bunny));
    expect(partingDodgeLine("agility", bunny, "Ada")).toBe(nimbleDodgeLine(bunny, "Ada"));
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
