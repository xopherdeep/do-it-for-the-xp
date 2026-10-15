/**
 * Redirects kid-mode devices to the hero-phone screen, except for hero-phone and link-phone.
 */
export function handleHeroPhoneGuard(
  to: { name?: unknown },
  isKidMode: boolean
): { name: string } | void {
  const isKid = Boolean(isKidMode);
  if (!isKid) return;

  const routeName = typeof to.name === "string" ? to.name : "";
  const isAllowedKidRoute = routeName === "hero-phone" || routeName === "link-phone";
  if (isAllowedKidRoute) return;

  return { name: "hero-phone" };
}
