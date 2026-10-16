/**
 * The Hospital admits a hero at 0 HP (docs/Quest-Rooms-Spec.md 5.8). Every path that empties a hero's HP calls this one
 * service: a lost fight, a parting strike that empties HP, a temple trap.
 *
 *   1. Treatment: HP and MP go to full, the same gains as the paid revive (`quoteCare("revive")`).
 *   2. The bill: a flat HOSPITAL_BILL out of the wallet, then savings; the rest is owed (`GpPurse.hospitalBill`) and
 *      grounds the hero until it is paid at the Gold Bank (or a Game Master forgives it).
 *   3. The family hears of it: a notice for the hero and every other Game Master, and a Town Crier line in the family
 *      chat (the pattern of `AbilityService.tellTheFamily`).
 *
 * The HP, MP and purse changes happen before this function returns, so a reload in the middle of the "carried to the
 * Hospital" moment finds the hero treated and billed. The notices are fire and forget; a failure never reaches the
 * caller. The pure rules (who pays, the words) are in `hospitalBill.ts`.
 */
import { isGrounded } from "@/lib/services/gp/wallet";
import { FAMILY_CHAT_ROOM, useChatStore } from "@/lib/store/stores/chat";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import {
  admissionChatLine,
  admissionNotes,
  chargeHospitalBill,
  forgiveHospitalBill,
  forgiveNotes,
  payoffChatLine,
  payoffNotes,
  type BillCharge,
  type NoteCopy,
} from "./hospitalBill";
import { quoteCare } from "./Lodging";

/** What emptied the hero's HP. */
export type AdmissionCause = "battle" | "run" | "trap";

/** What an admission came to: the nurse reads it back on the Hospital screen. */
export interface HospitalAdmission {
  userId: string;
  cause: AdmissionCause;
  charge: BillCharge;
  hpGain: number;
  mpGain: number;
  /** ISO time of the admission */
  at: string;
}

/** The query the arena and the temple send the hero to the Hospital with, so the nurse reads the bill. */
export const ADMITTED_QUERY = "admitted";

/** Where an admission ends: the Hospital screen, with the cue for the nurse to read the bill. */
export const hospitalRoute = (userId: string) => ({
  name: "hospital",
  params: { userId },
  query: { [ADMITTED_QUERY]: "1" },
});

/** The latest admission per hero, until the Hospital screen has read it once. A reload loses it, and the nurse falls back. */
const receipts = new Map<string, HospitalAdmission>();

/** The admission the nurse has not read yet (once), or null. */
export function takeAdmissionReceipt(userId: string): HospitalAdmission | null {
  const key = String(userId);
  const receipt = receipts.get(key) ?? null;
  receipts.delete(key);
  return receipt;
}

const nameOf = (hero?: { name?: { nick?: string; first?: string } } | null, fallback = "A hero"): string =>
  hero?.name?.nick || hero?.name?.first || fallback;

/** Push the same notice to every Game Master except `exceptId`. */
const notifyGameMasters = (note: NoteCopy, refId: string, exceptId: string): void => {
  try {
    const notifications = useNotificationsStore();
    for (const gm of Object.values(useUserStore().users)) {
      const shouldSkip = gm?.isAdult !== true || gm.id === exceptId;
      if (shouldSkip) continue;
      notifications.push({ heroId: gm.id, kind: "hospital", title: note.title, body: note.body, refId, link: "/game-master/chat" });
    }
  } catch (error) {
    debug.warn("The Game Masters could not be notified of the Hospital", error);
  }
};

/** A Town Crier line in the family chat; a failure is logged and never reaches the caller. */
const postToFamily = async (line: string): Promise<void> => {
  try {
    await useChatStore().postSystemLine(FAMILY_CHAT_ROOM, line);
  } catch (error) {
    debug.warn("The Town Crier could not post the Hospital line", error);
  }
};

/** The admission notices: the hero's own, every other Game Master's (synchronously), then the chat line. */
const tellTheFamily = async (userId: string, heroName: string, charge: BillCharge, at: string): Promise<void> => {
  const notes = admissionNotes(heroName, charge);
  const refId = `admit-${userId}-${at}`;
  try {
    useNotificationsStore().push({
      heroId: userId,
      kind: "hospital",
      title: notes.hero.title,
      body: notes.hero.body,
      refId,
      link: `/bank/${userId}/`,
    });
  } catch (error) {
    debug.warn("The hero could not be notified of the Hospital", error);
  }
  notifyGameMasters(notes.gm, refId, userId);
  await postToFamily(admissionChatLine(heroName, charge));
};

/**
 * Admit a hero to the Hospital: treat them to full HP and MP, charge the flat bill and tell the family. Returns what it
 * came to, or null when there is no such hero. The caller shows the moment and sends the hero to the Hospital screen.
 */
export function admitToHospital(userId: string, cause: AdmissionCause = "battle", now: Date = new Date()): HospitalAdmission | null {
  const store = useUserStore();
  const hero = store.users[userId];
  if (!hero) {
    debug.warn("The Hospital could not admit a hero who is not loaded", userId);
    return null;
  }

  // Treatment first, so a reload never finds the hero at 0
  const treatment = quoteCare("revive", hero.stats);
  const hasHpGain = treatment.hpGain > 0;
  if (hasHpGain) store.updateUserHP({ userId, amount: treatment.hpGain });
  const hasMpGain = treatment.mpGain > 0;
  if (hasMpGain) store.updateUserMP({ userId, amount: treatment.mpGain });

  const charge = chargeHospitalBill(hero.stats?.gp);
  store.setWallet(userId, charge.gp, { kind: "bill", note: "Hospital stay" });

  const admission: HospitalAdmission = {
    userId,
    cause,
    charge,
    hpGain: treatment.hpGain,
    mpGain: treatment.mpGain,
    at: now.toISOString(),
  };
  receipts.set(String(userId), admission);
  void tellTheFamily(userId, nameOf(hero), charge, admission.at);
  return admission;
}

/** True while the hero owes the Hospital: no Powers, but fights, quests and shops all work. */
export function isHeroGrounded(userId: string): boolean {
  return isGrounded(useUserStore().users[userId]?.stats?.gp);
}

/** The bank took the last of the bill: the family hears the hero is free (the hero's own toast is the bank's). */
export function announceBillPaid(userId: string, now: Date = new Date()): void {
  const hero = useUserStore().users[userId];
  const heroName = nameOf(hero);
  notifyGameMasters(payoffNotes(heroName), `paid-${userId}-${now.toISOString()}`, userId);
  void postToFamily(payoffChatLine(heroName));
}

/**
 * A Game Master forgives a hero's bill from the hero's card in the dashboard. Returns how much was forgiven (0 when
 * the hero owed nothing). The hero is told, and the family chat logs who forgave what.
 */
export function forgiveBill(userId: string, gmId: string, now: Date = new Date()): number {
  const store = useUserStore();
  const hero = store.users[userId];
  if (!hero) return 0;
  const { gp, forgiven } = forgiveHospitalBill(hero.stats?.gp);
  const isNothingForgiven = forgiven <= 0;
  if (isNothingForgiven) return 0;

  store.setWallet(userId, gp, { kind: "refund", note: "Hospital bill forgiven" });
  const notes = forgiveNotes(nameOf(store.users[gmId], "A Game Master"), nameOf(hero), forgiven);
  try {
    useNotificationsStore().push({
      heroId: userId,
      kind: "hospital",
      title: notes.hero.title,
      body: notes.hero.body,
      refId: `forgiven-${userId}-${now.toISOString()}`,
    });
  } catch (error) {
    debug.warn("The hero could not be told the bill was forgiven", error);
  }
  void postToFamily(notes.chat);
  return forgiven;
}
