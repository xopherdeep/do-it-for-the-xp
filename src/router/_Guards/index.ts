import { Router } from "vue-router";
import { useFamilyStore } from "@/lib/store/stores/family";
import { handleHeroPhoneGuard } from "./heroPhone.guard";
import { handleLogoutGuard } from "./logout.guard";
import { handleAuthGuard } from "./auth.guard";
import { handleBattleTimerGuard } from "./battle.guard";
import { handleBgmGuard } from "./bgm.guard";
import { handleGmGuard } from "./gm.guard";
import { handleWorldGuard } from "./world.guard";
import { handleProGuard } from "./pro.guard";
import { handleTransitionGuard } from "./transition.guard";
import { handleAreaGuard } from "./area.guard";
import { handleGuideGuard } from "./guide.guard";

/**
 * Applies all router guards to the provided router instance.
 * Guards are composed of single-responsibility functions for maintainability.
 */
export function useRouterGuards(router: Router): void {
  router.beforeEach(async (to, from, next) => {
    // 0. Hero phone kid-mode gate: in kid mode, only hero-phone and link-phone are accessible.
    await useFamilyStore().init();
    const heroPhoneResult = handleHeroPhoneGuard(to, useFamilyStore().isKidMode);
    const hasHeroPhoneRedirect = typeof heroPhoneResult === "object" && heroPhoneResult !== null;
    if (hasHeroPhoneRedirect) {
      return next(heroPhoneResult);
    }

    // 1. Logout confirmation (blocks if pending)
    const isLogoutBlocked = handleLogoutGuard(to, router);
    if (isLogoutBlocked) {
      return next(false);
    }

    // 2. Authentication check
    const authResult = handleAuthGuard(to);
    const isAuthRefused = authResult === false;
    if (isAuthRefused) {
      return next(false);
    }
    const hasAuthRedirect = typeof authResult === "object" && authResult !== null;
    if (hasAuthRedirect) {
      return next(authResult);
    }

    // 3. Game Master gate: /game-master/** is for Game Masters (parents) only. It sits after
    //    auth so a signed-out visitor goes to log-in first, and before the side-effect guards
    //    so a refused hero never triggers the Game Master soundtrack.
    const gmResult = await handleGmGuard(to);
    const hasGmRedirect = typeof gmResult === "object" && gmResult !== null;
    if (hasGmRedirect) {
      return next(gmResult);
    }

    // 3b. XP Pro gate: routes with meta.pro open the upsell instead when the family is not Pro
    const proResult = await handleProGuard(to, from);
    const isProRefused = proResult === false;
    if (isProRefused) return next(false);
    const hasProRedirect = typeof proResult === "object" && proResult !== null;
    if (hasProRedirect) return next(proResult);

    // 4. Onboarding gate: on foot the hero reaches only Hometown and the Plains; the overworld and the
    //    other regions need a freed Pegasus. Before the side-effect guards so a turned-back hero never
    //    starts the soundtrack or the encounter clock of a region they did not enter.
    const worldResult = await handleWorldGuard(to);
    const hasWorldRedirect = typeof worldResult === "object" && worldResult !== null;
    if (hasWorldRedirect) {
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

  // 8. The Area tab remembers the last place the hero stood (afterEach, side effect only)
  handleAreaGuard(router);

  // 9. The Guide notes the Beast Log and the shops once the hero reaches them (afterEach, side effect only)
  handleGuideGuard(router);
}

// Re-export individual guards for testing or direct use
export { handleHeroPhoneGuard } from "./heroPhone.guard";
export { handleLogoutGuard } from "./logout.guard";
export { handleAuthGuard, type AuthGuardResult } from "./auth.guard";
export { handleGmGuard, canAccessGameMaster, isGameMasterRoute, type GmGuardResult } from "./gm.guard";
export { handleWorldGuard, type WorldGuardResult } from "./world.guard";
export { handleProGuard } from "./pro.guard";
export { handleBattleTimerGuard } from "./battle.guard";
export { handleBgmGuard } from "./bgm.guard";
export { handleTransitionGuard } from "./transition.guard";
export { handleAreaGuard } from "./area.guard";
export { handleGuideGuard } from "./guide.guard";
