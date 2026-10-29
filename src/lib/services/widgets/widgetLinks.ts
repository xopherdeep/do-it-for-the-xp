import { App } from "@capacitor/app";

/**
 * Taps on the phone's home-screen widgets. Every widget opens the app at one of its own addresses
 * (`com.forthexp.doit://<host>/<rest>`, see android/app/src/main/java/com/forthexp/doit/widgets); this reads the
 * address and says which screen it means. Pure: no router, no storage, no Vue, so the mapping is all in one place.
 *
 * A widget sits on the home screen and knows nothing about the family, so none of its addresses carry a hero. The
 * paths keep `:userId` where the hero goes and `heroPath` fills in whoever is signed in (see main.ts).
 */

/** The scheme the app claims (AndroidManifest's VIEW filter) and the iOS URL type. */
const SCHEME = "com.forthexp.doit://";

/** The hero's place in a path, filled in once the app knows who is signed in. */
const HERO = ":userId";

const PORTAL = `/my-portal/${HERO}`;
const QUEST_LOG = `/my-tasks/${HERO}`;

/** Where a widget tap lands: an address of the app, with the hero still to be filled in. */
export interface WidgetDestination {
  /** The route's path, `:userId` included (see `heroPath`). */
  path: string;
  query?: Record<string, string>;
}

/**
 * The query the quest log reads to open its Quick Task sheet, so the Dock's + button writes a task instead of only
 * landing on the board.
 */
export const QUICK_TASK_QUERY: Record<string, string> = { add: "quick" };

/** The widgets' plain addresses: a host and nothing else. */
const PATHS: Record<string, string> = {
  // The Hero Card: the portal's own path redirects to My Home, the hero's room
  "my-portal": PORTAL,
  // The Gold Vault: the bank in Home Town
  bank: `/bank/${HERO}`,
  // The Streak Altar and the Dock's party button
  party: `${PORTAL}/my-party`,
  // The Dock's chores button: the quest log
  chores: QUEST_LOG,
};

/**
 * The path of one of the app's own addresses, segment by segment: `com.forthexp.doit://quest/q-1?from=widget` gives
 * `["quest", "q-1"]`. Empty for any other scheme, and for an address too mangled to read.
 */
function segmentsOf(url: string): string[] {
  const isNotOurs = !url.startsWith(SCHEME);
  if (isNotOurs) return [];
  const path = url.slice(SCHEME.length).split(/[?#]/)[0];
  try {
    return path.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    // chemx-allow: a stray % makes decodeURIComponent throw; an address nobody can read goes nowhere
    return [];
  }
}

/**
 * The screen a widget address means, or null for one this does not own. Null matters: the Town Hall's return address
 * (`com.forthexp.doit://town-hall?...`) comes in through the same door and must keep flowing to nativeReturn.ts, and
 * an address from a build newer than this one should leave the hero where they are rather than guess.
 */
export function parseWidgetLink(url: string): WidgetDestination | null {
  const [host, ...rest] = segmentsOf(url);
  if (!host) return null;

  const plain = PATHS[host];
  if (plain) return { path: plain };

  // A row of the Quest Board widget: the quest log opens that quest's beast card (the `taskId` route, as a
  // notification's tap uses)
  const isOneQuest = host === "quest";
  if (isOneQuest) return rest[0] ? { path: `${QUEST_LOG}/task/${encodeURIComponent(rest[0])}` } : null;

  // The Dock's dungeon button. A temple is always entered by name, and the Dock does not know which one the hero is
  // in, so the plain button opens the world map, where the temples are; `dungeon/<temple>` enters one directly.
  const isDungeon = host === "dungeon";
  if (isDungeon) {
    return rest[0]
      ? { path: `/temple/${encodeURIComponent(rest[0])}/${HERO}` }
      : { path: `${PORTAL}/world-map` };
  }

  const isAction = host === "action";
  if (isAction) return rest[0] === "add-task" ? { path: QUEST_LOG, query: { ...QUICK_TASK_QUERY } } : null;

  return null;
}

/** A destination as an address the router can push, with the hero signed in where `:userId` was. */
export function heroPath(destination: WidgetDestination, heroId: string): WidgetDestination {
  const path = destination.path.replace(HERO, encodeURIComponent(heroId));
  return destination.query ? { path, query: destination.query } : { path };
}

/** The address that started the app, or null when it was started some other way (and on the web, where there is none). */
async function launchAddress(): Promise<string | null> {
  try {
    const launch = await App.getLaunchUrl();
    return launch?.url || null;
  } catch {
    // chemx-allow: no launch address to read is the normal case; the listener below carries every later tap
    return null;
  }
}

/**
 * Hear the widgets. Two paths deliver an address and both are needed: Capacitor's BridgeActivity turns a tap on a
 * running app into an `appUrlOpen` event, but that event never fires for the address that *started* the app, which
 * only `getLaunchUrl` has. Android has been seen to deliver a cold start both ways, so the launch address is spent
 * once; a later tap on the same widget still travels. Resolves with the function that stops listening.
 */
export async function listenForWidgetLink(
  navigate: (destination: WidgetDestination) => void
): Promise<() => void> {
  // The launch address, until the echo of it (if Android sends one) has been dropped
  let coldStartUrl: string | null = null;
  // Taps that land before the launch address is known wait here, so neither path can jump the other
  let waiting: string[] | null = [];

  const dispatch = (url: string) => {
    const destination = parseWidgetLink(url);
    if (destination) navigate(destination);
  };

  const deliver = (url: string) => {
    if (waiting) {
      waiting.push(url);
      return;
    }
    const isColdStartEcho = url === coldStartUrl;
    coldStartUrl = null;
    if (isColdStartEcho) return;
    dispatch(url);
  };

  const handle = await App.addListener("appUrlOpen", ({ url }) => deliver(url));

  coldStartUrl = await launchAddress();
  const queued = waiting;
  waiting = null;
  if (coldStartUrl) dispatch(coldStartUrl);
  queued.forEach(deliver);

  return () => {
    void handle.remove();
  };
}
