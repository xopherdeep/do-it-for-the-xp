import { Capacitor } from "@capacitor/core";
import { defineStore } from "pinia";
import { v4 as uuidv4 } from "uuid";
import { computed, ref } from "vue";
import { getTownHallDb } from "@/lib/databases/TownHallDb";
import { townHallFetch, TownHallError, type TownHallAuth } from "@/lib/services/townhall/townHallClient";
import { fetchBoards } from "@/lib/services/townhall/townHallFeed";
import { readLinkReturn, type LinkReturn } from "@/lib/services/townhall/townHallLink";
import { claimLinkState, rememberLinkState } from "@/lib/services/townhall/townHallLinkState";
import {
  approvePost,
  canDismiss,
  editPost,
  holdsComments,
  newPost,
  recover,
  refusesAccount,
  rejectPost,
  sendable,
  settle,
  startSending,
  type SendResult,
} from "@/lib/services/townhall/townHallOutbox";
import { bugEnvironment, draftProblem, requestFor, type PostDraft, type PostRequest } from "@/lib/services/townhall/townHallPosts";
import { appVersion, hostNonce, townHallSiteUrl, type TownHallBoardSlug } from "@/lib/services/townhall/townHallSite";
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
  const isText = typeof value === "string";
  if (!isText) return undefined;
  return value.trim() || undefined;
}

/** How a flush went: posts the site took, whether the family's link was given up, whether the account may not post. */
export interface FlushResult {
  sent: number;
  unlinked: boolean;
  forbidden: boolean;
}

type BoardIds = Partial<Record<TownHallBoardSlug, number>>;

/** What one flush keeps track of while it runs. */
interface FlushRun {
  result: FlushResult;
  /** Posts this flush has already had a go at, so a post that went back in the queue is not tried again in the same flush. */
  tried: Set<string>;
  /** The site's board ids, read when the first topic needs them. */
  boardIds: BoardIds | null;
  /** The site said to slow down with comments (one every 15 seconds): the rest of this flush sends none. */
  commentsHeld: boolean;
}

/** What a send that did not come back with a post: the site's refusal as it is (with WordPress's code), anything else as a server error. */
function failureOf(error: unknown): SendResult {
  const isSiteRefusal = error instanceof TownHallError;
  if (!isSiteRefusal) return { ok: false, code: "server" };
  return { ok: false, code: error.code, message: error.message, ...(error.siteCode ? { siteCode: error.siteCode } : {}) };
}

/** A made post answers with its id. A reply without one (a captive portal's page, say) is no sign the site has the post. */
function resultOfReply(data: unknown): SendResult {
  const id = (data as { id?: unknown } | null)?.id;
  return typeof id === "number" ? { ok: true, remoteId: id } : { ok: false, code: "server" };
}

/** Where a bug report was found and what device sent it; the other kinds carry none. */
function bugDetails(draft: PostDraft, route: string, at: number): { route: string; environment: string } | undefined {
  const isBug = draft.kind === "bug";
  if (!isBug) return undefined;
  const environment = bugEnvironment({ version: appVersion(), route, platform: Capacitor.getPlatform(), userAgent: navigator.userAgent, at });
  return { route, environment };
}

/** One try at sending a request. Whatever goes wrong comes back as a result, never as an error. */
async function sendRequest(request: PostRequest, withAuth: TownHallAuth): Promise<SendResult> {
  try {
    const { data } = await townHallFetch<unknown>(request.path, { auth: withAuth, method: "POST", body: request.body });
    return resultOfReply(data);
  } catch (e) {
    return failureOf(e);
  }
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

  /**
   * Load the stored link and posts, once. A failed load may be tried again. A post the closed app left sending goes back
   * in the queue (and is saved so), so it is not stuck forever.
   */
  function init(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        const db = getTownHallDb();
        const [storedLink, storedPosts] = await Promise.all([db.getLink(), db.getPosts()]);
        const recovered = recover(storedPosts);
        const changed = recovered.some((post, i) => post !== storedPosts[i]);
        if (changed) await db.savePosts(recovered);
        link.value = storedLink;
        posts.value = recovered;
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
      const isSiteError = e instanceof TownHallError;
      if (!isSiteError) throw e;
      return undefined;
    }
  }

  /**
   * Check the new password with the configured Town Hall site and keep it. A refusal or a dead connection stores nothing.
   * A link that replaces another asks the site to delete the old connection (with the old sign-in, best effort), so the
   * parent's profile does not collect connections nobody uses.
   */
  async function checkAndStore(ret: Extract<LinkReturn, { kind: "linked" }>): Promise<"linked" | "failed"> {
    if (!isTownHallSite(ret.siteUrl)) return "failed";
    const previous = activeLink.value;
    const withAuth = basicAuthOf(ret);
    let name: unknown;
    try {
      const me = await townHallFetch<{ name?: unknown } | null>("wp/v2/users/me", { auth: withAuth, query: { context: "edit" } });
      name = me.data?.name;
    } catch (e) {
      const isSiteError = e instanceof TownHallError;
      if (isSiteError) return "failed";
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
    const replacesConnection = previous?.appPasswordUuid !== undefined && previous.appPasswordUuid !== uuid;
    const shouldRemoveOld = !!previous && replacesConnection;
    if (shouldRemoveOld) await removeFromSite(previous);
    return "linked";
  }

  /**
   * A Game Master leaves for the authorize page: remember a one-shot state for the return to bring back (see
   * townHallLinkState.ts) and forget the last result, so a return that comes to the same thing again is noticed.
   */
  async function beginLink(heroId: string): Promise<string> {
    lastLinkResult.value = null;
    return rememberLinkState(heroId);
  }

  /**
   * Take what came back on the return address (pendingReturn.ts on the web, the app's own address in the phone apps).
   * Only a return that brings back the state this device handed out, while it is fresh, counts, and only once; any other
   * (crafted, stale, replayed) comes to `none`: nothing is asked, kept or said. A new link is checked before it is kept.
   */
  async function completeLink(search: string): Promise<LinkResult> {
    const ret = readLinkReturn(search);
    const isNotLinkReturn = ret.kind === "none";
    if (isNotLinkReturn) return "none";
    const asked = await claimLinkState(ret.state);
    if (!asked) return "none";
    let result: LinkResult = "rejected";
    const isLinked = ret.kind === "linked";
    if (isLinked) {
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
    const connectionUuid = current.appPasswordUuid;
    if (!connectionUuid) return false;
    try {
      await townHallFetch(`wp/v2/users/me/application-passwords/${encodeURIComponent(connectionUuid)}`, {
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

  async function persistPosts(): Promise<void> {
    await getTownHallDb().savePosts(posts.value);
  }

  function replacePost(next: TownHallPost): void {
    posts.value = posts.value.map((post) => (post.id === next.id ? next : post));
  }

  /** Change one post and save. A post that is not there, or that the change leaves as it was, writes nothing. */
  async function changePost(id: string, change: (post: TownHallPost) => TownHallPost): Promise<void> {
    await init();
    const current = posts.value.find((post) => post.id === id);
    if (!current) return;
    const next = change(current);
    const isUnchanged = next === current;
    if (isUnchanged) return;
    replacePost(next);
    await persistPosts();
  }

  /**
   * A hero's draft goes in the outbox: awaiting the Game Master's say for a topic or comment, queued for a Game Master's
   * own post or a bug report. A draft with something wrong with it (the first problem comes back as text) stores nothing.
   * Nothing is sent here; `flush()` sends.
   */
  async function submit(
    draft: PostDraft,
    hero: { id: string; name: string },
    isGameMaster: boolean,
    route: string,
  ): Promise<{ problem: string | null; post?: TownHallPost }> {
    const problem = draftProblem(draft);
    if (problem) return { problem };
    await init();
    const now = Date.now();
    const post = newPost(draft, hero, isGameMaster, now, uuidv4(), bugDetails(draft, route, now));
    posts.value = [...posts.value, post];
    await persistPosts();
    return { problem: null, post };
  }

  /** The Game Master lets a hero's waiting post go to the site. */
  async function approve(id: string): Promise<void> {
    await changePost(id, approvePost);
  }

  /** The Game Master keeps a hero's waiting post off the site. */
  async function reject(id: string): Promise<void> {
    await changePost(id, rejectPost);
  }

  /** Clear a rejected, failed or sent post from the list. Any other post stays. */
  async function dismiss(id: string): Promise<void> {
    await init();
    const current = posts.value.find((post) => post.id === id);
    const mayDismiss = current !== undefined && canDismiss(current);
    if (!mayDismiss) return;
    posts.value = posts.value.filter((post) => post.id !== id);
    await persistPosts();
  }

  /**
   * A failed post gets new text and starts again. Returns what is wrong with the new text, or null when it was taken.
   * A post that has not failed (or is gone) is left alone and null comes back: there is nothing wrong with the text.
   */
  async function resubmit(id: string, draft: PostDraft, isGameMaster: boolean): Promise<string | null> {
    const problem = draftProblem(draft);
    if (problem) return problem;
    await changePost(id, (post) => editPost(post, draft, isGameMaster));
    return null;
  }

  /** Sign the family out of a link the site refused. A refused website session has no link here to forget. Whether a link went. */
  async function giveUpOnRefusedLink(withAuth: TownHallAuth): Promise<boolean> {
    const hadLink = withAuth.kind === "basic";
    if (hadLink) await forgetLink();
    return hadLink;
  }

  /** Read the site's board ids into the run. False when they cannot be read: the flush stops and the posts wait. */
  async function loadBoardIds(run: FlushRun, withAuth: TownHallAuth): Promise<boolean> {
    try {
      const boards = await fetchBoards({ auth: withAuth });
      run.boardIds = Object.fromEntries(boards.map((board) => [board.slug, board.id]));
      return true;
    } catch (e) {
      const code = e instanceof TownHallError ? e.code : "server";
      const isRefused = code === "unauthorized";
      if (isRefused) run.result.unlinked = await giveUpOnRefusedLink(withAuth);
      const isForbidden = code === "forbidden";
      if (isForbidden) run.result.forbidden = true;
      return false;
    }
  }

  /**
   * Send one queued post and record how it went. True when the flush should stop here: the site no longer accepts the
   * sign-in, or cannot be reached (the posts behind this one would only wait out the same timeout).
   * A post whose request cannot be built (a board the site lacks, a comment without its post) fails with the reason,
   * before it is ever marked sending, and the flush goes on.
   */
  async function sendOne(post: TownHallPost, run: FlushRun): Promise<boolean> {
    const withAuth = auth.value;
    const needsBoards = post.kind === "topic" && run.boardIds === null;
    if (needsBoards) {
      const loaded = await loadBoardIds(run, withAuth);
      if (!loaded) return true;
    }

    let request: PostRequest;
    try {
      request = requestFor(post, run.boardIds ?? {});
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      replacePost(settle(startSending(post), { ok: false, code: "invalid", message: reason }).post);
      await persistPosts();
      return false;
    }

    const sending = startSending(post);
    replacePost(sending);
    const result = await sendRequest(request, withAuth);
    const settled = settle(sending, result);
    replacePost(settled.post);
    await persistPosts();

    const isSent = settled.post.status === "sent";
    if (isSent) run.result.sent += 1;
    const isAccountRefused = refusesAccount(result);
    if (isAccountRefused) run.result.forbidden = true;
    const areCommentsHeld = holdsComments(result);
    if (areCommentsHeld) run.commentsHeld = true;
    const shouldUnlink = settled.unlink;
    if (shouldUnlink) run.result.unlinked = await giveUpOnRefusedLink(withAuth);
    const isOffline = !result.ok && result.code === "offline";
    return settled.unlink || isOffline;
  }

  let inFlight: Promise<FlushResult> | null = null;

  async function sendQueued(): Promise<FlushResult> {
    try {
      await init();
      const run: FlushRun = { result: { sent: 0, unlinked: false, forbidden: false }, tried: new Set(), boardIds: null, commentsHeld: false };
      const mayTry = (post: TownHallPost) => !run.tried.has(post.id) && !(run.commentsHeld && post.kind === "comment");
      let stopped = false;
      while (!stopped && isLinked.value) {
        const next = sendable(posts.value).find(mayTry);
        if (!next) break;
        run.tried.add(next.id);
        stopped = await sendOne(next, run);
      }
      return run.result;
    } finally {
      // Cleared in the same step as the last look at the queue, so a call that joins this flush is sure the flush has
      // not yet looked at the queue for the last time. (`await init()` comes first, so this never runs before `flush`
      // has stored the promise.)
      inFlight = null;
    }
  }

  /**
   * Send the queued posts to the site, oldest first, saving after each. One flush runs at a time: a call made while one
   * runs gets that flush's answer, so the Town Hall opening while the browser comes back online sends each post once.
   * It looks at the queue again after each post, so a post approved meanwhile goes out in the same flush.
   * Nothing is requested while the device is not linked. A refused sign-in (401) gives the link up and stops; a connection
   * that is down stops; an account that may not post (403) is noted in `forbidden` and the flush goes on, because another
   * kind of post may still be allowed. A comment flood keeps that comment queued and holds the other comments until the
   * next flush. Anything else leaves the post queued (or failed, when the site refuses its text or the thread is closed)
   * and goes on to the next. Only a failure to load or save the stored posts rejects.
   */
  function flush(): Promise<FlushResult> {
    if (!inFlight) inFlight = sendQueued();
    return inFlight;
  }

  return {
    link,
    activeLink,
    posts,
    lastLinkResult,
    auth,
    isLinked,
    signedInThroughWebsite,
    init,
    beginLink,
    completeLink,
    unlink,
    forgetLink,
    submit,
    approve,
    reject,
    dismiss,
    resubmit,
    flush,
  };
});
