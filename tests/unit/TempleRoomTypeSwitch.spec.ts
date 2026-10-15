/**
 * Changing a room's type in the temple room editor (useTempleRoomEditor.selectType and the config steps after it), with
 * the real editor store: the room becomes the record the new type owns. A seal or a chest never outlives the type that
 * meant it (a boss turned into a chest sealed the hero in; a chest turned into a miniboss still held the Boss Key the
 * audit counts), while the name, the doors and the beasts of a combat room stay. Only the browser's storage and Ionic's
 * router and controllers are faked.
 */
import { createPinia, setActivePinia } from "pinia";
import { useTempleRoomEditor } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/useTempleRoomEditor";
import { auditTemple } from "@/lib/services/temples/templeAudit";

jest.mock("@ionic/storage", () => {
  const rows = new Map<string, Map<string, unknown>>();
  class FakeStorage {
    private readonly mine: Map<string, unknown>;
    constructor(config: { name: string }) {
      if (!rows.has(config.name)) rows.set(config.name, new Map());
      this.mine = rows.get(config.name) as Map<string, unknown>;
    }
    async create() {
      return this;
    }
    async get(key: string) {
      return this.mine.has(key) ? JSON.parse(JSON.stringify(this.mine.get(key))) : null;
    }
    async set(key: string, value: unknown) {
      this.mine.set(key, JSON.parse(JSON.stringify(value)));
    }
    async remove(key: string) {
      this.mine.delete(key);
    }
    async clear() {
      this.mine.clear();
    }
    async keys() {
      return Array.from(this.mine.keys());
    }
  }
  return { Drivers: { IndexedDB: "indexeddb", LocalStorage: "localstorage" }, Storage: FakeStorage };
});
jest.mock("@ionic/vue", () => ({
  toastController: { create: jest.fn(() => Promise.resolve({ present: jest.fn() })) },
  alertController: { create: jest.fn() },
  createAnimation: jest.fn(),
  useIonRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("vue-router", () => ({ useRoute: () => ({ params: {}, query: {} }) }));
jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});

const lockedNorth = { north: "locked", east: "door", south: "door", west: "door" };

/** A one-row first floor: a sealed boss, a chest holding the Boss Key, a sealed miniboss and a beast room, all with doors of their own */
const startEditor = async (cell: number) => {
  const editor = useTempleRoomEditor({ templeId: "shadow-temple", row: "0", col: String(cell) });
  const { store } = editor;
  store.reset();
  store.templeId = "shadow-temple";
  store.currentLevelId = "1F";
  store.templeMaze = [["R0100", "R0101", "R0102", "R0103"]];
  store.roomsData = {
    R0100: {
      type: "boss",
      sides: { ...lockedNorth },
      content: { name: "Attic", lockOnEnter: true, beasts: ["b1"], xp: 800, gp: 80, ap: 8 },
    },
    R0101: {
      type: "loot",
      sides: { ...lockedNorth },
      content: { name: "Vault", chest: "dungeon", dungeon: "master-key", gold: 50 },
    },
    R0102: { type: "miniboss", content: { lockOnEnter: true, beasts: ["b2"], xp: 300 } },
    R0103: {
      type: "monster",
      sides: { ...lockedNorth },
      content: { name: "Pantry", beasts: ["b3"], xp: 100, gp: 10, ap: 1, questId: "q1", lockOnEnter: false },
    },
  };
  await editor.loadRoomData();
  return editor;
};

const bossKeyPlaced = (editor: Awaited<ReturnType<typeof startEditor>>) =>
  auditTemple({ dungeonLayout: { maze: editor.store.templeMaze, rooms: editor.store.roomsData } }).checks.find(
    (check) => check.id === "bossKey"
  )?.ok;

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("a fight room that becomes a room with no fight", () => {
  it("lets go of the seal when a boss becomes a chest, so the hero is not shut in", async () => {
    const editor = await startEditor(0);
    await editor.selectType("loot");
    expect(editor.roomData.value?.type).toBe("loot");
    expect(editor.roomData.value?.content).not.toHaveProperty("lockOnEnter");
    expect(editor.roomData.value?.content).not.toHaveProperty("beasts");
    expect(editor.roomData.value?.content).not.toHaveProperty("xp");

    await editor.saveToStore();
    expect(editor.store.roomsData.R0100.type).toBe("loot");
    expect(editor.store.roomsData.R0100.content).not.toHaveProperty("lockOnEnter");
  });

  it.each(["empty", "health", "shop", "teleport"])("lets go of the seal when a miniboss becomes %s", async (type) => {
    const editor = await startEditor(2);
    await editor.selectType(type);
    expect(editor.roomData.value?.type).toBe(type);
    expect(editor.roomData.value?.content).not.toHaveProperty("lockOnEnter");
    expect(editor.roomData.value?.content).not.toHaveProperty("xp");
  });

  it("keeps the room's name and its doors", async () => {
    const editor = await startEditor(0);
    await editor.selectType("empty");
    expect(editor.roomData.value?.content?.name).toBe("Attic");
    expect(editor.roomData.value?.sides).toEqual(lockedNorth);
  });
});

describe("a chest that becomes another room", () => {
  it("takes the Boss Key out of a chest that becomes a miniboss, so the audit stops counting it", async () => {
    const editor = await startEditor(1);
    expect(bossKeyPlaced(editor)).toBe(true);

    await editor.selectType("miniboss");
    expect(editor.roomData.value?.type).toBe("miniboss");
    ["chest", "dungeon", "gold", "items"].forEach((key) => expect(editor.roomData.value?.content).not.toHaveProperty(key));
    expect(editor.roomData.value?.content?.name).toBe("Vault");
    expect(editor.modalStep.value).toBe(2.5);

    await editor.saveToStore();
    expect(bossKeyPlaced(editor)).toBe(false);
  });

  it("starts a Pegasus room with no leftover key or map", async () => {
    const editor = await startEditor(1);
    await editor.selectType("master");
    expect(editor.roomData.value?.type).toBe("master");
    expect(editor.roomData.value?.content).not.toHaveProperty("dungeon");
    expect(editor.roomData.value?.content).not.toHaveProperty("chest");
  });
});

describe("a fight room that becomes another fight room", () => {
  it("keeps the beasts, the rewards and the seal between monster and miniboss", async () => {
    const editor = await startEditor(2);
    await editor.selectType("monster");
    expect(editor.roomData.value?.type).toBe("monster");
    expect(editor.roomData.value?.content).toMatchObject({ lockOnEnter: true, beasts: ["b2"], xp: 300 });
  });

  it("seals a room that becomes a boss, and takes the quest off it", async () => {
    const editor = await startEditor(3);
    await editor.selectType("boss");
    expect(editor.roomData.value?.type).toBe("boss");
    expect(editor.roomData.value?.content?.lockOnEnter).toBe(true);
    expect(editor.roomData.value?.content?.questId).toBeUndefined();
    expect(editor.modalStep.value).toBe(3);
  });

  it("keeps the room's name and its doors when the boss config replaces the record", async () => {
    const editor = await startEditor(3);
    await editor.selectType("boss");
    expect(editor.roomData.value?.content?.name).toBe("Pantry");
    expect(editor.roomData.value?.sides).toEqual(lockedNorth);
  });

  it("keeps the room's name and its doors when a unique monster config replaces the record", async () => {
    const editor = await startEditor(3);
    await editor.selectType("miniboss");
    editor.selectMonsterConfig("NEW");
    expect(editor.roomData.value?.type).toBe("miniboss");
    expect(editor.roomData.value?.content?.name).toBe("Pantry");
    expect(editor.roomData.value?.sides).toEqual(lockedNorth);
    expect(editor.modalStep.value).toBe(3);
  });

  it("keeps the room's name and its doors when a shared monster config replaces the record", async () => {
    const editor = await startEditor(3);
    editor.store.roomsData.MINI = { type: "miniboss", content: { beasts: ["b9"], lockOnEnter: true } };
    await editor.selectType("miniboss");
    editor.selectMonsterConfig("MINI");
    expect(editor.roomData.value?.content).toMatchObject({ name: "Pantry", beasts: ["b9"], lockOnEnter: true });
    expect(editor.roomData.value?.sides).toEqual(lockedNorth);
  });
});

describe("a room whose type does not change", () => {
  it("keeps its content, a miniboss's drop included, and only takes the quest off", async () => {
    const editor = await startEditor(3);
    editor.roomData.value!.content = { ...editor.roomData.value!.content, chest: "dungeon", dungeon: "master-key" };
    await editor.selectType("monster");
    expect(editor.roomData.value?.content).toMatchObject({
      name: "Pantry",
      beasts: ["b3"],
      xp: 100,
      lockOnEnter: false,
      chest: "dungeon",
      dungeon: "master-key",
    });
    expect(editor.roomData.value?.content?.questId).toBeUndefined();
  });
});
