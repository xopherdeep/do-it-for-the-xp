import { readFileSync } from "fs";
import { join } from "path";
import {
  MAX_NOTE_LENGTH,
  awardAmounts,
  awardResult,
  canAward,
  gmGpNote,
  tidyNote,
  toAmount,
} from "@/app/Admin/XpDashboard/components/bonusAward";

describe("toAmount", () => {
  it("keeps whole numbers and rounds the rest", () => {
    expect(toAmount(10)).toBe(10);
    expect(toAmount("25")).toBe(25);
    expect(toAmount(2.6)).toBe(3);
    expect(toAmount(-5)).toBe(-5);
  });

  it("reads an empty or broken field as 0, never -0", () => {
    expect(toAmount("")).toBe(0);
    expect(toAmount(null)).toBe(0);
    expect(toAmount(undefined)).toBe(0);
    expect(toAmount("abc")).toBe(0);
    expect(toAmount("0")).toBe(0);
    expect(Object.is(toAmount("-0"), 0)).toBe(true);
  });
});

describe("awardAmounts", () => {
  it("pays GP, XP and AP of a bonus as typed", () => {
    expect(awardAmounts(false, { gp: "10", xp: 5, ap: "2" })).toEqual({ gp: 10, xp: 5, ap: 2 });
  });

  it("makes a penalty take GP only, whichever sign was typed", () => {
    expect(awardAmounts(true, { gp: -10, xp: 5, ap: 2 })).toEqual({ gp: -10, xp: 0, ap: 0 });
    expect(awardAmounts(true, { gp: "10", xp: 0, ap: 0 })).toEqual({ gp: -10, xp: 0, ap: 0 });
    expect(Object.is(awardAmounts(true, { gp: "", xp: 0, ap: 0 }).gp, 0)).toBe(true);
  });
});

describe("canAward", () => {
  const nothing = { gp: 0, xp: 0, ap: 0 };

  it("stays shut with nobody picked", () => {
    expect(canAward(0, { gp: 10, xp: 0, ap: 0 })).toBe(false);
  });

  it("stays shut while the amount is 0, including Custom's starting 0 and a cleared field", () => {
    expect(canAward(2, nothing)).toBe(false);
    expect(canAward(2, awardAmounts(false, { gp: "0", xp: "0", ap: "0" }))).toBe(false);
    expect(canAward(2, awardAmounts(false, { gp: "", xp: "", ap: "" }))).toBe(false);
    expect(canAward(2, awardAmounts(true, { gp: 0, xp: 0, ap: 0 }))).toBe(false);
  });

  it("opens for any amount that moves something", () => {
    expect(canAward(1, { gp: 5, xp: 0, ap: 0 })).toBe(true);
    expect(canAward(1, { gp: -5, xp: 0, ap: 0 })).toBe(true);
    expect(canAward(1, { gp: 0, xp: 3, ap: 0 })).toBe(true);
    expect(canAward(1, { gp: 0, xp: 0, ap: 1 })).toBe(true);
  });

  it("does not count a negative XP or AP as something to pay", () => {
    expect(canAward(1, { gp: 0, xp: -3, ap: -1 })).toBe(false);
  });
});

describe("the wallet history note", () => {
  it("uses the default wording when the Game Master wrote nothing", () => {
    expect(gmGpNote(10)).toBe("Game Master bonus");
    expect(gmGpNote(-10)).toBe("Game Master penalty");
    expect(gmGpNote(10, "")).toBe("Game Master bonus");
    expect(gmGpNote(-10, "   \n ")).toBe("Game Master penalty");
    expect(gmGpNote(10, undefined)).toBe("Game Master bonus");
  });

  it("shows the Game Master's note when given", () => {
    expect(gmGpNote(10, "Cleaned the whole garage")).toBe("Cleaned the whole garage");
    expect(gmGpNote(-5, "Left the gate open")).toBe("Left the gate open");
  });

  it("keeps the note to one trimmed line of a sensible length", () => {
    expect(tidyNote("  Great\n\nteamwork   today ")).toBe("Great teamwork today");
    expect(tidyNote("x".repeat(500))).toHaveLength(MAX_NOTE_LENGTH);
    expect(tidyNote(42)).toBe("");
  });
});

describe("the award result the sheet hands back", () => {
  it("carries who, how much and the note so the dashboard can refresh", () => {
    const members = ["a", "b"];
    const result = awardResult(false, members, { gp: 10, xp: 5, ap: 0 }, " Well done ");
    expect(result).toEqual({ isPenalty: false, members: ["a", "b"], gp: 10, xp: 5, ap: 0, note: "Well done" });
    expect(result.members).not.toBe(members);
  });
});

describe("the sheet", () => {
  const sheet = readFileSync(join(__dirname, "../../src/app/Admin/XpDashboard/components/XpBonus.vue"), "utf8");

  it("sends Custom to the number 0, not the text \"0\"", () => {
    expect(sheet).not.toMatch(/segment-button value="0"/);
    expect(sheet).toContain('<ion-segment-button :value="0"> Custom </ion-segment-button>');
  });

  it("hands the award result back when it closes", () => {
    expect(sheet).toContain("modalController.dismiss(result)");
    expect(sheet).toContain("gmGpNote(gp, this.notes)");
  });
});
