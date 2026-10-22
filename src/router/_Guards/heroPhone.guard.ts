/**
 * Redirects kid-mode devices to the hero-phone screen, except for hero-phone and link-phone.
 *
 * A kid phone that is a full portal (family sync is on, the phone is linked and its first pull is done) lets every
 * route through: the hero plays the whole game there. The Game Master console stays shut to it because the Game
 * Master guard answers denied in kid mode whatever the phone holds (`canAccessGameMaster`).
 */
export function handleHeroPhoneGuard(
  to: { name?: unknown },
  isKidMode: boolean,
  isFullPortal: boolean
): { name: string } | void {
  const isKid = Boolean(isKidMode);
  const isKeptOnHeroPhone = isKid && !isFullPortal;
  if (!isKeptOnHeroPhone) return;

  const routeName = typeof to.name === "string" ? to.name : "";
  const isAllowedKidRoute = routeName === "hero-phone" || routeName === "link-phone";
  if (isAllowedKidRoute) return;

  return { name: "hero-phone" };
}
