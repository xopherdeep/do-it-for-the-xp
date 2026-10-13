import {
  CLERK,
  CLERK_ERRANDS,
  CONCIERGE,
  NOTHING_ON_THE_BOARD,
  NURSE,
  benchReceiptLine,
  benchRefusalLine,
  careConfirmPrompt,
  careReceiptLine,
  careRefusalLine,
  clerkMenuChoices,
  clerkMenuPrompt,
  comingSoonPrompt,
  conciergeMenuChoices,
  conciergeMenuPrompt,
  conciergeNotice,
  courierLatePrompt,
  nurseMenuChoices,
  nurseMenuPrompt,
  nurseNotice,
  roomConfirmPrompt,
  roomReceiptLine,
  roomRefusalLine,
} from "@/lib/services/hometown/hometownPrompts";
import { quoteBenchRest, quoteCare } from "@/lib/services/hometown/Lodging";
import { BUILDING_ACCENTS, accentOf } from "@/components/organisms/RevealPrompt/revealPrompt";

describe("Nurse Joy's menu", () => {
  it("lists the old action sheet's choices in order, each with an icon, Leave Hospital last and dim", () => {
    const choices = nurseMenuChoices();
    expect(choices.map((choice) => choice.id)).toEqual(["heal", "revive", "bench", "stats", "patients", "leave"]);
    expect(choices.map((choice) => choice.label)).toEqual([
      "Heal Ailments",
      "Revive Heroes",
      "Rest on a Bench (free)",
      "Check Vital Stats",
      "View Patients",
      "Leave Hospital",
    ]);
    expect(choices.every((choice) => Boolean(choice.icon))).toBe(true);
    expect(choices[5].tone).toBe("ghost");
  });

  it("has the nurse speak, takes the hospital's pink and lets Escape step away from the desk", () => {
    const prompt = nurseMenuPrompt(["Hello!"]);
    expect(prompt).toMatchObject({ speaker: NURSE, accent: "hospital", lines: ["Hello!"], cancelId: "stay" });
    expect(prompt.choices.some((choice) => choice.id === "stay")).toBe(false);
    expect(accentOf(prompt.accent)).toBe("#e05a7a");
  });
});

describe("Nurse Joy's confirms", () => {
  it("asks the heal price with the coins rising, in her accent, and Escape is no", () => {
    const prompt = careConfirmPrompt("heal");
    expect(prompt).toMatchObject({ speaker: NURSE, accent: "hospital", sprite: "coins", cancelId: "no" });
    expect(prompt.lines[0]).toBe("The cost to heal is 50 GP. Shall I get started?");
    expect(prompt.choices.map((choice) => [choice.id, choice.label, Boolean(choice.icon)])).toEqual([
      ["yes", "Pay & Heal", true],
      ["no", "Not now", true],
    ]);
  });

  it("asks the revive price", () => {
    const prompt = careConfirmPrompt("revive");
    expect(prompt.lines[0]).toBe("The cost to revive is 100 GP. Shall I get started?");
    expect(prompt.choices[0].label).toBe("Pay & Revive");
  });

  it("turns a hero away in the words the screen always used, whichever the quote said", () => {
    expect(careRefusalLine(quoteCare("heal", { hp: { now: 10, max: 10 }, gp: { wallet: 99 } }))).toBe(
      "*checks your chart* You're already in perfect health! Come back if that changes."
    );
    expect(careRefusalLine(quoteCare("heal", { hp: { now: 1, max: 10 }, gp: { wallet: 5 } }))).toBe(
      "*frowns at the ledger* I'm sorry, dear, this costs ₲50 and your wallet is short. Come back when you can."
    );
  });

  it("reads the receipt: the verb, the price and where HP (and MP) stand", () => {
    expect(careReceiptLine("heal", 50, { now: 42, max: 42 })).toBe("Healed! ₲50 paid. HP 42/42");
    expect(careReceiptLine("revive", 100, { now: 42, max: 42 }, { now: 300, max: 300 })).toBe(
      "Revived! ₲100 paid. HP 42/42 MP 300/300"
    );
    expect(careReceiptLine("heal", 50)).toBe("Healed! ₲50 paid.");
  });

  it("says why the bench is refused and what the nap did", () => {
    expect(benchRefusalLine(quoteBenchRest({ hp: { now: 10, max: 10 } }, null))).toBe(
      "*checks your chart* You're in perfect health! The bench is for the wounded, dear."
    );
    expect(benchRefusalLine({ hpGain: 0, canRest: false, reason: "rested" })).toBe(
      "*taps the clock* You've had your nap for today. Come back tomorrow, or see me for a proper heal."
    );
    expect(benchReceiptLine(10, { now: 20, max: 42 })).toBe("You doze off on the waiting-room bench... +10 HP. HP 20/42 Same time tomorrow?");
  });

  it("answers with the nurse's voice, one OK, and the heart rising for a treatment", () => {
    expect(nurseNotice("Rest well.", "heart")).toMatchObject({ speaker: NURSE, accent: "hospital", sprite: "heart", lines: ["Rest well."], cancelId: "ok" });
    expect(nurseNotice("No.").sprite).toBeUndefined();
  });
});

describe("the concierge", () => {
  it("lists rooms, community events and leaving, each with an icon", () => {
    const choices = conciergeMenuChoices();
    expect(choices.map((choice) => [choice.id, choice.label])).toEqual([
      ["room", "Rent a Room"],
      ["events", "Community Events"],
      ["leave", "Leave Hotel"],
    ]);
    expect(choices.every((choice) => Boolean(choice.icon))).toBe(true);
    expect(choices[2].tone).toBe("ghost");
  });

  it("speaks in the hotel's purple, and Escape steps away from the desk", () => {
    const prompt = conciergeMenuPrompt(["Welcome!"]);
    expect(prompt).toMatchObject({ speaker: CONCIERGE, accent: "hotel", cancelId: "stay" });
    expect(accentOf(prompt.accent)).toBe("#e2783c");
  });

  it("asks the room's price with the bed rising", () => {
    const prompt = roomConfirmPrompt();
    expect(prompt).toMatchObject({ speaker: CONCIERGE, accent: "hotel", sprite: "bed", cancelId: "no" });
    expect(prompt.lines[0]).toBe("A night's rest is 10 GP and restores you fully. Check in?");
    expect(prompt.choices.map((choice) => choice.label)).toEqual(["Pay & Rest", "Not tonight"]);
  });

  it("asks the quote's price when the Hotel passes one", () => {
    expect(roomConfirmPrompt("adventure", 50).lines[0]).toBe("A night's rest is 50 GP and restores you fully. Check in?");
  });

  it("turns a guest away in the words the screen always used", () => {
    expect(roomRefusalLine(quoteCare("room", { hp: { now: 5, max: 5 }, mp: { now: 5, max: 5 }, gp: { wallet: 50 } }))).toBe(
      "*smiles* You look perfectly rested already! The room will be here when you need it."
    );
    expect(roomRefusalLine(quoteCare("room", { hp: { now: 1, max: 5 }, gp: { wallet: 2 } }))).toBe(
      "*checks the register* A room is ₲15 a night, and your wallet is short. Do come back."
    );
  });

  it("wishes good morning with the receipt", () => {
    expect(roomReceiptLine(10, { now: 42, max: 42 }, { now: 300, max: 300 })).toBe("Good morning! ₲10 paid. HP 42/42 MP 300/300");
  });

  it("has a line for a board that is not on the map", () => {
    expect(NOTHING_ON_THE_BOARD).toBe("Nothing on the board tonight.");
    expect(conciergeNotice(NOTHING_ON_THE_BOARD)).toMatchObject({ speaker: CONCIERGE, accent: "hotel", lines: [NOTHING_ON_THE_BOARD] });
  });
});

describe("the Town Hall clerk", () => {
  it("lists what a hero can do at the board, each with an icon, and a dim never mind", () => {
    const choices = clerkMenuChoices(false);
    expect(choices.map((choice) => [choice.id, choice.label])).toEqual([
      ["board", "Post on the Board"],
      ["bug", "Report a Bug"],
      ["never", "Never mind"],
    ]);
    expect(choices.every((choice) => Boolean(choice.icon))).toBe(true);
    expect(choices[2].tone).toBe("ghost");
  });

  it("offers Family Registration to a Game Master only, just above never mind", () => {
    expect(clerkMenuChoices(false).map((choice) => choice.id)).toEqual(["board", "bug", "never"]);
    const choices = clerkMenuChoices(true);
    expect(choices.map((choice) => choice.id)).toEqual(["board", "bug", "registration", "never"]);
    expect(choices[2]).toMatchObject({ label: "Family Registration", icon: "file-signature" });
    expect(choices.some((choice) => choice.id === "announce")).toBe(false);
  });

  it("asks with the stone tablet rising in the Town Hall's brown, and Escape is never mind", () => {
    const prompt = clerkMenuPrompt(true);
    expect(prompt).toMatchObject({ speaker: CLERK, accent: "townHall", sprite: "tablet", cancelId: "never" });
    expect(prompt.choices.map((choice) => choice.id)).toEqual(["board", "bug", "registration", "never"]);
    expect(clerkMenuPrompt(false).choices.map((choice) => choice.id)).toEqual(["board", "bug", "never"]);
    expect(accentOf(prompt.accent)).toBe(BUILDING_ACCENTS.townHall);
  });

  it("names each errand the way the board does, and says it is coming soon", () => {
    expect(CLERK_ERRANDS).toEqual({ board: "Posting on the Board", bug: "Bug reports", registration: "Family registration" });
    expect(comingSoonPrompt("Bug reports")).toMatchObject({
      speaker: CLERK,
      accent: "townHall",
      lines: ["*shuffles papers* Bug reports: coming soon, friend."],
      cancelId: "ok",
    });
  });

  it("says the courier is late and offers to try again, or never mind", () => {
    const prompt = courierLatePrompt();
    expect(prompt).toMatchObject({
      speaker: CLERK,
      accent: "townHall",
      sprite: "tablet",
      lines: ["*peers out the window* The courier hasn't arrived from the city yet."],
      cancelId: "never",
    });
    expect(prompt.choices.map((choice) => [choice.id, choice.label])).toEqual([
      ["retry", "Try again"],
      ["never", "Never mind"],
    ]);
    expect(prompt.choices[0].icon).toBe("redo");
    expect(prompt.choices[1].tone).toBe("ghost");
  });
});
