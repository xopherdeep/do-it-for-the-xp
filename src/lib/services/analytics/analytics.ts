import { Capacitor } from "@capacitor/core";
import type { RouteLocationNormalized, Router } from "vue-router";

/** The GA4 web stream "Do it for the XP" (property do-it-for-the-xp). */
export const GA_MEASUREMENT_ID = "G-5KV3PXQGH6";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type PageView = ReturnType<typeof pageViewFor>;

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

/** Web (and iOS until it has a Firebase config): gtag.js on the web stream. Offline the queue just waits. */
const startGtag = (): ((view: PageView) => void) => {
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

  return (view) => window.gtag?.("event", "page_view", view);
};

/**
 * Android: the native Firebase SDK on the app's own stream (android/app/google-services.json), so a
 * phone is one app user, not also a web visitor. GA's "Page path and screen class" and "Page title
 * and screen name" pair each web field with its app field, so the same screen lines up on both.
 * Ad id, Android id and ad personalisation are off in AndroidManifest.xml.
 */
const startFirebase = (): ((view: PageView) => void) => {
  const plugin = import("@capacitor-firebase/analytics");
  return (view) => {
    plugin
      .then(({ FirebaseAnalytics }) =>
        FirebaseAnalytics.logEvent({
          name: "screen_view",
          params: { screen_class: view.page_path, screen_name: view.page_title },
        })
      )
      .catch(() => undefined);
  };
};

/** Reports a screen view after every navigation, on the stream that fits the platform. */
export const startAnalytics = (router: Router, platform = Capacitor.getPlatform()): void => {
  const isAnalyticsOn = analyticsEnabled();
  if (!isAnalyticsOn) return;

  const report = platform === "android" ? startFirebase() : startGtag();
  router.afterEach((to, _from, failure) => {
    if (failure) return;
    report(pageViewFor(to, window.location.origin));
  });
};
