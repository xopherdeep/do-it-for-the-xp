import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { getTownHallDb } from "@/lib/databases/TownHallDb";
import { townHallFetch, TownHallError, type TownHallAuth } from "@/lib/services/townhall/townHallClient";
import { readLinkReturn, type LinkReturn } from "@/lib/services/townhall/townHallLink";
import { hostNonce, townHallSiteUrl } from "@/lib/services/townhall/townHallSite";
import type { TownHallLink, TownHallPost } from "@/lib/services/townhall/townHallTypes";

/** What coming back from WordPress's "authorize this app" page came to: nothing there, turned down, or a checked link. */
export type LinkResult = "linked" | "rejected" | "none" | "failed";

/** `removed-here-only`: this device forgot the link but the site still lists the connection, so the parent removes it there. */
export type UnlinkResult = "forgotten" | "removed-here-only";

/** Whether an address is the configured Town Hall site: only it may hand out a link, and a link counts only for it. */
function isTownHallSite(candidate: string): boolean {
  try {
    return new URL(candidate).origin === new URL(townHallSiteUrl()).origin;
  } catch {
    return false;
  }
}

/** The site's text, trimmed, or nothing when it sent something else or an empty string. */
function textOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim() || undefined;
}

const basicAuthOf = (link: Pick<TownHallLink, "userLogin" | "appPassword">): TownHallAuth => ({
  kind: "basic",
  userLogin: link.userLogin,
  appPassword: link.appPassword,
});

/** The family's link to the Town Hall site on this device, and how requests prove who sends them. */
export const useTownHallStore = defineStore("townHall", () => {
  const link = ref<TownHallLink | null>(null);
  const posts = ref<TownHallPost[]>([]);
  /** The last return that came to something; an ordinary visit (`none`) leaves it alone. */
  const lastLinkResult = ref<LinkResult | null>(null);

  const hostSession = (): string | null => hostNonce(window.wpApiSettings);

  /**
   * The stored link, but only while it belongs to the configured site: a link counts only for the site that issued it.
   * One for another site (a development override pointing elsewhere) stays in storage and counts again when the site matches.
   */
  const activeLink = computed(() => {
    if (!link.value) return null;
    return isTownHallSite(link.value.siteUrl) ? link.value : null;
  });

  /** The link first; else the session of the website hosting the app; else a guest. */
  const auth = computed<TownHallAuth>(() => {
    if (activeLink.value) return basicAuthOf(activeLink.value);
    const nonce = hostSession();
    return nonce ? { kind: "nonce", nonce } : { kind: "none" };
  });
  const isLinked = computed(() => auth.value.kind !== "none");
  const signedInThroughWebsite = computed(() => !activeLink.value && hostSession() !== null);

  let initPromise: Promise<void> | null = null;

  /** Load the stored link and posts, once. A failed load may be tried again. */
  function init(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        const db = getTownHallDb();
        const [storedLink, storedPosts] = await Promise.all([db.getLink(), db.getPosts()]);
        link.value = storedLink;
        posts.value = storedPosts;
      })().catch((e) => {
        initPromise = null;
        throw e;
      });
    }
    return initPromise;
  }

  /** The connection's id on the site, which Unlink needs to remove it there; the link works without it. */
  async function connectionId(withAuth: TownHallAuth): Promise<string | undefined> {
    try {
      const { data } = await townHallFetch<{ uuid?: unknown }>("wp/v2/users/me/application-passwords/introspect", { auth: withAuth });
      return textOrUndefined(data?.uuid);
    } catch (e) {
      if (!(e instanceof TownHallError)) throw e;
      return undefined;
    }
  }

  /** Check the new password with the configured Town Hall site and keep it. A refusal or a dead connection stores nothing. */
  async function checkAndStore(ret: Extract<LinkReturn, { kind: "linked" }>): Promise<"linked" | "failed"> {
    if (!isTownHallSite(ret.siteUrl)) return "failed";
    const withAuth = basicAuthOf(ret);
    let name: unknown;
    try {
      const me = await townHallFetch<{ name?: unknown } | null>("wp/v2/users/me", { auth: withAuth, query: { context: "edit" } });
      name = me.data?.name;
    } catch (e) {
      if (e instanceof TownHallError) return "failed";
      throw e;
    }
    const uuid = await connectionId(withAuth);
    const next: TownHallLink = {
      siteUrl: townHallSiteUrl(),
      userLogin: ret.userLogin,
      appPassword: ret.appPassword,
      displayName: textOrUndefined(name) ?? ret.userLogin,
      linkedAt: Date.now(),
      ...(uuid ? { appPasswordUuid: uuid } : {}),
    };
    await getTownHallDb().saveLink(next);
    link.value = next;
    return "linked";
  }

  /**
   * Take what WordPress appended to the return address (`window.location.search`, read by the page, which also takes it
   * out of the address bar). A new link is checked before it is kept.
   */
  async function completeLink(search: string): Promise<LinkResult> {
    const ret = readLinkReturn(search);
    if (ret.kind === "none") return "none";
    let result: LinkResult = "rejected";
    if (ret.kind === "linked") {
      await init();
      result = await checkAndStore(ret);
    }
    lastLinkResult.value = result;
    return result;
  }

  /** Forget the link on this device only, without asking the site (for example when the site no longer accepts it). */
  async function forgetLink(): Promise<void> {
    await init();
    await getTownHallDb().clearLink();
    link.value = null;
  }

  /**
   * Ask the site to delete this device's connection. Whatever goes wrong (a refusal, no connection, an unexpected error)
   * the connection is not known to be gone, so the answer is false and the parent removes it on the site.
   */
  async function removeFromSite(current: TownHallLink): Promise<boolean> {
    if (!current.appPasswordUuid) return false;
    try {
      await townHallFetch(`wp/v2/users/me/application-passwords/${encodeURIComponent(current.appPasswordUuid)}`, {
        auth: basicAuthOf(current),
        method: "DELETE",
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Remove the connection on the site if it lets us, and the link from this device either way. */
  async function unlink(): Promise<UnlinkResult> {
    await init();
    const current = activeLink.value;
    if (!current) return "forgotten";
    const removedOnSite = await removeFromSite(current);
    await forgetLink();
    return removedOnSite ? "forgotten" : "removed-here-only";
  }

  return { link, posts, lastLinkResult, auth, isLinked, signedInThroughWebsite, init, completeLink, unlink, forgetLink };
});
