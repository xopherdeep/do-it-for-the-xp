import { TOWN_HALL_APP_ID } from "./townHallSite";

/**
 * Linking the family to the Town Hall site. The parent leaves for WordPress's "authorize this app" page and
 * WordPress sends them back to the Town Hall with the new Application Password in the query string.
 */

export type LinkReturn =
  | { kind: "linked"; siteUrl: string; userLogin: string; appPassword: string; state?: string }
  | { kind: "rejected"; state?: string }
  | { kind: "none" };

interface PageLocation {
  origin: string;
  pathname: string;
}

/** The page's whole address, as `window.location` has it. */
export interface ReturnLocation extends PageLocation {
  search: string;
  hash: string;
}

/** The query key that carries the one-shot state the app handed WordPress (see townHallLinkState.ts). */
export const LINK_STATE_PARAM = "th_state";

/** The keys WordPress and the app put on the way back: any of them makes an address a Town Hall return. */
const RETURN_KEYS = [LINK_STATE_PARAM, "site_url", "user_login", "password"] as const;

/**
 * Where WordPress sends the parent back to from a phone app: the app's own address (the iOS URL type and the Android intent
 * filter both claim it), which the system browser hands to the app as an `appUrlOpen` event.
 */
export const NATIVE_RETURN_URL = "com.forthexp.doit://town-hall";

/** The Town Hall for the hero on screen: the address WordPress sends the parent back to. */
export function townHallReturnUrl(userId: string, loc: PageLocation, hash: boolean): string {
  const route = `/town-hall/${encodeURIComponent(userId)}`;
  return hash ? `${loc.origin}${loc.pathname}#${route}` : `${loc.origin}${route}`;
}

/** WordPress's authorize page; success and reject both come back to the Town Hall. */
export function authorizeUrl(opts: { site: string; appName: string; returnUrl: string }): string {
  const params = new URLSearchParams({
    app_name: opts.appName,
    app_id: TOWN_HALL_APP_ID,
    success_url: opts.returnUrl,
    reject_url: opts.returnUrl,
  });
  return `${opts.site.replace(/\/+$/, "")}/wp-admin/authorize-application.php?${params}`;
}

/**
 * What WordPress appended to the return URL. It sends `site_url`, `user_login` and `password` on approval
 * (spaces in the password as `+`) and `success=false` on reject; anything else is not a link.
 */
export function readLinkReturn(search: string): LinkReturn {
  const params = new URLSearchParams(search);
  const siteUrl = params.get("site_url");
  const userLogin = params.get("user_login");
  const appPassword = params.get("password");
  const state = params.get(LINK_STATE_PARAM);
  const withState = state ? { state } : {};
  if (siteUrl && userLogin && appPassword) return { kind: "linked", siteUrl, userLogin, appPassword, ...withState };
  if (params.get("success") === "false") return { kind: "rejected", ...withState };
  return { kind: "none" };
}

/** The query of a hash route (`#/town-hall/gm-1?a=b` gives `?a=b`), empty when the route has none. */
function queryOfHash(hash: string): string {
  const start = hash.indexOf("?");
  return start < 0 ? "" : hash.slice(start);
}

function isTownHallReturn(params: URLSearchParams): boolean {
  return RETURN_KEYS.some((key) => params.has(key)) || params.get("success") === "false";
}

/**
 * WordPress's answer, wherever it landed, and the address without it. Its approve button appends the answer to the END of
 * the return address, so in a hash-routed build it sits in the route's own query (`#/town-hall/gm-1?th_state=..&password=..`);
 * the no-JS fallback puts it before the fragment instead. Both queries are read (the page's first, then the route's) and
 * both leave the address; the route stays. Null when the address carries no Town Hall return.
 */
export function captureLinkReturn(loc: ReturnLocation): { search: string; url: string } | null {
  const params = new URLSearchParams(loc.search);
  new URLSearchParams(queryOfHash(loc.hash)).forEach((value, key) => params.append(key, value));
  if (!isTownHallReturn(params)) return null;
  const route = loc.hash.split("?")[0];
  return { search: `?${params}`, url: `${loc.origin}${loc.pathname}${route}` };
}

/** The query of an address (`?a=b`, no fragment; empty when it has none), in the shape `readLinkReturn` reads. */
export function searchOf(url: string): string {
  const start = url.indexOf("?");
  if (start < 0) return "";
  const fragment = url.indexOf("#");
  if (fragment >= 0 && fragment < start) return "";
  return fragment < 0 ? url.slice(start) : url.slice(start, fragment);
}

/**
 * `history.state` with the query taken out of the route vue-router keeps in `current`. The return is taken before the
 * router is made, so a fresh entry has no state at all; an entry the browser brings back (a reload of an older one) may
 * still hold the router's memory, and the router writes that route back to the entry's address when the app navigates on.
 * A route without a query comes back unchanged in value.
 */
export function strippedState(state: unknown): unknown {
  if (!state || typeof state !== "object") return state;
  const current = (state as { current?: unknown }).current;
  if (typeof current !== "string") return state;
  return { ...state, current: current.replace(/\?[^#]*/, "") };
}
