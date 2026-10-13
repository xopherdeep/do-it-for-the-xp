import { BACKUP_STORES } from "@/lib/services/core/BackupService";
import { TownHallDb, townHallStorage } from "@/lib/databases/TownHallDb";
import type { TownHallLink, TownHallPost } from "@/lib/services/townhall/townHallTypes";

/** An in-memory stand-in for the ionic Storage: the base class only calls create, get, set, remove, keys and clear. */
const fakeStorage = () => {
  const data = new Map<string, unknown>();
  const storage = {
    create: async () => storage,
    get: async (key: string) => (data.has(key) ? data.get(key) : null),
    set: async (key: string, value: unknown) => {
      data.set(key, value);
    },
    remove: async (key: string) => {
      data.delete(key);
    },
    keys: async () => Array.from(data.keys()),
    clear: async () => data.clear(),
  };
  return storage;
};

const LINK: TownHallLink = {
  siteUrl: "https://doit.forthexp.com",
  userLogin: "mom@example.com",
  appPassword: "AbCd EfGh",
  displayName: "Mom",
  linkedAt: 1760000000000,
};

const POST: TownHallPost = { id: "p-1", kind: "topic", heroId: "h-1", heroName: "Ari", createdAt: 1, status: "queued", board: "suggestion-box", title: "Hi", body: "Hello" };

describe("TownHallDb", () => {
  let storage: ReturnType<typeof fakeStorage>;
  let db: TownHallDb;
  beforeEach(() => {
    storage = fakeStorage();
    db = new TownHallDb(storage as never);
  });

  it("lives in the database named __xp_town_hall (a rename would sign every family out)", () => {
    expect((townHallStorage as unknown as { _config: { name: string } })._config.name).toBe("__xp_town_hall");
  });

  it("is not part of a backup", () => {
    expect(BACKUP_STORES.map((store) => store.storage)).not.toContain(townHallStorage);
  });

  it("holds no link and no posts at first", async () => {
    expect(await db.getLink()).toBeNull();
    expect(await db.getPosts()).toEqual([]);
  });

  it("saves and clears the link", async () => {
    await db.saveLink(LINK);
    expect(await db.getLink()).toEqual(LINK);
    expect(await storage.keys()).toEqual(["link"]);
    await db.clearLink();
    expect(await db.getLink()).toBeNull();
  });

  it("saves the posts", async () => {
    await db.savePosts([POST]);
    expect(await db.getPosts()).toEqual([POST]);
    expect(await storage.keys()).toEqual(["posts"]);
  });

  it("reads a stored value of the wrong shape as empty", async () => {
    await storage.set("link", "garbage");
    await storage.set("posts", { not: "a list" });
    expect(await db.getLink()).toBeNull();
    expect(await db.getPosts()).toEqual([]);
  });
});
