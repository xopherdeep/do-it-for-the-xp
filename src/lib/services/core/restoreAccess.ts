import { canManageFamily, resolveGmAccess } from "@/router/_Guards/gm.guard";
import type { GmAccess, GmStoreView } from "@/router/_Guards/gm.guard";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * Who may restore a backup. A restore replaces everyone's data, so on a device that has profiles only a Game Master
 * may do it (the same people canManageFamily lets in). A device with no profile at all, a new phone or a cleared
 * browser, has nobody to protect and no Game Master to sign in as, so anybody may restore there: otherwise the one
 * file that holds the family could never be loaded onto an empty device.
 */
export interface RestoreAccessInput {
  /** How many profiles the device holds */
  profileCount: number;
  /** What resolveGmAccess says about the person signed in now ("denied" for a hero or nobody) */
  gmAccess: GmAccess;
}

export function canRestoreBackup({ profileCount, gmAccess }: RestoreAccessInput): boolean {
  // Only an exact zero opens the door: a count that is missing or broken must never read as an empty device
  const isEmptyDevice = profileCount === 0;
  if (isEmptyDevice) return true;
  const isGameMasterSide = gmAccess !== "denied";
  return isGameMasterSide;
}

/**
 * The answer for the person using the app right now. Reads the user store each time it is called, so wrap it in a
 * computed (or call it in a render) and it follows the store: a reload that signs the Game Master back in changes it.
 * Kid mode still locks it, like every other Game Master action.
 */
export function canRestoreHere(view: GmStoreView = useUserStore()): boolean {
  const profileCount = Object.keys(view.users).length;
  const gmAccess: GmAccess = canManageFamily(view) ? resolveGmAccess(view) : "denied";
  return canRestoreBackup({ profileCount, gmAccess });
}
