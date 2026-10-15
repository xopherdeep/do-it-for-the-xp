import { createPinia, setActivePinia } from "pinia";
import { BACKUP_STORES } from "@/lib/services/core/BackupService";
import { useTownHallStore } from "@/lib/store/stores/townHall";
import { townHallFetch, TownHallError } from "@/lib/services/townhall/townHallClient";
import type { PostDraft } from "@/lib/services/townhall/townHallPosts";
import { appVersion } from "@/lib/services/townhall/townHallSite";
import type { TownHallLink, TownHallPost } from "@/lib/services/townhall/townHallTypes";
import { LINK_STATE_KEY, LINK_STATE_TTL_MS, newLinkState } from "@/lib/services/townhall/townHallLinkState";

const mockDb = {
  getLink: jest.fn(),
  saveLink: jest.fn(),
  clearLink: jest.fn(),
  getPosts: jest.fn(),
  savePosts: jest.fn(),
};
jest.mock("@/lib/databases/TownHallDb", () => ({ __esModule: true, getTownHallDb: () => mockDb }));

jest.mock("@/lib/services/townhall/townHallClient", () => {
  const actual = jest.requireActual("@/lib/services/townhall/townHallClient");
  return { __esModule: true, TownHallError: actual.TownHallError, townHallFetch: jest.fn() };
});

let mockNative = false;
jest.mock("@capacitor/core", () => {
  const actual = jest.requireActual("@capacitor/core");
  return { ...actual, Capacitor: { ...actual.Capacitor, getPlatform: () => "web", isNativePlatform: () => mockNative } };
});

/** The phone apps keep the registration's state in Preferences (plain functions: resetAllMocks must not wipe them). */
const mockPreferences = new Map<string, string>();
jest.mock("@capacitor/preferences", () => ({
  __esModule: true,
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: mockPreferences.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => void mockPreferences.set(key, value),
    remove: async ({ key }: { key: string }) => void mockPreferences.delete(key),
  },
}));

jest.mock("uuid", () => {
  let made = 0;
  return { __esModule: true, v4: () => `post-${++made}` };
});

const fetchMock = townHallFetch as jest.Mock;

const SITE = "https://doit.forthexp.com";
const LOGIN = "mom@example.com";
const PASSWORD = "AbCd EfGh IjKl MnOp QrSt UvWx";

const BASIC = { kind: "basic", userLogin: LOGIN, appPassword: PASSWORD };

/** The one-shot state this device handed WordPress when the Game Master left for the authorize page. */
const STATE = "state-1";

/** The device remembers a state, as the Town Hall does on its way to the authorize page. */
const expectReturn = (state = STATE, at = Date.now()) => sessionStorage.setItem(LINK_STATE_KEY, JSON.stringify(newLinkState("gm-1", at, state)));

/** What comes back on the return URL: the state, then WordPress's answer (URLSearchParams turns spaces into "+" and back). */
const linkedQuery = (over: Record<string, string> = {}) =>
  `?${new URLSearchParams({ th_state: STATE, site_url: SITE, user_login: LOGIN, password: PASSWORD, ...over })}`;

const storedLink = (over: Partial<TownHallLink> = {}): TownHallLink => ({
  siteUrl: SITE,
  userLogin: LOGIN,
  appPassword: PASSWORD,
  displayName: "Mom",
  linkedAt: 1760000000000,
  appPasswordUuid: "u-1",
  ...over,
});

/** The site answers users/me and introspect; either can be made to fail. */
const siteAnswers = (opts: { me?: unknown; introspect?: unknown } = {}) => {
  const me = "me" in opts ? opts.me : { name: "Mom" };
  const introspect = "introspect" in opts ? opts.introspect : { uuid: "u-1" };
  fetchMock.mockImplementation(async (path: string) => {
    const answer = path === "wp/v2/users/me" ? me : path.endsWith("/introspect") ? introspect : undefined;
    if (answer instanceof Error) throw answer;
    return { data: answer, headers: { get: () => null } };
  });
};

const requests = () => fetchMock.mock.calls.map(([path, req]) => ({ path, ...req }));

const HERO = { id: "h-1", name: "Ari" };
const NOW = 1760000000000;
const BOARDS_PATH = "wp/v2/cafeteria_board";

const aPost = (over: Partial<TownHallPost> = {}): TownHallPost => ({
  id: "p-1",
  kind: "topic",
  heroId: HERO.id,
  heroName: HERO.name,
  createdAt: 1000,
  status: "queued",
  board: "feature-requests",
  title: "More dragons",
  body: "Please add dragons.",
  ...over,
});

const aComment = (over: Partial<TownHallPost> = {}): TownHallPost =>
  aPost({ id: "c-1", kind: "comment", postId: 7, board: undefined, title: undefined, body: "Nice news!", ...over });

const aBug = (over: Partial<TownHallPost> = {}): TownHallPost =>
  aPost({
    id: "b-1",
    kind: "bug",
    board: undefined,
    title: "Sword is stuck",
    body: "It will not swing.",
    bug: { route: "/battle", environment: "App: dev" },
    ...over,
  });

/** What the site holds for boards: two of the Town Hall's and one it has no use for. */
const WP_BOARDS = [
  { id: 3, slug: "feature-requests", name: "Feature Requests", description: "", count: 0 },
  { id: 4, slug: "ideas-suggestions", name: "Ideas", description: "", count: 0 },
  { id: 9, slug: "garden-chat", name: "Garden", description: "", count: 0 },
];

type PostAnswer = (path: string, req: { auth: unknown; body: any }, count: number) => unknown;

/**
 * The site lists boards and takes posts: each POST gets the next id (101, 102, ...) unless `onPost` answers.
 * An answer that is an Error is thrown, as the client does.
 */
const siteTakesPosts = (opts: { boards?: unknown; onPost?: PostAnswer } = {}) => {
  let count = 0;
  fetchMock.mockImplementation(async (path: string, req: { auth: unknown; body: any }) => {
    const answer =
      path === BOARDS_PATH
        ? "boards" in opts
          ? opts.boards
          : WP_BOARDS
        : await (opts.onPost ?? ((_path, _req, n) => ({ id: 100 + n })))(path, req, ++count);
    if (answer instanceof Error) throw answer;
    return { data: answer, headers: { get: () => null } };
  });
};

const posted = () => requests().filter((request) => request.method === "POST");
const boardRequests = () => requests().filter((request) => request.path === BOARDS_PATH);
const lastSaved = (): TownHallPost[] => {
  const calls = mockDb.savePosts.mock.calls;
  return calls[calls.length - 1][0];
};
const statusesOf = (posts: TownHallPost[]) => posts.map((post) => [post.id, post.status]);

/** A store with the family's link and these stored posts, loaded. */
const storeWith = async (posts: TownHallPost[] = [], opts: { linked?: boolean } = {}) => {
  mockDb.getLink.mockResolvedValue(opts.linked === false ? null : storedLink());
  mockDb.getPosts.mockResolvedValue(posts);
  const store = useTownHallStore();
  await store.init();
  return store;
};

/** A gate a fake site waits at, so a test can hold a send in the air. */
const gate = () => {
  let open: () => void = () => undefined;
  const opened = new Promise<void>((resolve) => (open = resolve));
  return { opened, open };
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("town hall store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.resetAllMocks();
    mockDb.getLink.mockResolvedValue(null);
    mockDb.getPosts.mockResolvedValue([]);
    mockDb.saveLink.mockResolvedValue(undefined);
    mockDb.clearLink.mockResolvedValue(undefined);
    mockDb.savePosts.mockResolvedValue(undefined);
    mockNative = false;
    mockPreferences.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    window.wpApiSettings = undefined;
  });

  describe("completeLink", () => {
    beforeEach(() => expectReturn());

    it("checks the new password, reads the connection's id and stores the link", async () => {
      siteAnswers();
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery())).toBe("linked");

      expect(mockDb.saveLink).toHaveBeenCalledTimes(1);
      const saved = mockDb.saveLink.mock.calls[0][0] as TownHallLink;
      expect(saved).toMatchObject({
        siteUrl: SITE,
        userLogin: LOGIN,
        appPassword: PASSWORD,
        displayName: "Mom",
        appPasswordUuid: "u-1",
      });
      expect(saved.linkedAt).toBeGreaterThan(0);
      expect(store.link).toEqual(saved);
      expect(store.auth).toEqual(BASIC);
      expect(store.lastLinkResult).toBe("linked");

      expect(requests()).toEqual([
        expect.objectContaining({ path: "wp/v2/users/me", query: { context: "edit" }, auth: BASIC }),
        expect.objectContaining({ path: "wp/v2/users/me/application-passwords/introspect", auth: BASIC }),
      ]);
    });

    it("keeps a password with spaces and a login with an accent exactly as WordPress sent them", async () => {
      siteAnswers({ me: { name: "José" } });
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery({ user_login: "josé" }))).toBe("linked");

      expect(store.link).toMatchObject({ userLogin: "josé", appPassword: PASSWORD, displayName: "José" });
      expect(store.auth).toEqual({ kind: "basic", userLogin: "josé", appPassword: PASSWORD });
    });

    it("fails and stores nothing when the site refuses the password", async () => {
      siteAnswers({ me: new TownHallError("unauthorized", "Incorrect password", 401) });
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery())).toBe("failed");

      expect(mockDb.saveLink).not.toHaveBeenCalled();
      expect(store.link).toBeNull();
      expect(store.isLinked).toBe(false);
      expect(store.lastLinkResult).toBe("failed");
      expect(requests().map((r) => r.path)).toEqual(["wp/v2/users/me"]);
    });

    it("fails when the site cannot be reached", async () => {
      siteAnswers({ me: new TownHallError("offline") });
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery())).toBe("failed");
      expect(mockDb.saveLink).not.toHaveBeenCalled();
    });

    it("still links when the connection's id cannot be read", async () => {
      siteAnswers({ introspect: new TownHallError("server", "no introspect", 404) });
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery())).toBe("linked");

      const saved = mockDb.saveLink.mock.calls[0][0] as TownHallLink;
      expect(saved.appPasswordUuid).toBeUndefined();
      expect(store.link?.displayName).toBe("Mom");
    });

    it("greets by the login when the site sends no display name", async () => {
      siteAnswers({ me: { name: "" } });
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery())).toBe("linked");
      expect(store.link?.displayName).toBe(LOGIN);
    });

    it("answers rejected for success=false with the state, with no request and nothing stored", async () => {
      const store = useTownHallStore();

      expect(await store.completeLink(`?th_state=${STATE}&success=false`)).toBe("rejected");

      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockDb.saveLink).not.toHaveBeenCalled();
      expect(store.link).toBeNull();
      expect(store.lastLinkResult).toBe("rejected");
    });

    it("answers none for an ordinary visit and leaves the last result alone", async () => {
      siteAnswers();
      const store = useTownHallStore();
      await store.completeLink(linkedQuery());

      expect(await store.completeLink("")).toBe("none");

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(store.lastLinkResult).toBe("linked");
      expect(store.isLinked).toBe(true);
    });

    it("refuses a return that names another site: no request, nothing stored", async () => {
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery({ site_url: "https://evil.example" }))).toBe("failed");

      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockDb.saveLink).not.toHaveBeenCalled();
      expect(store.link).toBeNull();
      expect(store.lastLinkResult).toBe("failed");
    });

    it("refuses a site_url that is not an address", async () => {
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery({ site_url: "not a url" }))).toBe("failed");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockDb.saveLink).not.toHaveBeenCalled();
    });

    it("accepts the configured site spelled with a trailing slash or capitals, and stores the configured site", async () => {
      siteAnswers();
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery({ site_url: "https://DOIT.forthexp.com/" }))).toBe("linked");
      expect(store.link?.siteUrl).toBe(SITE);
    });

    it("waits for the stored link to load, so a late load cannot wipe the new one", async () => {
      siteAnswers();
      let release: (link: TownHallLink | null) => void = () => undefined;
      mockDb.getLink.mockReturnValue(new Promise((resolve) => (release = resolve)));
      const store = useTownHallStore();
      const init = store.init();

      const linking = store.completeLink(linkedQuery());
      await new Promise((resolve) => setTimeout(resolve, 0));
      // while the stored link is still loading, nothing is checked and nothing is saved
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockDb.saveLink).not.toHaveBeenCalled();

      release(storedLink({ userLogin: "old@example.com" }));
      await init;

      expect(await linking).toBe("linked");
      expect(store.link?.userLogin).toBe(LOGIN);
      expect(store.auth).toEqual(BASIC);
    });
  });

  describe("completeLink accepts only the return this device asked for (the one-shot state)", () => {
    const nothingHappened = (store: ReturnType<typeof useTownHallStore>) => {
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockDb.saveLink).not.toHaveBeenCalled();
      expect(store.link).toBeNull();
      expect(store.lastLinkResult).toBeNull();
    };

    it("ignores a return with no state: no request, nothing stored, nothing said", async () => {
      siteAnswers();
      expectReturn();
      const store = useTownHallStore();

      const { th_state: _state, ...withoutState } = Object.fromEntries(new URLSearchParams(linkedQuery()));
      expect(await store.completeLink(`?${new URLSearchParams(withoutState)}`)).toBe("none");

      nothingHappened(store);
    });

    it("ignores a return with someone else's state, and the parent's own return still links after it", async () => {
      siteAnswers();
      expectReturn();
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery({ th_state: "crafted" }))).toBe("none");
      nothingHappened(store);

      expect(await store.completeLink(linkedQuery())).toBe("linked");
    });

    it("ignores a return when this device never left for the site (a crafted link)", async () => {
      siteAnswers();
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery())).toBe("none");

      nothingHappened(store);
    });

    it("ignores a return that comes back after the state expired", async () => {
      siteAnswers();
      expectReturn(STATE, Date.now() - LINK_STATE_TTL_MS - 1);
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery())).toBe("none");

      nothingHappened(store);
      expect(sessionStorage.getItem(LINK_STATE_KEY)).toBeNull();
    });

    it("ignores the same return a second time (replayed): the state is used up", async () => {
      siteAnswers();
      expectReturn();
      const store = useTownHallStore();
      expect(await store.completeLink(linkedQuery())).toBe("linked");
      fetchMock.mockClear();
      mockDb.saveLink.mockClear();

      expect(await store.completeLink(linkedQuery({ user_login: "stranger", password: "xxxx" }))).toBe("none");

      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockDb.saveLink).not.toHaveBeenCalled();
      expect(store.link?.userLogin).toBe(LOGIN);
    });

    it("ignores a refusal without the state, so 'Maybe another time' is never said for nothing", async () => {
      expectReturn();
      const store = useTownHallStore();

      expect(await store.completeLink("?success=false")).toBe("none");
      expect(await store.completeLink("?th_state=crafted&success=false")).toBe("none");

      expect(store.lastLinkResult).toBeNull();
    });

    it("phone apps: claims the state the app kept in Preferences before it was killed", async () => {
      mockNative = true;
      mockPreferences.set(LINK_STATE_KEY, JSON.stringify(newLinkState("gm-1", Date.now(), "native-state")));
      siteAnswers();
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery({ th_state: "web-state" }))).toBe("none");
      expect(await store.completeLink(linkedQuery({ th_state: "native-state" }))).toBe("linked");

      expect(mockPreferences.has(LINK_STATE_KEY)).toBe(false);
      expect(store.link?.userLogin).toBe(LOGIN);
    });

    it("beginLink remembers a state for the Town Hall to put on the authorize page's addresses, and clears the last result", async () => {
      const store = useTownHallStore();
      store.lastLinkResult = "failed";

      const state = await store.beginLink("gm-1");

      expect(store.lastLinkResult).toBeNull();
      expect(JSON.parse(sessionStorage.getItem(LINK_STATE_KEY) ?? "null")).toMatchObject({ state, heroId: "gm-1" });
      siteAnswers();
      expect(await store.completeLink(linkedQuery({ th_state: state }))).toBe("linked");
    });
  });

  describe("linking again", () => {
    beforeEach(() => expectReturn());

    const siteWithConnection = (uuid: string) => {
      fetchMock.mockImplementation(async (path: string) => {
        const answer = path === "wp/v2/users/me" ? { name: "Mom" } : path.endsWith("/introspect") ? { uuid } : { deleted: true };
        return { data: answer, headers: { get: () => null } };
      });
    };

    it("removes the previous connection from the site with the previous sign-in, once the new one is kept", async () => {
      mockDb.getLink.mockResolvedValue(storedLink({ userLogin: "old@example.com", appPassword: "old pass", appPasswordUuid: "u-old" }));
      siteWithConnection("u-new");
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery())).toBe("linked");

      const removal = requests().find((request) => request.method === "DELETE");
      expect(removal).toEqual(
        expect.objectContaining({
          path: "wp/v2/users/me/application-passwords/u-old",
          auth: { kind: "basic", userLogin: "old@example.com", appPassword: "old pass" },
        })
      );
      expect(store.link?.appPasswordUuid).toBe("u-new");
    });

    it("still links when the site will not remove the previous connection", async () => {
      mockDb.getLink.mockResolvedValue(storedLink({ appPasswordUuid: "u-old" }));
      fetchMock.mockImplementation(async (path: string, req: { method?: string }) => {
        if (req?.method === "DELETE") throw new TownHallError("unauthorized", "revoked", 401);
        const answer = path === "wp/v2/users/me" ? { name: "Mom" } : { uuid: "u-new" };
        return { data: answer, headers: { get: () => null } };
      });
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery())).toBe("linked");
      expect(store.link?.appPasswordUuid).toBe("u-new");
    });

    it("leaves the connection alone when the site hands back the same one, or the old one has no id", async () => {
      mockDb.getLink.mockResolvedValue(storedLink({ appPasswordUuid: "u-1" }));
      siteWithConnection("u-1");
      const store = useTownHallStore();
      expect(await store.completeLink(linkedQuery())).toBe("linked");
      expect(requests().some((request) => request.method === "DELETE")).toBe(false);
    });

    it("never sends a link kept for another site to this one", async () => {
      mockDb.getLink.mockResolvedValue(storedLink({ siteUrl: "http://localhost:8090/doit", appPasswordUuid: "u-other" }));
      siteWithConnection("u-new");
      const store = useTownHallStore();

      expect(await store.completeLink(linkedQuery())).toBe("linked");
      expect(requests().some((request) => request.method === "DELETE")).toBe(false);
    });
  });

  describe("unlink", () => {
    const linked = async () => {
      mockDb.getLink.mockResolvedValue(storedLink());
      const store = useTownHallStore();
      await store.init();
      return store;
    };

    it("deletes the connection on the site and forgets it here", async () => {
      fetchMock.mockResolvedValue({ data: { deleted: true }, headers: { get: () => null } });
      const store = await linked();

      expect(await store.unlink()).toBe("forgotten");

      expect(requests()).toEqual([
        expect.objectContaining({ path: "wp/v2/users/me/application-passwords/u-1", method: "DELETE", auth: BASIC }),
      ]);
      expect(mockDb.clearLink).toHaveBeenCalledTimes(1);
      expect(store.link).toBeNull();
      expect(store.isLinked).toBe(false);
      expect(store.auth).toEqual({ kind: "none" });
    });

    it("forgets it here even when the site refuses, and says only here", async () => {
      fetchMock.mockRejectedValue(new TownHallError("unauthorized", "revoked", 401));
      const store = await linked();

      expect(await store.unlink()).toBe("removed-here-only");

      expect(mockDb.clearLink).toHaveBeenCalledTimes(1);
      expect(store.link).toBeNull();
    });

    it("forgets it here even when the attempt to ask the site breaks unexpectedly", async () => {
      fetchMock.mockRejectedValue(new Error("something nobody planned for"));
      const store = await linked();

      expect(await store.unlink()).toBe("removed-here-only");

      expect(mockDb.clearLink).toHaveBeenCalledTimes(1);
      expect(store.link).toBeNull();
      expect(store.isLinked).toBe(false);
    });

    it("forgets it here without asking the site when the connection's id was never read", async () => {
      mockDb.getLink.mockResolvedValue(storedLink({ appPasswordUuid: undefined }));
      const store = useTownHallStore();
      await store.init();

      expect(await store.unlink()).toBe("removed-here-only");

      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockDb.clearLink).toHaveBeenCalledTimes(1);
      expect(store.link).toBeNull();
    });

    it("has nothing to do without a link", async () => {
      const store = useTownHallStore();

      expect(await store.unlink()).toBe("forgotten");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockDb.clearLink).not.toHaveBeenCalled();
    });

    it("forgetLink clears the link without contacting the site", async () => {
      const store = await linked();

      await store.forgetLink();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockDb.clearLink).toHaveBeenCalledTimes(1);
      expect(store.link).toBeNull();
      expect(store.isLinked).toBe(false);
    });
  });

  describe("fetchProfile", () => {
    const linked = async () => {
      mockDb.getLink.mockResolvedValue(storedLink());
      return useTownHallStore();
    };

    it("is null when no one is linked, and asks nothing", async () => {
      expect(await useTownHallStore().fetchProfile()).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("reads the name and email from the site with the link's sign-in", async () => {
      fetchMock.mockResolvedValue({ data: { name: " Mom Pollard ", email: "mom@example.com" }, headers: { get: () => null } });
      const store = await linked();

      expect(await store.fetchProfile()).toEqual({ login: LOGIN, displayName: "Mom Pollard", email: "mom@example.com" });
      expect(requests()).toEqual([expect.objectContaining({ path: "wp/v2/users/me", auth: BASIC, query: { context: "edit" } })]);
      expect(mockDb.saveLink).not.toHaveBeenCalled();
    });

    it("is null when the site refuses", async () => {
      fetchMock.mockRejectedValue(new TownHallError("unauthorized", "no", 401));
      expect(await (await linked()).fetchProfile()).toBeNull();
    });

    it("rethrows an error that is not the site's", async () => {
      fetchMock.mockRejectedValue(new TypeError("boom"));
      await expect((await linked()).fetchProfile()).rejects.toThrow("boom");
    });
  });

  describe("init", () => {
    it("loads the stored link and posts once", async () => {
      const post: TownHallPost = {
        id: "p-1",
        kind: "comment",
        heroId: "h-1",
        heroName: "Ari",
        createdAt: 1,
        status: "queued",
        postId: 7,
        body: "Nice news!",
      };
      mockDb.getLink.mockResolvedValue(storedLink());
      mockDb.getPosts.mockResolvedValue([post]);
      const store = useTownHallStore();

      await Promise.all([store.init(), store.init()]);
      await store.init();

      expect(mockDb.getLink).toHaveBeenCalledTimes(1);
      expect(mockDb.getPosts).toHaveBeenCalledTimes(1);
      expect(store.link).toEqual(storedLink());
      expect(store.posts).toEqual([post]);
      expect(store.isLinked).toBe(true);
    });

    it("tries again after a failed load", async () => {
      mockDb.getLink.mockRejectedValueOnce(new Error("storage is down"));
      const store = useTownHallStore();

      await expect(store.init()).rejects.toThrow("storage is down");
      await store.init();

      expect(mockDb.getLink).toHaveBeenCalledTimes(2);
    });
  });

  describe("posts left behind by a closed app", () => {
    it("turns a post that was sending back into queued, keeps its error, and saves that", async () => {
      const store = await storeWith([aPost({ id: "a", status: "sending", error: "offline" }), aPost({ id: "b", status: "sent", remoteId: 5 })]);

      expect(statusesOf(store.posts)).toEqual([["a", "queued"], ["b", "sent"]]);
      expect(store.posts[0].error).toBe("offline");
      expect(lastSaved()).toEqual(store.posts);
    });

    it("saves nothing when no post needed putting back", async () => {
      await storeWith([aPost(), aComment({ id: "c", status: "awaiting-gm" })]);

      expect(mockDb.savePosts).not.toHaveBeenCalled();
    });
  });

  describe("submit", () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("keeps a hero's topic for the Game Master and sends nothing", async () => {
      const store = await storeWith();
      const topic: PostDraft = { kind: "topic", board: "feature-requests", title: "More dragons", body: "Please add dragons." };

      const result = await store.submit(topic, HERO, false, "/town-hall");

      expect(result.problem).toBeNull();
      expect(result.post).toMatchObject({
        kind: "topic",
        heroId: "h-1",
        heroName: "Ari",
        status: "awaiting-gm",
        board: "feature-requests",
        title: "More dragons",
        body: "Please add dragons.",
      });
      expect(result.post?.id).toEqual(expect.any(String));
      expect(result.post?.createdAt).toBeGreaterThan(0);
      expect(store.posts).toEqual([result.post]);
      expect(lastSaved()).toEqual([result.post]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("queues a Game Master's own comment straight away", async () => {
      const store = await storeWith();

      const { post } = await store.submit({ kind: "comment", postId: 7, body: "Nice news!" }, { id: "gm", name: "Mom" }, true, "/town-hall");

      expect(post).toMatchObject({ kind: "comment", heroId: "gm", status: "queued", postId: 7, body: "Nice news!" });
      expect(post?.bug).toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("queues a bug report with the screen and the device it came from", async () => {
      jest.spyOn(Date, "now").mockReturnValue(NOW);
      const store = await storeWith();

      const { post } = await store.submit({ kind: "bug", title: "Sword is stuck", body: "It will not swing." }, HERO, false, "/battle");

      expect(post).toMatchObject({
        kind: "bug",
        status: "queued",
        createdAt: NOW,
        bug: {
          route: "/battle",
          environment: `App: ${appVersion()}\nScreen: /battle\nDevice: web, ${navigator.userAgent}\nTime: 2025-10-09T08:53:20.000Z`,
        },
      });
    });

    it("gives back what is wrong with the draft and stores nothing", async () => {
      const store = await storeWith();

      expect(await store.submit({ kind: "comment", postId: 7, body: "   " }, HERO, false, "/town-hall")).toEqual({ problem: "Write something first." });
      expect(await store.submit({ kind: "topic", title: "Hello", body: "Hi" }, HERO, false, "/town-hall")).toEqual({ problem: "Pick a board." });

      expect(store.posts).toEqual([]);
      expect(mockDb.savePosts).not.toHaveBeenCalled();
    });

    it("waits for the stored posts to load, so a late load cannot wipe the new one", async () => {
      let release: (posts: TownHallPost[]) => void = () => undefined;
      mockDb.getPosts.mockReturnValue(new Promise((resolve) => (release = resolve)));
      const store = useTownHallStore();
      const loading = store.init();

      const submitting = store.submit({ kind: "comment", postId: 7, body: "Nice!" }, HERO, true, "/town-hall");
      await tick();
      expect(mockDb.savePosts).not.toHaveBeenCalled();

      release([aPost({ id: "old", status: "sent", remoteId: 1 })]);
      await loading;
      const { post } = await submitting;

      expect(statusesOf(store.posts)).toEqual([["old", "sent"], [post?.id, "queued"]]);
      expect(lastSaved()).toEqual(store.posts);
    });
  });

  describe("approve, reject, dismiss and resubmit", () => {
    it("approve lets a waiting post into the queue and saves it", async () => {
      const store = await storeWith([aPost({ id: "a", status: "awaiting-gm" })]);

      await store.approve("a");

      expect(store.posts[0].status).toBe("queued");
      expect(lastSaved()).toEqual(store.posts);
    });

    it("reject keeps a waiting post off the site and saves it", async () => {
      const store = await storeWith([aPost({ id: "a", status: "awaiting-gm" })]);

      await store.reject("a");

      expect(store.posts[0].status).toBe("rejected");
      expect(lastSaved()).toEqual(store.posts);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("change nothing, and write nothing, for a post that is not waiting or not there", async () => {
      const store = await storeWith([aPost({ id: "q" })]);

      await store.approve("q");
      await store.reject("q");
      await store.approve("ghost");
      await store.reject("ghost");

      expect(statusesOf(store.posts)).toEqual([["q", "queued"]]);
      expect(mockDb.savePosts).not.toHaveBeenCalled();
    });

    it("dismiss removes a rejected, failed or sent post and keeps the others", async () => {
      const statuses = ["awaiting-gm", "queued", "sent", "rejected", "failed"] as const;
      const store = await storeWith(statuses.map((status) => aPost({ id: status, status })));

      for (const id of [...statuses, "ghost"]) await store.dismiss(id);

      expect(statusesOf(store.posts)).toEqual([["awaiting-gm", "awaiting-gm"], ["queued", "queued"]]);
      expect(lastSaved()).toEqual(store.posts);
    });

    it("resubmit gives a failed post new text and starts it again, as a hero's or a Game Master's", async () => {
      const failed = aPost({ id: "f", status: "failed", error: "Title is required", createdAt: 5 });
      const store = await storeWith([failed, { ...failed, id: "g" }]);
      const better: PostDraft = { kind: "topic", board: "feature-requests", title: "More dragons, please", body: "A lot more." };

      expect(await store.resubmit("f", better, false)).toBeNull();
      expect(await store.resubmit("g", better, true)).toBeNull();

      const retitled = { title: "More dragons, please", body: "A lot more." };
      expect(store.posts[0]).toEqual(aPost({ id: "f", createdAt: 5, status: "awaiting-gm", ...retitled }));
      expect(store.posts[1]).toEqual(aPost({ id: "g", createdAt: 5, status: "queued", ...retitled }));
      expect(lastSaved()).toEqual(store.posts);
    });

    it("resubmit hands back what is wrong with the new text and keeps the post as it was", async () => {
      const store = await storeWith([aPost({ id: "f", status: "failed", error: "Title is required" })]);

      expect(await store.resubmit("f", { kind: "topic", board: "feature-requests", title: "Hi", body: " " }, false)).toBe("Write something first.");

      expect(store.posts[0]).toMatchObject({ status: "failed", error: "Title is required" });
      expect(mockDb.savePosts).not.toHaveBeenCalled();
    });

    it("resubmit leaves a post that has not failed, or is not there, alone", async () => {
      const store = await storeWith([aPost({ id: "q" })]);
      const draft: PostDraft = { kind: "topic", board: "feature-requests", title: "New", body: "New text." };

      expect(await store.resubmit("q", draft, false)).toBeNull();
      expect(await store.resubmit("ghost", draft, false)).toBeNull();

      expect(store.posts[0]).toEqual(aPost({ id: "q" }));
      expect(mockDb.savePosts).not.toHaveBeenCalled();
    });
  });

  describe("flush", () => {
    it("makes no request when the device is not linked", async () => {
      siteTakesPosts();
      const store = await storeWith([aPost()], { linked: false });

      expect(await store.flush()).toEqual({ sent: 0, unlinked: false, forbidden: false });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(store.posts[0].status).toBe("queued");
    });

    it("sends through the website's session when the app is hosted on the Town Hall site", async () => {
      window.wpApiSettings = { root: "https://doit.forthexp.com/wp-json", nonce: "n1" };
      siteTakesPosts();
      const store = await storeWith([aComment()], { linked: false });

      expect(await store.flush()).toEqual({ sent: 1, unlinked: false, forbidden: false });

      expect(posted()).toEqual([expect.objectContaining({ path: "wp/v2/comments", auth: { kind: "nonce", nonce: "n1" } })]);
    });

    it("makes no request when nothing is queued", async () => {
      siteTakesPosts();
      const store = await storeWith([
        aPost({ id: "a", status: "awaiting-gm" }),
        aPost({ id: "b", status: "sent", remoteId: 4 }),
        aPost({ id: "c", status: "rejected" }),
        aPost({ id: "d", status: "failed", error: "No" }),
      ]);

      expect(await store.flush()).toEqual({ sent: 0, unlinked: false, forbidden: false });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("sends an approved topic to the cafeteria with the family's sign-in and the board's id", async () => {
      siteTakesPosts();
      const store = await storeWith();
      const topic: PostDraft = { kind: "topic", board: "feature-requests", title: "More dragons", body: "Please add dragons." };
      const { post } = await store.submit(topic, HERO, false, "/town-hall");
      await store.approve(post!.id);

      expect(await store.flush()).toEqual({ sent: 1, unlinked: false, forbidden: false });

      expect(requests()).toEqual([
        expect.objectContaining({ path: BOARDS_PATH, auth: BASIC }),
        {
          path: "wp/v2/cafeteria_topic",
          auth: BASIC,
          method: "POST",
          body: {
            title: "More dragons",
            content: "Please add dragons.\n\n— Ari, from Do It For The XP",
            status: "pending",
            cafeteria_board: [3],
          },
        },
      ]);
      expect(store.posts[0]).toMatchObject({ id: post!.id, status: "sent", remoteId: 101 });
      expect(store.posts[0].error).toBeUndefined();
      expect(lastSaved()).toEqual(store.posts);
    });

    it("sends the oldest first, and asks for the boards only when a topic is waiting", async () => {
      siteTakesPosts();
      const store = await storeWith([aBug({ createdAt: 2 }), aComment({ createdAt: 1 })]);

      expect(await store.flush()).toEqual({ sent: 2, unlinked: false, forbidden: false });

      expect(posted().map((request) => request.path)).toEqual(["wp/v2/comments", "wp/v2/compass_bug"]);
      expect(posted()[0].body).toMatchObject({ post: 7, content: "Nice news!\n\n— Ari, from Do It For The XP" });
      expect(posted()[1].body).toMatchObject({ title: "Sword is stuck", bug_url: "/battle", bug_environment: "App: dev" });
      expect(boardRequests()).toHaveLength(0);
    });

    it("asks for the boards once, however many topics go out", async () => {
      siteTakesPosts();
      const store = await storeWith([
        aPost({ id: "a", createdAt: 1 }),
        aPost({ id: "b", createdAt: 2, board: "ideas-suggestions" }),
        aPost({ id: "c", createdAt: 3 }),
      ]);

      expect(await store.flush()).toMatchObject({ sent: 3 });

      expect(boardRequests()).toHaveLength(1);
      expect(posted().map((request) => request.body.cafeteria_board)).toEqual([[3], [4], [3]]);
    });

    it("sends each post once when flush is called twice at the same time", async () => {
      const site = gate();
      siteTakesPosts({
        onPost: async (_path, _req, n) => {
          await site.opened;
          return { id: 100 + n };
        },
      });
      const store = await storeWith([aPost({ id: "a", createdAt: 1 }), aComment({ id: "b", createdAt: 2 })]);

      const first = store.flush();
      const second = store.flush();
      await tick();
      site.open();
      const [one, two] = await Promise.all([first, second]);

      expect(posted().map((request) => request.path)).toEqual(["wp/v2/cafeteria_topic", "wp/v2/comments"]);
      expect(boardRequests()).toHaveLength(1);
      expect(one).toEqual({ sent: 2, unlinked: false, forbidden: false });
      expect(two).toBe(one);
      expect(statusesOf(store.posts)).toEqual([["a", "sent"], ["b", "sent"]]);
    });

    it("starts a new flush once the last one is done", async () => {
      siteTakesPosts();
      const store = await storeWith([aComment({ id: "a", createdAt: 1 })]);
      expect(await store.flush()).toMatchObject({ sent: 1 });

      await store.submit({ kind: "comment", postId: 8, body: "And this!" }, HERO, true, "/town-hall");

      expect(await store.flush()).toMatchObject({ sent: 1 });
      expect(await store.flush()).toMatchObject({ sent: 0 });
      expect(posted()).toHaveLength(2);
    });

    it("sends a post approved while it is busy, and shows the post in the air as sending", async () => {
      const site = gate();
      siteTakesPosts({
        onPost: async (_path, _req, n) => {
          if (n === 1) await site.opened;
          return { id: 100 + n };
        },
      });
      const store = await storeWith([aComment({ id: "a", createdAt: 1 }), aComment({ id: "w", createdAt: 2, status: "awaiting-gm" })]);

      const flushing = store.flush();
      await tick();
      expect(statusesOf(store.posts)).toEqual([["a", "sending"], ["w", "awaiting-gm"]]);
      await store.approve("w");
      await store.dismiss("a");
      site.open();

      expect(await flushing).toEqual({ sent: 2, unlinked: false, forbidden: false });
      expect(statusesOf(store.posts)).toEqual([["a", "sent"], ["w", "sent"]]);
      expect(posted()).toHaveLength(2);
    });

    it("saves after each post, so a closed app loses at most the one in the air", async () => {
      let savedWhenSecondWentOut: unknown;
      siteTakesPosts({
        onPost: (_path, _req, n) => {
          if (n === 2) savedWhenSecondWentOut = statusesOf(lastSaved());
          return { id: 100 + n };
        },
      });
      const store = await storeWith([aComment({ id: "a", createdAt: 1 }), aComment({ id: "b", createdAt: 2 })]);

      await store.flush();

      expect(savedWhenSecondWentOut).toEqual([["a", "sent"], ["b", "queued"]]);
      expect(mockDb.savePosts).toHaveBeenCalledTimes(2);
      expect(statusesOf(lastSaved())).toEqual([["a", "sent"], ["b", "sent"]]);
    });

    describe("when the site refuses the sign-in (401)", () => {
      it("forgets the link, keeps the post queued, stops, and says unlinked", async () => {
        siteTakesPosts({ onPost: () => new TownHallError("unauthorized", "Invalid password", 401) });
        const store = await storeWith([aComment({ id: "a", createdAt: 1 }), aComment({ id: "b", createdAt: 2 })]);

        expect(await store.flush()).toEqual({ sent: 0, unlinked: true, forbidden: false });

        expect(mockDb.clearLink).toHaveBeenCalledTimes(1);
        expect(store.link).toBeNull();
        expect(store.isLinked).toBe(false);
        expect(posted()).toHaveLength(1);
        expect(statusesOf(store.posts)).toEqual([["a", "queued"], ["b", "queued"]]);
        expect(store.posts[0].error).toBe("unauthorized");
        expect(lastSaved()).toEqual(store.posts);
      });

      it("leaves a stored link for another site alone when the website's session is what was refused", async () => {
        window.wpApiSettings = { root: "https://doit.forthexp.com/wp-json", nonce: "n1" };
        siteTakesPosts({ onPost: () => new TownHallError("unauthorized", "Cookie check failed", 401) });
        mockDb.getLink.mockResolvedValue(storedLink({ siteUrl: "https://other.example" }));
        mockDb.getPosts.mockResolvedValue([aComment({ id: "a", createdAt: 1 }), aComment({ id: "b", createdAt: 2 })]);
        const store = useTownHallStore();
        await store.init();

        expect(await store.flush()).toEqual({ sent: 0, unlinked: false, forbidden: false });

        expect(mockDb.clearLink).not.toHaveBeenCalled();
        expect(store.link).toEqual(storedLink({ siteUrl: "https://other.example" }));
        expect(posted()).toHaveLength(1);
        expect(statusesOf(store.posts)).toEqual([["a", "queued"], ["b", "queued"]]);
      });
    });

    it("says forbidden when the account may not post, keeps that post queued, and goes on to the next", async () => {
      siteTakesPosts({ onPost: (_path, _req, n) => (n === 1 ? new TownHallError("forbidden", "Sorry, you are not allowed", 403) : { id: 150 }) });
      const store = await storeWith([aPost({ id: "a", createdAt: 1 }), aComment({ id: "b", createdAt: 2 })]);

      expect(await store.flush()).toEqual({ sent: 1, unlinked: false, forbidden: true });

      expect(statusesOf(store.posts)).toEqual([["a", "queued"], ["b", "sent"]]);
      expect(store.posts[0].error).toBe("forbidden");
      expect(mockDb.clearLink).not.toHaveBeenCalled();
    });

    describe("WordPress's refusals of a comment, by its error code", () => {
      const flood = () => new TownHallError("invalid", "You are posting comments too quickly. Slow down.", 400, "comment_flood");

      it("a flood keeps the comment queued, sends no more comments in this flush, and still sends the topic and the bug", async () => {
        siteTakesPosts({ onPost: (path) => (path === "wp/v2/comments" ? flood() : { id: 150 }) });
        const store = await storeWith([
          aComment({ id: "c-1", createdAt: 1 }),
          aComment({ id: "c-2", createdAt: 2 }),
          aPost({ id: "t-1", createdAt: 3 }),
          aBug({ id: "b-1", createdAt: 4 }),
        ]);

        expect(await store.flush()).toEqual({ sent: 2, unlinked: false, forbidden: false });

        expect(posted().map((request) => request.path)).toEqual(["wp/v2/comments", "wp/v2/cafeteria_topic", "wp/v2/compass_bug"]);
        expect(statusesOf(store.posts)).toEqual([
          ["c-1", "queued"],
          ["c-2", "queued"],
          ["t-1", "sent"],
          ["b-1", "sent"],
        ]);
        expect(mockDb.clearLink).not.toHaveBeenCalled();
      });

      it("a flood holds comments for that flush only: the next flush tries them again", async () => {
        let flooding = true;
        siteTakesPosts({ onPost: () => (flooding ? flood() : { id: 151 }) });
        const store = await storeWith([aComment({ id: "c-1", createdAt: 1 }), aComment({ id: "c-2", createdAt: 2 })]);
        await store.flush();
        flooding = false;

        expect(await store.flush()).toEqual({ sent: 2, unlinked: false, forbidden: false });
        expect(statusesOf(store.posts)).toEqual([
          ["c-1", "sent"],
          ["c-2", "sent"],
        ]);
      });

      it("a duplicate (a retry after a lost answer) counts as sent, so it does not wait forever", async () => {
        siteTakesPosts({ onPost: () => new TownHallError("server", "Duplicate comment detected", 409, "comment_duplicate") });
        const store = await storeWith([aComment({ id: "c-1", error: "offline" })]);

        expect(await store.flush()).toEqual({ sent: 1, unlinked: false, forbidden: false });

        expect(store.posts[0]).toMatchObject({ status: "sent", remoteId: 0 });
        expect(store.posts[0].error).toBeUndefined();
      });

      it("a closed thread or an unpublished post fails that comment with the site's words: never 'forbidden', the link stays, the rest go", async () => {
        const refusals: Record<number, TownHallError> = {
          1: new TownHallError("forbidden", "Sorry, comments are closed for this item.", 403, "rest_comment_closed"),
          2: new TownHallError("forbidden", "Sorry, you are not allowed to create a comment on this post.", 403, "rest_comment_draft_post"),
        };
        siteTakesPosts({ onPost: (_path, _req, n) => refusals[n] ?? { id: 152 } });
        const store = await storeWith([
          aComment({ id: "c-1", createdAt: 1 }),
          aComment({ id: "c-2", createdAt: 2 }),
          aPost({ id: "t-1", createdAt: 3 }),
        ]);

        expect(await store.flush()).toEqual({ sent: 1, unlinked: false, forbidden: false });

        expect(statusesOf(store.posts)).toEqual([
          ["c-1", "failed"],
          ["c-2", "failed"],
          ["t-1", "sent"],
        ]);
        expect(store.posts[0].error).toBe("Sorry, comments are closed for this item.");
        expect(store.posts[1].error).toBe("Sorry, you are not allowed to create a comment on this post.");
        expect(mockDb.clearLink).not.toHaveBeenCalled();
        expect(store.isLinked).toBe(true);
      });
    });

    it("fails a post the site refuses with the site's own words, and sends the rest", async () => {
      siteTakesPosts({ onPost: (_path, _req, n) => (n === 1 ? new TownHallError("invalid", "Title is required", 400) : { id: 150 }) });
      const store = await storeWith([aComment({ id: "a", createdAt: 1 }), aComment({ id: "b", createdAt: 2 })]);

      expect(await store.flush()).toEqual({ sent: 1, unlinked: false, forbidden: false });

      expect(statusesOf(store.posts)).toEqual([["a", "failed"], ["b", "sent"]]);
      expect(store.posts[0].error).toBe("Title is required");
    });

    it("stops at the first post that cannot get through and keeps the rest queued", async () => {
      siteTakesPosts({ onPost: () => new TownHallError("offline") });
      const store = await storeWith([aComment({ id: "a", createdAt: 1 }), aComment({ id: "b", createdAt: 2 }), aComment({ id: "c", createdAt: 3 })]);

      expect(await store.flush()).toEqual({ sent: 0, unlinked: false, forbidden: false });

      expect(posted()).toHaveLength(1);
      expect(statusesOf(store.posts)).toEqual([["a", "queued"], ["b", "queued"], ["c", "queued"]]);
      expect(store.posts[0].error).toBe("offline");
    });

    it("keeps a bug queued while Bug Net is not active on the site, and still sends the rest", async () => {
      siteTakesPosts({ onPost: (path) => (path === "wp/v2/compass_bug" ? new TownHallError("server", "No route was found", 404) : { id: 150 }) });
      const store = await storeWith([aBug({ createdAt: 1 }), aComment({ createdAt: 2 })]);

      expect(await store.flush()).toEqual({ sent: 1, unlinked: false, forbidden: false });

      expect(statusesOf(store.posts)).toEqual([["b-1", "queued"], ["c-1", "sent"]]);
      expect(store.posts[0].error).toBe("server");
    });

    it("treats an error nobody planned for like a server error: the post is queued again and the flush goes on", async () => {
      siteTakesPosts({ onPost: (_path, _req, n) => (n === 1 ? new TypeError("something nobody planned for") : { id: 150 }) });
      const store = await storeWith([aComment({ id: "a", createdAt: 1 }), aComment({ id: "b", createdAt: 2 })]);

      expect(await store.flush()).toEqual({ sent: 1, unlinked: false, forbidden: false });

      expect(statusesOf(store.posts)).toEqual([["a", "queued"], ["b", "sent"]]);
      expect(store.posts[0].error).toBe("server");
    });

    it("does not count a reply with no id as sent", async () => {
      siteTakesPosts({ onPost: () => null });
      const store = await storeWith([aComment()]);

      expect(await store.flush()).toEqual({ sent: 0, unlinked: false, forbidden: false });

      expect(statusesOf(store.posts)).toEqual([["c-1", "queued"]]);
      expect(store.posts[0].error).toBe("server");
    });

    it("fails a topic for a board the site does not have, and still sends the next post", async () => {
      siteTakesPosts();
      const store = await storeWith([aPost({ id: "t", board: "suggestion-box", createdAt: 1 }), aComment({ id: "c", createdAt: 2 })]);

      expect(await store.flush()).toEqual({ sent: 1, unlinked: false, forbidden: false });

      expect(statusesOf(store.posts)).toEqual([["t", "failed"], ["c", "sent"]]);
      expect(store.posts[0].error).toBe('The board "suggestion-box" has no id on the site.');
      expect(posted().map((request) => request.path)).toEqual(["wp/v2/comments"]);
      expect(lastSaved()).toEqual(store.posts);
    });

    it("fails a comment that lost the post it answers, and still sends the next post", async () => {
      siteTakesPosts();
      const store = await storeWith([aComment({ id: "lost", postId: undefined, createdAt: 1 }), aComment({ id: "ok", createdAt: 2 })]);

      expect(await store.flush()).toEqual({ sent: 1, unlinked: false, forbidden: false });

      expect(statusesOf(store.posts)).toEqual([["lost", "failed"], ["ok", "sent"]]);
      expect(store.posts[0].error).toBe("A comment needs the post it answers.");
    });

    it.each(["offline", "server"] as const)("stops without throwing when the boards cannot be read (%s)", async (code) => {
      siteTakesPosts({ boards: new TownHallError(code, "No luck", code === "server" ? 503 : undefined) });
      const store = await storeWith([aPost({ id: "a", createdAt: 1 }), aPost({ id: "b", createdAt: 2 })]);

      expect(await store.flush()).toEqual({ sent: 0, unlinked: false, forbidden: false });

      expect(boardRequests()).toHaveLength(1);
      expect(posted()).toHaveLength(0);
      expect(statusesOf(store.posts)).toEqual([["a", "queued"], ["b", "queued"]]);
    });

    it("sends what comes before a topic when the boards cannot be read for it", async () => {
      siteTakesPosts({ boards: new TownHallError("offline") });
      const store = await storeWith([aPost({ id: "t", createdAt: 2 }), aComment({ id: "c", createdAt: 1 })]);

      expect(await store.flush()).toEqual({ sent: 1, unlinked: false, forbidden: false });

      expect(statusesOf(store.posts)).toEqual([["t", "queued"], ["c", "sent"]]);
    });

    it("stops without throwing when the boards answer is nonsense", async () => {
      siteTakesPosts({ boards: { oops: true } });
      const store = await storeWith([aPost()]);

      expect(await store.flush()).toEqual({ sent: 0, unlinked: false, forbidden: false });

      expect(statusesOf(store.posts)).toEqual([["p-1", "queued"]]);
    });

    it("treats a refused sign-in while reading the boards like a refused post", async () => {
      siteTakesPosts({ boards: new TownHallError("unauthorized", "Invalid password", 401) });
      const store = await storeWith([aPost()]);

      expect(await store.flush()).toEqual({ sent: 0, unlinked: true, forbidden: false });

      expect(mockDb.clearLink).toHaveBeenCalledTimes(1);
      expect(store.isLinked).toBe(false);
      expect(posted()).toHaveLength(0);
      expect(statusesOf(store.posts)).toEqual([["p-1", "queued"]]);
    });

    it("stops when the link is forgotten while posts are going out", async () => {
      const store = await storeWith([aComment({ id: "a", createdAt: 1 }), aComment({ id: "b", createdAt: 2 })]);
      siteTakesPosts({
        onPost: async (_path, _req, n) => {
          await store.forgetLink();
          return { id: 100 + n };
        },
      });

      expect(await store.flush()).toEqual({ sent: 1, unlinked: false, forbidden: false });

      expect(posted()).toHaveLength(1);
      expect(statusesOf(store.posts)).toEqual([["a", "sent"], ["b", "queued"]]);
    });

    it("rejects when the stored posts cannot be loaded, and the next flush tries again", async () => {
      mockDb.getLink.mockRejectedValueOnce(new Error("storage is down")).mockResolvedValue(storedLink());
      mockDb.getPosts.mockResolvedValue([aComment()]);
      siteTakesPosts();
      const store = useTownHallStore();

      await expect(store.flush()).rejects.toThrow("storage is down");

      expect(await store.flush()).toEqual({ sent: 1, unlinked: false, forbidden: false });
    });
  });

  describe("who is signed in", () => {
    it("is nobody on a plain install", () => {
      const store = useTownHallStore();

      expect(store.auth).toEqual({ kind: "none" });
      expect(store.isLinked).toBe(false);
      expect(store.signedInThroughWebsite).toBe(false);
    });

    it("is the website's session when the app is hosted on the Town Hall site and there is no link", () => {
      window.wpApiSettings = { root: "https://doit.forthexp.com/wp-json", nonce: "n1" };
      const store = useTownHallStore();

      expect(store.auth).toEqual({ kind: "nonce", nonce: "n1" });
      expect(store.isLinked).toBe(true);
      expect(store.signedInThroughWebsite).toBe(true);
    });

    it("ignores the nonce of another WordPress site hosting the app", () => {
      window.wpApiSettings = { root: "https://www.forthexp.com/wp-json", nonce: "n1" };
      const store = useTownHallStore();

      expect(store.auth).toEqual({ kind: "none" });
      expect(store.isLinked).toBe(false);
      expect(store.signedInThroughWebsite).toBe(false);
    });

    it("prefers the link to the nonce", async () => {
      window.wpApiSettings = { root: "https://doit.forthexp.com/wp-json", nonce: "n1" };
      mockDb.getLink.mockResolvedValue(storedLink());
      const store = useTownHallStore();
      await store.init();

      expect(store.auth).toEqual(BASIC);
      expect(store.isLinked).toBe(true);
      expect(store.signedInThroughWebsite).toBe(false);
    });
  });

  describe("a link counts only for the site that issued it", () => {
    const OTHER = "https://other.example";
    const storedForOtherSite = async () => {
      mockDb.getLink.mockResolvedValue(storedLink({ siteUrl: OTHER }));
      const store = useTownHallStore();
      await store.init();
      return store;
    };
    afterEach(() => {
      localStorage.removeItem("xp:townHallSite");
    });

    it("is not used for auth or counted as linked, and stays in storage", async () => {
      const store = await storedForOtherSite();

      expect(store.auth).toEqual({ kind: "none" });
      expect(store.isLinked).toBe(false);
      expect(store.signedInThroughWebsite).toBe(false);
      expect(store.link).toEqual(storedLink({ siteUrl: OTHER }));
      expect(mockDb.clearLink).not.toHaveBeenCalled();
    });

    it("lets the website's session through instead", async () => {
      window.wpApiSettings = { root: "https://doit.forthexp.com/wp-json", nonce: "n1" };
      const store = await storedForOtherSite();

      expect(store.auth).toEqual({ kind: "nonce", nonce: "n1" });
      expect(store.signedInThroughWebsite).toBe(true);
    });

    it("is not unlinked on the other site: no request, and the link stays", async () => {
      const store = await storedForOtherSite();

      expect(await store.unlink()).toBe("forgotten");

      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockDb.clearLink).not.toHaveBeenCalled();
      expect(store.link).toEqual(storedLink({ siteUrl: OTHER }));
    });

    it("follows the configured site: the same stored link counts under the override that names its site", async () => {
      localStorage.setItem("xp:townHallSite", OTHER);
      const elsewhere = await storedForOtherSite();
      expect(elsewhere.isLinked).toBe(true);

      localStorage.removeItem("xp:townHallSite");
      setActivePinia(createPinia());
      const home = await storedForOtherSite();
      expect(home.isLinked).toBe(false);
    });
  });

  describe("what a backup carries", () => {
    it("never holds the family's sign-in or unsent posts", () => {
      expect(BACKUP_STORES.map((store) => store.name)).not.toContain("__xp_town_hall");
    });
  });
});
