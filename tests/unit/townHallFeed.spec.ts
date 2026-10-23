import {
  countDrafts,
  countPendingTopics,
  fetchBoards,
  fetchBugs,
  fetchComments,
  fetchDrafts,
  fetchHeldComments,
  fetchNews,
  fetchPatchNotes,
  fetchPendingTopics,
  fetchTopics,
  fetchWords,
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

describe("the desk's readers", () => {
  it("reads news drafts outside the Patch Notes, and patch-note drafts inside them", async () => {
    const { req, urls } = site([["categories?slug=patch-notes", reply([{ id: 7 }])], ["posts?", reply([post(5)])]]);
    expect((await fetchDrafts("news", req)).map((d) => d.id)).toEqual([5]);
    expect(urls()[1]).toBe(`${ROOT}/wp/v2/posts?status=draft%2Cpending&context=edit&_embed=true&per_page=5&categories_exclude=7`);
    await fetchDrafts("patch-notes", req);
    expect(urls()[3]).toBe(`${ROOT}/wp/v2/posts?status=draft%2Cpending&context=edit&_embed=true&per_page=5&categories=7`);
  });
  it("reads no patch-note drafts while the site has no Patch Notes category", async () => {
    const { req, urls } = site([["categories?slug=patch-notes", reply([])]]);
    expect(await fetchDrafts("patch-notes", req)).toEqual([]);
    expect(urls()).toHaveLength(1);
  });
  it("reads a board's pending topics", async () => {
    const { req, urls } = site([["cafeteria_topic", reply([post(9, { _embedded: { author: [{ name: "Max" }] } })])]]);
    expect((await fetchPendingTopics(11, req)).map((t) => t.author)).toEqual(["Max"]);
    expect(urls()).toEqual([`${ROOT}/wp/v2/cafeteria_topic?status=pending&context=edit&cafeteria_board=11&_embed=true&per_page=10`]);
  });
  it("reads the held comments with the post each answers and the site's total", async () => {
    const { req, urls } = site([["comments", reply([{ id: 3, post: 101, author_name: "Ana", date: "2026-10-02T11:00:00", content: { rendered: "<p>Hi</p>" } }], { "X-WP-Total": "12" })]]);
    expect(await fetchHeldComments(req)).toEqual({ items: [{ id: 3, postId: 101, author: "Ana", date: "2026-10-02T11:00:00", content: "<p>Hi</p>" }], total: 12 });
    expect(urls()).toEqual([`${ROOT}/wp/v2/comments?status=hold&context=edit&per_page=20`]);
  });
  it("reads the open bug reports with Bug Net's fields, newest first, leaving out the resolved", async () => {
    const bug = (id: number, status: string) => ({ ...post(id), bug_status: status, bug_url: "/temple", bug_environment: "App: 1.0" });
    const { req, urls } = site([["compass_bug", reply([bug(1, "new"), bug(2, "resolved")])]]);
    expect(await fetchBugs(req)).toEqual([{ id: 1, date: "2026-10-01T09:30:00", title: "Post 1", status: "new", route: "/temple", environment: "App: 1.0" }]);
    expect(urls()).toEqual([`${ROOT}/wp/v2/compass_bug?status=draft%2Cpending%2Cpublish&context=edit&per_page=10&orderby=date&order=desc`]);
  });
  it("reads an item's raw words for editing", async () => {
    const { req, urls } = site([["cafeteria_topic/8", reply({ id: 8, title: { raw: "T", rendered: "T" }, content: { raw: "B", rendered: "<p>B</p>" } })]]);
    expect(await fetchWords("topic", 8, req)).toEqual({ title: "T", body: "B" });
    expect(urls()).toEqual([`${ROOT}/wp/v2/cafeteria_topic/8?context=edit`]);
  });
  it("counts drafts and pending topics from the site's total header, zero without one", async () => {
    const { req, urls } = site([["posts?", reply([], { "X-WP-Total": "3" })], ["cafeteria_topic", reply([])]]);
    expect(await countDrafts(req)).toBe(3);
    expect(await countPendingTopics(req)).toBe(0);
    expect(urls()).toEqual([`${ROOT}/wp/v2/posts?status=draft%2Cpending&context=edit&per_page=1`, `${ROOT}/wp/v2/cafeteria_topic?status=pending&context=edit&per_page=1`]);
  });
});
