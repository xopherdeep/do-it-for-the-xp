import { modalController } from "@ionic/vue";
import SetupWizard from "./SetupWizard.vue";
import { isGameEmpty } from "@/lib/services/setup/runSetup";

export interface SetupResult {
  done: boolean;
  heroCount: number;
}

// Once per app session: closing the wizard (finished or skipped) ends the offer
let offeredThisSession = false;
// The wizard that is open now: a second tap or a second offer shares it instead of stacking another
let openWizard: Promise<SetupResult> | null = null;

/** Presents the setup wizard and resolves with how it closed */
export function openSetupWizard(): Promise<SetupResult> {
  if (openWizard) return openWizard;
  const run = async (): Promise<SetupResult> => {
    const modal = await modalController.create({ component: SetupWizard, cssClass: "fullscreen" });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    return { done: Boolean(data?.done), heroCount: data?.heroCount ?? 0 };
  };
  openWizard = run().finally(() => {
    openWizard = null;
  });
  return openWizard;
}

/** The first-launch offer: only an empty game, only once this session. Null when nothing was offered */
export async function offerSetupOnce(): Promise<SetupResult | null> {
  if (offeredThisSession) return null;
  offeredThisSession = true;
  if (!(await isGameEmpty())) {
    offeredThisSession = false;
    return null;
  }
  return openSetupWizard();
}

export function resetSetupOfferForTests() {
  offeredThisSession = false;
  openWizard = null;
}
