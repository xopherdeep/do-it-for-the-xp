import type { WpApiSettings } from "@/lib/api/apiHost";

/**
 * Where the Town Hall lives: the WordPress site that holds the boards, the Patch Notes and the family's
 * accounts. The app and the xophz-compass-xp plugin share these names.
 */

/** The Application Password app id; the plugin lists it with the same value. */
export const TOWN_HALL_APP_ID = "7606ce60-29c7-43b6-9533-2063ee726df4";

export const DEFAULT_TOWN_HALL_SITE = "https://doit.forthexp.com";

/** Development only: point the app at another site (for example a local WordPress) from the console. */
export const SITE_OVERRIDE_KEY = "xp:townHallSite";

/** Where a kid's parent makes a free account on the network. */
export const SIGNUP_URL = "https://www.forthexp.com/wp-signup.php";

/** The community boards, in the order the Town Hall shows them. */
export const TOWN_HALL_BOARDS = ["feature-requests", "ideas-suggestions", "comments-feedback", "suggestion-box"] as const;
export type TownHallBoardSlug = (typeof TOWN_HALL_BOARDS)[number];

/** The category slug of the posts the Patch Notes tab reads. */
export const PATCH_NOTES_SLUG = "patch-notes";

export const TOWN_HALL_TIMEOUT_MS = 8000;

export interface TownHallSiteOptions {
  /** The build setting; defaults to VUE_APP_TOWN_HALL_SITE. */
  env?: string;
  /** The development override; defaults to the localStorage value. */
  override?: string | null;
  /** Defaults to a production build. */
  production?: boolean;
}

const withoutTrailingSlashes = (url: string) => url.trim().replace(/\/+$/, "");

function storedSiteOverride(): string | null {
  try {
    return localStorage.getItem(SITE_OVERRIDE_KEY);
  } catch {
    return null;
  }
}

function developmentOverride(passed: string | null | undefined): string | null {
  return passed === undefined ? storedSiteOverride() : passed;
}

/** The Town Hall site (no trailing slash): the override in development, else the build setting, else doit.forthexp.com. */
export function townHallSiteUrl(opts: TownHallSiteOptions = {}): string {
  const production = opts.production ?? process.env.NODE_ENV === "production";
  const override = production ? null : developmentOverride(opts.override);
  const env = opts.env === undefined ? process.env.VUE_APP_TOWN_HALL_SITE : opts.env;
  const site = override || env || DEFAULT_TOWN_HALL_SITE;
  return withoutTrailingSlashes(site);
}

/** The WordPress REST root of the Town Hall site. */
export function townHallRestRoot(site: string = townHallSiteUrl()): string {
  return `${site}/wp-json`;
}

/**
 * The host page's REST nonce, but only when that page is the Town Hall site itself: a nonce from another
 * site (www.forthexp.com hosting the app) means nothing to the Town Hall.
 */
export function hostNonce(settings: WpApiSettings | undefined, site: string = townHallSiteUrl()): string | null {
  const hostRoot = settings?.root ? withoutTrailingSlashes(settings.root).toLowerCase() : "";
  const isTownHallHost = hostRoot === townHallRestRoot(site).toLowerCase();
  return isTownHallHost ? settings?.nonce || null : null;
}

/** Checked in order: Edge's and Chrome's agents also say "Safari", and Android's also says "Linux". */
type AgentTable = ReadonlyArray<readonly [RegExp, string]>;

const BROWSERS: AgentTable = [
  [/Edg\//, "Edge"],
  [/Firefox\//, "Firefox"],
  [/Chrome\/|CriOS/, "Chrome"],
  [/Safari\//, "Safari"],
];

const DEVICES: AgentTable = [
  [/Android/, "Android"],
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Windows/, "Windows"],
  [/Macintosh|Mac OS X/, "Mac"],
  [/Linux/, "Linux"],
];

/** The phone apps are named by platform, whatever web view they run in. */
const APP_NAMES = new Map([
  ["android", "Android app"],
  ["ios", "iPhone app"],
]);

function nameFromAgent(table: AgentTable, userAgent: string, fallback: string): string {
  const match = table.find(([pattern]) => pattern.test(userAgent));
  return match ? match[1] : fallback;
}

/** What the family sees in the site's Application Passwords list: "Do It For The XP – Chrome on Android". */
export function connectionName(userAgent: string, platform: string): string {
  const prefix = "Do It For The XP – ";
  const appName = APP_NAMES.get(platform);
  if (appName) return `${prefix}${appName}`;
  return `${prefix}${nameFromAgent(BROWSERS, userAgent, "Browser")} on ${nameFromAgent(DEVICES, userAgent, "this device")}`;
}

/** The build's version from package.json (vue.config.js exposes it), or "dev". */
export function appVersion(): string {
  return process.env.VUE_APP_VERSION || "dev";
}
