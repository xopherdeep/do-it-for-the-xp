import { townHallFetch, type TownHallRequest } from "./townHallClient";
import { PATCH_NOTES_SLUG, TOWN_HALL_BOARDS, type TownHallBoardSlug } from "./townHallSite";

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

export interface BoardInfo {
  id: number;
  slug: TownHallBoardSlug;
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

interface Rendered {
  rendered?: string;
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

interface WpComment {
  id: number;
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

/** The page count WordPress puts in a header; a site that sends none has one page. */
function totalPagesOf(headers: Headers): number {
  const pages = Number(headers.get("X-WP-TotalPages"));
  return pages >= 1 ? pages : 1;
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

/** The Town Hall's boards, in the Town Hall's order, whatever else the site keeps. */
export async function fetchBoards(req: TownHallReadRequest = {}): Promise<BoardInfo[]> {
  const { data } = await townHallFetch<WpBoard[]>("wp/v2/cafeteria_board", { ...req, query: { per_page: 100 } });
  const terms = data ?? [];
  return TOWN_HALL_BOARDS.flatMap((slug) => {
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
