import type { TownHallBoardSlug } from "./townHallSite";
import type { TownHallPost, TownHallPostKind } from "./townHallTypes";

/** What a hero may write for the Town Hall, and how a post becomes a request to the site. All pure. */

/** Limits count characters (code points), not bytes or UTF-16 units: a title of 100 dragon emoji is allowed. */
export const TITLE_MAX = 100;
export const BODY_MAX = 2000;
export const BUG_BODY_MAX = 4000;

/** A draft before it becomes a post. */
export interface PostDraft {
  kind: TownHallPostKind;
  title?: string;
  body: string;
  board?: TownHallBoardSlug; // topic
  postId?: number; // comment
}

/** The length of a text in characters (code points). */
export function charCount(text: string): number {
  return Array.from(text).length;
}

/** The first thing wrong with a draft, in the order a kid fixes it, or null when the clerk can take it. */
export function draftProblem(draft: PostDraft): string | null {
  const title = draft.title ?? "";
  const isTopic = draft.kind === "topic";
  const hasBoard = Boolean(draft.board);
  const hasTitle = title.trim().length > 0;
  const hasBody = draft.body.trim().length > 0;
  const bodyLimit = draft.kind === "bug" ? BUG_BODY_MAX : BODY_MAX;
  const bodyLimitMessage = draft.kind === "bug" ? "Keep it under 4,000 characters." : "Keep it under 2,000 characters.";

  if (isTopic && !hasBoard) return "Pick a board.";
  if (isTopic && !hasTitle) return "Give it a title.";
  if (charCount(title) > TITLE_MAX) return "Keep the title under 100 characters.";
  if (!hasBody) return "Write something first.";
  if (charCount(draft.body) > bodyLimit) return bodyLimitMessage;
  return null;
}

/** The line that ends every topic and comment. No real names, no family name. */
export function signature(heroName: string): string {
  return `\n\n— ${heroName}, from Do It For The XP`;
}

/** What a bug report says about the device, as plain text for the site's environment field. */
export function bugEnvironment(info: { version: string; route: string; platform: string; userAgent: string; at: number }): string {
  return [
    `App: ${info.version}`,
    `Screen: ${info.route}`,
    `Device: ${info.platform}, ${info.userAgent}`,
    `Time: ${new Date(info.at).toISOString()}`,
  ].join("\n");
}

export interface PostRequest {
  /** The REST path under /wp-json, without a leading slash. */
  path: string;
  body: Record<string, unknown>;
}

/** The WordPress REST request that sends a post. Throws when the post lacks what its kind needs. */
export function requestFor(post: TownHallPost, boardIds: Partial<Record<TownHallBoardSlug, number>>): PostRequest {
  if (post.kind === "comment") {
    if (post.postId === undefined) throw new Error("A comment needs the post it answers.");
    return { path: "wp/v2/comments", body: { post: post.postId, content: post.body + signature(post.heroName) } };
  }
  if (post.kind === "bug") {
    return {
      path: "wp/v2/compass_bug",
      body: {
        title: post.title?.trim() ? post.title : `Bug report from ${post.heroName}`,
        content: post.body,
        status: "pending",
        bug_status: "new",
        bug_priority: "medium",
        bug_type: "bug",
        bug_plugin: "do-it-for-the-xp",
        bug_url: post.bug?.route ?? "",
        bug_environment: post.bug?.environment ?? "",
      },
    };
  }
  const boardId = post.board === undefined ? undefined : boardIds[post.board as TownHallBoardSlug];
  if (boardId === undefined) throw new Error(`The board "${post.board ?? ""}" has no id on the site.`);
  return {
    path: "wp/v2/cafeteria_topic",
    body: { title: post.title ?? "", content: post.body + signature(post.heroName), status: "pending", cafeteria_board: [boardId] },
  };
}
