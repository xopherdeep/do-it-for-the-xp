/**
 * The PIN pad's forgotten-PIN dialogs and the one save they lead to. The rules (codes, sealing, lockout) live in
 * services/profile; this file only asks and shows.
 */
import { alertController } from "@ionic/vue";
import { ProfileDb } from "@/lib/databases";
import { profileStorage } from "@/lib/databases/profileStorage";
import { useUserStore } from "@/lib/store/stores/user";
import { mintRecoveryCode, sealRecoveryCode } from "@/lib/services/profile/pinRecovery";
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

/** Shows a recovery code once, and waits until the parent has closed it */
export async function showRecoveryCode(code: string, isReplacement = false): Promise<void> {
  const lead = isReplacement ? "Your old recovery code is used up. Here is a new one." : "Write this code down and keep it away from the kids.";
  const alert = await alertController.create({
    mode: "ios",
    header: "Your recovery code",
    message: `${lead}<br><br><strong style="font-size:1.4em;letter-spacing:2px">${code}</strong><br><br>If you ever forget your PIN, tap Forgot PIN and type this code to choose a new one. It won't be shown again.`,
    backdropDismiss: false,
    buttons: [{ text: "I wrote it down", role: "confirm" }],
  });
  await alert.present();
  await alert.onDidDismiss();
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
  const code = change.newRecoveryCode ? mintRecoveryCode() : null;
  await db.setProfile({
    ...stored,
    ...(change.pin ? { passcode: change.pin } : {}),
    ...(code ? { pinRecovery: sealRecoveryCode(code) } : {}),
  });
  await useUserStore().loadUsers();
  return code;
}
