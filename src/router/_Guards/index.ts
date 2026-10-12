import { Router } from "vue-router";
import { handleLogoutGuard } from "./logout.guard";
import { handleAuthGuard } from "./auth.guard";
import { handleBattleTimerGuard } from "./battle.guard";
import { handleBgmGuard } from "./bgm.guard";
import { handleGmGuard } from "./gm.guard";
import { handleWorldGuard } from "./world.guard";
import { handleProGuard } from "./pro.guard";
import { handleTransitionGuard } from "./transition.guard";

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

    // 3b. XP Pro gate: routes with meta.pro open the upsell instead when the family is not Pro
    const proResult = await handleProGuard(to, from);
    if (proResult === false) return next(false);
    if (typeof proResult === "object") return next(proResult);

    // 4. Onboarding gate: on foot the hero reaches only Hometown and the Plains; the overworld and the
    //    other regions need a freed Pegasus. Before the side-effect guards so a turned-back hero never
    //    starts the soundtrack or the encounter clock of a region they did not enter.
    const worldResult = await handleWorldGuard(to);
    if (typeof worldResult === "object") {
      return next(worldResult);
    }

    // 5. Battle timer management (side effect only)
    handleBattleTimerGuard(to, router);

    // 6. BGM management (side effect only)
    handleBgmGuard(to, router);

    // Continue navigation
    next();
  });

  // 7. Scene transitions run last (beforeResolve), once every guard above has allowed the navigation
  handleTransitionGuard(router);
}

// Re-export individual guards for testing or direct use
export { handleLogoutGuard } from "./logout.guard";
export { handleAuthGuard, type AuthGuardResult } from "./auth.guard";
export { handleGmGuard, canAccessGameMaster, isGameMasterRoute, type GmGuardResult } from "./gm.guard";
export { handleWorldGuard, type WorldGuardResult } from "./world.guard";
export { handleProGuard } from "./pro.guard";
export { handleBattleTimerGuard } from "./battle.guard";
export { handleBgmGuard } from "./bgm.guard";
export { handleTransitionGuard } from "./transition.guard";
