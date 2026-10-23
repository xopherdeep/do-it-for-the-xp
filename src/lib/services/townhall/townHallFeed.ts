import { townHallFetch, type TownHallRequest } from "./townHallClient";
import { isOpenBug, REST_PATHS, type EditableType, type NewsCategory, type Words } from "./townHallDesk";
import { PATCH_NOTES_SLUG, TOWN_HALL_BOARDS, type SiteBoardSlug, type TownHallBoardSlug } from "./townHallSite";

/** What a read needs from the caller: who asks, and (for tests and other sites) how and where. */
export type TownHallReadRequest = Pick<TownHallRequest, "auth" | "fetchImpl" | "root">;

/** WordPress sends rendered HTML; the screens decide how to show it. */
export interface NewsItem {
  id: number;
  date: string;
  title: string;
  excerpt: string;
  content: string;
  link: string;
  imageUrl?: string;
  categories: string[];
}

export interface CommentItem {
  id: number;
  author: string;
  date: string;
  content: string;
}

export interface BoardInfo<S extends SiteBoardSlug = TownHallBoardSlug> {
  id: number;
  slug: S;
  name: string;
  description: string;
  count: number;
}

export interface TopicItem {
  id: number;
  date: string;
  title: string;
  content: string;
  author: string;
}

/** A comment the site holds for approval, with the post it answers. */
export interface HeldComment extends CommentItem {
  postId: number;
}

/** A Bug Net report as the desk lists it. */
export interface BugItem {
  id: number;
  date: string;
  title: string;
  status: string;
  route: string;
  environment: string;
}

interface Rendered {
  rendered?: string;
  /** Only sent in the edit context. */
  raw?: string;
}

interface WpPost {
  id: number;
  date?: string;
  title?: Rendered;
  excerpt?: Rendered;
  content?: Rendered;
  link?: string;
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url?: string }>;
    "wp:term"?: Array<Array<{ name?: string }>>;
    author?: Array<{ name?: string }>;
  };
}

interface WpBug extends WpPost {
  bug_status?: string;
  bug_url?: string;
  bug_environment?: string;
}

interface WpComment {
  id: number;
  post?: number;
  author_name?: string;
  date?: string;
  content?: Rendered;
}

interface WpBoard {
  id: number;
  slug: string;
  name?: string;
  description?: string;
  count?: number;
}

const NEWS_PER_PAGE = 5;
const PATCH_NOTES_LIMIT = 10;
const COMMENTS_LIMIT = 50;
const TOPICS_PER_PAGE = 10;
const DRAFTS_LIMIT = 5;
const HELD_COMMENTS_LIMIT = 20;
const BUGS_LIMIT = 10;
const DRAFT_STATUSES = "draft,pending";

/** The page count WordPress puts in a header; a site that sends none has one page. */
function totalPagesOf(headers: Headers): number {
  const pages = Number(headers.get("X-WP-TotalPages"));
  return pages >= 1 ? pages : 1;
}

/** The item count WordPress puts in a header; a site that sends none counts none. */
function totalOf(headers: Headers): number {
  const total = Number(headers.get("X-WP-Total"));
  return total >= 1 ? total : 0;
}

function toNewsItem(post: WpPost): NewsItem {
  const embedded = post._embedded ?? {};
  const imageUrl = embedded["wp:featuredmedia"]?.[0]?.source_url;
  const categories = (embedded["wp:term"]?.[0] ?? []).map((term) => term.name ?? "");
  return {
    id: post.id,
    date: post.date ?? "",
    title: post.title?.rendered ?? "",
    excerpt: post.excerpt?.rendered ?? "",
    content: post.content?.rendered ?? "",
    link: post.link ?? "",
    imageUrl,
    categories,
  };
}

function toTopicItem(post: WpPost): TopicItem {
  return {
    id: post.id,
    date: post.date ?? "",
    title: post.title?.rendered ?? "",
    content: post.content?.rendered ?? "",
    author: (post._embedded ?? {}).author?.[0]?.name || "Unknown",
  };
}

/** The id of the Patch Notes category, or null when the site has not made it yet. */
export async function patchNotesCategoryId(req: TownHallReadRequest = {}): Promise<number | null> {
  const { data } = await townHallFetch<Array<{ id: number }>>("wp/v2/categories", { ...req, query: { slug: PATCH_NOTES_SLUG } });
  const [category] = data ?? [];
  return category ? category.id : null;
}

/** The news, a page at a time, without the Patch Notes (they have their own tab). */
export async function fetchNews(page: number, req: TownHallReadRequest = {}): Promise<{ items: NewsItem[]; totalPages: number }> {
  const patchNotesId = await patchNotesCategoryId(req);
  const { data, headers } = await townHallFetch<WpPost[]>("wp/v2/posts", {
    ...req,
    query: { _embed: "true", per_page: NEWS_PER_PAGE, page, categories_exclude: patchNotesId ?? undefined },
  });
  return { items: (data ?? []).map(toNewsItem), totalPages: totalPagesOf(headers) };
}

/** The latest Patch Notes; none at all (and no second request) while the site has no such category. */
export async function fetchPatchNotes(req: TownHallReadRequest = {}): Promise<NewsItem[]> {
  const patchNotesId = await patchNotesCategoryId(req);
  const hasCategory = patchNotesId !== null;
  if (!hasCategory) return [];
  const { data } = await townHallFetch<WpPost[]>("wp/v2/posts", { ...req, query: { categories: patchNotesId, per_page: PATCH_NOTES_LIMIT } });
  return (data ?? []).map(toNewsItem);
}

/** A post's comments, oldest first. */
export async function fetchComments(postId: number, req: TownHallReadRequest = {}): Promise<CommentItem[]> {
  const { data } = await townHallFetch<WpComment[]>("wp/v2/comments", {
    ...req,
    query: { post: postId, per_page: COMMENTS_LIMIT, order: "asc" },
  });
  return (data ?? []).map((comment) => ({
    id: comment.id,
    author: comment.author_name ?? "",
    date: comment.date ?? "",
    content: comment.content?.rendered ?? "",
  }));
}

/** The Town Hall's boards (or the `slugs` asked for), in that order, whatever else the site keeps. */
export async function fetchBoards<S extends SiteBoardSlug = TownHallBoardSlug>(
  req: TownHallReadRequest = {},
  slugs: readonly S[] = TOWN_HALL_BOARDS as unknown as readonly S[],
): Promise<BoardInfo<S>[]> {
  const { data } = await townHallFetch<WpBoard[]>("wp/v2/cafeteria_board", { ...req, query: { per_page: 100 } });
  const terms = data ?? [];
  return slugs.flatMap((slug) => {
    const term = terms.find((candidate) => candidate.slug === slug);
    return term ? [{ id: term.id, slug, name: term.name ?? "", description: term.description ?? "", count: term.count ?? 0 }] : [];
  });
}

/** One board's topics, newest first as the site sorts them, a page at a time. */
export async function fetchTopics(
  boardId: number,
  page: number,
  req: TownHallReadRequest = {},
): Promise<{ items: TopicItem[]; totalPages: number }> {
  const { data, headers } = await townHallFetch<WpPost[]>("wp/v2/cafeteria_topic", {
    ...req,
    query: { cafeteria_board: boardId, _embed: "true", per_page: TOPICS_PER_PAGE, page },
  });
  return { items: (data ?? []).map(toTopicItem), totalPages: totalPagesOf(headers) };
}

/** The unpublished posts (drafts and pending): the news, or the Patch Notes; none while the site has no such category. */
export async function fetchDrafts(category: NewsCategory, req: TownHallReadRequest = {}): Promise<NewsItem[]> {
  const patchNotesId = await patchNotesCategoryId(req);
  const isPatchNotes = category === "patch-notes";
  const hasCategory = patchNotesId !== null;
  const hasNothingToRead = isPatchNotes && !hasCategory;
  if (hasNothingToRead) return [];
  const categoryKey = isPatchNotes ? "categories" : "categories_exclude";
  const { data } = await townHallFetch<WpPost[]>(REST_PATHS.post, {
    ...req,
    query: { status: DRAFT_STATUSES, context: "edit", _embed: "true", per_page: DRAFTS_LIMIT, [categoryKey]: patchNotesId ?? undefined },
  });
  return (data ?? []).map(toNewsItem);
}

/** A board's topics that wait for approval. */
export async function fetchPendingTopics(boardId: number, req: TownHallReadRequest = {}): Promise<TopicItem[]> {
  const { data } = await townHallFetch<WpPost[]>(REST_PATHS.topic, {
    ...req,
    query: { status: "pending", context: "edit", cafeteria_board: boardId, _embed: "true", per_page: TOPICS_PER_PAGE },
  });
  return (data ?? []).map(toTopicItem);
}

/** The comments held for approval, each with the post it answers, and how many the site holds in all. */
export async function fetchHeldComments(req: TownHallReadRequest = {}): Promise<{ items: HeldComment[]; total: number }> {
  const { data, headers } = await townHallFetch<WpComment[]>(REST_PATHS.comment, {
    ...req,
    query: { status: "hold", context: "edit", per_page: HELD_COMMENTS_LIMIT },
  });
  const items = (data ?? []).map((comment) => ({
    id: comment.id,
    postId: comment.post ?? 0,
    author: comment.author_name ?? "",
    date: comment.date ?? "",
    content: comment.content?.rendered ?? "",
  }));
  return { items, total: totalOf(headers) };
}

/** The bug reports still open, newest first. */
export async function fetchBugs(req: TownHallReadRequest = {}): Promise<BugItem[]> {
  const { data } = await townHallFetch<WpBug[]>(REST_PATHS.bug, {
    ...req,
    query: { status: "draft,pending,publish", context: "edit", per_page: BUGS_LIMIT, orderby: "date", order: "desc" },
  });
  return (data ?? [])
    .map((bug) => ({
      id: bug.id,
      date: bug.date ?? "",
      title: bug.title?.rendered ?? "",
      status: bug.bug_status ?? "new",
      route: bug.bug_url ?? "",
      environment: bug.bug_environment ?? "",
    }))
    .filter((bug) => isOpenBug(bug.status));
}

/** The title and body of a post or topic as they were typed, not as they render. */
export async function fetchWords(type: EditableType, id: number, req: TownHallReadRequest = {}): Promise<Words> {
  const { data } = await townHallFetch<WpPost | null>(`${REST_PATHS[type]}/${id}`, { ...req, query: { context: "edit" } });
  return {
    title: data?.title?.raw ?? data?.title?.rendered ?? "",
    body: data?.content?.raw ?? data?.content?.rendered ?? "",
  };
}

/** How many posts wait as drafts or pending, from the site's total. */
export async function countDrafts(req: TownHallReadRequest = {}): Promise<number> {
  const { headers } = await townHallFetch<WpPost[]>(REST_PATHS.post, {
    ...req,
    query: { status: DRAFT_STATUSES, context: "edit", per_page: 1 },
  });
  return totalOf(headers);
}

/** How many topics wait for approval, from the site's total. */
export async function countPendingTopics(req: TownHallReadRequest = {}): Promise<number> {
  const { headers } = await townHallFetch<WpPost[]>(REST_PATHS.topic, {
    ...req,
    query: { status: "pending", context: "edit", per_page: 1 },
  });
  return totalOf(headers);
}
