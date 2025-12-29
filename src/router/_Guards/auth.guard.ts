import { RouteLocationNormalized } from "vue-router";
import { useBattleStore } from "@/lib/store/stores/battle";
import { useUserStore } from "@/lib/store/stores/user";

export type AuthGuardResult = boolean | { name: string } | void;

/**
 * Handles authentication checks.
 * Returns navigation result: false to block, object to redirect, or void to continue.
 */
export function handleAuthGuard(to: RouteLocationNormalized): AuthGuardResult {
  const battleStore = useBattleStore();
  const userStore = useUserStore();

  // Block navigation during active battle
  if (battleStore.active) return false;

  // Allow login route
  if (to.name === "log-in") return;

  // Allow routes that don't require auth
  if (to.meta?.requiresAuth === false) return;

  // Allow authenticated users
  if (userStore.currentUser.isAuthenticated) return;

  // Redirect to login
  return { name: "log-in" };
}
