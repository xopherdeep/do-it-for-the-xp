/**
 * The "temple changed" bus, and the TempleDb that speaks on it: every save (and removal) in the TempleDb is
 * announced after the write, so the engine can follow the temple editor without an app reload.
 */
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { emitTempleChanged, onTempleChanged } from "@/lib/engine/temples/templeChanges";

jest.mock("@ionic/storage", () => {
  class Storage {
    private rows = new Map<string, unknown>();
    constructor(public readonly config: unknown) {}
    async create() {
      return this;
    }
    async get(key: string) {
      return this.rows.has(key) ? JSON.parse(JSON.stringify(this.rows.get(key))) : null;
    }
    async set(key: string, value: unknown) {
      this.rows.set(key, value);
    }
    async remove(key: string) {
      this.rows.delete(key);
    }
    async clear() {
      this.rows.clear();
    }
    async keys() {
      return [...this.rows.keys()];
    }
  }
  return { Storage, Drivers: { IndexedDB: "indexeddb", LocalStorage: "localstorage" } };
});

describe("the temple changes bus", () => {
  it("tells every listener which temple changed", () => {
    const first: string[] = [];
    const second: string[] = [];
    const stopFirst = onTempleChanged((id) => first.push(id));
    const stopSecond = onTempleChanged((id) => second.push(id));

    emitTempleChanged("wind-temple");
    emitTempleChanged("gen-pantry");

    expect(first).toEqual(["wind-temple", "gen-pantry"]);
    expect(second).toEqual(["wind-temple", "gen-pantry"]);
    stopFirst();
    stopSecond();
  });

  it("stops telling a listener that unsubscribed, and only that one", () => {
    const stays: string[] = [];
    const leaves: string[] = [];
    const stopStays = onTempleChanged((id) => stays.push(id));
    const stopLeaves = onTempleChanged((id) => leaves.push(id));

    emitTempleChanged("a");
    stopLeaves();
    emitTempleChanged("b");

    expect(stays).toEqual(["a", "b"]);
    expect(leaves).toEqual(["a"]);
    stopLeaves(); // a second call is harmless
    stopStays();
  });

  it("does not let a listener that throws keep the others from hearing it", () => {
    const heard: string[] = [];
    const stopBroken = onTempleChanged(() => {
      throw new Error("broken listener");
    });
    const stopFine = onTempleChanged((id) => heard.push(id));

    expect(() => emitTempleChanged("ice-temple")).not.toThrow();

    expect(heard).toEqual(["ice-temple"]);
    stopBroken();
    stopFine();
  });

  it("does not skip a listener when one unsubscribes while it is being told", () => {
    const heard: string[] = [];
    const stopFirst = onTempleChanged(() => stopFirst());
    const stopSecond = onTempleChanged((id) => heard.push(id));

    emitTempleChanged("fire-temple");

    expect(heard).toEqual(["fire-temple"]);
    stopSecond();
  });

  it("is quiet when nobody listens", () => {
    expect(() => emitTempleChanged("nobody")).not.toThrow();
  });
});

describe("TempleDb announces what it saves", () => {
  const db = new TempleDb(templeStorage);

  beforeEach(async () => {
    await templeStorage.clear();
  });

  it("emits after the write, so a listener that reads the record finds it", async () => {
    const seen: Array<string | undefined> = [];
    const stop = onTempleChanged((id) => {
      // The write is done by now: the record is there to read (synchronously for the check, via the promise below)
      void db.getTempleById(id).then((record) => seen.push(record?.customName));
    });

    await db.setTemple({ id: "wind-temple", customName: "Howling Spire", categoryIds: [] });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(seen).toEqual(["Howling Spire"]);
    stop();
  });

  it("emits once for each temple of setTemples", async () => {
    const ids: string[] = [];
    const stop = onTempleChanged((id) => ids.push(id));

    await db.setTemples([
      { id: "a-temple", categoryIds: [] },
      { id: "b-temple", categoryIds: [] },
    ]);

    expect(ids).toEqual(["a-temple", "b-temple"]);
    stop();
  });

  it("emits when a temple is removed, and not before the removal", async () => {
    await db.setTemple({ id: "gone-temple", categoryIds: [] });
    const stored: boolean[] = [];
    const stop = onTempleChanged((id) => {
      void db.getTempleById(id).then((record) => stored.push(record !== null));
    });

    await db.remove("gone-temple");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(stored).toEqual([false]);
    stop();
  });

  it("emits nothing when the write fails", async () => {
    const ids: string[] = [];
    const stop = onTempleChanged((id) => ids.push(id));
    const failing = jest.spyOn(templeStorage, "set").mockRejectedValueOnce(new Error("quota"));

    await expect(db.setTemple({ id: "full-temple", categoryIds: [] })).rejects.toThrow("quota");

    expect(ids).toEqual([]);
    failing.mockRestore();
    stop();
  });
});
