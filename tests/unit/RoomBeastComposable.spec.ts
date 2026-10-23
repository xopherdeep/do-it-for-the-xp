/**
 * The beast of a combat room (useRoomBeast): the card the room's reveal shows, and the voxel monster that roams the room.
 * Walking into a combat room looks the beast up (a quest's beast, the authored one, or the one the bestiary picks for the
 * temple's element); the voxel waits while it is asked and falls back to the stand-in when nothing answers.
 * The bestiary, the quest board and the avatars are doubles; the pure beast-picking rules (RoomBeast) are the real ones.
 */
import { computed, nextTick, ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { standInMonster } from "@/lib/services/temples/RoomBeast";
import { useRoomBeast, type RoomBeastDeps } from "@/app/Console/TempleGrounds/templeGrounds/useRoomBeast";

const mockGetBeastById = jest.fn();
const mockGetBeasts = jest.fn();
const mockLoadBeastById = jest.fn();
const mockWhenQuestRoomsReady = jest.fn();
const mockQuestRoomStateFor = jest.fn();

jest.mock("@/lib/databases/BestiaryDb", () => ({
  __esModule: true,
  beastStorage: {},
  default: class {
    getBeastById = (id: string) => mockGetBeastById(id);
    getBeasts = () => mockGetBeasts();
  },
}));
jest.mock("@/lib/services/battle/BestiaryService", () => ({
  BestiaryService: class {
    getAvatar = (id: number) => `avatar-${id}`;
    loadBeastById = (id: string) => mockLoadBeastById(id);
  },
}));
jest.mock("@/lib/engine/core/dungeons/TempleSystem", () => ({
  TempleSystem: { getInstance: () => ({ whenQuestRoomsReady: (temple: string) => mockWhenQuestRoomsReady(temple) }) },
}));
jest.mock("@/lib/services/temples/RoomInteractions", () => ({
  questRoomStateFor: (...args: unknown[]) => mockQuestRoomStateFor(...args),
}));
jest.mock("@/lib/services/temples/questRooms", () => ({
  isQuestRoom: (room: Room) => Boolean(room.content?.quest),
}));
jest.mock("@/lib/services/temples/roomInteractions/treasure", () => ({ isRoomSpent: jest.fn(() => false) }));
jest.mock("@/lib/utils/debug", () => ({ __esModule: true, default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const LIBRARY_BEAST = BEAST_LIBRARY[0];
const NAMELESS = { ...LIBRARY_BEAST, id: "zz-nameless", name: "   ", avatar: 3 };
const FACELESS = { ...LIBRARY_BEAST, id: "zz-faceless", name: "Faceless Fiend", avatar: undefined };
beforeAll(() => {
  BEAST_LIBRARY.push(NAMELESS, FACELESS);
});
afterAll(() => {
  BEAST_LIBRARY.splice(BEAST_LIBRARY.indexOf(NAMELESS), 1);
  BEAST_LIBRARY.splice(BEAST_LIBRARY.indexOf(FACELESS), 1);
});

beforeEach(() => {
  jest.resetAllMocks();
  mockGetBeasts.mockResolvedValue([]);
  mockGetBeastById.mockResolvedValue(null);
  mockLoadBeastById.mockResolvedValue(null);
  mockWhenQuestRoomsReady.mockResolvedValue(undefined);
  mockQuestRoomStateFor.mockReturnValue(null);
});

const monster = (content: Room["content"] = {}, type = "monster"): Room => ({ type, content });
/** The quest a room holds, as the temple stores it (the live state is faked: questRoomStateFor) */
const QUEST = { beastId: "q-beast", difficulty: 1, basicSchedule: "daily" };
const fireBeast = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ id, name, checklist: [], element: "fire", ...extra });
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
};

/**
 * The composable over refs the test moves, as the temple screen's useTemple does. `start` is how the screen stands when the
 * hero walks in (the watch looks at it at once): a cleared room, a generated temple whose metadata has not arrived.
 */
const roomScreen = (
  room?: Room,
  over: Partial<Record<keyof RoomBeastDeps, unknown>> = {},
  start: { cleared?: boolean; generated?: boolean; meta?: { element?: string } | null } = {}
) => {
  const currentRoom = ref<Room | undefined>(room);
  const currentPosition = ref<[number, number]>([0, 1]);
  const isCurrentRoomCleared = ref(Boolean(start.cleared));
  const templeMeta = ref<{ element?: string } | undefined>(start.meta === null ? undefined : (start.meta ?? { element: "fire" }));
  const isGenerated = ref(Boolean(start.generated));
  const templeElement = ref("fire");
  const beast = useRoomBeast({
    props: { temple: "t1", userId: "hero-1" },
    progressHeroId: "hero-1",
    currentRoom,
    currentPosition,
    currentLevel: ref("1F"),
    isCurrentRoomCleared,
    templeMeta: computed(() => templeMeta.value),
    isGenerated: computed(() => isGenerated.value),
    templeElement: computed(() => templeElement.value),
    ...over,
  } as unknown as RoomBeastDeps);
  return { beast, currentRoom, currentPosition, isCurrentRoomCleared, templeMeta, isGenerated, templeElement };
};

/** Let the watch fire and every lookup it started finish */
const settle = async () => {
  await nextTick();
  await flushPromises();
};

describe("the monster that roams a room", () => {
  it("is the dust bunny when the hero is in no room", async () => {
    const { beast } = roomScreen(undefined);
    await settle();

    expect(beast.activeMonster.value).toEqual({ name: "Dust Bunny", avatar: "avatar-74" });
    expect(beast.showVoxelMonster.value).toBe(false);
  });

  it("is not there in a room that has no fight", async () => {
    const { beast } = roomScreen({ type: "empty" });
    await settle();

    expect(beast.showVoxelMonster.value).toBe(false);
    expect(mockGetBeasts).not.toHaveBeenCalled();
    expect(mockGetBeastById).not.toHaveBeenCalled();
  });

  it("is gone from a combat room whose beasts are beaten, and the room asks the bestiary nothing", async () => {
    const { beast } = roomScreen(monster({ beasts: ["b1"] }), {}, { cleared: true });
    await settle();

    expect(beast.isCombatRoomCleared.value).toBe(true);
    expect(beast.showVoxelMonster.value).toBe(false);
    expect(mockGetBeastById).not.toHaveBeenCalled();
  });

  it("knows a boss and a miniboss as combat rooms too", async () => {
    for (const type of ["miniboss", "boss"]) {
      const { beast } = roomScreen(monster({}, type));
      await settle();
      expect(beast.showVoxelMonster.value).toBe(true);
    }
  });

  it("stands in with the element's monster for the room when the bestiary has nobody to give", async () => {
    const room = monster();
    const { beast } = roomScreen(room);
    await settle();

    const standIn = standInMonster(room, "fire");
    expect(beast.activeMonster.value).toEqual({ name: standIn.name, avatar: `avatar-${standIn.avatarId}` });
    expect(beast.showVoxelMonster.value).toBe(true);
  });

  it("falls back to fire for a temple with no element", async () => {
    const room = monster();
    const { beast } = roomScreen(room, { templeElement: computed(() => "") });
    await settle();

    expect(beast.activeMonster.value.name).toBe(standInMonster(room, "fire").name);
  });
});

describe("an authored beast", () => {
  it("waits for the lookup (the voxel monster is held back), then takes the beast's name and picture", async () => {
    const lookup = deferred<unknown>();
    mockGetBeastById.mockReturnValue(lookup.promise);
    const { beast } = roomScreen(monster({ beasts: ["b1"] }));
    await settle();
    expect(beast.showVoxelMonster.value).toBe(false);

    lookup.resolve({ id: "b1", name: " Mustwisp ", imageUrl: "must.png" });
    await settle();

    expect(beast.activeMonster.value).toEqual({ name: "Mustwisp", avatar: "must.png" });
    expect(beast.showVoxelMonster.value).toBe(true);
    expect(mockGetBeastById).toHaveBeenCalledWith("b1");
  });

  it("keeps the stand-in's face for a beast with no picture", async () => {
    mockGetBeastById.mockResolvedValue({ id: "b1", name: "Mustwisp" });
    const { beast } = roomScreen(monster({ beasts: ["b1"] }));
    await settle();

    expect(beast.activeMonster.value).toEqual({ name: "Mustwisp", avatar: "avatar-74" });
  });

  it("stands in when the bestiary does not know the beast", async () => {
    const room = monster({ beasts: ["gone"] });
    mockGetBeastById.mockResolvedValue({ id: "gone", name: "" });
    const { beast } = roomScreen(room);
    await settle();

    expect(beast.activeMonster.value.name).toBe(standInMonster(room, "fire").name);
    expect(beast.showVoxelMonster.value).toBe(true);
  });

  it("does not hand the lookup's beast to a room the hero has since left", async () => {
    const lookup = deferred<unknown>();
    mockGetBeastById.mockReturnValueOnce(lookup.promise);
    const first = monster({ beasts: ["b1"] });
    const { beast, currentRoom } = roomScreen(first);
    await settle();

    const next = monster();
    currentRoom.value = next;
    await settle();
    lookup.resolve({ id: "b1", name: "Mustwisp", imageUrl: "must.png" });
    await settle();

    expect(beast.activeMonster.value.name).toBe(standInMonster(next, "fire").name);
  });

  it("clears the last room's beast as the hero walks into the next room", async () => {
    mockGetBeastById.mockResolvedValue({ id: "b1", name: "Mustwisp", imageUrl: "must.png" });
    const { beast, currentRoom } = roomScreen(monster({ beasts: ["b1"] }));
    await settle();
    expect(beast.activeMonster.value.name).toBe("Mustwisp");

    currentRoom.value = { type: "empty" };
    await settle();

    expect(beast.activeMonster.value.name).not.toBe("Mustwisp");
    expect(beast.showVoxelMonster.value).toBe(false);
  });

  it("looks the beast up once however often the hero comes back", async () => {
    mockGetBeastById.mockResolvedValue({ id: "b1", name: "Mustwisp", imageUrl: "must.png" });
    const { beast, currentRoom } = roomScreen(monster({ beasts: ["b1"] }));
    await settle();

    currentRoom.value = { type: "empty" };
    await settle();
    currentRoom.value = monster({ beasts: ["b1"] });
    await settle();

    expect(beast.activeMonster.value.name).toBe("Mustwisp");
    expect(mockGetBeastById).toHaveBeenCalledTimes(1);
  });

  it("reuses the lookup when the room key changes (another place or element) but the beast does not", async () => {
    mockGetBeastById.mockResolvedValue({ id: "b1", name: "Mustwisp", imageUrl: "must.png" });
    const { currentPosition, templeMeta } = roomScreen(monster({ beasts: ["b1"] }));
    await settle();

    currentPosition.value = [0, 2]; // beastCard is cached, so the answer arrives with no second lookup
    templeMeta.value = { element: "ice" };
    await settle();

    expect(mockGetBeastById).toHaveBeenCalledTimes(1);
  });
});

describe("the beast a room's reveal shows (getBeastCard)", () => {
  it("is the bestiary's beast: a trimmed name, and the picture it carries", async () => {
    mockGetBeastById.mockResolvedValue({ id: "b1", name: "  Mustwisp ", imageUrl: "must.png", localImage: "local.png", avatar: 5 });
    const { beast } = roomScreen(undefined);

    expect(await beast.getBeastCard("b1")).toEqual({ name: "Mustwisp", art: { src: "must.png", alt: "Mustwisp", frame: "beast" } });
  });

  it("takes the local picture when there is no image url, and the avatar when there is neither", async () => {
    mockGetBeastById.mockResolvedValueOnce({ id: "b1", name: "A", localImage: "local.png", avatar: 5 });
    mockGetBeastById.mockResolvedValueOnce({ id: "b2", name: "B", avatar: "5" });
    const { beast } = roomScreen(undefined);

    expect((await beast.getBeastCard("b1"))?.art?.src).toBe("local.png");
    expect((await beast.getBeastCard("b2"))?.art?.src).toBe("avatar-5");
  });

  it("is the name alone for a beast with no picture at all", async () => {
    mockGetBeastById.mockResolvedValue({ id: "b1", name: "Mustwisp" });
    const { beast } = roomScreen(undefined);

    expect(await beast.getBeastCard("b1")).toEqual({ name: "Mustwisp", art: undefined });
  });

  it("falls back to the battle's loader for a bestiary that answers nothing", async () => {
    mockLoadBeastById.mockResolvedValue({ name: " Loaded ", avatar: 9 });
    const { beast } = roomScreen(undefined);

    expect(await beast.getBeastCard("b1")).toEqual({ name: "Loaded", art: { src: "avatar-9", alt: "Loaded", frame: "beast" } });
  });

  it("falls back to the loader's name alone when its enemy has no avatar", async () => {
    mockLoadBeastById.mockResolvedValue({ name: "Loaded" });
    const { beast } = roomScreen(undefined);

    expect(await beast.getBeastCard("b1")).toEqual({ name: "Loaded", art: undefined });
  });

  it("is nothing for a beast neither the bestiary nor the loader knows", async () => {
    const { beast } = roomScreen(undefined);

    expect(await beast.getBeastCard("nobody")).toBeNull();
  });

  it("is nothing for a blank beast (the bestiary answers an unknown id with one)", async () => {
    mockGetBeastById.mockResolvedValue({ id: "blank", name: "  " });
    const { beast } = roomScreen(undefined);

    expect(await beast.getBeastCard("blank")).toBeNull();
  });

  it("is nothing when the bestiary cannot be read", async () => {
    mockGetBeastById.mockRejectedValue(new Error("storage is gone"));
    const { beast } = roomScreen(undefined);

    expect(await beast.getBeastCard("b1")).toBeNull();
  });

  it("finds a quest's beast in the library when the bestiary has not met it (blank beast or no beast at all)", async () => {
    const { beast } = roomScreen(undefined);
    const libraryCard = { name: String(LIBRARY_BEAST.name).trim(), art: { src: `avatar-${LIBRARY_BEAST.avatar}`, alt: String(LIBRARY_BEAST.name).trim(), frame: "beast" } };

    mockGetBeastById.mockResolvedValueOnce({ id: "x", name: "" });
    expect(await beast.getBeastCard(String(LIBRARY_BEAST.id), true)).toEqual(libraryCard);

    mockGetBeastById.mockResolvedValueOnce(null);
    mockLoadBeastById.mockResolvedValueOnce(null);
    const second = roomScreen(undefined).beast;
    expect(await second.getBeastCard(String(LIBRARY_BEAST.id), true)).toEqual(libraryCard);
  });

  it("does not look in the library for a beast that is not a quest's", async () => {
    mockGetBeastById.mockResolvedValue({ id: "x", name: "" });
    const { beast } = roomScreen(undefined);

    expect(await beast.getBeastCard(String(LIBRARY_BEAST.id))).toBeNull();
  });

  it("is nothing for a quest's beast that the library does not hold, holds nameless, or holds without a picture", async () => {
    mockGetBeastById.mockResolvedValue({ id: "x", name: "" });
    const { beast } = roomScreen(undefined);

    expect(await beast.getBeastCard("not-in-the-library", true)).toBeNull();
    expect(await beast.getBeastCard("zz-nameless", true)).toBeNull();
    expect(await beast.getBeastCard("zz-faceless", true)).toEqual({ name: "Faceless Fiend", art: undefined });
  });

  it("asks the bestiary once per beast, and keeps a quest's beast apart from an authored one of the same id", async () => {
    mockGetBeastById.mockResolvedValue({ id: "b1", name: "Mustwisp" });
    const { beast } = roomScreen(undefined);

    const first = beast.getBeastCard("b1");
    expect(beast.getBeastCard("b1")).toBe(first);
    expect(mockGetBeastById).toHaveBeenCalledTimes(1);

    expect(beast.getBeastCard("b1", true)).not.toBe(first);
    expect(mockGetBeastById).toHaveBeenCalledTimes(2);
  });
});

describe("a room that holds a quest", () => {
  const questRoom = () => monster({ quest: QUEST });
  const liveQuest = (beastId?: string) => ({ resolution: { kind: "live" }, beastId });

  it("shows the quest's beast, once the run has read its board", async () => {
    const board = deferred<void>();
    mockWhenQuestRoomsReady.mockReturnValue(board.promise);
    mockQuestRoomStateFor.mockReturnValue(liveQuest("q-beast"));
    mockGetBeastById.mockResolvedValue({ id: "q-beast", name: "Quest Beast", imageUrl: "quest.png" });
    const room = questRoom();
    const { beast } = roomScreen(room);
    await settle();
    expect(beast.showVoxelMonster.value).toBe(false);
    expect(mockQuestRoomStateFor).not.toHaveBeenCalled();

    board.resolve();
    await settle();

    expect(mockWhenQuestRoomsReady).toHaveBeenCalledWith("t1");
    expect(mockQuestRoomStateFor).toHaveBeenCalledWith(room, "t1", "hero-1");
    expect(beast.activeMonster.value).toEqual({ name: "Quest Beast", avatar: "quest.png" });
    expect(beast.showVoxelMonster.value).toBe(true);
  });

  it("takes the quest's beast from the library when the family has not met it", async () => {
    mockQuestRoomStateFor.mockReturnValue(liveQuest(String(LIBRARY_BEAST.id)));
    mockGetBeastById.mockResolvedValue({ id: "x", name: "" });
    const { beast } = roomScreen(questRoom());
    await settle();

    expect(beast.activeMonster.value.name).toBe(String(LIBRARY_BEAST.name).trim());
  });

  it("keeps the stand-in for a quest with no beast, and the voxel is not held back", async () => {
    const room = questRoom();
    mockQuestRoomStateFor.mockReturnValue(liveQuest(undefined));
    const { beast } = roomScreen(room);
    await settle();

    expect(beast.activeMonster.value.name).toBe(standInMonster(room, "fire").name);
    expect(beast.showVoxelMonster.value).toBe(true);
    expect(mockGetBeasts).not.toHaveBeenCalled();
  });

  it("keeps the stand-in for a quest whose beast nothing knows", async () => {
    const room = questRoom();
    mockQuestRoomStateFor.mockReturnValue(liveQuest("nobody"));
    const { beast } = roomScreen(room);
    await settle();

    expect(beast.activeMonster.value.name).toBe(standInMonster(room, "fire").name);
    expect(beast.showVoxelMonster.value).toBe(true);
  });

  it("plays a dormant room as a classic fight with its authored beast", async () => {
    mockQuestRoomStateFor.mockReturnValue({ resolution: { kind: "dormant" }, beastId: "q-beast" });
    mockGetBeastById.mockResolvedValue({ id: "b1", name: "Authored", imageUrl: "authored.png" });
    const { beast } = roomScreen(monster({ quest: QUEST, beasts: ["b1"] }));
    await settle();

    expect(beast.activeMonster.value).toEqual({ name: "Authored", avatar: "authored.png" });
    expect(mockGetBeastById).not.toHaveBeenCalledWith("q-beast");
  });

  it("plays as a classic fight when the run has no board to read for the quest", async () => {
    mockQuestRoomStateFor.mockReturnValue(null);
    mockGetBeasts.mockResolvedValue([fireBeast("n1", "Native One")]);
    const { beast } = roomScreen(questRoom());
    await settle();

    expect(beast.activeMonster.value.name).toBe("Native One");
  });

  it("plays as a classic fight, and reads no board, when no hero's run is behind the screen", async () => {
    mockGetBeasts.mockResolvedValue([fireBeast("n1", "Native One")]);
    const { beast } = roomScreen(questRoom(), { progressHeroId: undefined });
    await settle();

    expect(mockWhenQuestRoomsReady).not.toHaveBeenCalled();
    expect(mockQuestRoomStateFor).not.toHaveBeenCalled();
    expect(beast.activeMonster.value.name).toBe("Native One");
  });

  it("goes on to read the room when the board could not be read", async () => {
    mockWhenQuestRoomsReady.mockRejectedValue(new Error("no board"));
    mockQuestRoomStateFor.mockReturnValue(liveQuest("q-beast"));
    mockGetBeastById.mockResolvedValue({ id: "q-beast", name: "Quest Beast", imageUrl: "quest.png" });
    const { beast } = roomScreen(questRoom());
    await settle();

    expect(beast.activeMonster.value.name).toBe("Quest Beast");
  });

  it("does not hand the quest's beast to a room the hero has since left", async () => {
    const lookup = deferred<unknown>();
    mockQuestRoomStateFor.mockReturnValue(liveQuest("q-beast"));
    mockGetBeastById.mockReturnValueOnce(lookup.promise);
    const { beast, currentRoom } = roomScreen(questRoom());
    await settle();

    const next = monster();
    currentRoom.value = next;
    await settle();
    lookup.resolve({ id: "q-beast", name: "Quest Beast", imageUrl: "quest.png" });
    await settle();

    expect(beast.activeMonster.value.name).toBe(standInMonster(next, "fire").name);
  });
});

describe("a room with no authored beast: the one the bestiary picks for the temple", () => {
  it("is the element's beast for the room's place, by position", async () => {
    mockGetBeasts.mockResolvedValue([fireBeast("n1", "Native One", { avatar: 3 }), fireBeast("n2", "Native Two", { avatar: 4 })]);
    const { beast } = roomScreen(monster());
    await settle();

    // [row 0, column 1] -> (0 + 1) % 2 = the second fire beast
    expect(beast.activeMonster.value).toEqual({ name: "Native Two", avatar: "avatar-4" });
  });

  it("takes the picked beast's image url, then its local image, then the stand-in's face", async () => {
    mockGetBeasts.mockResolvedValue([fireBeast("n1", "Native One", { imageUrl: "one.png" })]);
    const withUrl = roomScreen(monster());
    await settle();
    expect(withUrl.beast.activeMonster.value).toEqual({ name: "Native One", avatar: "one.png" });

    mockGetBeasts.mockResolvedValue([fireBeast("n1", "Native One", { localImage: "local.png" })]);
    const withLocal = roomScreen(monster());
    await settle();
    expect(withLocal.beast.activeMonster.value.avatar).toBe("local.png");

    mockGetBeasts.mockResolvedValue([fireBeast("n1", "Native One")]);
    const withNone = roomScreen(monster());
    await settle();
    expect(withNone.beast.activeMonster.value).toEqual({ name: "Native One", avatar: "avatar-74" });
  });

  it("matches a named monster type before the element", async () => {
    mockGetBeasts.mockResolvedValue([fireBeast("n1", "Native One"), fireBeast("w1", "Grey Wolf", { element: "ice" })]);
    const { beast } = roomScreen(monster({ monsterType: "wolf" }));
    await settle();

    expect(beast.activeMonster.value.name).toBe("Grey Wolf");
  });

  it("uses the temple's element, fire when it has none", async () => {
    mockGetBeasts.mockResolvedValue([fireBeast("n1", "Native One"), fireBeast("i1", "Ice One", { element: "ice" })]);
    const iceTemple = roomScreen(monster(), { templeElement: computed(() => "ice") });
    await settle();
    expect(iceTemple.beast.activeMonster.value.name).toBe("Ice One");

    const noElement = roomScreen(monster(), { templeElement: computed(() => "") });
    await settle();
    expect(noElement.beast.activeMonster.value.name).toBe("Native One");
  });

  it("stands in when the temple's element has no beasts in the bestiary", async () => {
    const room = monster();
    mockGetBeasts.mockResolvedValue([fireBeast("i1", "Ice One", { element: "ice" })]);
    const { beast } = roomScreen(room);
    await settle();

    expect(beast.activeMonster.value.name).toBe(standInMonster(room, "fire").name);
    expect(beast.showVoxelMonster.value).toBe(true);
  });

  it("stands in when the bestiary cannot be read, and the voxel is not held back", async () => {
    const room = monster();
    mockGetBeasts.mockRejectedValue(new Error("storage is gone"));
    const { beast } = roomScreen(room);
    await settle();

    expect(beast.activeMonster.value.name).toBe(standInMonster(room, "fire").name);
    expect(beast.showVoxelMonster.value).toBe(true);
  });

  it("holds the voxel back while the bestiary is read", async () => {
    const list = deferred<unknown[]>();
    mockGetBeasts.mockReturnValue(list.promise);
    const { beast } = roomScreen(monster());
    await settle();
    expect(beast.showVoxelMonster.value).toBe(false);

    list.resolve([fireBeast("n1", "Native One")]);
    await settle();

    expect(beast.showVoxelMonster.value).toBe(true);
  });

  it("does not hand the picked beast to a room the hero has since left", async () => {
    const list = deferred<unknown[]>();
    mockGetBeasts.mockReturnValueOnce(list.promise);
    const { beast, currentRoom } = roomScreen(monster());
    await settle();

    const next = { type: "empty" } as Room;
    currentRoom.value = next;
    await settle();
    list.resolve([fireBeast("n1", "Native One")]);
    await settle();

    expect(beast.activeMonster.value.name).not.toBe("Native One");
  });

  it("waits, asking nothing, for a generated temple's metadata (its element comes with it), then picks", async () => {
    mockGetBeasts.mockResolvedValue([fireBeast("n1", "Native One")]);
    const { beast, templeMeta } = roomScreen(monster(), {}, { generated: true, meta: null });
    await settle();
    expect(beast.showVoxelMonster.value).toBe(false);
    expect(mockGetBeasts).not.toHaveBeenCalled();

    templeMeta.value = { element: "fire" };
    await settle();

    expect(beast.showVoxelMonster.value).toBe(true);
    expect(beast.activeMonster.value.name).toBe("Native One");
  });
});
