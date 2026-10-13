import { createPinia, setActivePinia } from "pinia";
import { BACKUP_STORES } from "@/lib/services/core/BackupService";
import { useTownHallStore } from "@/lib/store/stores/townHall";
import { townHallFetch, TownHallError } from "@/lib/services/townhall/townHallClient";
import type { TownHallLink, TownHallPost } from "@/lib/services/townhall/townHallTypes";

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

const fetchMock = townHallFetch as jest.Mock;

const SITE = "https://doit.forthexp.com";
const LOGIN = "mom@example.com";
const PASSWORD = "AbCd EfGh IjKl MnOp QrSt UvWx";

const BASIC = { kind: "basic", userLogin: LOGIN, appPassword: PASSWORD };

/** What WordPress appends to the return URL: spaces in the password come as "+", which URLSearchParams decodes. */
const linkedQuery = (over: Record<string, string> = {}) =>
  `?${new URLSearchParams({ site_url: SITE, user_login: LOGIN, password: PASSWORD, ...over })}`;

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

describe("town hall store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.resetAllMocks();
    mockDb.getLink.mockResolvedValue(null);
    mockDb.getPosts.mockResolvedValue([]);
    mockDb.saveLink.mockResolvedValue(undefined);
    mockDb.clearLink.mockResolvedValue(undefined);
    mockDb.savePosts.mockResolvedValue(undefined);
  });
  afterEach(() => {
    window.wpApiSettings = undefined;
  });

  describe("completeLink", () => {
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

    it("answers rejected for success=false, with no request and nothing stored", async () => {
      const store = useTownHallStore();

      expect(await store.completeLink("?success=false")).toBe("rejected");

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
      release(null);
      await init;

      expect(await linking).toBe("linked");
      expect(store.link?.userLogin).toBe(LOGIN);
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

  describe("what a backup carries", () => {
    it("never holds the family's sign-in or unsent posts", () => {
      expect(BACKUP_STORES.map((store) => store.name)).not.toContain("__xp_town_hall");
    });
  });
});
