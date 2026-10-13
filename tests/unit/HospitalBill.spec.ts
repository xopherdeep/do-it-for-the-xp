import { REVIVE_COST } from "@/lib/services/hometown/Lodging";
import {
  admissionChatLine,
  admissionNotes,
  chargeHospitalBill,
  forgiveHospitalBill,
  forgiveNotes,
  CARRIED_TO_HOSPITAL_LINE,
  GROUNDED_REASON,
  HOSPITAL_BILL,
  nurseAdmissionBlocks,
  nurseBillLine,
  payoffChatLine,
  payoffNotes,
} from "@/lib/services/hometown/hospitalBill";
import { isGrounded } from "@/lib/services/gp/wallet";

/** The rules of the Hospital's bill (docs/Quest-Rooms-Spec.md 5.8): pure, so no store and no Ionic here. */

describe("the flat bill", () => {
  it("is one revive: REVIVE_COST, 100 GP", () => {
    expect(HOSPITAL_BILL).toBe(REVIVE_COST);
    expect(HOSPITAL_BILL).toBe(100);
  });

  it("does not look at the hero's level: the purse is all it reads", () => {
    const rich = chargeHospitalBill({ wallet: 500, savings: 0, limit: 1000 });
    const poor = chargeHospitalBill({ wallet: 500, savings: 0, limit: 1000 });
    expect(rich.bill).toBe(100);
    expect(poor.bill).toBe(100);
  });
});

describe("chargeHospitalBill", () => {
  it("takes it all from the wallet when the wallet covers it", () => {
    const charge = chargeHospitalBill({ wallet: 250, savings: 80, limit: 1000 });
    expect(charge).toMatchObject({ bill: 100, fromWallet: 100, fromSavings: 0, owed: 0, totalOwed: 0 });
    expect(charge.gp).toMatchObject({ wallet: 150, savings: 80, hospitalBill: 0 });
    expect(isGrounded(charge.gp)).toBe(false);
  });

  it("takes the wallet first, then savings, and owes the rest", () => {
    const charge = chargeHospitalBill({ wallet: 40, savings: 25, limit: 1000 });
    expect(charge).toMatchObject({ fromWallet: 40, fromSavings: 25, owed: 35, totalOwed: 35 });
    expect(charge.gp).toMatchObject({ wallet: 0, savings: 0, hospitalBill: 35 });
    expect(isGrounded(charge.gp)).toBe(true);
  });

  it("empties the wallet and owes the rest when there are no savings (the 40 of 100 case)", () => {
    const charge = chargeHospitalBill({ wallet: 40, savings: 0, limit: 1000 });
    expect(charge).toMatchObject({ bill: 100, fromWallet: 40, fromSavings: 0, owed: 60 });
    expect(charge.gp).toMatchObject({ wallet: 0, hospitalBill: 60 });
  });

  it("pulls from savings when the wallet is empty", () => {
    const charge = chargeHospitalBill({ wallet: 0, savings: 300, limit: 1000 });
    expect(charge).toMatchObject({ fromWallet: 0, fromSavings: 100, owed: 0 });
    expect(charge.gp).toMatchObject({ savings: 200 });
  });

  it("owes the whole bill to a hero with nothing at all", () => {
    expect(chargeHospitalBill({ wallet: 0, savings: 0, limit: 1000 })).toMatchObject({ owed: 100, totalOwed: 100 });
    expect(chargeHospitalBill(undefined)).toMatchObject({ owed: 100 });
  });

  it("stacks: a second admission adds another 100 to what is still owed", () => {
    const first = chargeHospitalBill({ wallet: 40, savings: 0, limit: 1000 });
    const second = chargeHospitalBill(first.gp);
    expect(second).toMatchObject({ bill: 100, owed: 100, totalOwed: 160 });
    expect(second.gp.hospitalBill).toBe(160);
    expect(chargeHospitalBill(second.gp).gp.hospitalBill).toBe(260);
  });

  it("charges a wallet that arrives after the first admission against the new bill, not the old one", () => {
    const first = chargeHospitalBill({ wallet: 0, savings: 0, limit: 1000 });
    const second = chargeHospitalBill({ ...first.gp, wallet: 70 });
    expect(second).toMatchObject({ fromWallet: 70, owed: 30, totalOwed: 130 });
  });

  it("leaves plain debt and the wallet limit alone", () => {
    const charge = chargeHospitalBill({ wallet: 10, savings: 0, debt: 33, limit: 300 });
    expect(charge.gp).toMatchObject({ debt: 33, limit: 300, hospitalBill: 90 });
  });

  it("takes a different flat bill when the caller names one", () => {
    expect(chargeHospitalBill({ wallet: 500, limit: 1000 }, 25)).toMatchObject({ bill: 25, fromWallet: 25 });
  });
});

describe("forgiveHospitalBill", () => {
  it("wipes the whole bill by default and lifts the grounding", () => {
    const result = forgiveHospitalBill({ wallet: 5, hospitalBill: 160, debt: 12, limit: 1000 });
    expect(result.forgiven).toBe(160);
    expect(result.gp).toMatchObject({ wallet: 5, hospitalBill: 0, debt: 12 });
    expect(isGrounded(result.gp)).toBe(false);
  });

  it("can forgive part of it", () => {
    const result = forgiveHospitalBill({ hospitalBill: 160 }, 100);
    expect(result).toMatchObject({ forgiven: 100 });
    expect(result.gp.hospitalBill).toBe(60);
    expect(isGrounded(result.gp)).toBe(true);
  });

  it("never forgives more than is owed, and forgives nothing for a hero who owes nothing", () => {
    expect(forgiveHospitalBill({ hospitalBill: 30 }, 500).forgiven).toBe(30);
    expect(forgiveHospitalBill({ hospitalBill: 0 }).forgiven).toBe(0);
    expect(forgiveHospitalBill(undefined).forgiven).toBe(0);
  });
});

describe("the words", () => {
  const split = chargeHospitalBill({ wallet: 40, savings: 0, limit: 1000 });

  it("has the nurse read the bill and say the hero is grounded", () => {
    expect(nurseBillLine(split)).toBe(
      "Treatment: ₲100. ₲40 from your wallet, ₲60 still owed. You're grounded until the bill is paid at the Gold Bank."
    );
  });

  it("names the savings when they paid a share", () => {
    const charge = chargeHospitalBill({ wallet: 40, savings: 25, limit: 1000 });
    expect(nurseBillLine(charge)).toBe(
      "Treatment: ₲100. ₲40 from your wallet, ₲25 from your savings, ₲35 still owed. You're grounded until the bill is paid at the Gold Bank."
    );
  });

  it("lets a hero who paid in full walk out free", () => {
    const line = nurseBillLine(chargeHospitalBill({ wallet: 300, limit: 1000 }));
    expect(line).toBe("Treatment: ₲100. ₲100 from your wallet. Paid in full, you're free to go.");
    expect(line).not.toMatch(/grounded/i);
  });

  it("says when a stacked bill grew", () => {
    const second = chargeHospitalBill(split.gp);
    expect(nurseBillLine(second)).toBe(
      "Treatment: ₲100. ₲100 still owed. That brings your bill to ₲160. You're grounded until the bill is paid at the Gold Bank."
    );
  });

  it("posts the family-chat line", () => {
    expect(admissionChatLine("Mia", split)).toBe("Mia was carried to the Hospital. Bill ₲100 (₲60 owed).");
    expect(admissionChatLine("Mia", chargeHospitalBill({ wallet: 300, limit: 1000 }))).toBe(
      "Mia was carried to the Hospital. Bill ₲100 (paid in full)."
    );
  });

  it("writes the hero's and the Game Master's notification", () => {
    const notes = admissionNotes("Mia", split);
    expect(notes.hero.title).toBe("Carried to the Hospital");
    expect(notes.hero.body).toContain("₲60");
    expect(notes.hero.body).toMatch(/grounded/i);
    expect(notes.gm.title).toBe("Mia was carried to the Hospital");
    expect(notes.gm.body).toContain("₲60 owed");
  });

  it("writes the payoff and forgiveness lines", () => {
    expect(payoffChatLine("Mia")).toBe("Mia paid the hospital bill. No longer grounded.");
    expect(payoffNotes("Mia")).toEqual({ title: "Mia paid the hospital bill", body: "Mia is no longer grounded." });
    expect(forgiveNotes("Dad", "Mia", 60).chat).toBe("Dad forgave Mia's hospital bill (₲60).");
    expect(forgiveNotes("Dad", "Mia", 60).hero.title).toBe("Hospital bill forgiven");
  });

  it("gives the grounded refusal in kid words", () => {
    expect(GROUNDED_REASON).toBe("Grounded: pay your hospital bill at the Gold Bank.");
  });
});

describe("what the nurse says on arrival", () => {
  it("greets, reads the bill and explains what grounded means", () => {
    const blocks = nurseAdmissionBlocks(chargeHospitalBill({ wallet: 40, limit: 1000 }), 60);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toMatch(/carried you in/i);
    expect(blocks[1]).toContain("₲40 from your wallet, ₲60 still owed");
    expect(blocks[2]).toMatch(/Gold Bank/);
  });

  it("skips the grounded tip for a hero who paid in full", () => {
    const blocks = nurseAdmissionBlocks(chargeHospitalBill({ wallet: 500, limit: 1000 }), 0);
    expect(blocks).toHaveLength(2);
    expect(blocks[1]).toMatch(/free to go/);
  });

  it("falls back to the bill still owed when the receipt is gone (the app was reloaded)", () => {
    const blocks = nurseAdmissionBlocks(null, 60);
    expect(blocks[1]).toBe("You still owe the Hospital ₲60. You're grounded until the bill is paid at the Gold Bank.");
  });

  it("has nothing to read for a hero who owes nothing and has no receipt", () => {
    expect(nurseAdmissionBlocks(null, 0)).toEqual([]);
  });

  it("has one line for the arena and the temple to share", () => {
    expect(CARRIED_TO_HOSPITAL_LINE).toBe("You were carried to the Hospital.");
  });
});
