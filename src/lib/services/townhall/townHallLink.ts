import { TOWN_HALL_APP_ID } from "./townHallSite";

/**
 * Linking the family to the Town Hall site. The parent leaves for WordPress's "authorize this app" page and
 * WordPress sends them back to the Town Hall with the new Application Password in the query string.
 */

export type LinkReturn =
  | { kind: "linked"; siteUrl: string; userLogin: string; appPassword: string }
  | { kind: "rejected" }
  | { kind: "none" };

interface PageLocation {
  origin: string;
  pathname: string;
}

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
  if (siteUrl && userLogin && appPassword) return { kind: "linked", siteUrl, userLogin, appPassword };
  if (params.get("success") === "false") return { kind: "rejected" };
  return { kind: "none" };
}

/** The page address without the query, so the password leaves the address bar and the history. */
export function strippedUrl(loc: PageLocation & { hash: string }): string {
  return `${loc.origin}${loc.pathname}${loc.hash}`;
}

/**
 * `history.state` with the query taken out of the route vue-router keeps in `current` (path-routed builds: it holds the
 * whole address). The router writes that route back to the entry's address when the app navigates on, so leaving it would
 * put the password back in the address bar and the history, and Back would link a second time. A hash-routed build's
 * `current` never held the query, so its state comes back unchanged in value.
 */
export function strippedState(state: unknown): unknown {
  if (!state || typeof state !== "object") return state;
  const current = (state as { current?: unknown }).current;
  if (typeof current !== "string") return state;
  return { ...state, current: current.replace(/\?[^#]*/, "") };
}
