import { Router } from "vue-router";
import { handleLogoutGuard } from "./logout.guard";
import { handleAuthGuard } from "./auth.guard";
import { handleBattleTimerGuard } from "./battle.guard";
import { handleBgmGuard } from "./bgm.guard";

/**
 * Applies all router guards to the provided router instance.
 * Guards are composed of single-responsibility functions for maintainability.
 */
export function useRouterGuards(router: Router): void {
  router.beforeEach((to, from, next) => {
    // 1. Logout confirmation (blocks if pending)
    if (handleLogoutGuard(to, router)) {
      return next(false);
    }

    // 2. Authentication check
    const authResult = handleAuthGuard(to);
    if (authResult === false) {
      return next(false);
    }
    if (typeof authResult === "object") {
      return next(authResult);
    }

    // 3. Battle timer management (side effect only)
    handleBattleTimerGuard(to);

    // 4. BGM management (side effect only)
    handleBgmGuard(to);

    // Continue navigation
    next();
  });
}

// Re-export individual guards for testing or direct use
export { handleLogoutGuard } from "./logout.guard";
export { handleAuthGuard, type AuthGuardResult } from "./auth.guard";
export { handleBattleTimerGuard } from "./battle.guard";
export { handleBgmGuard } from "./bgm.guard";
