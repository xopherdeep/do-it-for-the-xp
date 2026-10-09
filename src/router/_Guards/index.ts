import { Router } from "vue-router";
import { handleLogoutGuard } from "./logout.guard";
import { handleAuthGuard } from "./auth.guard";
import { handleBattleTimerGuard } from "./battle.guard";
import { handleBgmGuard } from "./bgm.guard";
import { handleGmGuard } from "./gm.guard";

/**
 * Applies all router guards to the provided router instance.
 * Guards are composed of single-responsibility functions for maintainability.
 */
export function useRouterGuards(router: Router): void {
  router.beforeEach(async (to, from, next) => {
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

    // 3. Game Master gate: /game-master/** is for Game Masters (parents) only. It sits after
    //    auth so a signed-out visitor goes to log-in first, and before the side-effect guards
    //    so a refused hero never triggers the Game Master soundtrack.
    const gmResult = await handleGmGuard(to);
    if (typeof gmResult === "object") {
      return next(gmResult);
    }

    // 4. Battle timer management (side effect only)
    handleBattleTimerGuard(to, router);

    // 5. BGM management (side effect only)
    handleBgmGuard(to);

    // Continue navigation
    next();
  });
}

// Re-export individual guards for testing or direct use
export { handleLogoutGuard } from "./logout.guard";
export { handleAuthGuard, type AuthGuardResult } from "./auth.guard";
export { handleGmGuard, canAccessGameMaster, isGameMasterRoute, type GmGuardResult } from "./gm.guard";
export { handleBattleTimerGuard } from "./battle.guard";
export { handleBgmGuard } from "./bgm.guard";
