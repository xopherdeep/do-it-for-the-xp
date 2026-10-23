/**
 * Characterization of the room-symbol rules the temple editor composables use (hooks/grid/roomSymbols): which tokens
 * are shared and which belong to one room, which symbol a cell takes when its type changes, promoting a shared token
 * to a unique symbol, and the room record written for a cell.
 */
import { _00_, ____, SHOP, TELE } from "@/lib/engine/dungeons/roomTypes";
import { ENTRANCE_TOKEN } from "@/lib/store/stores/temple-creator";
import {
  buildRoomRecord,
  chooseRoomSymbol,
  isClearableRoomSymbol,
  isCoordinateToken,
  isSharedConfigToken,
  isUniqueRoomSymbol,
  promoteToUniqueSymbol,
  roomSymbols,
  withPickedBeast,
} from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/hooks/grid/roomSymbols";

describe("roomSymbols", () => {
  it("maps each room kind to its resize symbol", () => {
    expect(roomSymbols).toEqual({
      wall: ____,
      entrance: ENTRANCE_TOKEN,
      empty: "O__O",
      monster: "q__q",
      loot: "$__$",
      boss: "X__X",
      miniboss: "x__x",
      teleport: TELE,
      shop: SHOP,
      health: "H__P",
    });
  });
});

// What the temple creator store writes into a saved maze: five characters, not the legacy single letters
const STORED_WALL = "_____";
const STORED_ENTRANCE = "_00__";

describe("isUniqueRoomSymbol", () => {
  it("is false for the shared wall and entrance symbols and true for any other", () => {
    expect(isUniqueRoomSymbol(____)).toBe(false);
    expect(isUniqueRoomSymbol(_00_)).toBe(false);
    expect(isUniqueRoomSymbol("R001")).toBe(true);
    expect(isUniqueRoomSymbol("M001")).toBe(true);
    expect(isUniqueRoomSymbol("")).toBe(true);
  });

  it("is false for the stored wall and entrance tokens, so retyping a saved wall never deletes the shared record", () => {
    expect(isUniqueRoomSymbol(STORED_WALL)).toBe(false);
    expect(isUniqueRoomSymbol(STORED_ENTRANCE)).toBe(false);
  });

  it("is false for the other spellings of the wall and the entrance", () => {
    expect(isUniqueRoomSymbol("____")).toBe(false);
    expect(isUniqueRoomSymbol("WALL")).toBe(false);
    expect(isUniqueRoomSymbol("_00_")).toBe(false);
    expect(isUniqueRoomSymbol("EXIT")).toBe(false);
  });

  it("stays true for a room id and a coordinate id", () => {
    expect(isUniqueRoomSymbol("R001")).toBe(true);
    expect(isUniqueRoomSymbol("M0201")).toBe(true);
  });
});

describe("isCoordinateToken", () => {
  it("is a letter and exactly four digits", () => {
    expect(isCoordinateToken("R0000")).toBe(true);
    expect(isCoordinateToken("m1234")).toBe(true);
    expect(isCoordinateToken("R001")).toBe(false);
    expect(isCoordinateToken("R00001")).toBe(false);
    expect(isCoordinateToken("11234")).toBe(false);
    expect(isCoordinateToken("RR001")).toBe(false);
    expect(isCoordinateToken("")).toBe(false);
  });
});

describe("isSharedConfigToken", () => {
  it("is true for the wall and for shared config tokens", () => {
    expect(isSharedConfigToken(____)).toBe(true);
    expect(isSharedConfigToken("_____")).toBe(true);
    expect(isSharedConfigToken("M001")).toBe(true);
    expect(isSharedConfigToken("MINI")).toBe(true);
    expect(isSharedConfigToken("BOSS")).toBe(true);
    expect(isSharedConfigToken("O__O")).toBe(true);
  });

  it("is false for the entrance, any token starting with R, and coordinate ids", () => {
    expect(isSharedConfigToken(_00_)).toBe(false);
    expect(isSharedConfigToken(STORED_ENTRANCE)).toBe(false);
    expect(isSharedConfigToken("_00_")).toBe(false);
    expect(isSharedConfigToken("EXIT")).toBe(false);
    expect(isSharedConfigToken("R001")).toBe(false);
    expect(isSharedConfigToken("Roof")).toBe(false);
    expect(isSharedConfigToken("M0001")).toBe(false);
    expect(isSharedConfigToken("k1234")).toBe(false);
  });
});

describe("isClearableRoomSymbol", () => {
  it("is true for a symbol starting with R or a coordinate id", () => {
    expect(isClearableRoomSymbol("R001")).toBe(true);
    expect(isClearableRoomSymbol("Roof")).toBe(true);
    expect(isClearableRoomSymbol("M0001")).toBe(true);
  });

  it("is false for the wall, the entrance and shared config tokens", () => {
    expect(isClearableRoomSymbol(____)).toBe(false);
    expect(isClearableRoomSymbol(_00_)).toBe(false);
    expect(isClearableRoomSymbol(STORED_WALL)).toBe(false);
    expect(isClearableRoomSymbol(STORED_ENTRANCE)).toBe(false);
    expect(isClearableRoomSymbol("M001")).toBe(false);
    expect(isClearableRoomSymbol("BOSS")).toBe(false);
  });
});

describe("chooseRoomSymbol", () => {
  const generate = () => {
    const fn = jest.fn(() => "R042");
    return fn;
  };

  it("uses the shared wall symbol for a wall, whatever the cell held", () => {
    const gen = generate();
    expect(chooseRoomSymbol("R001", "monster", "wall", gen)).toBe(____);
    expect(chooseRoomSymbol(____, "wall", "wall", gen)).toBe(____);
    expect(gen).not.toHaveBeenCalled();
  });

  it("uses the shared entrance symbol for an entrance, whatever the cell held", () => {
    const gen = generate();
    expect(chooseRoomSymbol("R001", "monster", "entrance", gen)).toBe(ENTRANCE_TOKEN);
    expect(chooseRoomSymbol(____, "wall", "entrance", gen)).toBe(ENTRANCE_TOKEN);
    expect(gen).not.toHaveBeenCalled();
  });

  it("generates a unique symbol for a cell leaving the wall or the entrance", () => {
    const gen = generate();
    expect(chooseRoomSymbol(____, "wall", "monster", gen)).toBe("R042");
    expect(chooseRoomSymbol(_00_, "entrance", "loot", gen)).toBe("R042");
    expect(gen).toHaveBeenCalledTimes(2);
  });

  it("generates a unique symbol for a stored wall or entrance token even when the type did not change", () => {
    const gen = generate();
    expect(chooseRoomSymbol(STORED_WALL, "empty", "empty", gen)).toBe("R042");
    expect(chooseRoomSymbol(STORED_ENTRANCE, "empty", "empty", gen)).toBe("R042");
    expect(gen).toHaveBeenCalledTimes(2);
  });

  it("generates a unique symbol when a room changes type", () => {
    const gen = generate();
    expect(chooseRoomSymbol("R001", "monster", "loot", gen)).toBe("R042");
    expect(gen).toHaveBeenCalledTimes(1);
  });

  it("keeps the symbol when the type stays the same", () => {
    const gen = generate();
    expect(chooseRoomSymbol("R001", "monster", "monster", gen)).toBe("R001");
    expect(gen).not.toHaveBeenCalled();
  });
});

describe("promoteToUniqueSymbol", () => {
  const generate = () => jest.fn(() => "L0007");

  it("swaps the shared wall token for a generated symbol", () => {
    const gen = generate();
    expect(promoteToUniqueSymbol(____, gen)).toBe("L0007");
    expect(promoteToUniqueSymbol("_____", gen)).toBe("L0007");
    expect(promoteToUniqueSymbol("WALL", gen)).toBe("L0007");
    expect(gen).toHaveBeenCalledTimes(3);
  });

  it("swaps a shared config token for a generated symbol", () => {
    const gen = generate();
    expect(promoteToUniqueSymbol("M001", gen)).toBe("L0007");
    expect(promoteToUniqueSymbol("BOSS", gen)).toBe("L0007");
    expect(gen).toHaveBeenCalledTimes(2);
  });

  it("keeps the entrance, room ids and coordinate ids without generating", () => {
    const gen = generate();
    expect(promoteToUniqueSymbol(_00_, gen)).toBe(_00_);
    expect(promoteToUniqueSymbol(STORED_ENTRANCE, gen)).toBe(STORED_ENTRANCE);
    expect(promoteToUniqueSymbol("_00_", gen)).toBe("_00_");
    expect(promoteToUniqueSymbol("R001", gen)).toBe("R001");
    expect(promoteToUniqueSymbol("M0001", gen)).toBe("M0001");
    expect(gen).not.toHaveBeenCalled();
  });
});

describe("buildRoomRecord", () => {
  const plainDoors = () => ({ north: "door", east: "door", south: "door", west: "door" });

  it("is just the type for a room with plain doors and no content", () => {
    expect(buildRoomRecord("monster", {}, plainDoors())).toEqual({ type: "monster" });
  });

  it("writes the sides when any side is not a plain door, as the same object", () => {
    const sides = { ...plainDoors(), east: "locked" };
    const record = buildRoomRecord("loot", {}, sides);
    expect(record.sides).toBe(sides);
    expect(record).toEqual({ type: "loot", sides });
  });

  it("writes the content when it has anything, as the same object", () => {
    const content = { beasts: ["b1"] };
    const record = buildRoomRecord("monster", content, plainDoors());
    expect(record.content).toBe(content);
    expect(record.sides).toBeUndefined();
  });

  it("locks every door and small lock of a boss room with the boss key", () => {
    const sides = { north: "door", east: "locked", south: "bombable", west: "wall" };
    const record = buildRoomRecord("boss", {}, sides);
    expect(record.sides).toEqual({
      north: "masterlocked",
      east: "masterlocked",
      south: "bombable",
      west: "wall",
    });
  });

  it("does not change the sides it is given when locking a boss room", () => {
    const sides = plainDoors();
    const record = buildRoomRecord("boss", {}, sides);
    expect(sides).toEqual(plainDoors());
    expect(record.sides).not.toBe(sides);
  });

  it("gives a boss room with plain doors all four boss locks", () => {
    expect(buildRoomRecord("boss", { lockOnEnter: true }, plainDoors())).toEqual({
      type: "boss",
      sides: { north: "masterlocked", east: "masterlocked", south: "masterlocked", west: "masterlocked" },
      content: { lockOnEnter: true },
    });
  });

  it("leaves a boss room with no sides at all without sides", () => {
    expect(buildRoomRecord("boss", {}, {})).toEqual({ type: "boss" });
  });

  it("only locks sides for a boss, not a miniboss", () => {
    expect(buildRoomRecord("miniboss", {}, plainDoors())).toEqual({ type: "miniboss" });
  });
});

describe("withPickedBeast", () => {
  const miniboss = () => ({
    type: "miniboss",
    sides: { north: "locked", east: "door", south: "door", west: "door" },
    content: { beasts: ["b1", "b2", "b3"], lockOnEnter: true, difficulty: "hard" as const, xp: 50 },
  });

  it("replaces the one beast in its place and keeps the rest of the list", () => {
    const record = withPickedBeast(miniboss(), "miniboss", "b2", ["b9"]);
    expect(record.content?.beasts).toEqual(["b1", "b9", "b3"]);
  });

  it("keeps the sides, lockOnEnter, difficulty and rewards the room had", () => {
    const record = withPickedBeast(miniboss(), "miniboss", "b1", ["b9"]);
    expect(record).toEqual({ ...miniboss(), content: { ...miniboss().content, beasts: ["b9", "b2", "b3"] } });
  });

  it("takes several picks into the one slot, in order", () => {
    expect(withPickedBeast(miniboss(), "miniboss", "b2", ["b8", "b9"]).content?.beasts).toEqual(["b1", "b8", "b9", "b3"]);
  });

  it("drops the beast when nothing is picked in its place", () => {
    expect(withPickedBeast(miniboss(), "miniboss", "b2", []).content?.beasts).toEqual(["b1", "b3"]);
  });

  it("adds the pick at the end for a slot with no beast yet", () => {
    expect(withPickedBeast(miniboss(), "miniboss", "", ["b9"]).content?.beasts).toEqual(["b1", "b2", "b3", "b9"]);
    expect(withPickedBeast(miniboss(), "miniboss", "gone", ["b9"]).content?.beasts).toEqual(["b1", "b2", "b3", "b9"]);
  });

  it("starts a record of the fallback type for a cell that has none", () => {
    expect(withPickedBeast(undefined, "boss", "", ["b9"])).toEqual({ type: "boss", content: { beasts: ["b9"] } });
  });

  it("fills in the beasts of a record that has content but no list", () => {
    const record = withPickedBeast({ type: "monster", content: { xp: 5 } }, "monster", "", ["b9"]);
    expect(record).toEqual({ type: "monster", content: { xp: 5, beasts: ["b9"] } });
  });

  it("does not change the record it is given", () => {
    const held = miniboss();
    const record = withPickedBeast(held, "miniboss", "b2", ["b9"]);
    expect(held).toEqual(miniboss());
    expect(record).not.toBe(held);
    expect(record.content).not.toBe(held.content);
  });
});
