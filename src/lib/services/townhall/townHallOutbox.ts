import type { TownHallErrorCode } from "./townHallClient";
import type { PostDraft } from "./townHallPosts";
import type { PostStatus, TownHallPost, TownHallPostKind } from "./townHallTypes";

/**
 * The outbox rules: how a post moves from the hero's draft to the site, and what each send result does to it.
 * awaiting-gm -> queued -> sending -> sent, with rejected (Game Master said no) and failed (the site refused the text) as the dead ends.
 * All pure: every function returns new objects and leaves its input alone.
 */

/** What one try at sending a post came back with; a refusal carries WordPress's own error code when the site sent one. */
export type SendResult = { ok: true; remoteId: number } | { ok: false; code: TownHallErrorCode; message?: string; siteCode?: string };

/**
 * WordPress's refusals of one comment (wp_allow_comment and the REST comments controller), told apart by their code
 * because their statuses mislead: a non-moderator may comment once every 15 seconds (400 comment_flood); a retry of a
 * comment the site already has is 409 comment_duplicate; a closed thread or an unpublished post is a 403 that says nothing
 * about the family's account.
 */
const COMMENT_FLOOD = "comment_flood";
const COMMENT_DUPLICATE = "comment_duplicate";
const NOT_OPEN_FOR_COMMENTS: ReadonlySet<string> = new Set(["rest_comment_closed", "rest_comment_draft_post"]);

const siteCodeOf = (result: SendResult): string => (result.ok ? "" : result.siteCode ?? "");

/** The site refused the family's account, not one post (a 403 that is not about a thread): Family Registration may need redoing. */
export function refusesAccount(result: SendResult): boolean {
  return !result.ok && result.code === "forbidden" && !NOT_OPEN_FOR_COMMENTS.has(siteCodeOf(result));
}

/** The site asks the family to slow down with comments: the flush sends no more comments this time. */
export function holdsComments(result: SendResult): boolean {
  return siteCodeOf(result) === COMMENT_FLOOD;
}

/** A bug report needs no approval, and a Game Master approves their own posts by posting them. */
function startingStatus(kind: TownHallPostKind, isGameMaster: boolean): PostStatus {
  return kind === "bug" || isGameMaster ? "queued" : "awaiting-gm";
}

/** The parts of a draft a post keeps, without the ones the draft leaves out. */
function draftFields(draft: PostDraft): Pick<TownHallPost, "title" | "board" | "postId" | "body"> {
  return {
    ...(draft.title !== undefined ? { title: draft.title } : {}),
    ...(draft.board !== undefined ? { board: draft.board } : {}),
    ...(draft.postId !== undefined ? { postId: draft.postId } : {}),
    body: draft.body,
  };
}

/** A hero's draft becomes a post. The id and the time come from the caller so this stays deterministic. */
export function newPost(
  draft: PostDraft,
  hero: { id: string; name: string },
  isGameMaster: boolean,
  now: number,
  id: string,
  bug?: { route: string; environment: string },
): TownHallPost {
  return {
    id,
    kind: draft.kind,
    heroId: hero.id,
    heroName: hero.name,
    createdAt: now,
    status: startingStatus(draft.kind, isGameMaster),
    ...draftFields(draft),
    ...(bug ? { bug } : {}),
  };
}

/** The Game Master lets a hero's post go to the site. Only a post awaiting approval changes. */
export function approvePost(post: TownHallPost): TownHallPost {
  return post.status === "awaiting-gm" ? { ...post, status: "queued" } : post;
}

/** The Game Master keeps a hero's post off the site. Only a post awaiting approval changes. */
export function rejectPost(post: TownHallPost): TownHallPost {
  return post.status === "awaiting-gm" ? { ...post, status: "rejected" } : post;
}

/** A send begins. Only a queued post can. It keeps the last try's error, so the hero still sees it while the retry runs. */
export function startSending(post: TownHallPost): TownHallPost {
  return post.status === "queued" ? { ...post, status: "sending" } : post;
}

/** The post as the site has it, its last error cleared. */
function sentAs(post: TownHallPost, remoteId: number): TownHallPost {
  const { error: _cleared, ...rest } = post;
  return { ...rest, status: "sent", remoteId };
}

/**
 * What a send result does to the post. Anything the hero cannot fix by waiting or by fixing the link keeps the post
 * queued (offline, server errors, a 404 from a Bug Net that is not active yet, a link the site no longer knows, an
 * account that may not post, a comment flood). Only text the site refuses, or a thread closed to comments, fails the post,
 * with the site's words so the hero can fix or clear it. A duplicate comment is sent: the site has it already.
 * `unlink` tells the caller to forget the family's link, because the site no longer accepts it.
 * Only a post that is sending settles: a stray result for a post that already moved on (two sends in flight, a
 * late answer for a post the Game Master rejected) changes nothing, so a sent post is never queued and sent twice.
 */
export function settle(post: TownHallPost, result: SendResult): { post: TownHallPost; unlink: boolean } {
  if (post.status !== "sending") return { post, unlink: false };
  if (result.ok) return { post: sentAs(post, result.remoteId), unlink: false };
  const siteCode = siteCodeOf(result);
  // A duplicate: the site has the comment already, from a try whose answer was lost (its id is not known)
  if (siteCode === COMMENT_DUPLICATE) return { post: sentAs(post, 0), unlink: false };
  if (siteCode === COMMENT_FLOOD) return { post: { ...post, status: "queued", error: siteCode }, unlink: false };
  const refusesText = result.code === "invalid" || NOT_OPEN_FOR_COMMENTS.has(siteCode);
  if (refusesText) {
    return { post: { ...post, status: "failed", error: result.message || result.code }, unlink: false };
  }
  return { post: { ...post, status: "queued", error: result.code }, unlink: result.code === "unauthorized" };
}

/** On start, a post the closed app left sending goes back in the queue, so it is not stuck forever (its error stays). */
export function recover(posts: TownHallPost[]): TownHallPost[] {
  return posts.map((post) => (post.status === "sending" ? { ...post, status: "queued" } : post));
}

/** The posts ready to go to the site, oldest first. */
export function sendable(posts: TownHallPost[]): TownHallPost[] {
  return posts.filter((post) => post.status === "queued").sort((a, b) => a.createdAt - b.createdAt);
}

/** The posts a hero or a Game Master may clear from their list. A post waiting, queued or in the air stays. */
const DISMISSABLE: ReadonlySet<PostStatus> = new Set<PostStatus>(["rejected", "failed", "sent"]);

/** Whether the post may be cleared from the list: the Game Master turned it down, the site refused it, or it is sent. */
export function canDismiss(post: TownHallPost): boolean {
  return DISMISSABLE.has(post.status);
}

const WAITING_LABELS: Record<PostStatus, string> = {
  "awaiting-gm": "Waiting for your Game Master",
  rejected: "Not approved",
  queued: "Waiting to send",
  sending: "Waiting to send",
  failed: "Couldn't send",
  sent: "Sent",
};

/** What the hero reads on a post that is not on the site yet: what it waits for, or the site's words when it was refused. */
export function waitingLabel(post: TownHallPost): string {
  const label = WAITING_LABELS[post.status];
  const hasReason = post.status === "failed" && Boolean(post.error);
  return hasReason ? `${label}: ${post.error}` : label;
}

/** What the clerk tells a hero who has just posted: the line to say (hometownPrompts `postedNotice`). */
export type PostedOutcome = "to-gm" | "to-site" | "bug" | "on-file-hero" | "on-file-gm";

/**
 * How a post that was just kept goes on. A post awaiting the Game Master goes to the Game Master, linked or not. Any
 * other waits for a registration the family lacks (on file, and whose it is to register), or goes out: a bug report to
 * the developers, a Game Master's topic or comment to the site.
 */
export function postedOutcome(post: TownHallPost, linked: boolean, isGameMaster: boolean): PostedOutcome {
  if (post.status === "awaiting-gm") return "to-gm";
  if (!linked) return isGameMaster ? "on-file-gm" : "on-file-hero";
  return post.kind === "bug" ? "bug" : "to-site";
}

/** A hero's posts the site does not have yet (waiting, queued, sending, rejected, failed), newest first. */
export function waitingFor(posts: TownHallPost[], heroId: string): TownHallPost[] {
  return posts
    .filter((post) => post.heroId === heroId && post.status !== "sent")
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** A failed post with new text starts again, with its error cleared. Any other post is left alone. */
export function editPost(post: TownHallPost, draft: PostDraft, isGameMaster: boolean): TownHallPost {
  if (post.status !== "failed") return post;
  return {
    id: post.id,
    kind: post.kind,
    heroId: post.heroId,
    heroName: post.heroName,
    createdAt: post.createdAt,
    status: startingStatus(post.kind, isGameMaster),
    ...draftFields(draft),
    ...(post.bug ? { bug: post.bug } : {}),
  };
}
