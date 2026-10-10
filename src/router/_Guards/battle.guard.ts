import { RouteLocationNormalized, Router } from "vue-router";
import { useBattleStore } from "@/lib/store/stores/battle";
import { useUserStore } from "@/lib/store/stores/user";
import { freeBattleRoute } from "@/app/Console/BattleField/battle/battleContext";
import { hasNoEncounters } from "@/lib/services/quests/ItemEffects";
import debug from "@/lib/utils/debug";

/** Routes that trigger random battle encounters */
const BATTLE_ENABLED_ROUTES = ["home-town", "world-map"] as const;

/** Battle pages are named battle-quest, battle-temple and battle-free (see battleContext). */
const isBattleRoute = (name: unknown): boolean =>
  typeof name === "string" && name.startsWith("battle-");

/**
 * One exploration tick, run by the battle store's timer while the hero is out exploring.
 *
 * A tick that cannot start a fight spends no steps, so the encounter that was coming is still
 * coming afterwards instead of landing the moment the hero is free again:
 *  - the live route is a battle page (returning from a fight restarts this timer while the
 *    route is still battle-free, so reading the live route also stops a second fight stacking
 *    on the first);
 *  - nobody is the current hero;
 *  - the hero wears X's Invisibility (no random encounters until it wears off);
 *  - a battle is already active.
 */
async function onExplorationTick(router: Router): Promise<void> {
  const battleStore = useBattleStore();
  const userStore = useUserStore();
  const heroId = userStore.currentUser.id;

  if (isBattleRoute(router.currentRoute.value.name)) return;
  if (!heroId) return;
  if (hasNoEncounters(userStore.users?.[heroId] ?? userStore.currentUser, new Date())) return;
  if (battleStore.active) return;

  if (!battleStore.randomEncounter()) return;

  debug.log("Random encounter triggered!");
  // Re-arm the step counter (a new random wait inside steps.min..steps.max) before navigating,
  // so no tick can fire again while the push is still in flight.
  battleStore.resetBattleTimer();

  // The battle page picks a random bestiary beast and returns to home-town on its own.
  try {
    await router.push(freeBattleRoute(heroId));
  } catch (error) {
    debug.error("Random encounter could not start a battle", error);
  }
}

/**
 * Manages battle timer based on current route.
 * Starts timer on exploration routes, stops it elsewhere.
 * While it runs, running out of steps sends the current hero into a free battle.
 */
export function handleBattleTimerGuard(
  to: RouteLocationNormalized,
  router: Router
): void {
  const battleStore = useBattleStore();

  if (
    BATTLE_ENABLED_ROUTES.includes(
      to.name as (typeof BATTLE_ENABLED_ROUTES)[number]
    )
  ) {
    battleStore.startBattleTimer({
      onEncounter: () => onExplorationTick(router),
    });
  } else {
    battleStore.stopBattleTimer();
  }
}
