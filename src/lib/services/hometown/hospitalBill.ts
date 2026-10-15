/**
 * The Hospital's bill, the pure part (docs/Quest-Rooms-Spec.md 5.8): what an admission costs, who pays it, what a
 * Game Master can forgive, and the words the nurse, the chat and the notices use. Nothing here touches a store; the
 * service that does is `hospitalAdmission.ts`.
 *
 *   - The bill is flat: HOSPITAL_BILL = REVIVE_COST, whatever the hero's level. Quest pay comes from difficulty, not
 *     level, so a level-scaled bill would grow while income stays the same (the growth mechanic decision 6 rules out).
 *   - It comes out of the wallet first, then savings; whatever is left is owed (`GpPurse.hospitalBill`, kept apart
 *     from `debt`). Bills stack: a second admission adds another 100.
 *   - While anything is owed the hero is grounded (`isGrounded` in wallet.ts).
 */
import { gold } from "@/lib/services/gp/bankTeller";
import { normalizePurse, type GpPurse, type Purse } from "@/lib/services/gp/wallet";
import { REVIVE_COST } from "./Lodging";

/** What one admission costs: the same 100 GP as a paid revive. Tunable here and nowhere else. */
export const HOSPITAL_BILL = REVIVE_COST;

/** The one line the arena or the temple says as a hero blacks out, before the Hospital screen. */
export const CARRIED_TO_HOSPITAL_LINE = "You were carried to the Hospital.";

/** Why a grounded hero's Cast is refused. */
export const GROUNDED_REASON = "Grounded: pay your hospital bill at the Gold Bank.";

const whole = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

/** How an admission's bill was met. */
export interface BillCharge {
  /** The purse afterwards */
  gp: Purse;
  /** What this admission billed */
  bill: number;
  fromWallet: number;
  fromSavings: number;
  /** What this admission left unpaid (added to the hero's hospital bill) */
  owed: number;
  /** The whole hospital bill after this admission, earlier admissions included */
  totalOwed: number;
}

/** Charge one admission to a purse: wallet first, then savings, the rest added to `hospitalBill`. */
export function chargeHospitalBill(gp: GpPurse | null | undefined, bill: number = HOSPITAL_BILL): BillCharge {
  const purse = normalizePurse(gp);
  const billed = whole(bill);
  const fromWallet = Math.min(purse.wallet, billed);
  const fromSavings = Math.min(purse.savings, billed - fromWallet);
  const owed = billed - fromWallet - fromSavings;
  const totalOwed = purse.hospitalBill + owed;
  return {
    gp: {
      ...purse,
      wallet: purse.wallet - fromWallet,
      savings: purse.savings - fromSavings,
      hospitalBill: totalOwed,
    },
    bill: billed,
    fromWallet,
    fromSavings,
    owed,
    totalOwed,
  };
}

/** What a Game Master's forgiveness did. */
export interface Forgiveness {
  gp: Purse;
  forgiven: number;
}

/** Wipe the hospital bill (or the first `amount` of it). The grounding lifts when it reaches 0. */
export function forgiveHospitalBill(gp: GpPurse | null | undefined, amount?: number): Forgiveness {
  const purse = normalizePurse(gp);
  const wanted = amount === undefined ? purse.hospitalBill : whole(amount);
  const forgiven = Math.min(wanted, purse.hospitalBill);
  return { gp: { ...purse, hospitalBill: purse.hospitalBill - forgiven }, forgiven };
}

/** "₲40 from your wallet, ₲25 from your savings, ₲35 still owed" */
const shares = (charge: BillCharge): string => {
  const parts: string[] = [];
  const hasWalletShare = charge.fromWallet > 0;
  if (hasWalletShare) parts.push(`${gold(charge.fromWallet)} from your wallet`);
  const hasSavingsShare = charge.fromSavings > 0;
  if (hasSavingsShare) parts.push(`${gold(charge.fromSavings)} from your savings`);
  const isStillOwed = charge.owed > 0;
  if (isStillOwed) parts.push(`${gold(charge.owed)} still owed`);
  return parts.join(", ");
};

/** What the nurse reads when a hero is carried in. */
export function nurseBillLine(charge: BillCharge): string {
  const head = `Treatment: ${gold(charge.bill)}. ${shares(charge)}.`;
  const isPaidInFull = charge.owed <= 0;
  if (isPaidInFull) return `${head} Paid in full, you're free to go.`;
  const stacked = charge.totalOwed > charge.owed ? ` That brings your bill to ${gold(charge.totalOwed)}.` : "";
  return `${head}${stacked} You're grounded until the bill is paid at the Gold Bank.`;
}

/** What the nurse says to a hero who comes back to a reloaded app with the bill still owed (no receipt to read). */
export function nurseOwedLine(owed: number): string {
  return `You still owe the Hospital ${gold(owed)}. You're grounded until the bill is paid at the Gold Bank.`;
}

/**
 * What Nurse Joy says when a hero arrives from a lost fight or a trap: the greeting, the bill, and what being grounded
 * means. `charge` is the admission just made (null after a reload, when only the bill still owed is known).
 * Empty when there is nothing to read.
 */
export function nurseAdmissionBlocks(charge: BillCharge | null, owedNow: number): string[] {
  const greeting = "*gasps* Oh dear, they carried you in! You're all patched up, with full HP and full MP.";
  const tip = "You can still fight and do quests, so chores are how the gold comes in. Pay at the Gold Bank and you're free!";
  if (charge) return [greeting, nurseBillLine(charge), ...(charge.totalOwed > 0 ? [tip] : [])];
  const isStillOwed = owedNow > 0;
  if (isStillOwed) return [greeting, nurseOwedLine(owedNow), tip];
  return [];
}

/** "Mia was carried to the Hospital. Bill ₲100 (₲60 owed)." for the family chat. */
export function admissionChatLine(heroName: string, charge: BillCharge): string {
  const state = charge.totalOwed > 0 ? `${gold(charge.totalOwed)} owed` : "paid in full";
  return `${heroName} was carried to the Hospital. Bill ${gold(charge.bill)} (${state}).`;
}

export interface NoteCopy {
  title: string;
  body: string;
}

/** The hero's and the Game Masters' notices at admission. */
export function admissionNotes(heroName: string, charge: BillCharge): { hero: NoteCopy; gm: NoteCopy } {
  const isOwing = charge.totalOwed > 0;
  return {
    hero: {
      title: "Carried to the Hospital",
      body: isOwing
        ? `Bill ${gold(charge.bill)}, ${gold(charge.totalOwed)} owed. You're grounded until it's paid at the Gold Bank.`
        : `Bill ${gold(charge.bill)}, paid in full.`,
    },
    gm: {
      title: `${heroName} was carried to the Hospital`,
      body: isOwing
        ? `Bill ${gold(charge.bill)} (${gold(charge.totalOwed)} owed). ${heroName} is grounded.`
        : `Bill ${gold(charge.bill)} (paid in full).`,
    },
  };
}

/** The family-chat line when the bill is paid off. */
export function payoffChatLine(heroName: string): string {
  return `${heroName} paid the hospital bill. No longer grounded.`;
}

/** The Game Masters' notice when the bill is paid off. */
export function payoffNotes(heroName: string): NoteCopy {
  return { title: `${heroName} paid the hospital bill`, body: `${heroName} is no longer grounded.` };
}

/** The chat line and the hero's notice when a Game Master forgives the bill. */
export function forgiveNotes(gmName: string, heroName: string, forgiven: number): { chat: string; hero: NoteCopy } {
  return {
    chat: `${gmName} forgave ${heroName}'s hospital bill (${gold(forgiven)}).`,
    hero: { title: "Hospital bill forgiven", body: `${gmName} wiped your ${gold(forgiven)} bill. You're free!` },
  };
}
