import { Router } from "vue-router";
import { markRouteSeen } from "@/lib/services/guide/guideState";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

/**
 * The Guide waits on the hero opening the Beast Log and walking into a shop: note it once the navigation has happened
 * (afterEach, side effect only). An error here must never hold up the hero.
 */
export function handleGuideGuard(router: Router): void {
  router.afterEach?.((to, _from, failure) => {
    if (failure) return;
    try {
      const fromRoute = to.params?.userId;
      const heroId = typeof fromRoute === "string" && fromRoute ? fromRoute : useUserStore().currentUser?.id;
      markRouteSeen(to.name, heroId ? String(heroId) : undefined);
    } catch (error) {
      debug.error("Could not note the Guide's progress", error);
    }
  });
}
