import { RouteLocationNormalized } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { useToast } from "@/hooks/useToast";
import { FIRST_FLIGHT_LINE, PLAINS_ROUTE, canFly, isFlightRoute } from "@/lib/services/travel/flight";
import debug from "@/lib/utils/debug";

/** Redirect handed to `next()` when a hero on foot is turned back. */
export type WorldGuardRedirect = { name: string; params: { userId: string } };

/** `undefined` lets the navigation continue, an object redirects it. */
export type WorldGuardResult = WorldGuardRedirect | void;

/** The `:userId` of the route as a string (a repeated param arrives as a list), or undefined when it has none. */
const userIdOf = (to: Pick<RouteLocationNormalized, "params">): string | undefined => {
  const raw = to.params?.userId;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return id ? String(id) : undefined;
};

/** Fire-and-forget: a toast that fails to show must never hold up navigation. */
function announceFirstFlight(): void {
  useToast()
    .showToast(FIRST_FLIGHT_LINE, 2500, "bottom")
    .catch((error) => debug.error("Could not show the first flight toast", error));
}

/**
 * The onboarding gate: on foot the hero reaches only Hometown and the Plains. The overworld and every other
 * region page need a freed Pegasus, so a hero without one is sent to the Plains (their own, by the route's
 * `:userId`) with the line that says how to earn the first flight. Runs after auth and the Game Master gate.
 *
 * Only the overworld and the eight other region routes are flight routes, so the Game Master's pages and the
 * Plains itself pass untouched: a bounce can never loop. A hero the store does not know is left to the
 * portal's own guard (it sends them to the profile chooser), and a guard that errors lets the hero through
 * rather than trap them.
 */
export async function handleWorldGuard(to: RouteLocationNormalized): Promise<WorldGuardResult> {
  if (!isFlightRoute(to.name)) return;

  try {
    const userStore = useUserStore();
    // A hard refresh or deep link gets here before App.ts has loaded the profiles (the my-portal route's own
    // guard runs after this one), so load them first.
    const hasNoProfilesLoaded = Object.keys(userStore.users ?? {}).length === 0;
    if (hasNoProfilesLoaded) {
      await userStore.loadUsers();
    }

    const userId = userIdOf(to) ?? userStore.currentUser?.id ?? undefined;
    if (!userId) return;

    const hero = userStore.users?.[userId] ?? (userStore.currentUser?.id === userId ? userStore.currentUser : undefined);
    const shouldLetPass = !hero || canFly(hero);
    if (shouldLetPass) return;

    announceFirstFlight();
    return { name: PLAINS_ROUTE, params: { userId } };
  } catch (error) {
    debug.error("World guard could not check the hero", error);
  }
}
