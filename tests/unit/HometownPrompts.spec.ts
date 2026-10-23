import {
  CLERK,
  CLERK_ERRANDS,
  CONCIERGE,
  NOTHING_ON_THE_BOARD,
  NURSE,
  benchReceiptLine,
  benchRefusalLine,
  binPrompt,
  careConfirmPrompt,
  careReceiptLine,
  careRefusalLine,
  clerkMenuChoices,
  clerkMenuPrompt,
  conciergeMenuChoices,
  conciergeMenuPrompt,
  conciergeNotice,
  courierLatePrompt,
  deskNotice,
  forbiddenPrompt,
  keysTakenNotice,
  linkResultNotice,
  linkedStatusPrompt,
  nurseMenuChoices,
  nurseMenuPrompt,
  nurseNotice,
  postedNotice,
  registerAgainPrompt,
  registrationPrompt,
  roomConfirmPrompt,
  roomReceiptLine,
  roomRefusalLine,
  unlinkResultNotice,
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

  it("names each errand the way the board does", () => {
    expect(CLERK_ERRANDS).toEqual({
      board: "Posting on the Board",
      bug: "Bug reports",
      registration: "Family registration",
      "write-news": "Writing the news",
      "write-patch-note": "Writing a patch note",
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

describe("the clerk's Family Registration", () => {
  it("asks a family that is not registered to register, naming the account and warning the display name is public", () => {
    const prompt = registrationPrompt(false);
    expect(prompt).toMatchObject({ speaker: CLERK, accent: "townHall", sprite: "tablet", cancelId: "never" });
    expect(prompt.lines).toEqual([
      "To post for your family, register it with the Town Hall. You'll need a For the XP account.",
      "Your display name on the site is public, so pick one that isn't your full name.",
    ]);
    expect(prompt.choices.map((choice) => [choice.id, choice.label, choice.icon])).toEqual([
      ["have", "I have an account", "sign-in-alt"],
      ["create", "Create one", "user-plus"],
      ["never", "Never mind", "times"],
    ]);
    expect(prompt.choices[2].tone).toBe("ghost");
  });

  it("says the family is signed in through the website first, only when it is", () => {
    const viaWebsite = registrationPrompt(true);
    expect(viaWebsite.lines).toEqual([
      "You're signed in through the website. Registering lets your family post from any device.",
      "To post for your family, register it with the Town Hall. You'll need a For the XP account.",
      "Your display name on the site is public, so pick one that isn't your full name.",
    ]);
    expect(registrationPrompt(false).lines.join(" ")).not.toContain("signed in through the website");
  });

  it("shows a registered family under its display name, with Unlink this device and an OK", () => {
    const prompt = linkedStatusPrompt("Mom");
    expect(prompt).toMatchObject({ speaker: CLERK, accent: "townHall", sprite: "tablet", cancelId: "never" });
    expect(prompt.lines).toEqual(["Your family is registered as Mom."]);
    expect(prompt.choices.map((choice) => [choice.id, choice.label, choice.icon])).toEqual([
      ["unlink", "Unlink this device", "unlink"],
      ["never", "OK", "check"],
    ]);
  });

  it("welcomes the new member by name, takes a refusal gracefully and says plainly when nothing was saved", () => {
    expect(linkResultNotice("linked", "Mom")).toMatchObject({
      speaker: CLERK,
      accent: "townHall",
      lines: ["*stamps the ledger* Welcome, Mom! Your family is registered at the Town Hall."],
      cancelId: "ok",
    });
    expect(linkResultNotice("rejected").lines).toEqual(["*closes the ledger* Maybe another time."]);
    expect(linkResultNotice("failed").lines).toEqual([
      "*squints at the papers* The registration didn't go through, and nothing was saved. Try again.",
    ]);
  });

  it("tears up the card, and says what is left to do when the site could not be asked", () => {
    expect(unlinkResultNotice("forgotten")).toMatchObject({
      speaker: CLERK,
      accent: "townHall",
      lines: ["*tears up the card* This device no longer posts for your family."],
      cancelId: "ok",
    });
    expect(unlinkResultNotice("removed-here-only").lines).toEqual([
      '*tears up the card* Done here. To finish, remove "Do It For The XP" from your profile on doit.forthexp.com.',
    ]);
  });
});

describe("the clerk's posting lines", () => {
  it("says what happens to a post just kept, in the clerk's voice, with the stone tablet rising", () => {
    const lines = {
      "to-gm": "*pins it to the desk* Your Game Master will read it first.",
      "to-site": "*stamps it* Sent! It shows up once it's approved.",
      bug: "*files it carefully* Thanks! The developers will see it.",
      "on-file-hero": "*files it* I'll keep it until your Game Master registers the family.",
      "on-file-gm": "*files it* I'll send it once your family is registered.",
    } as const;
    for (const [outcome, line] of Object.entries(lines)) {
      expect(postedNotice(outcome as keyof typeof lines)).toMatchObject({
        speaker: CLERK,
        accent: "townHall",
        sprite: "tablet",
        lines: [line],
        cancelId: "ok",
      });
    }
  });

  it("tells a publishing link its post is up already", () => {
    expect(postedNotice("published").lines).toEqual(["*pins it to the wall* It's up on the wall already."]);
  });

  it("says the family must register again, to anyone", () => {
    expect(registerAgainPrompt()).toMatchObject({
      speaker: CLERK,
      accent: "townHall",
      lines: ["The Town Hall no longer recognizes your family. Your Game Master needs to register again."],
      cancelId: "ok",
    });
  });

  it("offers a Game Master to redo a registration that is not finished, or never mind", () => {
    const prompt = forbiddenPrompt(true);
    expect(prompt).toMatchObject({
      speaker: CLERK,
      accent: "townHall",
      sprite: "tablet",
      lines: ["Your registration isn't finished. Shall we redo it?"],
      cancelId: "never",
    });
    expect(prompt.choices.map((choice) => [choice.id, choice.label, choice.icon])).toEqual([
      ["redo", "Redo it", "file-signature"],
      ["never", "Never mind", "times"],
    ]);
    expect(prompt.choices[1].tone).toBe("ghost");
  });

  it("tells a hero to ask the Game Master, with nothing to redo", () => {
    const prompt = forbiddenPrompt(false);
    expect(prompt.lines).toEqual(["Your family's registration isn't finished. Ask your Game Master."]);
    expect(prompt.choices.map((choice) => choice.id)).toEqual(["ok"]);
    expect(prompt.cancelId).toBe("ok");
  });
});

describe("the clerk's desk", () => {
  it("offers the writers only to a link that can publish, after the hero's errands", () => {
    expect(clerkMenuChoices(true).map((c) => c.id)).toEqual(["board", "bug", "registration", "never"]);
    expect(clerkMenuChoices(true, true).map((c) => c.id)).toEqual(["board", "bug", "registration", "write-news", "write-patch-note", "never"]);
    expect(clerkMenuChoices(false, true).map((c) => c.label)).toContain("Write news");
    expect(clerkMenuChoices(false, true).find((c) => c.id === "write-patch-note")).toMatchObject({ label: "Write a patch note", icon: "pen" });
    expect(clerkMenuPrompt(true, "adventure", true).choices.map((c) => c.id)).toContain("write-news");
  });
  it("asks once before taking something down", () => {
    const prompt = binPrompt();
    expect(prompt.lines).toEqual(["Take it down? It goes to the city's bin; the site can bring it back for thirty days."]);
    expect(prompt.choices.map((c) => [c.id, c.label])).toEqual([["take-down", "Take it down"], ["leave", "Leave it"]]);
    expect(prompt.cancelId).toBe("leave");
  });
  it("says when the keys are taken back and what became of a desk job", () => {
    expect(keysTakenNotice().lines).toEqual(["The city has taken back your keys. Register again if that's a mistake."]);
    expect(deskNotice("published").lines).toEqual(["*pins it to the wall* It's up for everyone."]);
    expect(deskNotice("drafted").lines).toEqual(["*files it* Kept as a draft on the site."]);
    expect(deskNotice("saved").lines).toEqual(["*stamps it* Saved."]);
  });
});
