/**
 * The PIN pad's forgotten-PIN dialogs, the recovery code's hand-over (saved as pending, delivered once the parent taps
 * "I wrote it down") and the saves they lead to. The rules (codes, sealing, lockout) live in services/profile; this
 * file only asks and shows.
 */
import { alertController } from "@ionic/vue";
import { ProfileDb } from "@/lib/databases";
import { profileStorage } from "@/lib/databases/profileStorage";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { RECOVERY_DELIVERED, issueRecoveryCode } from "@/lib/services/profile/pinRecovery";
import { dialogMessage } from "@/lib/utils/dialogMessage";
import { passcodeProblem } from "@/router/_Guards/gm.guard";

/** What an alert's text field held when its confirm button was pressed, or null for Cancel */
const askText = async (header: string, message: string, input: Record<string, unknown>, confirm: string): Promise<string | null> => {
  const alert = await alertController.create({
    mode: "ios",
    header,
    message,
    inputs: [{ name: "value", ...input }],
    buttons: [
      { text: "Cancel", role: "cancel" },
      { text: confirm, role: "confirm" },
    ],
  });
  await alert.present();
  const { data, role } = await alert.onDidDismiss();
  const isConfirmed = role === "confirm";
  return isConfirmed ? String(data?.values?.value ?? "") : null;
};

/** Why a Game Master is being handed a code, which sets the first line of the dialog */
export type RecoveryCodeReason = "first" | "again" | "used" | "reissued";

const RECOVERY_LEADS: Record<RecoveryCodeReason, string> = {
  first: "Write this code down and keep it away from the kids.",
  again: "The last code was never marked as written down, so here is a fresh one. The old one no longer works.",
  used: "Your old recovery code is used up. Here is a new one.",
  reissued: "Your old recovery code no longer works. Here is a new one.",
};

/** Shows a recovery code and waits until the parent taps "I wrote it down" (the only way to close it) */
export async function showRecoveryCode(code: string, reason: RecoveryCodeReason = "first"): Promise<void> {
  const alert = await alertController.create({
    mode: "ios",
    header: "Your recovery code",
    message: `${RECOVERY_LEADS[reason]}<br><br><strong style="font-size:1.4em;letter-spacing:2px">${code}</strong><br><br>If you ever forget your PIN, tap Forgot PIN and type this code to choose a new one. It won't be shown again, and if the app closes before you tap the button you will get a new code next time.`,
    backdropDismiss: false,
    buttons: [{ text: "I wrote it down", role: "confirm" }],
  });
  await alert.present();
  await alert.onDidDismiss();
}

/** Counts the profile's recovery code as delivered: the Game Master tapped "I wrote it down" */
export async function confirmRecoveryDelivered(profile: Record<string, any>): Promise<void> {
  const db = new ProfileDb(profileStorage);
  const stored = (await db.get(profile.id)) ?? profile;
  await db.setProfile({ ...stored, ...RECOVERY_DELIVERED });
  await useUserStore().loadUsers();
}

/**
 * Shows a saved code, and only once the parent has tapped "I wrote it down" marks it delivered. If the app closes
 * first the mark never lands, and the next unlock makes and shows a new code. A failed mark has the same result,
 * so it is logged and the parent is not stopped.
 */
export async function showAndConfirmRecoveryCode(profile: Record<string, any>, code: string, reason: RecoveryCodeReason = "first"): Promise<void> {
  await showRecoveryCode(code, reason);
  try {
    await confirmRecoveryDelivered(profile);
  } catch (error) {
    debug.error("Could not mark the recovery code as delivered", error);
  }
}

/** Asks for the recovery code; null when cancelled */
export const askRecoveryCode = (hasOtherGameMaster: boolean): Promise<string | null> =>
  askText(
    "Forgot your PIN?",
    `Type the recovery code you were shown the first time you unlocked this profile.${
      hasOtherGameMaster ? " Another Game Master can also set you a new PIN in Settings > Family." : ""
    }`,
    { type: "text", placeholder: "XXXX-XXXX", attributes: { autocapitalize: "characters", autocomplete: "off" } },
    "Next"
  );

/** Asks for a new 4-digit PIN until it is valid; null when cancelled */
export async function askNewPin(): Promise<string | null> {
  let message = "Choose a new 4-digit PIN.";
  for (;;) {
    const pin = await askText("New PIN", message, { type: "password", inputmode: "numeric", placeholder: "••••", attributes: { maxlength: 4 } }, "Save");
    const isCancelled = pin === null;
    if (isCancelled) return null;
    const problem = passcodeProblem(pin, true);
    if (!problem) return pin;
    message = `${problem}. Try again.`;
  }
}

/**
 * Saves a new PIN and/or recovery code on the profile (ProfileDb seals them) and reloads the roster.
 * Returns the new recovery code when one was minted, so the caller can show it.
 */
export async function saveProfileSecrets(profile: Record<string, any>, change: { pin?: string; newRecoveryCode?: boolean }): Promise<string | null> {
  const db = new ProfileDb(profileStorage);
  const stored = (await db.get(profile.id)) ?? profile;
  const issued = change.newRecoveryCode ? issueRecoveryCode() : null;
  await db.setProfile({
    ...stored,
    ...(change.pin ? { passcode: change.pin } : {}),
    ...(issued ? issued.fields : {}),
  });
  await useUserStore().loadUsers();
  return issued ? issued.code : null;
}

/** Makes the profile a new recovery code (saved as not yet delivered), shows it, and marks it delivered on "I wrote it down" */
export async function issueAndShowRecoveryCode(profile: Record<string, any>, reason: RecoveryCodeReason = "first"): Promise<void> {
  const code = await saveProfileSecrets(profile, { newRecoveryCode: true });
  if (code) await showAndConfirmRecoveryCode(profile, code, reason);
}

/** Asks a signed-in Game Master to confirm a new recovery code; false when they decline */
export async function askReissueRecoveryCode(): Promise<boolean> {
  const alert = await alertController.create({
    mode: "ios",
    header: "Make a new recovery code?",
    cssClass: "rpg-alert",
    message: dialogMessage({
      lead: "Your new code opens the Forgot PIN door.",
      note: "Your old recovery code stops working the moment you say yes.",
    }),
    buttons: [
      { text: "Keep my code", role: "cancel" },
      { text: "Make a new code", role: "confirm" },
    ],
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  return role === "confirm";
}

/** Settings > Family: confirm, then make and show a new recovery code. False when the Game Master declined. */
export async function reissueRecoveryCode(profile: Record<string, any>): Promise<boolean> {
  const isConfirmed = await askReissueRecoveryCode();
  if (!isConfirmed) return false;
  await issueAndShowRecoveryCode(profile, "reissued");
  return true;
}
