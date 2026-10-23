import { charCount, TITLE_MAX } from "./townHallPosts";
import type { PostDraft } from "./townHallPosts";
import type { TownHallBoardSlug } from "./townHallSite";
import type { TownHallPostKind } from "./townHallTypes";

/** What an administrator's link may do at the Town Hall, and the requests that do it. All pure. */

/** What the signed-in account may do on the site, read from its capabilities at `readAt` (epoch ms). */
export interface SitePowers {
  publish: boolean;
  moderate: boolean;
  readAt: number;
}

/** A hero, a parent without the site's keys, or an account not read yet: no desk. */
export const NO_POWERS: SitePowers = { publish: false, moderate: false, readAt: 0 };

/** The map of capabilities in the site's answer for `me`, or an empty one when the answer has none. */
function capabilitiesOf(me: unknown): Record<string, unknown> {
  const isPerson = typeof me === "object" && me !== null;
  if (!isPerson) return {};
  const capabilities = (me as { capabilities?: unknown }).capabilities;
  const isMap = typeof capabilities === "object" && capabilities !== null;
  if (!isMap) return {};
  return capabilities as Record<string, unknown>;
}

/** The powers the site's `users/me` answer grants. A power is held only when its capability is exactly `true`. */
export function powersOf(me: unknown, now: number): SitePowers {
  const capabilities = capabilitiesOf(me);
  const canPublish = capabilities.publish_posts === true && capabilities.edit_others_posts === true;
  const canModerate = capabilities.moderate_comments === true;
  return { publish: canPublish, moderate: canModerate, readAt: now };
}

/** What the desk can act on. */
export type DeskItemType = "post" | "topic" | "comment" | "bug";

/** What the desk can rewrite (comments and bugs are only approved, resolved or binned). */
export type EditableType = "post" | "topic";

/** The REST collection of each kind of item, relative to the site's `wp-json`. */
export const REST_PATHS: Record<DeskItemType, string> = {
  post: "wp/v2/posts",
  topic: "wp/v2/cafeteria_topic",
  comment: "wp/v2/comments",
  bug: "wp/v2/compass_bug",
};

/** One call to the site. */
export interface DeskRequest {
  path: string;
  method: "POST" | "DELETE";
  body?: Record<string, unknown>;
}

/** A title and the words under it. */
export interface Words {
  title: string;
  body: string;
}

export type NewsCategory = "news" | "patch-notes";

/** A news post the administrator writes, published at once or kept as a draft. */
export interface NewsDraft {
  kind: "news";
  title: string;
  body: string;
  category: NewsCategory;
  status: "publish" | "draft";
}

/** New words for a post or topic that already exists. */
export interface EditDraft {
  kind: "edit";
  title: string;
  body: string;
}

/** Everything the compose sheet can write. */
export type ComposeDraft = PostDraft | NewsDraft | EditDraft;
export type ComposeKind = TownHallPostKind | "news" | "edit";

/** The words a compose sheet opens with: a hero's failed post, or an item's raw words for an edit. */
export interface ComposeWords {
  title?: string;
  body: string;
  board?: TownHallBoardSlug;
  postId?: number;
}

/** Longer than a hero's post: an administrator writes the news. */
export const NEWS_BODY_MAX = 8000;

/** The first thing wrong with a title and its words, in the order they are fixed, or null when the site can take them. */
export function wordsProblem(words: Words): string | null {
  const hasTitle = words.title.trim().length > 0;
  if (!hasTitle) return "Give it a title.";
  const isTitleTooLong = charCount(words.title) > TITLE_MAX;
  if (isTitleTooLong) return "Keep the title under 100 characters.";
  const hasBody = words.body.trim().length > 0;
  if (!hasBody) return "Write something first.";
  const isBodyTooLong = charCount(words.body) > NEWS_BODY_MAX;
  if (isBodyTooLong) return "Keep it under 8,000 characters.";
  return null;
}

/** Publish a draft post or a held topic. */
export function publishRequest(type: EditableType, id: number): DeskRequest {
  return { path: `${REST_PATHS[type]}/${id}`, method: "POST", body: { status: "publish" } };
}

/** Move an item to the site's trash. Never forced: the site can restore it. */
export function trashRequest(type: DeskItemType, id: number): DeskRequest {
  return { path: `${REST_PATHS[type]}/${id}`, method: "DELETE" };
}

/** Rewrite a post or topic. */
export function saveRequest(type: EditableType, id: number, words: Words): DeskRequest {
  return { path: `${REST_PATHS[type]}/${id}`, method: "POST", body: { title: words.title, content: words.body } };
}

/** Write a news post, in the Patch Notes category when it was picked (`patchNotesId` is that category's id on the site). */
export function createNewsRequest(draft: NewsDraft, patchNotesId: number | null): DeskRequest {
  const body: Record<string, unknown> = { title: draft.title, content: draft.body, status: draft.status };
  const isPatchNotes = draft.category === "patch-notes";
  if (isPatchNotes) {
    const hasNoCategory = patchNotesId === null;
    if (hasNoCategory) throw new Error("The site has no Patch Notes category yet.");
    body.categories = [patchNotesId];
  }
  return { path: REST_PATHS.post, method: "POST", body };
}

/** Let a held comment through. */
export function approveCommentRequest(id: number): DeskRequest {
  return { path: `${REST_PATHS.comment}/${id}`, method: "POST", body: { status: "approved" } };
}

/** Mark a bug report resolved. */
export function resolveBugRequest(id: number): DeskRequest {
  return { path: `${REST_PATHS.bug}/${id}`, method: "POST", body: { bug_status: "resolved" } };
}

const SETTLED_BUG_STATUSES = ["resolved", "closed"];

/** A bug stays on the desk until it is resolved or closed. */
export function isOpenBug(status: string): boolean {
  return !SETTLED_BUG_STATUSES.includes(status);
}

/** How many of each kind of item wait on the desk, or null where the count is not known yet. */
export interface WaitingCounts {
  drafts: number | null;
  topics: number | null;
  held: number | null;
  bugs: number | null;
}

/** The number on the desk's badge. A count that is not known adds nothing. */
export function waitingTotal(counts: WaitingCounts): number {
  return [counts.drafts, counts.topics, counts.held, counts.bugs].reduce<number>((sum, count) => sum + (count ?? 0), 0);
}
