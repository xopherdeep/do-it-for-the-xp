import type { TownHallErrorCode } from "./townHallClient";
import type { PostDraft } from "./townHallPosts";
import type { PostStatus, TownHallPost, TownHallPostKind } from "./townHallTypes";

/**
 * The outbox rules: how a post moves from the hero's draft to the site, and what each send result does to it.
 * awaiting-gm -> queued -> sending -> sent, with rejected (Game Master said no) and failed (the site refused the text) as the dead ends.
 * All pure: every function returns new objects and leaves its input alone.
 */

/** What one try at sending a post came back with. */
export type SendResult = { ok: true; remoteId: number } | { ok: false; code: TownHallErrorCode; message?: string };

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

/**
 * What a send result does to the post. Anything the hero cannot fix by waiting or by fixing the link keeps the post
 * queued (offline, server errors, a 404 from a Bug Net that is not active yet, a link the site no longer knows, an
 * account that may not post). Only text the site refuses fails the post, with the site's words so the hero can fix it.
 * `unlink` tells the caller to forget the family's link, because the site no longer accepts it.
 * Only a post that is sending settles: a stray result for a post that already moved on (two sends in flight, a
 * late answer for a post the Game Master rejected) changes nothing, so a sent post is never queued and sent twice.
 */
export function settle(post: TownHallPost, result: SendResult): { post: TownHallPost; unlink: boolean } {
  if (post.status !== "sending") return { post, unlink: false };
  if (result.ok) {
    const { error: _cleared, ...rest } = post;
    return { post: { ...rest, status: "sent", remoteId: result.remoteId }, unlink: false };
  }
  if (result.code === "invalid") {
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
