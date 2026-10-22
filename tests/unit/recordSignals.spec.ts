import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "@/lib/databases/DbStorageApi";
import {
  emitRecordWritten,
  emitStoreRestored,
  onRecordWritten,
  onStoreRestored,
  trackWrite,
  writesSettled,
  type RecordWrite,
  type StoreRestored,
} from "@/lib/services/sync/recordSignals";
import debug from "@/lib/utils/debug";

jest.mock("@/lib/utils/debug", () => ({ __esModule: true, default: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));

/** A real Ionic Storage on the localStorage driver, so the store name comes from the real class */
const openApi = async (name: string) => {
  const storage = new Storage({ name, driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage] });
  await storage.create();
  return new DbStorageApi(storage);
};

/** Listens for every record write until the returned stop is called */
const listen = () => {
  const writes: RecordWrite[] = [];
  const stop = onRecordWritten((write) => writes.push(write));
  return { writes, stop };
};

describe("DbStorageApi announces its writes", () => {
  it("set emits the store name, key and value; remove emits null; clear emits a removal per key", async () => {
    const api = await openApi("__beasts");
    const { writes, stop } = listen();

    await api.set("a", { id: "a", name: "First" });
    expect(writes).toEqual([{ store: "__beasts", key: "a", value: { id: "a", name: "First" } }]);

    await api.remove("a");
    expect(writes[1]).toEqual({ store: "__beasts", key: "a", value: null, previous: { id: "a", name: "First" } });

    await api.set("b", { id: "b" });
    await api.set("c", { id: "c" });
    writes.length = 0;
    await api.clear();

    expect(writes).toEqual([
      { store: "__beasts", key: "b", value: null, previous: { id: "b" } },
      { store: "__beasts", key: "c", value: null, previous: { id: "c" } },
    ]);
    expect(await api.keys()).toEqual([]);
    stop();
  });

  it("a removal carries the record that was there, so a log entry can still name its hero", async () => {
    const api = await openApi("__questLog");
    const { writes, stop } = listen();
    await api.set("q1", { id: "q1", userId: "h-1" });
    writes.length = 0;

    await api.remove("q1");

    expect(writes).toEqual([{ store: "__questLog", key: "q1", value: null, previous: { id: "q1", userId: "h-1" } }]);
    stop();
  });

  it("a removal that fails announces nothing", async () => {
    const api = await openApi("__recordSignalsRemoveFails");
    await api.set("q1", { id: "q1" });
    jest.spyOn(api.storage, "remove").mockRejectedValueOnce(new Error("disk full"));
    const { writes, stop } = listen();

    await expect(api.remove("q1")).rejects.toThrow("disk full");

    expect(writes).toEqual([]);
    stop();
  });

  it("removing a key that was never there says there was nothing before", async () => {
    const api = await openApi("__castLog");
    const { writes, stop } = listen();

    await api.remove("ghost");

    expect(writes).toEqual([{ store: "__castLog", key: "ghost", value: null, previous: null }]);
    stop();
  });

  it("a store the sync does not carry is not read before a removal or a clear", async () => {
    const api = await openApi("__recordSignalsLocal");
    await api.set("photo", { id: "photo", blob: "a big picture" });
    await api.set("other", { id: "other" });
    const read = jest.spyOn(api.storage, "get");
    const { writes, stop } = listen();

    await api.remove("photo");
    await api.clear();

    expect(read).not.toHaveBeenCalled();
    expect(writes).toEqual([
      { store: "__recordSignalsLocal", key: "photo", value: null },
      { store: "__recordSignalsLocal", key: "other", value: null },
    ]);
    stop();
  });

  it("set emits the plain JSON that was stored, not the object the caller still holds", async () => {
    const api = await openApi("__recordSignalsFlat");
    const { writes, stop } = listen();
    const record = { id: "a", when: new Date("2026-10-22T10:00:00.000Z"), skipped: undefined };

    await api.set("a", record);

    expect(writes[0].value).toEqual({ id: "a", when: "2026-10-22T10:00:00.000Z" });
    expect(writes[0].value).not.toBe(record);
    stop();
  });

  it("a clear of an empty store emits nothing", async () => {
    const api = await openApi("__recordSignalsEmpty");
    const { writes, stop } = listen();

    await api.clear();

    expect(writes).toEqual([]);
    stop();
  });

  it("a write that fails announces nothing", async () => {
    const api = await openApi("__recordSignalsFailing");
    jest.spyOn(api.storage, "set").mockRejectedValueOnce(new Error("disk full"));
    const { writes, stop } = listen();

    await expect(api.set("a", { id: "a" })).rejects.toThrow("disk full");

    expect(writes).toEqual([]);
    stop();
  });

  it("a storage that cannot tell its name is announced under an empty store name", async () => {
    const memory = new Map<string, unknown>();
    const nameless = {
      create: async () => nameless,
      set: async (key: string, value: unknown) => void memory.set(key, value),
      keys: async () => [...memory.keys()],
    };
    const api = new DbStorageApi(nameless as unknown as Storage);
    const { writes, stop } = listen();

    await api.set("a", { id: "a" });

    expect(writes).toEqual([{ store: "", key: "a", value: { id: "a" } }]);
    stop();
  });
});

describe("the record signals", () => {
  const written: RecordWrite = { store: "__beasts", key: "b1", value: { id: "b1" } };
  const restored: StoreRestored = { store: "__beasts", removedKeys: ["b2"] };

  it("a write listener hears each emit and stops after its unsubscribe", () => {
    const heard = jest.fn();
    const stop = onRecordWritten(heard);
    emitRecordWritten(written);
    emitRecordWritten({ ...written, key: "b2", value: null });
    expect(heard).toHaveBeenCalledTimes(2);
    expect(heard).toHaveBeenLastCalledWith({ ...written, key: "b2", value: null });
    stop();
    emitRecordWritten(written);
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it("a restore listener hears the store and the keys it lost", () => {
    const heard = jest.fn();
    const stop = onStoreRestored(heard);
    emitStoreRestored(restored);
    expect(heard).toHaveBeenCalledWith(restored);
    stop();
    emitStoreRestored(restored);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("a throwing listener does not stop the next one, and is logged", () => {
    const next = jest.fn();
    const stopBad = onRecordWritten(() => {
      throw new Error("boom");
    });
    const stopNext = onRecordWritten(next);
    expect(() => emitRecordWritten(written)).not.toThrow();
    expect(next).toHaveBeenCalledWith(written);
    expect(debug.error).toHaveBeenCalled();
    stopBad();
    stopNext();
  });

  it("notes every write while it is on its way: writesSettled waits for a set and a remove, and for a failed one too", async () => {
    const api = await openApi("__beasts");
    let isDone = false;
    const writing = api.set("w", { id: "w" }).then(() => (isDone = true));
    await writesSettled();
    expect(isDone).toBe(true);
    await writing;

    let release!: () => void;
    const held = trackWrite(new Promise<void>((resolve) => (release = resolve)));
    let isSettled = false;
    const waiting = writesSettled().then(() => (isSettled = true));
    await Promise.resolve();
    expect(isSettled).toBe(false);
    release();
    await held;
    await waiting;
    expect(isSettled).toBe(true);

    void trackWrite(Promise.reject(new Error("disk full"))).catch(() => undefined);
    await expect(writesSettled()).resolves.toBeUndefined();
  });
});
