import { computed, inject, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import { getActivePinia } from "pinia";
import { useBackButton, useIonRouter } from "@ionic/vue";
import { useUserStore } from "@/lib/store/stores/user";
import { parentOf } from "@/router/parentOf";
import type { ParentOptions } from "@/router/parentOf";

/** Ionic's router, or undefined outside one (a component mounted on its own in a test or a story). */
const useIonRouterIfAny = () => (inject("navManager", null) ? useIonRouter() : undefined);

/**
 * Back that never goes dead. With history behind the page Back follows it; with none (a refresh, a shared
 * link, a notification, the app starting on this page) it goes "up" to the place the page belongs to
 * (src/router/parentOf.ts), replacing the page and sliding the back way.
 *
 * `extra` adds what only the page knows (a shop's world); read each time, so it may use reactive state.
 * `backHref` is for `<ion-back-button :default-href="backHref">`: undefined on a page with no "up", which
 * keeps Ionic from drawing a button that would lead nowhere.
 */
export const useBack = (extra: () => ParentOptions = () => ({})) => {
  const ionRouter = useIonRouterIfAny();
  const route = useRoute() as RouteLocationNormalizedLoaded | undefined;

  const parentHref = computed(() => {
    if (!route) return null;
    const heroId = getActivePinia() ? useUserStore().currentUser.id : null;
    return parentOf(route, { heroId, ...extra() });
  });
  const backHref = computed(() => parentHref.value ?? undefined);

  const stepUp = () => {
    const parent = parentHref.value;
    if (parent) ionRouter?.navigate(parent, "back", "replace");
  };

  const stepBack = () => {
    if (ionRouter?.canGoBack()) ionRouter.back();
    else stepUp();
  };

  return { stepBack, stepUp, backHref, parentHref };
};

/**
 * Below Ionic's overlays (100) and menu (99) and the battle's run-away prompt (100), so an open modal still
 * closes first; above the router's own handler (0), which does nothing on the first page and would let the
 * app quit.
 */
export const HARDWARE_BACK_PRIORITY = 1;

/**
 * The Android hardware Back button for the whole app: with history it hands over to the router as usual;
 * on a page with no history behind it, it goes up (parentOf) instead of quitting. A page with no "up" is
 * left to the system. Call once, from the app shell.
 */
export const useHardwareBack = () => {
  const ionRouter = useIonRouterIfAny();
  const { stepUp, parentHref } = useBack();

  const handle = useBackButton(HARDWARE_BACK_PRIORITY, (processNextHandler: () => void) => {
    const hasHistory = Boolean(ionRouter?.canGoBack());
    const hasSomewhereToGo = !hasHistory && Boolean(parentHref.value);
    if (hasSomewhereToGo) stepUp();
    else processNextHandler();
  });
  onBeforeUnmount(() => handle.unregister());
};
