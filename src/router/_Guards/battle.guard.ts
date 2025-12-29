import { RouteLocationNormalized } from "vue-router";
import { useBattleStore } from "@/lib/store/stores/battle";
import debug from "@/lib/utils/debug";

/** Routes that trigger random battle encounters */
const BATTLE_ENABLED_ROUTES = ["home-town", "world-map"] as const;

/**
 * Manages battle timer based on current route.
 * Starts timer on exploration routes, stops it elsewhere.
 */
export function handleBattleTimerGuard(to: RouteLocationNormalized): void {
  const battleStore = useBattleStore();

  if (
    BATTLE_ENABLED_ROUTES.includes(
      to.name as (typeof BATTLE_ENABLED_ROUTES)[number]
    )
  ) {
    battleStore.startBattleTimer({
      onEncounter: () => {
        if (battleStore.randomEncounter()) {
          debug.log("Random encounter triggered!");
        }
      },
    });
  } else {
    battleStore.stopBattleTimer();
  }
}
