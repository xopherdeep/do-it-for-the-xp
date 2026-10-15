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
  const isInBattle = battleStore.active;
  if (isInBattle) return false;

  // Allow login route
  const isLoginRoute = to.name === "log-in";
  if (isLoginRoute) return;

  // Allow routes that don't require auth
  const isPublicRoute = to.meta?.requiresAuth === false;
  if (isPublicRoute) return;

  // Allow authenticated users
  if (userStore.currentUser.isAuthenticated) return;

  // Redirect to login
  return { name: "log-in" };
}
