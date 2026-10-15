import { Router } from "vue-router";
import { rememberPlace } from "@/app/Console/MyPortal/areaTab";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

/**
 * Remembers the last place the hero stood (a region, Home Town, a building, a temple, home) so the Area tab
 * of the bottom nav can keep wearing it while Party or Profile is open. A side effect only, after the
 * navigation has happened: a failed or cancelled one leaves the memory alone, and an error here must never
 * hold up the hero.
 */
export function handleAreaGuard(router: Router): void {
  router.afterEach?.((to, _from, failure) => {
    if (failure) return;
    try {
      rememberPlace(to, useUserStore().currentUser?.id);
    } catch (error) {
      debug.error("Could not remember the hero's place", error);
    }
  });
}
