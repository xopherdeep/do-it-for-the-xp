import { RouteLocationNormalized, Router } from "vue-router";
import { useBattleStore } from "@/lib/store/stores/battle";
import { useUserStore } from "@/lib/store/stores/user";
import { freeBattleRoute, regionForRoute, WORLD_REGIONS } from "@/app/Console/BattleField/battle/battleContext";
import { hasNoEncounters } from "@/lib/services/quests/ItemEffects";
import debug from "@/lib/utils/debug";

/** Routes that trigger random battle encounters: the home town, the map and the nine region pages. */
const BATTLE_ENABLED_ROUTES: readonly string[] = [
  "home-town",
  "world-map",
  ...Object.values(WORLD_REGIONS).map((region) => region.routeName),
];

/** True while a modal, alert, action sheet or popover is open over the page (a shop panel, a dialog). */
const isOverlayOpen = (): boolean =>
  typeof document !== "undefined" &&
  document.querySelector("ion-modal.show-modal, ion-alert, ion-action-sheet, ion-popover.show-popover") !== null;

/** Battle pages are named battle-quest, battle-temple and battle-free (see battleContext). */
const isBattleRoute = (name: unknown): boolean =>
  typeof name === "string" && name.startsWith("battle-");

/**
 * One exploration tick, run by the battle store's timer while the hero is out exploring.
 *
 * A tick that cannot start a fight spends no steps (the encounter clock counts wall-clock time, so the
 * tick rests the walk clock), and the encounter that was coming is still coming afterwards instead of
 * landing the moment the hero is free again:
 *  - the live route is a battle page (returning from a fight restarts this timer while the
 *    route is still battle-free, so reading the live route also stops a second fight stacking
 *    on the first);
 *  - nobody is the current hero;
 *  - the hero wears X's Invisibility (no random encounters until it wears off);
 *  - a battle is already active;
 *  - the tab is hidden, or a modal / shop panel is open over the page.
 */
async function onExplorationTick(router: Router): Promise<void> {
  const battleStore = useBattleStore();
  const userStore = useUserStore();
  const heroId = userStore.currentUser.id;

  const routeName = router.currentRoute.value.name;

  const blocked =
    isBattleRoute(routeName) ||
    (typeof document !== "undefined" && document.hidden) ||
    isOverlayOpen() ||
    !heroId ||
    hasNoEncounters(userStore.users?.[heroId] ?? userStore.currentUser, new Date()) ||
    battleStore.active;
  if (blocked) {
    battleStore.restWalk();
    return;
  }

  if (!battleStore.randomEncounter()) return;

  debug.log("Random encounter triggered!");
  // Re-arm the step counter (a new random wait inside steps.min..steps.max) before navigating,
  // so no tick can fire again while the push is still in flight.
  battleStore.resetBattleTimer();

  // The battle page picks a random bestiary beast (from the region's element on a region page)
  // and returns to the page the hero left, home-town or the region.
  const region = regionForRoute(routeName);
  try {
    await router.push(region ? freeBattleRoute(heroId, [], region) : freeBattleRoute(heroId));
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

  if (BATTLE_ENABLED_ROUTES.includes(String(to.name))) {
    const region = regionForRoute(to.name);
    battleStore.setTerrainForRoute(region ? WORLD_REGIONS[region].terrain : null);
    battleStore.startBattleTimer({
      onEncounter: () => onExplorationTick(router),
    });
  } else {
    battleStore.stopBattleTimer();
  }
}
