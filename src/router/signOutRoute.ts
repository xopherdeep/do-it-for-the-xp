import type { Router } from "vue-router";
import { useFamilyStore } from "@/lib/store/stores/family";

/**
 * Where Save & Quit lands once the hero has signed out (family sync spec, section 7): the profile picker on a family
 * device, the hero-phone screen (the hero's card, with Play) on a kid phone, which has no picker to offer.
 */
export const signOutRoute = (isKidMode: boolean): { name: "hero-phone" | "xp-profile" } => ({
  name: isKidMode ? "hero-phone" : "xp-profile",
});

/** Takes the router there; both Save & Quit paths (the avatar menu and My Home) use it */
export const goAfterSignOut = (router: Pick<Router, "replace">): ReturnType<Router["replace"]> =>
  router.replace(signOutRoute(useFamilyStore().isKidMode));
