/**
 * Opening a temple on a device's first launch: the shipped temples are synced into the TempleDb once per session
 * (ensureBuiltInTemples, started at app start), and a refresh in that sync starts every run in the temple over. So
 * useTemple's openTemple waits for the sync before it reads the temple's record (ensureTempleFresh) and starts the
 * run: the run can never open on a copy the sync is about to replace and forget.
 */
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useTemple } from "@/hooks/temples/useTemple";
import { ensureBuiltInTemples } from "@/lib/engine/core/dungeons/importAllTemples";
import { ensureTempleFresh } from "@/lib/engine/core/dungeons/templeFreshness";
import { addHero, HERO, makeTemple } from "./templeFixtures";

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
jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/store/stores/chat", () => ({
  __esModule: true,
  FAMILY_CHAT_ROOM: "family-chat",
  useChatStore: () => ({ postSystemLine: jest.fn(async () => ({})) }),
}));
jest.mock("@/lib/store/stores/notifications", () => ({
  __esModule: true,
  useNotificationsStore: () => ({ push: jest.fn() }),
}));
jest.mock("@/lib/engine/core/dungeons/importAllTemples", () => ({
  __esModule: true,
  ensureBuiltInTemples: jest.fn(),
}));
jest.mock("@/lib/engine/core/dungeons/templeFreshness", () => ({
  __esModule: true,
  ensureTempleFresh: jest.fn(async () => undefined),
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("opening a temple waits for the shipped temples to be synced", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    addHero();
    jest.mocked(ensureTempleFresh).mockClear();
  });

  it("reads the temple's record and starts the run only once ensureBuiltInTemples has settled", async () => {
    let settle: () => void = () => undefined;
    jest.mocked(ensureBuiltInTemples).mockImplementation(() => new Promise<void>((resolve) => (settle = resolve)));
    const id = makeTemple({ E: { type: "entrance" }, H: { type: "empty" } }, [["E", "H"]]);
    const wrapper = mount(
      defineComponent({
        setup() {
          return useTemple(id, [0, 0], undefined, HERO);
        },
        render: () => null,
      })
    );
    // Mounting opens the temple: the sync is awaited first, the record is not read until it settles
    const vm = wrapper.vm as unknown as { whenOpened: Promise<boolean> };
    await flush();
    expect(ensureBuiltInTemples).toHaveBeenCalledTimes(1);
    expect(ensureTempleFresh).not.toHaveBeenCalled();

    settle();
    await expect(vm.whenOpened).resolves.toBe(true);
    expect(ensureTempleFresh).toHaveBeenCalledWith(id);
    wrapper.unmount();
  });
});
