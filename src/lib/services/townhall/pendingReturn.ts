import { captureLinkReturn, strippedState } from "./townHallLink";

/**
 * WordPress's answer to Family Registration, taken out of the address when the app starts and kept here until the Town
 * Hall reads it. Taking it at boot, before the router's first navigation, means vue-router never memorises the password
 * (in its route, in `history.state.current` or `back`), whichever history mode the build routes by.
 */

let pending: string | null = null;

/** Keep a return (the query WordPress sent) for the Town Hall. */
export function stashLinkReturn(search: string): void {
  pending = search;
}

/** The kept return, once: the next call has nothing. */
export function takeLinkReturn(): string | null {
  const search = pending;
  pending = null;
  return search;
}

/**
 * The boot step (src/main.ts, before the router is made): when the address carries a Town Hall return, both of its
 * queries leave the address bar and the history entry at once and the return is kept for the Town Hall.
 */
export function captureTownHallReturn(win: Window = window): void {
  const captured = captureLinkReturn(win.location);
  if (!captured) return;
  win.history.replaceState(strippedState(win.history.state), "", captured.url);
  stashLinkReturn(captured.search);
}
