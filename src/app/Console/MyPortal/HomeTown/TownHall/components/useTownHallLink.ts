import { watch } from "vue";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import debug from "@/lib/utils/debug";
import type { LinkResult, UnlinkResult } from "@/lib/store/stores/townHall";
import { NATIVE_RETURN_URL, authorizeUrl, returnUrlFor } from "@/lib/services/townhall/townHallLink";
import { takeLinkReturn } from "@/lib/services/townhall/pendingReturn";
import { connectionName, townHallSiteUrl } from "@/lib/services/townhall/townHallSite";
import { usesHashHistory } from "@/router/historyMode";

/** The part of the Town Hall store the link flow touches */
export interface LinkStore {
  lastLinkResult: LinkResult | null;
  init(): Promise<unknown>;
  beginLink(heroId: string): Promise<string>;
  completeLink(search: string): Promise<LinkResult>;
  unlink(): Promise<UnlinkResult>;
}

export interface TownHallLinkOptions {
  store: LinkStore;
  /** The hero whose registration errand this is: the one-shot state is kept for them */
  heroId(): string;
  /** The route of the page WordPress sends the parent back to (the Town Hall's, or Settings') */
  returnRoute(): string;
  isGameMaster(): boolean;
  /** Says how the registration went (each page has its own clerk or toast) */
  announce(result: LinkResult): Promise<void>;
}

/**
 * Registering the family with the Town Hall site: the errand out to WordPress's authorize page, the return from it, and
 * unlinking. The Town Hall and Settings share it; each brings its own voice through `announce`.
 */
export function useTownHallLink(options: TownHallLinkOptions) {
  const { store } = options;

  // The phone apps get the parent back from outside the page (main.ts hands what the app was opened with to the store),
  // so the page follows the store's result. The web version announces its own return in completeReturn and has nothing to follow.
  if (Capacitor.isNativePlatform()) {
    watch(
      () => store.lastLinkResult,
      (result) => {
        if (result) void options.announce(result);
      }
    );
  }

  /** The device's saved link is read once; a storage failure leaves the family unregistered here and the page working */
  const loadLink = async () => {
    try {
      await store.init();
    } catch (err) {
      debug.error("Town Hall could not read this device's link:", err);
    }
  };

  /**
   * "I have an account" (a Game Master's errand): the device remembers a one-shot state, which the return must bring back
   * to count. The web version leaves for the site's authorize page, which sends the parent back to the page that asked.
   * A phone app opens the page in the system browser instead and WordPress sends the parent back through the app's own address.
   */
  const openAuthorizePage = async () => {
    if (!options.isGameMaster()) return;
    const site = townHallSiteUrl();
    const appName = connectionName(navigator.userAgent, Capacitor.getPlatform());
    try {
      const state = await store.beginLink(options.heroId());
      const returnUrl = Capacitor.isNativePlatform()
        ? NATIVE_RETURN_URL
        : returnUrlFor(options.returnRoute(), window.location, usesHashHistory());
      const url = authorizeUrl({ site, appName, returnUrl, state });
      if (!Capacitor.isNativePlatform()) {
        window.location.assign(url);
        return;
      }
      await Browser.open({ url });
    } catch (err) {
      debug.error("Town Hall could not open the registration page:", err);
      await options.announce("failed");
    }
  };

  const removeLink = () => store.unlink();

  /**
   * Coming back from WordPress's "authorize this app" page, the new password rode in the address. The app took it out of
   * the address bar and the history when it started (pendingReturn.ts, before the router read the address); this checks
   * it and says how it went. True when the visit was a return; false for an ordinary visit, which the page may use as it likes.
   */
  const completeReturn = async (): Promise<boolean> => {
    const search = takeLinkReturn();
    await loadLink();
    const isOrdinaryVisit = search === null;
    if (isOrdinaryVisit) return false;
    let result: LinkResult;
    try {
      result = await store.completeLink(search);
    } catch (err) {
      debug.error("Town Hall could not finish the registration:", err);
      result = "failed";
    }
    const isUnchanged = result === "none";
    if (!isUnchanged) await options.announce(result);
    return true;
  };

  return { loadLink, openAuthorizePage, removeLink, completeReturn };
}
