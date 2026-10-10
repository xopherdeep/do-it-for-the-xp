import { RouteLocationNormalized } from "vue-router";
import { toastController } from "@ionic/vue";
import { IMPERSONATOR_KEY, useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

/** Every Game Master page lives under this path (see src/router/Admin/game-master.routes.ts). */
export const GM_PATH = "/game-master";

/** Name of the parent route record that all Game Master pages are nested under. */
const GM_ROUTE_NAME = "game-master";

/** Toast shown to anyone turned away from the Game Master area. */
export const GM_ONLY_MESSAGE = "Game Master only";

/** Redirect handed to `next()` when a navigation is refused. */
export type GmGuardRedirect = { name: string; params?: Record<string, string> };

/** `undefined` lets the navigation continue, an object redirects it. */
export type GmGuardResult = GmGuardRedirect | void;

/**
 * Why access is granted, or "denied".
 * - game-master:    the signed-in profile is flagged isAdult
 * - masquerade:     a hero is on screen but a Game Master is impersonating them right now
 * - no-game-master: no profile on this device is flagged yet (installs from before the flag
 *                   existed), so nobody can be kept out and nobody should be locked out
 * - denied:         everyone else, including "nobody is signed in"
 */
export type GmAccess = "game-master" | "masquerade" | "no-game-master" | "denied";

/** The slice of the user store the decision needs (kept structural so tests can fake it). */
export interface GmStoreView {
  currentUser: { id: string | null; isImpersonating?: boolean };
  users: Record<string, { isAdult?: unknown } | undefined>;
}

/** Only a real `true` counts, so a stray "false" string or 1 can never promote a profile. */
const isGameMaster = (profile?: { isAdult?: unknown }): boolean =>
  profile?.isAdult === true;

/** Id of the Game Master who started the active masquerade (stored under IMPERSONATOR_KEY), if any. */
function readImpersonatorId(): string | null {
  try {
    return localStorage.getItem(IMPERSONATOR_KEY);
  } catch {
    return null; // storage blocked (private mode): treat as "no masquerade"
  }
}

/**
 * The decision table. Evaluated top to bottom against the real profile in `users`
 * (the `currentUser` copy made at login can be stale, so its isAdult is never read):
 *
 *  1. nobody signed in, or the signed-in id has no profile ......... denied
 *  2. users[currentUser.id].isAdult === true ....................... game-master
 *  3. currentUser.isImpersonating AND the id stored under
 *     IMPERSONATOR_KEY belongs to an isAdult profile ............... masquerade
 *  4. no profile on the device is isAdult .......................... no-game-master
 *  5. otherwise .................................................... denied
 */
export function resolveGmAccess(
  view: GmStoreView,
  getImpersonatorId: () => string | null = readImpersonatorId
): GmAccess {
  const { currentUser, users } = view;
  const profile = currentUser.id ? users[currentUser.id] : undefined;

  if (!profile) return "denied";
  if (isGameMaster(profile)) return "game-master";

  // The stored id alone is not enough: it lingers if a masquerade is never ended, and it must
  // not turn the next kid who opens the app into a Game Master.
  if (currentUser.isImpersonating) {
    const impersonatorId = getImpersonatorId();
    if (impersonatorId && isGameMaster(users[impersonatorId])) return "masquerade";
  }

  return Object.values(users).some(isGameMaster) ? "denied" : "no-game-master";
}

/** True when the signed-in person may open the Game Master area (guard and SideMenu share it). */
export function canAccessGameMaster(view: GmStoreView = useUserStore()): boolean {
  return resolveGmAccess(view) !== "denied";
}

/**
 * Who may switch the Game Master flag on or off in the profile form (AddProfile):
 *  - a Game Master, also while masquerading as a hero (everyone canAccessGameMaster lets in)
 *  - anybody, while no profile on the device is a Game Master yet: the first profile on a new
 *    device, or the first Game Master on an install from before the flag existed
 * A hero, or nobody signed in, on a device that already has a Game Master gets the toggle locked
 * and is told to ask a Game Master. Unlike canAccessGameMaster, this stays true for a first-run
 * visitor with no profile yet, who is "denied" the Game Master area but must be able to create
 * the device's first Game Master.
 */
export function canSetGameMaster(view: GmStoreView = useUserStore()): boolean {
  return canAccessGameMaster(view) || !Object.values(view.users).some(isGameMaster);
}

/** The PIN pad only types digits and takes exactly four presses, so nothing else could ever be entered on it. */
const PASSCODE_PATTERN = /^\d{4}$/;

/**
 * What is wrong with the passcode on a profile form, or null when it is fine. A Game Master must
 * have one (the PIN pad on the profile chooser is what keeps a hero out of their account); a hero
 * may leave it blank, but nobody may save one the PIN pad could never unlock.
 */
export function passcodeProblem(passcode: unknown, forGameMaster: boolean): string | null {
  const text = typeof passcode === "string" ? passcode : "";
  if (PASSCODE_PATTERN.test(text)) return null;
  if (forGameMaster) return "Game Masters need a 4-digit passcode";
  return text === "" ? null : "A passcode is exactly 4 digits";
}

/** Toast shown when a hero taps a family-settings action only a Game Master may use. */
export const FAMILY_GM_ONLY_MESSAGE = "Only a Game Master can change the family";

/** Toast shown when the last Game Master profile would be deleted. */
export const LAST_GM_MESSAGE = "The last Game Master cannot be deleted";

/**
 * Who may add, edit or delete profiles on /xp-settings/family: the same people who may open the
 * Game Master area (a Game Master, a masquerading Game Master, or anybody while the device has no
 * Game Master yet). A hero can otherwise delete the last Game Master and re-open the GM toggle.
 */
export function canManageFamily(view: GmStoreView = useUserStore()): boolean {
  return canAccessGameMaster(view);
}

/** True when `profile` is a Game Master and no other profile in `users` is one. */
export function isLastGameMaster(
  profile: { id?: string; isAdult?: unknown } | undefined,
  users: Record<string, { isAdult?: unknown } | undefined>
): boolean {
  if (!isGameMaster(profile)) return false;
  return !Object.entries(users).some(
    ([id, other]) => id !== profile?.id && isGameMaster(other)
  );
}

/** Why `profile` may not be deleted right now (toast text), or null when it may. */
export function deleteProfileProblem(
  profile: { id?: string; isAdult?: unknown },
  view: GmStoreView = useUserStore()
): string | null {
  if (!canManageFamily(view)) return FAMILY_GM_ONLY_MESSAGE;
  if (isLastGameMaster(profile, view.users)) return LAST_GM_MESSAGE;
  return null;
}

/**
 * A Game Master saved before the passcode rule has no 4-digit PIN. They are sent to the Pin tab of
 * their profile form to set one before the profile chooser lets them in.
 */
export function needsGameMasterPasscode(
  profile: { isAdult?: unknown; passcode?: unknown } | undefined
): boolean {
  return isGameMaster(profile) && passcodeProblem(profile?.passcode, true) !== null;
}

/**
 * True for /game-master and everything beneath it. The route record is checked as well as the
 * path because vue-router matches paths case-insensitively and honours aliases, so a typed
 * /Game-Master/dashboard would otherwise slip past a plain startsWith.
 */
export function isGameMasterRoute(
  to: Pick<RouteLocationNormalized, "path" | "matched">
): boolean {
  const path = to.path.toLowerCase();
  if (path === GM_PATH || path.startsWith(`${GM_PATH}/`)) return true;
  return (to.matched ?? []).some((record) => record.name === GM_ROUTE_NAME);
}

/** Fire-and-forget: a toast that fails to show must never hold up navigation. */
function announceGameMasterOnly(): void {
  toastController
    .create({
      message: GM_ONLY_MESSAGE,
      duration: 2500,
      position: "top",
      color: "warning",
    })
    .then((toast) => toast.present())
    .catch((error) => debug.error("Could not show the Game Master only toast", error));
}

/** Send a refused hero back to their own home, or to the profile chooser when nobody is known. */
function refusalRedirect(view: GmStoreView): GmGuardRedirect {
  const userId = view.currentUser.id;
  return userId && view.users[userId]
    ? { name: "my-home", params: { userId } }
    : { name: "xp-profile" };
}

/**
 * Keeps /game-master/** for Game Masters. Returns undefined to continue, or a redirect after
 * showing the "Game Master only" toast. Runs after the auth guard.
 */
export async function handleGmGuard(
  to: RouteLocationNormalized
): Promise<GmGuardResult> {
  if (!isGameMasterRoute(to)) return;

  const userStore = useUserStore();

  try {
    // A hard refresh or deep link gets here before App.ts has loaded the profiles. Without them
    // even a parent looks like a stranger, so load them first (as the my-portal route does).
    if (Object.keys(userStore.users).length === 0) {
      await userStore.loadUsers();
    }
    if (canAccessGameMaster(userStore)) return;
  } catch (error) {
    // Fail closed: a gate that errors out must not wave anybody through
    debug.error("Game Master guard could not verify the profile", error);
  }

  announceGameMasterOnly();
  return refusalRedirect(userStore);
}
