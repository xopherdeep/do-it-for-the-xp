/**
 * Which WordPress site the app talks to.
 *
 * When xophz-compass-xp hosts the app it injects window.wpApiSettings (REST root and a
 * nonce), so the app calls that same site with the visitor's login. Native builds and
 * `ionic serve` have no host page and keep calling doit.forthexp.com.
 */
export interface WpApiSettings {
  root?: string;
  nonce?: string;
}

export interface ApiConfig {
  protocol?: string;
  url: string;
  base: string;
  nonce?: string;
}

declare global {
  interface Window {
    wpApiSettings?: WpApiSettings;
  }
}

export function resolveApiConfig(settings: WpApiSettings | undefined): ApiConfig {
  const hostRoot = settings?.root;
  const isHostedByWordPress = Boolean(hostRoot);

  if (isHostedByWordPress) {
    return { url: (hostRoot as string).replace(/\/+$/, ""), base: "wp/v2", nonce: settings?.nonce };
  }
  return { protocol: "https", url: "doit.forthexp.com", base: "wp-json/wp/v2" };
}

const DEFAULT_COMPASS_REST_ROOT = "https://doit.forthexp.com/wp-json";

/** The WordPress REST root (no trailing slash): the hosting site when XP serves the app, else doit.forthexp.com. */
export function compassRestRoot(settings: WpApiSettings | undefined = window.wpApiSettings): string {
  const hostRoot = settings?.root;
  return hostRoot ? hostRoot.replace(/\/+$/, "") : DEFAULT_COMPASS_REST_ROOT;
}

/** The WordPress site itself (the REST root without its /wp-json), where /buy/... lives. */
export function compassSiteRoot(settings: WpApiSettings | undefined = window.wpApiSettings): string {
  return compassRestRoot(settings).replace(/\/wp-json$/, "");
}
