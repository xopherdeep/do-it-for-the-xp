import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { v4 as uuidv4 } from "uuid";

/**
 * The one-shot state of a Family Registration. When a Game Master leaves for WordPress's authorize page the device
 * remembers a random state; WordPress carries it back on the return address (`th_state`), and a return counts only when
 * it brings that state back while it is fresh. Anything else (a link someone crafted, a stale or replayed return, an app
 * that opened the game's own address) is ignored, so nobody can link the family to an account it did not choose.
 *
 * The web version keeps the state in sessionStorage (WordPress sends the parent back to the same tab); the phone apps keep
 * it in Preferences, because the app may be killed while the parent is in the system browser.
 */

export const LINK_STATE_KEY = "xp:townHallLinkState";

/** How long the parent has to approve on the site. */
export const LINK_STATE_TTL_MS = 30 * 60 * 1000;

export interface LinkState {
  state: string;
  /** The hero whose Town Hall the Game Master left from. */
  heroId: string;
  expiresAt: number;
}

export function newLinkState(heroId: string, now: number, state: string): LinkState {
  return { state, heroId, expiresAt: now + LINK_STATE_TTL_MS };
}

/** Whether a return's state is the one this device handed out, and still fresh. */
export function matchesLinkState(stored: LinkState | null, state: string | undefined, now: number): boolean {
  const isMissing = !stored || !state;
  if (isMissing) return false;
  return stored.state === state && now < stored.expiresAt;
}

interface StateShelf {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  clear(): Promise<void>;
}

/** sessionStorage can throw (blocked site data); a shelf that cannot be read holds nothing. */
const webShelf: StateShelf = {
  async read() {
    try {
      return sessionStorage.getItem(LINK_STATE_KEY);
    } catch {
      return null;
    }
  },
  async write(value) {
    sessionStorage.setItem(LINK_STATE_KEY, value);
  },
  async clear() {
    try {
      sessionStorage.removeItem(LINK_STATE_KEY);
    } catch {
      // Nothing could be kept there either
    }
  },
};

const nativeShelf: StateShelf = {
  async read() {
    return (await Preferences.get({ key: LINK_STATE_KEY })).value;
  },
  async write(value) {
    await Preferences.set({ key: LINK_STATE_KEY, value });
  },
  async clear() {
    await Preferences.remove({ key: LINK_STATE_KEY });
  },
};

const shelf = (): StateShelf => (Capacitor.isNativePlatform() ? nativeShelf : webShelf);

/** A kept state, or null when there is none or it is not one. */
function parsed(raw: string | null): LinkState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<LinkState> | null;
    const isState = typeof value?.state === "string" && typeof value.heroId === "string" && typeof value.expiresAt === "number";
    return isState ? (value as LinkState) : null;
  } catch {
    return null;
  }
}

/** A Game Master leaves for the authorize page: remember a new state (it replaces any older one) and hand it back. */
export async function rememberLinkState(heroId: string, now: number = Date.now()): Promise<string> {
  const record = newLinkState(heroId, now, uuidv4());
  await shelf().write(JSON.stringify(record));
  return record.state;
}

/**
 * A return came back with `state`: the kept record when it matches and is fresh, and then it is forgotten (one shot).
 * A wrong or missing state leaves the kept one for the parent's own return; an expired one is forgotten.
 */
export async function claimLinkState(state: string | undefined, now: number = Date.now()): Promise<LinkState | null> {
  const stored = parsed(await shelf().read());
  if (!stored) return null;
  const matches = matchesLinkState(stored, state, now);
  const expired = now >= stored.expiresAt;
  const shouldClear = matches || expired;
  if (shouldClear) await shelf().clear();
  return matches ? stored : null;
}
