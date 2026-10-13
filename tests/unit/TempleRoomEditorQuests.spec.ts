/**
 * The quest room flow of the temple room editor (useTempleRoomEditor + useRoomQuests), with the real editor store:
 * picking a quest writes `questId`, sets the room type from the quest's tier and promotes a shared token to a unique
 * symbol; the beast rooms are still there as the classic path and drop a quest cleanly. Only the browser's storage
 * and Ionic's router and controllers are faked.
 */
import { createPinia, setActivePinia } from "pinia";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { beastStorage } from "@/lib/databases/BestiaryDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { achievementStorage } from "@/lib/databases/AchievementDb";
import { useTempleRoomEditor } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/useTempleRoomEditor";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";

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
const mockPush = jest.fn();
jest.mock("@ionic/vue", () => ({
  toastController: { create: jest.fn(() => Promise.resolve({ present: jest.fn() })) },
  alertController: { create: jest.fn() },
  createAnimation: jest.fn(),
  useIonRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));
jest.mock("vue-router", () => ({ useRoute: () => ({ params: {}, query: {} }) }));
jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    getAll = jest.fn().mockResolvedValue([{ id: "hero-1", name: { nick: "Mia" } }]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});

const quest = (id: string, difficulty: number, overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id,
    achievementName: `Quest ${id}`,
    categoryId: "",
    beastId: "beast-dish-goblin",
    difficulty,
    type: "individual",
    assignee: ["hero-1"],
    basicSchedule: "daily",
    dueByTime: "",
    ...overrides,
  }) as Achievement;

/** An editor on a 1x3 first floor: a shared monster token, a shared miniboss token and a room of its own */
const startEditor = async (quests: Achievement[], cell = 0) => {
  const editor = useTempleRoomEditor({ templeId: "shadow-temple", row: "0", col: String(cell) });
  const { store } = editor;
  store.reset();
  store.templeId = "shadow-temple";
  store.currentLevelId = "1F";
  store.templeMaze = [["M001", "MINI", "R0102"]];
  store.roomsData = {
    M001: { type: "monster", content: { beasts: ["b1"], xp: 100, gp: 10, ap: 1 } },
    MINI: { type: "miniboss", content: { beasts: ["b2"], lockOnEnter: false } },
    R0102: { type: "empty", content: {} },
  };
  await editor.loadRoomData();
  editor.questRooms.quests.value = quests;
  return editor;
};

beforeEach(async () => {
  setActivePinia(createPinia());
  mockPush.mockClear();
  await beastStorage.clear();
  await achievementStorage.clear();
});

describe("picking a quest", () => {
  it("writes questId, sets the type from the tier and promotes a shared monster token to a unique symbol", async () => {
    const editor = await startEditor([quest("q1", 13)], 0);
    expect(await editor.questRooms.pickQuest("q1")).toBe(true);

    const { store } = editor;
    const symbol = (store.templeMaze as string[][])[0][0];
    expect(symbol).not.toBe("M001");
    expect(store.roomsData[symbol].type).toBe("boss");
    expect(store.roomsData[symbol].content?.questId).toBe("q1");
    expect(store.roomsData[symbol].content?.lockOnEnter).toBe(true);
    // the other cells that share the token keep their classic room
    expect(store.roomsData.M001.content?.questId).toBeUndefined();
    expect(store.roomsData.M001.type).toBe("monster");
    expect((store.templeMaze as string[][])[0].slice(1)).toEqual(["MINI", "R0102"]);
  });

  it("promotes the shared MINI token too, and keeps a symbol the room already owns", async () => {
    const mini = await startEditor([quest("q1", 3)], 1);
    await mini.questRooms.pickQuest("q1");
    const promoted = (mini.store.templeMaze as string[][])[0][1];
    expect(promoted).not.toBe("MINI");
    expect(mini.store.roomsData[promoted].type).toBe("miniboss");

    const own = await startEditor([quest("q2", 1)], 2);
    await own.questRooms.pickQuest("q2");
    expect((own.store.templeMaze as string[][])[0][2]).toBe("R0102");
    expect(own.store.roomsData.R0102).toMatchObject({ type: "monster", content: { questId: "q2" } });
  });

  it("makes each tier's room type: 2 a monster, 5 a miniboss, 8 a boss", async () => {
    const types: string[] = [];
    for (const difficulty of [2, 5, 8]) {
      const editor = await startEditor([quest("q", difficulty)], 2);
      await editor.questRooms.pickQuest("q");
      types.push(editor.store.roomsData.R0102.type);
    }
    expect(types).toEqual(["monster", "miniboss", "boss"]);
  });

  it("shows the quest room's config afterwards: Combat, step 3, the picker closed", async () => {
    const editor = await startEditor([quest("q1", 2)], 2);
    editor.questRooms.openPicker();
    expect(editor.questRooms.showPicker.value).toBe(true);
    await editor.questRooms.pickQuest("q1");
    expect(editor.questRooms.showPicker.value).toBe(false);
    expect(editor.showTypeModal.value).toBe(true);
    expect(editor.modalStep.value).toBe(3);
    expect(editor.selectedCategory.value?.name).toBe("Combat");
    expect(editor.isQuestRoom.value).toBe(true);
    expect(editor.pickerType.value).toBe("quest");
  });

  it("refuses a quest that is gone or only a draft, and changes nothing", async () => {
    const editor = await startEditor([quest("wip", 2, { draft: true })], 2);
    expect(await editor.questRooms.pickQuest("wip")).toBe(false);
    expect(await editor.questRooms.pickQuest("nope")).toBe(false);
    expect(editor.store.roomsData.R0102.type).toBe("empty");
    expect(editor.store.roomsData.R0102.content?.questId).toBeUndefined();
    expect(editor.isQuestRoom.value).toBe(false);
  });

  it("puts the quest's library beast in the family's bestiary, and never writes over a beast the family already has", async () => {
    const editor = await startEditor([quest("q1", 2)], 2);
    await editor.questRooms.pickQuest("q1");
    const stored = (await beastStorage.get("beast-dish-goblin")) as Beast | null;
    expect(stored?.name).toBe("Dish Goblin");
    expect(editor.allBeasts.value.map((beast) => beast.id)).toContain("beast-dish-goblin");

    await beastStorage.set("beast-dish-goblin", { ...stored, name: "Plate Fiend" });
    const again = await startEditor([quest("q1", 2)], 2);
    await again.questRooms.pickQuest("q1");
    expect(((await beastStorage.get("beast-dish-goblin")) as Beast).name).toBe("Plate Fiend");
  });
});

describe("the classic path is unchanged", () => {
  it("keeps Monster, Miniboss and Boss as room types the editor still picks", async () => {
    const editor = await startEditor([quest("q1", 2)], 2);
    await editor.selectType("monster");
    expect(editor.pickerType.value).toBe("monster");
    expect(editor.modalStep.value).toBe(2.5);
  });

  it("drops the quest from a room that becomes any other type", async () => {
    const editor = await startEditor([quest("q1", 2)], 2);
    await editor.questRooms.pickQuest("q1");
    expect(editor.isQuestRoom.value).toBe(true);
    await editor.selectType("trap");
    expect(editor.roomData.value?.type).toBe("trap");
    expect(editor.roomData.value?.content?.questId).toBeUndefined();
    expect(editor.isQuestRoom.value).toBe(false);
  });

  it("opens the picker when the quest room is confirmed, without touching the room's type", async () => {
    const editor = await startEditor([quest("q1", 2)], 2);
    await editor.selectType("quest");
    expect(editor.questRooms.showPicker.value).toBe(true);
    expect(editor.roomData.value?.type).toBe("empty");
  });
});

describe("the type modal on a quest room", () => {
  it("opens on the quest room's config, in Combat", async () => {
    const editor = await startEditor([quest("q1", 5)], 2);
    await editor.questRooms.pickQuest("q1");
    editor.closeTypeModal();
    editor.openTypeModal();
    expect(editor.modalStep.value).toBe(3);
    expect(editor.selectedCategory.value?.name).toBe("Combat");
  });

  it("goes back from the config to the type step, not the beast config selector", async () => {
    const editor = await startEditor([quest("q1", 5)], 2);
    await editor.questRooms.pickQuest("q1");
    editor.backModalStep();
    expect(editor.modalStep.value).toBe(2);
    expect(editor.pickerType.value).toBe("quest");
  });

  it("names the room Quest · its tier in the header", async () => {
    const editor = await startEditor([quest("q1", 13)], 2);
    expect(editor.capitalizedType.value).toBe("Empty");
    await editor.questRooms.pickQuest("q1");
    expect(editor.capitalizedType.value).toBe("Quest · Boss");
  });

  it("opens the Compendium's quest form for Edit quest, saving the room first and coming back to the config", async () => {
    const editor = await startEditor([quest("q1", 2)], 2);
    await editor.questRooms.pickQuest("q1");
    editor.editQuest("q1");
    expect(mockPush).toHaveBeenCalledWith({ name: "xp-achievement-config-dashboard", params: { id: "q1" } });
    expect(editor.isReturningFromSelection.value).toBe(true);
    expect(editor.showTypeModal.value).toBe(false);
  });
});

describe("coming back from the quest form", () => {
  const editorFor = (row: string, col: string, templeId = "shadow-temple") => useTempleRoomEditor({ templeId, row, col });

  it("opens the room's config once, even when the page was rebuilt and lost its own flag", async () => {
    const editor = await startEditor([quest("q1", 2)], 2);
    await editor.questRooms.pickQuest("q1");
    editor.editQuest("q1");

    const rebuilt = editorFor("0", "2");
    expect(rebuilt.isReturningFromSelection.value).toBe(false);
    expect(rebuilt.consumeReturnToConfig()).toBe(true);
    expect(rebuilt.consumeReturnToConfig()).toBe(false);
  });

  it("is for the room that left, not another room or another temple", async () => {
    const editor = await startEditor([quest("q1", 2)], 2);
    await editor.questRooms.pickQuest("q1");
    editor.editQuest("q1");

    expect(editorFor("0", "1").consumeReturnToConfig()).toBe(false);
    expect(editorFor("0", "2", "water-temple").consumeReturnToConfig()).toBe(false);
    expect(editorFor("0", "2").consumeReturnToConfig()).toBe(true);
  });

  it("still opens it for the same page that left, which kept its flag", async () => {
    const editor = await startEditor([quest("q1", 2)], 2);
    await editor.questRooms.pickQuest("q1");
    editor.editQuest("q1");
    expect(editor.consumeReturnToConfig()).toBe(true);
    expect(editor.isReturningFromSelection.value).toBe(false);
    expect(editorFor("0", "2").consumeReturnToConfig()).toBe(false);
  });

  it("lapses after an hour, so a trip that never came back opens nothing later", async () => {
    const editor = await startEditor([quest("q1", 2)], 2);
    await editor.questRooms.pickQuest("q1");
    const now = Date.now();
    const clock = jest.spyOn(Date, "now").mockReturnValue(now);
    try {
      editor.editQuest("q1");
      clock.mockReturnValue(now + 61 * 60 * 1000);
      expect(editorFor("0", "2").consumeReturnToConfig()).toBe(false);
    } finally {
      clock.mockRestore();
    }
  });

  it("has nothing to open when no trip was made", () => {
    expect(editorFor("0", "2").consumeReturnToConfig()).toBe(false);
  });
});

describe("the picker's size meter", () => {
  it("reads the temple as saved and the part this room makes of it", async () => {
    const editor = await startEditor([quest("small", 2), quest("big", 13)], 0);
    await editor.questRooms.pickQuest("big");
    // cell 0 now holds the 13; the other cells are classic or empty
    expect(editor.questRooms.size.value).toEqual({ total: 13, here: 13 });
    const [dishRow] = editor.questRooms.rows.value.filter((row) => row.id === "small");
    expect(dishRow.tier).toBe("monster");
  });
});

describe("Test fight", () => {
  it("fights the quest's beast, adopted first, and has nothing to fight in a classic room", async () => {
    const editor = await startEditor([quest("q1", 2)], 2);
    expect(await editor.questRooms.loadTestFightBeastIds()).toEqual([]);
    await editor.questRooms.pickQuest("q1");
    expect(await editor.questRooms.loadTestFightBeastIds()).toEqual(["beast-dish-goblin"]);
  });

  it("fights the beast of a shipped template that no quest fills yet", async () => {
    const editor = await startEditor([], 2);
    const fluffalo = BEAST_LIBRARY.find((entry) => entry.slug === "fluffalo");
    editor.roomData.value = {
      type: "monster",
      content: { quest: { beastId: String(fluffalo?.id), difficulty: 2, basicSchedule: "daily" } },
    };
    expect(await editor.questRooms.loadTestFightBeastIds()).toEqual(["beast-fluffalo"]);
  });
});
