import { modalController } from "@ionic/vue";
import SetupWizard from "./SetupWizard.vue";
import { isGameEmpty } from "@/lib/services/setup/runSetup";

export interface SetupResult {
  done: boolean;
  heroCount: number;
}

// Once per app session: closing the wizard (finished or skipped) ends the offer
let offeredThisSession = false;

/** Presents the setup wizard and resolves with how it closed */
export async function openSetupWizard(): Promise<SetupResult> {
  const modal = await modalController.create({ component: SetupWizard, cssClass: "fullscreen" });
  await modal.present();
  const { data } = await modal.onDidDismiss();
  return { done: Boolean(data?.done), heroCount: data?.heroCount ?? 0 };
}

/** The first-launch offer: only an empty game, only once this session. Null when nothing was offered */
export async function offerSetupOnce(): Promise<SetupResult | null> {
  if (offeredThisSession) return null;
  if (!(await isGameEmpty())) return null;
  offeredThisSession = true;
  return openSetupWizard();
}

export function resetSetupOfferForTests() {
  offeredThisSession = false;
}
