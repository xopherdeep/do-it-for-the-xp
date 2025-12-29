import { Router, RouteLocationNormalized } from "vue-router";
import { alertController } from "@ionic/vue";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * Shows a logout confirmation alert
 */
async function showLogoutAlert(
  onConfirm: () => void,
  onCancel?: () => void
): Promise<void> {
  const alert = await alertController.create({
    header: "Log Out?",
    message:
      "Are you sure you want to log out? You will have to sign in again using your credentials.",
    buttons: [
      {
        text: "No",
        role: "cancel",
        cssClass: "secondary",
        id: "cancel-button",
        handler: onCancel,
      },
      {
        text: "Yes",
        id: "confirm-button",
        handler: onConfirm,
      },
    ],
  });
  alert.present();
}

/**
 * Handles logout route with confirmation dialog.
 * Returns true if navigation should be blocked (confirmation pending).
 */
export function handleLogoutGuard(
  to: RouteLocationNormalized,
  router: Router
): boolean {
  if (to.name !== "log-out" || to.params.confirm) return false;

  const userStore = useUserStore();

  showLogoutAlert(() => {
    userStore.logoutUser();
    router.push({ name: "log-in", params: { confirm: "1" } });
  });

  return true;
}
