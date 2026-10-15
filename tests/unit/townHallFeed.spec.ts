import {
  fetchBoards,
  fetchComments,
  fetchNews,
  fetchPatchNotes,
  fetchTopics,
  patchNotesCategoryId,
} from "@/lib/services/townhall/townHallFeed";

/** jsdom has no Response, so the site answers with the four members the client may touch. */
const reply = (body: unknown, headers: Record<string, string> = {}, status = 200) => ({
  status,
  ok: status < 400,
  json: async () => body,
  headers: { get: (name: string) => headers[name] ?? null },
});

const ROOT = "https://doit.test/wp-json";

type Answer = ReturnType<typeof reply>;

/** A site that answers by URL: the first rule whose text the URL contains wins; anything else is an empty list. */
function site(rules: Array<[string, Answer]>) {
  const fetchImpl = jest.fn(async (url: string) => {
    const rule = rules.find(([text]) => url.includes(text));
    return rule ? rule[1] : reply([]);
  });
  const req = { root: ROOT, fetchImpl: fetchImpl as unknown as typeof fetch };
  const urls = () => fetchImpl.mock.calls.map((call) => call[0]);
  return { req, urls };
}

const board = (id: number, slug: string) => ({ id, slug, name: `Board ${slug}`, description: `About ${slug}`, count: id });

const post = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  date: "2026-10-01T09:30:00",
  title: { rendered: `Post ${id}` },
  excerpt: { rendered: `<p>Short ${id}</p>` },
  content: { rendered: `<p>Long ${id}</p>` },
  link: `https://doit.test/post-${id}`,
  ...extra,
});

describe("townHallFeed", () => {
  describe("fetchBoards", () => {
    it("keeps the Town Hall boards, in the Town Hall order", async () => {
      const { req, urls } = site([
        [
          "cafeteria_board",
          reply([board(1, "noo"), board(2, "suggestion-box"), board(3, "feature-requests"), board(4, "comments-feedback")]),
        ],
      ]);
      const boards = await fetchBoards(req);
      expect(boards.map((b) => b.slug)).toEqual(["feature-requests", "comments-feedback", "suggestion-box"]);
      expect(urls()).toEqual([`${ROOT}/wp/v2/cafeteria_board?per_page=100`]);
    });

    it("maps a term to a board", async () => {
      const { req } = site([["cafeteria_board", reply([board(9, "feature-requests")])]]);
      expect(await fetchBoards(req)).toEqual([
        { id: 9, slug: "feature-requests", name: "Board feature-requests", description: "About feature-requests", count: 9 },
      ]);
    });
  });

  describe("patchNotesCategoryId", () => {
    it("asks for the patch-notes slug and returns its id", async () => {
      const { req, urls } = site([["wp/v2/categories", reply([{ id: 7 }])]]);
      expect(await patchNotesCategoryId(req)).toBe(7);
      expect(urls()).toEqual([`${ROOT}/wp/v2/categories?slug=patch-notes`]);
    });

    it("is null when the site has no such category", async () => {
      const { req } = site([["wp/v2/categories", reply([])]]);
      expect(await patchNotesCategoryId(req)).toBeNull();
    });
  });

  describe("fetchNews", () => {
    it("leaves the Patch Notes out of the news when the category exists", async () => {
      const { req, urls } = site([
        ["wp/v2/categories", reply([{ id: 7 }])],
        ["wp/v2/posts", reply([post(1)])],
      ]);
      await fetchNews(1, req);
      const postsUrl = urls().find((url) => url.includes("/wp/v2/posts")) ?? "";
      expect(postsUrl).toContain("categories_exclude=7");
      expect(postsUrl).toContain("_embed=true");
      expect(postsUrl).toContain("per_page=5");
      expect(postsUrl).toContain("page=1");
    });

    it("sends no categories_exclude when the category is missing", async () => {
      const { req, urls } = site([
        ["wp/v2/categories", reply([])],
        ["wp/v2/posts", reply([post(1)])],
      ]);
      await fetchNews(2, req);
      const postsUrl = urls().find((url) => url.includes("/wp/v2/posts")) ?? "";
      expect(postsUrl).not.toContain("categories_exclude");
      expect(postsUrl).toContain("page=2");
    });

    it("maps the post, its picture and its categories, and reads the page count", async () => {
      const embedded = {
        "wp:featuredmedia": [{ source_url: "https://doit.test/pic.png" }],
        "wp:term": [[{ name: "Updates" }, { name: "Fun" }], [{ name: "a-tag" }]],
      };
      const { req } = site([
        ["wp/v2/categories", reply([])],
        ["wp/v2/posts", reply([post(4, { _embedded: embedded })], { "X-WP-TotalPages": "6" })],
      ]);
      const news = await fetchNews(1, req);
      expect(news.totalPages).toBe(6);
      expect(news.items).toEqual([
        {
          id: 4,
          date: "2026-10-01T09:30:00",
          title: "Post 4",
          excerpt: "<p>Short 4</p>",
          content: "<p>Long 4</p>",
          link: "https://doit.test/post-4",
          imageUrl: "https://doit.test/pic.png",
          categories: ["Updates", "Fun"],
        },
      ]);
    });

    it("reads one page and no picture when the site sends neither", async () => {
      const { req } = site([
        ["wp/v2/categories", reply([])],
        ["wp/v2/posts", reply([post(5)])],
      ]);
      const news = await fetchNews(1, req);
      expect(news.totalPages).toBe(1);
      expect(news.items[0].imageUrl).toBeUndefined();
      expect(news.items[0].categories).toEqual([]);
    });
  });

  describe("fetchPatchNotes", () => {
    it("is empty after one request when there is no Patch Notes category", async () => {
      const { req, urls } = site([["wp/v2/categories", reply([])]]);
      expect(await fetchPatchNotes(req)).toEqual([]);
      expect(urls()).toHaveLength(1);
    });

    it("reads the ten latest posts of the category", async () => {
      const { req, urls } = site([
        ["wp/v2/categories", reply([{ id: 7 }])],
        ["wp/v2/posts", reply([post(11), post(12)])],
      ]);
      const notes = await fetchPatchNotes(req);
      expect(notes.map((n) => n.id)).toEqual([11, 12]);
      expect(urls()[1]).toBe(`${ROOT}/wp/v2/posts?categories=7&per_page=10`);
    });
  });

  describe("fetchComments", () => {
    it("reads a post's comments oldest first", async () => {
      const { req, urls } = site([
        [
          "wp/v2/comments",
          reply([{ id: 3, author_name: "Pip", date: "2026-10-02T10:00:00", content: { rendered: "<p>Nice!</p>" } }]),
        ],
      ]);
      const comments = await fetchComments(12, req);
      expect(comments).toEqual([{ id: 3, author: "Pip", date: "2026-10-02T10:00:00", content: "<p>Nice!</p>" }]);
      expect(urls()).toEqual([`${ROOT}/wp/v2/comments?post=12&per_page=50&order=asc`]);
    });
  });

  describe("fetchTopics", () => {
    const topic = (id: number, extra: Record<string, unknown> = {}) => ({
      id,
      date: "2026-10-03T08:00:00",
      title: { rendered: `Topic ${id}` },
      content: { rendered: `<p>Body ${id}</p>` },
      ...extra,
    });

    it("maps the topic and its author, and reads the page count", async () => {
      const { req, urls } = site([
        ["cafeteria_topic", reply([topic(21, { _embedded: { author: [{ name: "Mom" }] } })], { "X-WP-TotalPages": "2" })],
      ]);
      const topics = await fetchTopics(5, 1, req);
      expect(topics.totalPages).toBe(2);
      expect(topics.items).toEqual([
        { id: 21, date: "2026-10-03T08:00:00", title: "Topic 21", content: "<p>Body 21</p>", author: "Mom" },
      ]);
      expect(urls()).toEqual([`${ROOT}/wp/v2/cafeteria_topic?cafeteria_board=5&_embed=true&per_page=10&page=1`]);
    });

    it("calls an author the site does not name Unknown", async () => {
      const { req } = site([["cafeteria_topic", reply([topic(22), topic(23, { _embedded: { author: [] } })])]]);
      const topics = await fetchTopics(5, 1, req);
      expect(topics.items.map((t) => t.author)).toEqual(["Unknown", "Unknown"]);
      expect(topics.totalPages).toBe(1);
    });
  });
});
