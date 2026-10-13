import type { RouteLocationNormalized, Router } from "vue-router";

/** The GA4 web stream "Do it for the XP" (property do-it-for-the-xp). */
export const GA_MEASUREMENT_ID = "G-5KV3PXQGH6";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Only shipped builds report: jest, `pnpm serve` and Cypress (which runs against `pnpm serve`) stay out of the numbers. */
export const analyticsEnabled = (): boolean => process.env.NODE_ENV === "production";

/**
 * One page_view per screen. GA4 drops everything after `#`, and shipped builds route by hash,
 * so the route pattern is sent as a plain path. The pattern (`/bank/:userId`) rather than the
 * real URL keeps hero, quest and temple ids out of Google and folds each screen into one row.
 */
export const pageViewFor = (to: RouteLocationNormalized, origin: string) => {
  const pattern = to.matched[to.matched.length - 1]?.path ?? to.path;
  const path = pattern.replace(/\?/g, "").replace(/(.)\/$/, "$1");
  return {
    page_location: `${origin}${path}`,
    page_path: path,
    page_title: typeof to.name === "string" ? to.name : path,
  };
};

/** Loads gtag.js and reports a page_view after every navigation. Offline the queue just waits. */
export const startAnalytics = (router: Router): void => {
  if (!analyticsEnabled()) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js reads the arguments object itself, not an array
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  // Kids play this: no Google signals, no ad personalisation, and the router sends the page views
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  router.afterEach((to, _from, failure) => {
    if (failure) return;
    window.gtag?.("event", "page_view", pageViewFor(to, window.location.origin));
  });
};
