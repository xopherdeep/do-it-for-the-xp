import { pickableHeroes, whoLine } from "@/lib/services/quests/questHeroes";

const dad = { id: "gm-1", isAdult: true };
const mia = { id: "kid-1", isAdult: false };
const sam = { id: "kid-2" };

describe("the heroes a quest can be given to", () => {
  it("leaves the Game Masters out of the picker and keeps the kids in order", () => {
    expect(pickableHeroes([dad, mia, sam])).toEqual([mia, sam]);
  });

  it("keeps a Game Master the quest is already given to, so they can still be taken off", () => {
    expect(pickableHeroes([dad, mia], ["gm-1"])).toEqual([dad, mia]);
    expect(pickableHeroes([dad, mia], ["kid-1"])).toEqual([mia]);
  });

  it("is empty for a family with no heroes yet", () => {
    expect(pickableHeroes([])).toEqual([]);
    expect(pickableHeroes([dad])).toEqual([]);
  });

  it("does not change the list it is given", () => {
    const everyone = [dad, mia];
    pickableHeroes(everyone);
    expect(everyone).toEqual([dad, mia]);
  });
});

describe("the line that says what to do for the way the quest is shared", () => {
  it("tells Solo to pick the hero who takes it", () => {
    expect(whoLine("individual")).toBe("Pick the hero who takes it.");
  });

  it("says an Open Bounty needs no one picked", () => {
    expect(whoLine("asNeeded")).toMatch(/Open Bounty is open to everyone/);
    expect(whoLine("asNeeded")).not.toMatch(/Pick/);
  });

  it("speaks to a team, a rotation and a race", () => {
    expect(whoLine("collaborate")).toBe("Pick the heroes who work as a team.");
    expect(whoLine("rotate")).toBe("Pick the heroes who take turns.");
    expect(whoLine("compete")).toBe("Pick the heroes who race.");
  });

  it("falls back to asking how it is shared, and never uses a dash", () => {
    expect(whoLine(undefined)).toBe("Choose how it is shared.");
    expect(whoLine("nonsense")).toBe("Choose how it is shared.");
    for (const type of ["asNeeded", "individual", "collaborate", "rotate", "compete", ""]) {
      expect(whoLine(type)).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
