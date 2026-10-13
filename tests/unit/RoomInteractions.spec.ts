import { createPinia, setActivePinia } from "pinia";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { MapVisibility, TEMPLE_CLEARED_KEY } from "@/lib/engine/core/dungeons/TempleSystem";
import {
  answerRiddle,
  buyWare,
  clearTemple,
  onEnterRoom,
  resetVisitMemory,
  roomActions,
  type RoomOutcome,
} from "@/lib/services/temples/RoomInteractions";
import { useUserStore } from "@/lib/store/stores/user";
import { addHero, contextAt, dice, dungeons, enter, hero, hp, makeTemple, mp, temples, wallet } from "./templeFixtures";

// The user store is real; only what it writes to disk is faked, so HP, MP and GP move exactly as in the app.
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
// A knocked-out hero is admitted to the Hospital, which tells the family; those outlets are doubles here.
jest.mock("@/lib/store/stores/chat", () => ({
  __esModule: true,
  FAMILY_CHAT_ROOM: "family-chat",
  useChatStore: () => ({ postSystemLine: jest.fn(async () => ({})) }),
}));
jest.mock("@/lib/store/stores/notifications", () => ({
  __esModule: true,
  useNotificationsStore: () => ({ push: jest.fn() }),
}));
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: () => Promise.resolve(null),
    saveProgress: (progress: unknown) => Promise.resolve(progress),
  }),
}));

beforeEach(() => {
  setActivePinia(createPinia());
  resetVisitMemory();
  addHero();
});

/** A one-row temple: the entrance, then the room under test at column 1. */
const withRoom = (room: Room, extra: Record<string, Room> = {}) => {
  const id = makeTemple({ E: { type: "entrance" }, X: room, ...extra }, [["E", "X"]]);
  enter(id, [0, 1]);
  return { id, room: dungeons.getRoom(id, [0, 1])!, ctx: contextAt(id, [0, 1]) };
};

const labels = (sheet: { actions: Array<{ label: string }> }) => sheet.actions.map((action) => action.label);
const run = async (sheet: ReturnType<typeof roomActions>, index = 0): Promise<RoomOutcome> => sheet.actions[index].run();

describe("the sheet of every room type", () => {
  const types: Array<[string, Room, string, string[]]> = [
    ["entrance", { type: "entrance" }, "The way out is behind you.", ["Leave Temple"]],
    ["exit (a second EXIT token)", { type: "exit" }, "The way out is behind you.", ["Leave Temple"]],
    ["empty", { type: "empty" }, "An empty room. Dust and echoes.", ["Look around"]],
    ["health", { type: "health" }, "A spring of clear water.", ["Drink"]],
    ["mana", { type: "mana" }, "A spring of silver light.", ["Drink"]],
    ["camp", { type: "camp" }, "A safe place to rest.", ["Make camp"]],
    ["trap that cannot be dodged", { type: "trap" }, "Something nasty waits underfoot.", []],
    ["trap that can be dodged", { type: "trap", content: { avoidable: true } }, "Something nasty waits underfoot.", ["Jump across", "Walk through"]],
    ["puzzle", { type: "puzzle" }, "Glyphs cover the wall.", ["Study the glyphs"]],
    ["teleport", { type: "teleport" }, "A shimmering circle.", ["Teleport"]],
    ["shop", { type: "shop" }, "Can I interest you in my wares?", ["View wares"]],
    ["full chest", { type: "loot", content: { chest: "dungeon", dungeon: "map" } }, "A chest!", ["Open Chest"]],
    ["opened chest", { type: "loot", isEmpty: true, content: { chest: "dungeon", dungeon: "map" } }, "An old chest, already opened.", ["Inspect Empty Chest"]],
    ["key", { type: "key", content: { keyId: "key1" } }, "A key glints in the dust.", ["Take it"]],
    ["monster", { type: "monster" }, "A Monster approaches!", ["Fight"]],
    ["miniboss", { type: "miniboss" }, "A fierce foe blocks the way!", ["Fight"]],
    ["boss", { type: "boss" }, "A Powerful Boss appears!", ["Fight"]],
    ["stairs up", { type: "stairs-up" }, "Stairs lead up.", ["Climb"]],
    ["stairs down", { type: "stairs_down" }, "Stairs lead down.", ["Climb"]],
    ["pit", { type: "pit" }, "A hole in the floor. Mind your step.", []],
    ["void", { type: "void" }, "Nothing but dark.", []],
    ["secret", { type: "secret" }, "A hidden chamber!", ["Open the chest"]],
    ["save", { type: "save" }, "A quiet alcove.", ["Save"]],
    ["save (savepoint in the DSL)", { type: "savepoint" }, "A quiet alcove.", ["Save"]],
    ["something nobody planned for", { type: "banana" }, "Something strange.", []],
  ];

  it.each(types)("%s", (_name, room, header, expected) => {
    const { ctx, room: placed } = withRoom(room);
    const sheet = roomActions(placed, ctx);

    expect(sheet.header).toBe(header);
    expect(labels(sheet)).toEqual(expected);
  });

  it("says something strange about a room that is not there", () => {
    const { ctx } = withRoom({ type: "empty" });
    expect(roomActions(undefined, ctx)).toMatchObject({ header: "Something strange.", actions: [] });
  });

  it("marks a chest for the screen to open itself, shut, instead of showing a sheet", () => {
    const full = withRoom({ type: "loot", content: { chest: "dungeon", dungeon: "map" } });
    expect(roomActions(full.room, full.ctx).chest).toBe("closed");

    const opened = withRoom({ type: "loot", isEmpty: true, content: { chest: "dungeon", dungeon: "map" } });
    expect(roomActions(opened.room, opened.ctx).chest).toBe("empty");

    const monster = withRoom({ type: "monster" });
    expect(roomActions(monster.room, monster.ctx).chest).toBeUndefined();
  });

  it("hands the screen what it must open for rooms it owns", async () => {
    const leave = withRoom({ type: "entrance" });
    expect(await run(roomActions(leave.room, leave.ctx))).toEqual({ intent: "leave" });

    const fight = withRoom({ type: "monster" });
    expect(await run(roomActions(fight.room, fight.ctx))).toEqual({ intent: "fight" });

    const chest = withRoom({ type: "loot", content: { chest: "dungeon", dungeon: "map" } });
    expect(await run(roomActions(chest.room, chest.ctx))).toEqual({ intent: "openChest" });

    const opened = withRoom({ type: "loot", isEmpty: true });
    expect(await run(roomActions(opened.room, opened.ctx))).toEqual({ intent: "emptyChest" });

    const teleport = withRoom({ type: "teleport" });
    expect(await run(roomActions(teleport.room, teleport.ctx))).toEqual({ intent: "teleport" });
  });
});

describe("empty rooms", () => {
  it("can hide a few GP under a stone, once", async () => {
    const { room, ctx } = withRoom({ type: "empty" });
    const lucky = { ...ctx, rng: dice(0.1, 0.5) }; // under a third, then 1 + floor(0.5 * 5)

    const outcome = await run(roomActions(room, lucky));

    expect(outcome.message).toBe("You found 3 GP under a stone!");
    expect(wallet()).toBe(103);
    expect(labels(roomActions(room, ctx))).toEqual([]); // looked already
  });

  it("often has nothing but a flavour line", async () => {
    const { room, ctx } = withRoom({ type: "empty" });

    const outcome = await run(roomActions(room, { ...ctx, rng: dice(0.9, 0) }));

    expect(outcome.message).toEqual(expect.any(String));
    expect(outcome.message).not.toMatch(/GP/);
    expect(wallet()).toBe(100);
  });
});

describe("springs and camps", () => {
  it("lets a hero drink the health spring once for its healthPoints", async () => {
    const { room, ctx } = withRoom({ type: "health", content: { healthPoints: 15 } });

    const outcome = await run(roomActions(room, ctx));

    expect(outcome).toMatchObject({ message: "+15 HP", sound: "restoreHP" });
    expect(hp()).toBe(45);
    const after = roomActions(room, ctx);
    expect(after.header).toBe("The spring is still.");
    expect(after.actions).toEqual([]);
  });

  it("restores 10 HP by default, never past the maximum", async () => {
    addHero({ hp: { now: 45, max: 50 } });
    const { room, ctx } = withRoom({ type: "health" });

    expect((await run(roomActions(room, ctx))).message).toBe("+5 HP");
    expect(hp()).toBe(50);
  });

  it("does not use the spring up on a hero who is not hurt", async () => {
    addHero({ hp: { now: 50, max: 50 } });
    const { room, ctx } = withRoom({ type: "health" });

    expect((await run(roomActions(room, ctx))).message).toMatch(/Not thirsty/);
    expect(labels(roomActions(room, ctx))).toEqual(["Drink"]);
  });

  it("restores MP at the mana spring, from magicPoints", async () => {
    const { room, ctx } = withRoom({ type: "mana", content: { magicPoints: 15 } });

    const outcome = await run(roomActions(room, ctx));

    expect(outcome).toMatchObject({ message: "+15 MP", sound: "restoreMP" });
    expect(mp()).toBe(25);
    expect(roomActions(room, ctx).actions).toEqual([]);
  });

  it("fills HP and MP at the camp, once", async () => {
    const { room, ctx } = withRoom({ type: "camp" });

    const outcome = await run(roomActions(room, ctx));

    expect(outcome.sound).toBe("restoreAll");
    expect(hp()).toBe(50);
    expect(mp()).toBe(40);
    expect(roomActions(room, ctx).actions).toEqual([]);
  });

  it("is a different spring for each hero and each room", async () => {
    const { room, ctx } = withRoom({ type: "health" });
    await run(roomActions(room, ctx));

    useUserStore().users["hero-2"] = { ...hero(), id: "hero-2", stats: { ...hero().stats, hp: { now: 10, max: 50 } } };
    const other = { ...ctx, userId: "hero-2" };
    expect(labels(roomActions(room, other))).toEqual(["Drink"]);
  });
});

describe("traps", () => {
  it("bites at once on entering: damage, a sound, a shake", () => {
    const { room, ctx } = withRoom({ type: "trap", content: { trapType: "rockfall", damage: 7 } });

    const outcome = onEnterRoom(room, ctx)!;

    expect(outcome).toMatchObject({ message: "The rockfall trap bites: -7 HP", sound: "damage", shake: true });
    expect(hp()).toBe(23);
  });

  it("does 5 damage by default and reads camelCase trap names", () => {
    const { room, ctx } = withRoom({ type: "trap", content: { trapType: "blindingFlash" } });

    expect(onEnterRoom(room, ctx)!.message).toBe("The blinding flash trap bites: -5 HP");
    expect(hp()).toBe(25);
  });

  it("bites once per visit", () => {
    const { room, ctx } = withRoom({ type: "trap" });
    onEnterRoom(room, ctx);

    expect(onEnterRoom(room, ctx)).toBeNull();
    expect(hp()).toBe(25);
    expect(roomActions(room, ctx).header).toBe("A sprung trap. Quiet now.");
  });

  it("admits a hero who drops to 0 HP to the Hospital: full HP and MP, billed, instead of game over", () => {
    addHero({ hp: { now: 3, max: 50 } });
    const { room, ctx } = withRoom({ type: "trap" });

    const outcome = onEnterRoom(room, ctx)!;

    expect(outcome.defeated).toBe(true);
    expect(hp()).toBe(50);
    expect(mp()).toBe(40);
    expect(wallet()).toBe(0); // the flat 100 came out of the 100 GP the hero carried
    expect(hero().stats.gp.hospitalBill).toBe(0);
  });

  it("owes the rest of the bill and grounds a hero who cannot cover it", () => {
    addHero({ hp: { now: 3, max: 50 }, gp: { wallet: 40, savings: 0, debt: 0, limit: 1000 } });
    const { room, ctx } = withRoom({ type: "trap" });

    expect(onEnterRoom(room, ctx)!.defeated).toBe(true);

    expect(wallet()).toBe(0);
    expect(hero().stats.gp.hospitalBill).toBe(60);
    expect(hp()).toBe(50);
  });

  it("does not bill a hero who survives the trap", () => {
    const { room, ctx } = withRoom({ type: "trap" });
    expect(onEnterRoom(room, ctx)!.defeated).toBeUndefined();
    expect(wallet()).toBe(100);
  });

  it("opens its sheet first when it can be dodged", () => {
    const { room, ctx } = withRoom({ type: "trap", content: { avoidable: true, damage: 8 } });

    expect(onEnterRoom(room, ctx)).toEqual({ intent: "sheet" });
    expect(hp()).toBe(30);
  });

  it("lets an agile hero jump across without a scratch", async () => {
    addHero({ special: { agility: 8 } });
    const { room, ctx } = withRoom({ type: "trap", content: { avoidable: true } });

    const outcome = await run(roomActions(room, { ...ctx, rng: dice(0.99) }), 0);

    expect(outcome.message).toBe("You leap clear of the trap.");
    expect(hp()).toBe(30);
    expect(roomActions(room, ctx).actions).toEqual([]); // dodged, so it is over
  });

  it("gives a clumsy hero a coin flip", async () => {
    const lucky = withRoom({ type: "trap", content: { avoidable: true } });
    await run(roomActions(lucky.room, { ...lucky.ctx, rng: dice(0.4) }), 0);
    expect(hp()).toBe(30);

    const unlucky = withRoom({ type: "trap", content: { avoidable: true } });
    const outcome = await run(roomActions(unlucky.room, { ...unlucky.ctx, rng: dice(0.6) }), 0);
    expect(outcome.message).toMatch(/trap bites: -5 HP/);
    expect(hp()).toBe(25);
  });

  it("always bites when the hero walks through", async () => {
    addHero({ special: { agility: 20 } });
    const { room, ctx } = withRoom({ type: "trap", content: { avoidable: true, damage: 4, trapType: "lavaPool" } });

    const outcome = await run(roomActions(room, ctx), 1);

    expect(outcome.message).toBe("The lava pool trap bites: -4 HP");
    expect(hp()).toBe(26);
  });
});

describe("puzzles", () => {
  /** Puzzle room at [0,1] with a locked door east of it and a locked door west of the room beyond. */
  const lockedCorridor = () => {
    const id = makeTemple(
      {
        E: { type: "entrance" },
        P: { type: "puzzle", content: { puzzleType: "stonePillars" }, locked: { east: true } },
        N: { type: "empty", locked: { west: true } },
      },
      [["E", "P", "N"]]
    );
    enter(id, [0, 1]);
    return { id, room: dungeons.getRoom(id, [0, 1])!, ctx: contextAt(id, [0, 1]) };
  };

  it("asks a riddle of three choices without giving the answer away", async () => {
    const { room, ctx } = lockedCorridor();

    const outcome = await run(roomActions(room, ctx));

    expect(outcome.intent).toBe("riddle");
    expect(outcome.riddle).toMatchObject({ id: "stonePillars", choices: expect.any(Array) });
    expect(outcome.riddle!.choices).toHaveLength(3);
    expect(outcome.riddle).not.toHaveProperty("answer");
  });

  it("falls back to a generic riddle for a puzzle it does not know", async () => {
    const { room, ctx } = withRoom({ type: "puzzle", content: { puzzleType: "somethingNew" } });

    const outcome = await run(roomActions(room, ctx));

    expect(outcome.riddle!.id).toBe("generic");
    expect(outcome.riddle!.choices).toHaveLength(3);
  });

  it("opens this room's locked doors and the door back from the room beyond when solved", () => {
    const { id, room, ctx } = lockedCorridor();

    const outcome = answerRiddle(room, ctx, 2); // a pillar

    expect(outcome).toMatchObject({ message: "The glyphs fade. A door unlocks.", sound: "shhh" });
    expect(dungeons.getRoom(id, [0, 1])!.locked!.east).toBe(false);
    expect(dungeons.getRoom(id, [0, 2])!.locked!.west).toBe(false);
    expect(hp()).toBe(30);
  });

  it("can be solved only once", () => {
    const { room, ctx } = lockedCorridor();
    answerRiddle(room, ctx, 2);

    const sheet = roomActions(room, ctx);

    expect(sheet.header).toBe("The glyphs have faded.");
    expect(sheet.actions).toEqual([]);
    expect(answerRiddle(room, ctx, 0).message).toBe("The glyphs have faded.");
  });

  it("costs 3 HP to get wrong, and the wall may be tried again", () => {
    const { room, ctx } = lockedCorridor();

    const outcome = answerRiddle(room, ctx, 0);

    expect(outcome).toMatchObject({ message: "Wrong. The wall glows hot.", sound: "damage", shake: true });
    expect(hp()).toBe(27);
    expect(labels(roomActions(room, ctx))).toEqual(["Study the glyphs"]);
  });

  it("can knock a hero out", () => {
    addHero({ hp: { now: 2, max: 50 } });
    const { room, ctx } = lockedCorridor();

    expect(answerRiddle(room, ctx, 0).defeated).toBe(true);
    expect(hp()).toBe(50);
    expect(wallet()).toBe(0);
  });
});

describe("shops", () => {
  const shop = () => withRoom({ type: "shop", content: { specialItem: "EarthquakeScroll" } });

  it("lists the potion and the special item with the hero's GP", async () => {
    const { room, ctx } = shop();

    const outcome = await run(roomActions(room, ctx));

    expect(outcome.intent).toBe("shop");
    expect(outcome.gp).toBe(100);
    expect(outcome.wares).toEqual([
      expect.objectContaining({ id: "potion-of-vigor", name: "Potion of Vigor", price: 15 }),
      expect.objectContaining({ id: "special:EarthquakeScroll", name: "Earthquake Scroll", price: 50 }),
    ]);
  });

  it("always sells the potion, even in a shop with no special item", async () => {
    const { room, ctx } = withRoom({ type: "shop" });

    const outcome = await run(roomActions(room, ctx));

    expect(outcome.wares!.map((ware) => ware.id)).toEqual(["potion-of-vigor"]);
  });

  it("sells a potion that heals 20 HP now", () => {
    const { room, ctx } = shop();

    const outcome = buyWare(room, ctx, "potion-of-vigor");

    expect(outcome).toMatchObject({ message: "Potion of Vigor: +20 HP", sound: "buyItem" });
    expect(wallet()).toBe(85);
    expect(hp()).toBe(50);
  });

  it("keeps the GP of a hero who is not hurt", () => {
    addHero({ hp: { now: 50, max: 50 } });
    const { room, ctx } = shop();

    expect(buyWare(room, ctx, "potion-of-vigor").sound).toBe("error");
    expect(wallet()).toBe(100);
  });

  it("puts the special item in the bag, from this temple, and only once", () => {
    const { id, room, ctx } = shop();

    const outcome = buyWare(room, ctx, "special:EarthquakeScroll");

    expect(outcome).toMatchObject({ sound: "buyItem" });
    expect(wallet()).toBe(50);
    // Bag items carry their type and icon since e2e9798f (My Goods files them by type)
    expect(hero().inventory).toEqual([
      expect.objectContaining({ name: "EarthquakeScroll", source: id, type: "material", faIcon: "gem" }),
    ]);
    expect(buyWare(room, ctx, "special:EarthquakeScroll")).toMatchObject({ message: expect.stringMatching(/Sold out/), sound: "error" });
    expect(wallet()).toBe(50);
    expect(hero().inventory).toHaveLength(1);
  });

  it("refuses a hero who cannot pay", () => {
    addHero({ gp: { wallet: 10, savings: 0, debt: 0, limit: 1000 } });
    const { room, ctx } = shop();

    expect(buyWare(room, ctx, "potion-of-vigor")).toEqual({ message: "Not enough GP", sound: "error" });
    expect(buyWare(room, ctx, "special:EarthquakeScroll")).toEqual({ message: "Not enough GP", sound: "error" });
    expect(wallet()).toBe(10);
    expect(hp()).toBe(30);
    expect(hero().inventory).toBeUndefined();
  });

  it("does not carry what it never listed", () => {
    const { room, ctx } = shop();
    expect(buyWare(room, ctx, "special:Banana").sound).toBe("error");
    expect(wallet()).toBe(100);
  });
});

describe("the temple gate", () => {
  /** Entrance, a boss, the gate. */
  const gateTemple = (gate: Room = { type: "gate" }) => {
    const id = makeTemple({ E: { type: "entrance" }, B: { type: "boss" }, G: gate }, [["E", "B", "G"]]);
    enter(id, [0, 2]);
    return { id, room: dungeons.getRoom(id, [0, 2])!, ctx: contextAt(id, [0, 2]) };
  };

  it("will not budge while the boss lives and the hero has no master key", () => {
    const { room, ctx } = gateTemple();

    const sheet = roomActions(room, ctx);

    expect(sheet.header).toBe("A great gate, sealed.");
    expect(sheet.subHeader).toBe("It will not budge. The Boss Key, or the beast that guards it, must come first.");
    expect(sheet.actions).toEqual([]);
  });

  it("opens once the boss room is cleared: temple cleared, reward paid, back to the world", async () => {
    const { id, room, ctx } = gateTemple();
    temples.markRoomCleared(id, "1F", [0, 1]);

    const sheet = roomActions(room, ctx);
    expect(labels(sheet)).toEqual(["Open the gate"]);
    const outcome = await run(sheet);

    expect(outcome).toMatchObject({ intent: "leave", sound: "shhh" });
    expect(outcome.message).toMatch(/\+150 XP, \+50 GP, \+3 AP/);
    expect(temples.isTempleCleared(id)).toBe(true);
    expect(temples.getTempleState(id)!.clearedRooms!.has(TEMPLE_CLEARED_KEY)).toBe(true);
    expect(wallet()).toBe(150);
    expect(hero().stats.ap.total).toBe(3);
    expect(hero().stats.xp.now).toBe(150);
  });

  it("opens for a hero who holds the master key, boss or not", async () => {
    const { id, room, ctx } = gateTemple();
    temples.grantMasterKey(id);

    expect(labels(roomActions(room, ctx))).toEqual(["Open the gate"]);
  });

  it("hands the screen the tally for the temple-cleared reveal", async () => {
    const { id, room, ctx } = gateTemple();
    temples.grantMasterKey(id);

    const outcome = await run(roomActions(room, ctx));

    expect(outcome.cleared).toEqual({ xp: 150, gp: 50, ap: 3, levelUp: false });
  });

  it("tells the reveal when the clear levelled the hero up", async () => {
    const { id, room, ctx } = gateTemple({ type: "gate", content: { reward: { xp: 500, gp: 0, ap: 0 } } });
    temples.grantMasterKey(id);

    const outcome = await run(roomActions(room, ctx));

    expect(outcome.cleared).toMatchObject({ xp: 500, gp: 0, ap: 0, levelUp: true });
    expect(outcome.message).toMatch(/Level up!/);
  });

  it("has no tally for a gate that was already open: the second clear pays nothing", async () => {
    const { id, room, ctx } = gateTemple();
    temples.grantMasterKey(id);
    await run(roomActions(room, ctx));

    const second = await run(roomActions(room, ctx));

    expect(second).toEqual({ intent: "leave", sound: "yes" });
    expect(second.cleared).toBeUndefined();
  });

  it("pays the reward the layout names", async () => {
    const { id, room, ctx } = gateTemple({ type: "gate", content: { reward: { xp: 10, gp: 5, ap: 1 } } });
    temples.grantMasterKey(id);

    const outcome = await run(roomActions(room, ctx));

    expect(outcome.message).toMatch(/\+10 XP, \+5 GP, \+1 AP/);
    expect(wallet()).toBe(105);
    expect(hero().stats.ap.total).toBe(1);
  });

  it("pays only once: an open gate just lets the hero out", async () => {
    const { id, room, ctx } = gateTemple();
    temples.grantMasterKey(id);
    await run(roomActions(room, ctx));

    const sheet = roomActions(room, ctx);
    const outcome = await run(sheet);

    expect(sheet.header).toBe("The gate stands open.");
    expect(outcome.intent).toBe("leave");
    expect(wallet()).toBe(150);
  });

  it("is simply open in a temple with no boss to beat", () => {
    const id = makeTemple({ E: { type: "entrance" }, G: { type: "gate" } }, [["E", "G"]]);
    enter(id, [0, 1]);

    expect(labels(roomActions(dungeons.getRoom(id, [0, 1])!, contextAt(id, [0, 1])))).toEqual(["Open the gate"]);
  });
});

describe("clearing a temple", () => {
  const gateTemplate = (gate: Room = { type: "gate" }) => {
    const id = makeTemple({ E: { type: "entrance" }, G: gate }, [["E", "G"]]);
    enter(id, [0, 1]);
    return id;
  };

  it("marks the temple cleared and pays the standard reward once", () => {
    const id = gateTemplate();

    const paid = clearTemple(id, "hero-1");

    expect(paid).toEqual({ xp: 150, gp: 50, ap: 3, levelUp: false });
    expect(temples.isTempleCleared(id)).toBe(true);
    expect(wallet()).toBe(150);
    expect(hero().stats.ap.total).toBe(3);
    expect(hero().stats.xp.now).toBe(150);
  });

  it("pays nothing the second time, whichever way the temple is cleared", async () => {
    const id = gateTemplate();
    clearTemple(id, "hero-1");

    expect(clearTemple(id, "hero-1")).toBeNull();
    // ... nor does the gate, which only lets the hero out
    const room = dungeons.getRoom(id, [0, 1])!;
    const outcome = await run(roomActions(room, contextAt(id, [0, 1])));
    expect(outcome).toEqual({ intent: "leave", sound: "yes" });
    expect(wallet()).toBe(150);
    expect(hero().stats.xp.now).toBe(150);
  });

  it("pays the reward the temple's gate names, even when the chest clears it", () => {
    const id = gateTemplate({ type: "gate", content: { reward: { xp: 40, gp: 8, ap: 2 } } });

    expect(clearTemple(id, "hero-1")).toEqual({ xp: 40, gp: 8, ap: 2, levelUp: false });
    expect(wallet()).toBe(108);
  });

  it("takes the reward it is told to pay over the temple's own", () => {
    const id = gateTemplate();

    expect(clearTemple(id, "hero-1", { xp: 5, gp: 0, ap: 0 })).toEqual({ xp: 5, gp: 0, ap: 0, levelUp: false });
    expect(wallet()).toBe(100);
  });

  it("clears the temple for a run with no hero, and pays nobody", () => {
    const id = gateTemplate();

    expect(clearTemple(id)).toBeNull();
    expect(temples.isTempleCleared(id)).toBe(true);
    expect(wallet()).toBe(100);
  });
});

describe("the beast an encounter shows", () => {
  it.each([
    ["monster", "A Monster approaches!"],
    ["miniboss", "A fierce foe blocks the way!"],
    ["boss", "A Powerful Boss appears!"],
  ])("hands the screen the first beast of a %s room, under the kind's line", async (type, header) => {
    const { ctx, room } = withRoom({ type, content: { beasts: ["beast-socktopus", "beast-dust-bunny-king"] } });

    const sheet = roomActions(room, ctx);

    expect(sheet.header).toBe(header);
    expect(sheet.beastId).toBe("beast-socktopus");
    // The fight itself is unchanged: one action, the screen starts the battle
    expect(labels(sheet)).toEqual(["Fight"]);
    expect(await run(sheet)).toEqual({ intent: "fight" });
  });

  it.each(["monster", "miniboss", "boss"])("names no beast for a %s room that lists none", (type) => {
    const withNone = withRoom({ type });
    expect(roomActions(withNone.room, withNone.ctx).beastId).toBeUndefined();

    const empty = withRoom({ type, content: { beasts: [] } });
    expect(roomActions(empty.room, empty.ctx).beastId).toBeUndefined();
  });

  it("keeps a beast id as the text it is (a numeric id is still an id)", () => {
    const { ctx, room } = withRoom({ type: "monster", content: { beasts: [74 as unknown as string] } });
    expect(roomActions(room, ctx).beastId).toBe("74");
  });

  it("shows no beast once the fight is won: the room only offers its search", () => {
    const { id, ctx, room } = withRoom({ type: "monster", content: { beasts: ["beast-socktopus"] } });
    temples.markRoomCleared(id, "1F", [0, 1]);

    const sheet = roomActions(room, ctx);

    expect(sheet.header).toBe("Nothing left here but the smell.");
    expect(sheet.beastId).toBeUndefined();
    expect(labels(sheet)).toEqual(["Search the room"]);
  });

  it("names no beast for rooms that are not encounters", () => {
    const { ctx, room } = withRoom({ type: "empty", content: { beasts: ["beast-socktopus"] } });
    expect(roomActions(room, ctx).beastId).toBeUndefined();
  });
});

describe("fights that are over", () => {
  it("leaves nothing but the smell, and a one in two chance of 2-8 GP", async () => {
    const { id, room, ctx } = withRoom({ type: "monster" });
    temples.markRoomCleared(id, "1F", [0, 1]);

    const sheet = roomActions(room, { ...ctx, rng: dice(0.2, 0.5) });
    expect(sheet.header).toBe("Nothing left here but the smell.");
    expect(labels(sheet)).toEqual(["Search the room"]);
    const outcome = await run(sheet);

    expect(outcome.message).toBe("You found 5 GP in the mess.");
    expect(wallet()).toBe(105);
    expect(roomActions(room, ctx).actions).toEqual([]);
  });

  it("finds nothing half the time", async () => {
    const { id, room, ctx } = withRoom({ type: "boss" });
    temples.markRoomCleared(id, "1F", [0, 1]);

    const outcome = await run(roomActions(room, { ...ctx, rng: dice(0.9) }));

    expect(outcome.message).toBe("Nothing but the smell.");
    expect(wallet()).toBe(100);
  });
});

describe("stairs and pits", () => {
  const tower = (upper: Room = { type: "empty" }) => {
    const id = makeTemple(
      { E: { type: "entrance" }, U: { type: "stairs-up" }, D: { type: "stairs-down" }, F: upper, P: { type: "pit" } },
      { "1F": [["E", "U", "P"]], "2F": [["F", "D", "F"]] }
    );
    return id;
  };

  it("climbs up to the stairs down on the floor above", async () => {
    const id = tower();
    enter(id, [0, 1]);
    const room = dungeons.getRoom(id, [0, 1], "1F")!;

    const outcome = await run(roomActions(room, contextAt(id, [0, 1])));

    expect(outcome).toMatchObject({ message: "You climb up to 2F.", sound: "steps", moved: true });
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 1] });
  });

  it("climbs down again", async () => {
    const id = tower();
    enter(id, [0, 1], "2F");
    const room = dungeons.getRoom(id, [0, 1], "2F")!;

    const outcome = await run(roomActions(room, contextAt(id, [0, 1])));

    expect(outcome.message).toBe("You climb down to 1F.");
    expect(outcome.sound).toBe("steps");
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 1] });
  });

  it("finds rubble where the layout has no such floor", async () => {
    const { id, room, ctx } = withRoom({ type: "stairs-up" });

    const outcome = await run(roomActions(room, ctx));

    expect(outcome).toEqual({ message: "The stairs are blocked by rubble.", sound: "error" });
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 1] });
  });

  it("drops a hero through a pit to the floor below, 5 HP lighter", () => {
    const upper = makeTemple(
      { E: { type: "entrance" }, P: { type: "pit" }, F: { type: "empty" } },
      { "1F": [["E", "F"]], "2F": [["F", "P"]] }
    );
    enter(upper, [0, 1], "2F");

    const outcome = onEnterRoom(dungeons.getRoom(upper, [0, 1], "2F"), contextAt(upper, [0, 1]))!;

    expect(outcome).toMatchObject({ message: "You fall to 1F: -5 HP", sound: "damage", moved: true });
    expect(hp()).toBe(25);
    expect(temples.getTempleState(upper)).toMatchObject({ currentLevel: "1F", currentPosition: [0, 1] });
  });

  it("only bruises a hero when there is no floor below, and only once", () => {
    const { id, room, ctx } = withRoom({ type: "pit" });

    const outcome = onEnterRoom(room, ctx)!;

    expect(outcome).toMatchObject({ sound: "damage", shake: true });
    expect(outcome.moved).toBeUndefined();
    expect(hp()).toBe(25);
    expect(temples.getTempleState(id)!.currentPosition).toEqual([0, 1]);
    expect(onEnterRoom(room, ctx)).toBeNull();
  });
});

describe("secret chambers, saves and pick-ups", () => {
  it("holds a one-time chest of 20 GP", async () => {
    const { room, ctx } = withRoom({ type: "secret" });

    const outcome = await run(roomActions(room, ctx));

    expect(outcome.message).toBe("A hidden chest! +20 GP");
    expect(wallet()).toBe(120);
    const after = roomActions(room, ctx);
    expect(after.header).toBe("The chamber is bare now.");
    expect(after.actions).toEqual([]);
  });

  it("pays a Thief 25% more from the chest, and from what a search turns up", async () => {
    hero().jobClass = "Thief";
    const { room, ctx } = withRoom({ type: "secret" });
    expect((await run(roomActions(room, ctx))).message).toBe("A hidden chest! +25 GP");
    expect(wallet()).toBe(125);

    const empty = withRoom({ type: "empty" });
    const found = await run(roomActions(empty.room, { ...empty.ctx, rng: dice(0, 0.5) })); // finds 3 GP -> 4
    expect(found.message).toBe("You found 4 GP under a stone!");
    expect(wallet()).toBe(129);
  });

  it("pays a Warrior the plain 20 GP", async () => {
    hero().jobClass = "Warrior";
    const { room, ctx } = withRoom({ type: "secret" });
    expect((await run(roomActions(room, ctx))).message).toBe("A hidden chest! +20 GP");
    expect(wallet()).toBe(120);
  });

  it("stays off the map, compass or not, until the hero has stood in it", () => {
    const id = makeTemple({ E: { type: "entrance" }, S: { type: "secret" } }, [["E", "S"]]);
    enter(id, [0, 0]);
    const state = temples.getTempleState(id)!;
    state.hasMap = true;
    state.hasCompass = true;

    expect(temples.getRoomVisibility(id, [0, 1])).toBe(MapVisibility.NONE);
    expect(temples.shouldShowRoomDetails(id, [0, 1])).toBe(false);

    temples.moveToPosition(id, [0, 1], "east");
    expect(temples.getRoomVisibility(id, [0, 1])).toBe(MapVisibility.FULL_DETAILS);
  });

  it("saves the journey", async () => {
    const { room, ctx } = withRoom({ type: "save" });

    const outcome = await run(roomActions(room, ctx));

    expect(outcome).toEqual({ message: "Your journey is saved.", sound: "yes" });
  });

  it("hands over a key, and the master key opens the gate", async () => {
    const { id, room, ctx } = withRoom({ type: "key", content: { keyId: "key1", keyName: "Coral Key" } });

    const outcome = await run(roomActions(room, ctx));

    expect(outcome.message).toBe("You take Coral Key.");
    expect(temples.getTempleState(id)!.playerKeys).toBe(1);
    expect(roomActions(room, ctx).actions).toEqual([]);

    const master = withRoom({ type: "key", content: { keyId: "master" } });
    const taken = await run(roomActions(master.room, master.ctx));
    expect(temples.hasMasterKey(master.id)).toBe(true);
    // The player reads "Boss Key", never "master key"
    expect(taken.message).toBe("The Boss Key is yours.");

    const named = withRoom({ type: "key", content: { keyId: "master", keyName: "Trident Key" } });
    expect((await run(roomActions(named.room, named.ctx))).message).toBe("Trident Key: the Boss Key is yours.");
  });
});
