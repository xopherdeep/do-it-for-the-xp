import { modalController, toastController } from "@ionic/vue";
import type { ProGate } from "./proPlans";

/** Shown when an 11th device restores a key. */
export const DEVICE_LIMIT_MESSAGE =
  "This key is on 10 devices already; contact support to reset them.";

/** A middle-of-the-screen toast in the RPG style. Fire and forget: a toast that fails must never break a purchase flow. */
export async function proToast(message: string, color: "success" | "warning" | "danger" = "warning"): Promise<void> {
  try {
    const toast = await toastController.create({
      message,
      duration: 3500,
      position: "middle",
      buttons: [{ text: "Close", role: "cancel" }],
      color,
      cssClass: "rpg-toast",
    });
    await toast.present();
  } catch {
    // nothing to do: the flow carries on without the toast
  }
}

/** Opens the "XP Pro" upsell for the feature that was tapped. */
export async function openProUpsell(gate: ProGate): Promise<void> {
  const { default: XpProUpsell } = await import("@/components/molecules/Modals/XpProUpsell.vue");
  const modal = await modalController.create({
    component: XpProUpsell,
    componentProps: { gate },
    cssClass: "xp-pro-upsell-modal",
  });
  await modal.present();
}
