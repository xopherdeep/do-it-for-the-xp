/**
 * Room records for the room editor page: tidying a stored room before it is edited (legacy fields, default sides,
 * the chest it already holds), what each room type sends the type picker to next, the content a chosen chest,
 * consumable or travel room starts with, the record a room becomes when its type changes, and the chest a Quick Edit
 * loot pick writes.
 */
import type { Room, RoomContent } from "@/lib/engine/core/dungeons/types";
import { PEGASUS_ROOM_TYPES } from "@/lib/services/temples/ChestLoot";
import { defaultSides, legacyLockedToSides } from "./doorSides";

/** The room's content object, created empty first when the room has none */
export const ensureContent = (room: Room): RoomContent => {
  const content = room.content;
  if (content) return content;
  room.content = {} as RoomContent;
  return room.content;
};

// Migration: Move top-level properties to content (legacy support)
const moveLegacyFieldsIntoContent = (currentRoom: Room): void => {
  const content = ensureContent(currentRoom);
  const rd = currentRoom as Record<string, unknown>;
  const legacyBeastIds = rd.selectedBeastIds;
  if (legacyBeastIds) {
    content.beasts = legacyBeastIds as string[];
    delete rd.selectedBeastIds;
  }
  const hasLegacyMimic = rd.isMimic !== undefined;
  if (hasLegacyMimic) {
    content.isMimic = rd.isMimic as boolean;
    delete rd.isMimic;
  }
  const legacyMimicType = rd.mimicType;
  if (legacyMimicType) {
    content.mimicType = legacyMimicType as string;
    delete rd.mimicType;
  }
  const legacyMimicBeastId = rd.mimicBeastId;
  if (legacyMimicBeastId) {
    content.mimicBeastId = legacyMimicBeastId as string;
    delete rd.mimicBeastId;
  }
  const hasLegacyLockOnEnter = rd.lockOnEnter !== undefined;
  if (hasLegacyLockOnEnter) {
    content.lockOnEnter = rd.lockOnEnter as boolean;
    delete rd.lockOnEnter;
  }
  const legacyChestType = rd.chestType;
  if (legacyChestType) {
    content.chest = legacyChestType as string;
    delete rd.chestType;
  }
};

// Auto-select chest type from content if it exists
const autoSelectChestType = (currentRoom: Room): void => {
  const content = ensureContent(currentRoom);
  const isLootRoom = currentRoom.type === "loot";
  if (isLootRoom) {
    if (content.dungeon) {
      content.chest = "dungeon";
    } else if (content.gold !== undefined) {
      content.chest = "gold";
    } else if (content.items?.length) {
      content.chest = "consumable";
    }
  }
};

/**
 * Brings a stored room up to what the editor expects, in place: legacy top-level fields move into `content`,
 * `content.beasts` exists, the old `locked` flags become `sides` (and a room that has sides sheds them), `sides`
 * exists, and a loot room's chest type follows what it holds.
 */
export const prepareRoomForEditing = (currentRoom: Room): void => {
  const content = ensureContent(currentRoom);

  moveLegacyFieldsIntoContent(currentRoom);

  const hasBeastList = Boolean(content.beasts);
  if (!hasBeastList) content.beasts = [];

  // Migration: Move legacy locked to sides
  const legacyLocked = currentRoom.locked;
  const hasLegacyLockedOnly = !currentRoom.sides && !!legacyLocked;
  if (hasLegacyLockedOnly) {
    currentRoom.sides = legacyLockedToSides(legacyLocked);
    delete currentRoom.locked;
  }

  // With sides, the sides are the truth (play locks doors from them, see lockedFromSides): a `locked` flag kept
  // beside them would keep a door the Game Master opens here locked in play
  const hasSides = Boolean(currentRoom.sides);
  if (hasSides) delete currentRoom.locked;

  if (!hasSides) {
    currentRoom.sides = defaultSides();
  }

  autoSelectChestType(currentRoom);
};

export type TypeStep = "monster-config" | "boss" | "config" | "close";

const TRAVEL_ROOM_TYPES = ["stairs-up", "stairs-down", "pit", "void", "teleport"];
const CONFIG_STEP_ROOM_TYPES = ["loot", "shop", "master", ...TRAVEL_ROOM_TYPES];

/**
 * Where picking a room type sends the type picker: monsters and minibosses choose a shared config first, a boss goes
 * straight to its config, loot, shops, the Master Room and travel rooms go to their config, and the rest just close.
 */
export const stepForRoomType = (type: string): TypeStep => {
  const isSharedConfigType = type === "monster" || type === "miniboss";
  if (isSharedConfigType) return "monster-config";
  const isBoss = type === "boss";
  if (isBoss) return "boss";
  const hasConfigStep = CONFIG_STEP_ROOM_TYPES.includes(type);
  if (hasConfigStep) return "config";
  return "close";
};

const COMBAT_ROOM_TYPES = ["monster", "miniboss", "boss"];

/** The wall and the entrance are shared tokens: every cell that shows one reads the same record, so it holds nothing of its own */
const SHARED_TOKEN_TYPES = ["wall", "entrance"];

/**
 * What a type change carries over from the room's old content, by the family of types both rooms belong to. Beasts
 * and the name are handled apart (`contentAfterTypeChange`); a chest, a shop, a heal or a travel target stays with
 * the type that owns it.
 */
const CARRIED_WITHIN_FAMILY: { types: readonly string[]; keys: readonly string[] }[] = [
  {
    types: COMBAT_ROOM_TYPES,
    keys: ["difficulty", "xp", "gp", "ap", "lockOnEnter", "quest", "questId", "questIds", "drops"],
  },
  { types: PEGASUS_ROOM_TYPES, keys: ["dungeon"] },
];

const copyOf = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * The content a room has once its type changes from `fromType` to `toType`: built from the new type's template, so
 * it keeps only what the new type owns. The name always stays; beasts stay in a combat room; the fight (rewards, seal,
 * quest) and what its beast drops stay between combat rooms (a quest swapped to another tier retypes the room, and
 * the drop stays with the fight) and the Pegasus pick between the egg rooms. A seal never outlives a fight, and
 * leaving the boss lets go of the one the boss template put there; a boss is always sealed. A chest never moves to
 * another type, so a Boss Key cannot ride along into a miniboss that the audit then counts. The wall and the entrance
 * start empty. The same type keeps all of its content. The content given is not changed.
 */
export const contentAfterTypeChange = (
  fromType: string,
  toType: string,
  content: RoomContent | undefined
): RoomContent => {
  const held: RoomContent = content ?? {};
  const isSameType = fromType === toType;
  if (isSameType) return copyOf(held);
  const isSharedToken = SHARED_TOKEN_TYPES.includes(toType);
  if (isSharedToken) return {};

  const next: RoomContent = {};
  const hasName = held.name !== undefined;
  if (hasName) next.name = held.name;
  const shouldKeepBeasts = held.beasts !== undefined && COMBAT_ROOM_TYPES.includes(toType);
  if (shouldKeepBeasts) next.beasts = held.beasts;

  const family = CARRIED_WITHIN_FAMILY.find((f) => f.types.includes(fromType) && f.types.includes(toType));
  family?.keys.forEach((key) => {
    const isHeld = held[key] !== undefined;
    if (isHeld) next[key] = held[key];
  });

  const isLeavingBoss = fromType === "boss";
  if (isLeavingBoss) delete next.lockOnEnter;
  const isBecomingBoss = toType === "boss";
  if (isBecomingBoss) next.lockOnEnter = true;
  return copyOf(next);
};

/** Makes the room `toType` in place: its content is rebuilt (`contentAfterTypeChange`); its sides and the rest stay. */
export const retypeRoom = (room: Room, toType: string): void => {
  const isSameType = room.type === toType;
  if (isSameType) return;
  room.content = contentAfterTypeChange(room.type, toType, room.content);
  room.type = toType;
};

/**
 * A copy of a shared config's record (the BOSS token, M001) for this cell. The config owns the fight; the cell keeps
 * its own doors and its name, which no config can know.
 */
export const adoptSharedRecord = (shared: Room, mine: Room): Room => {
  const adopted = copyOf(shared);
  const sides = mine.sides ?? adopted.sides;
  if (sides) adopted.sides = copyOf(sides);
  const name = mine.content?.name;
  const hasName = name !== undefined;
  if (hasName) ensureContent(adopted).name = name;
  return adopted;
};

/**
 * What a chest holds after the Quick Edit "Select Loot" pick: the room's own content with the chest set to the
 * dungeon item (`{ chest: 'dungeon', dungeon: <id> }`, the pair the room editor, the audit and the chest reveal read),
 * merged, so the name, a mimic and the rest stay. `null` is the Empty pick: the dungeon item comes off. The old
 * `item` key nothing read is dropped. The content given is not changed.
 */
export const pickChestItem = (content: RoomContent | undefined, itemId: string | null): RoomContent => {
  const next: RoomContent = { ...(content ?? {}) };
  delete next.item;
  const isEmptyPick = itemId === null;
  if (isEmptyPick) {
    delete next.dungeon;
    const isDungeonChest = next.chest === "dungeon";
    if (isDungeonChest) delete next.chest;
    return next;
  }
  next.chest = "dungeon";
  next.dungeon = itemId;
  return next;
};

/**
 * A new travel room (stairs, pit, void, teleport) starts with no target at all: stairs then climb to the neighbouring
 * floor and land on the paired stairs, and teleport circles pair themselves. A target seeded here (the room's own floor
 * and cell 0,0) made stairs "blocked by rubble", or landed the hero on cell 0,0 instead of the paired stairs. A target
 * the Game Master picked is kept; the old seed on a stairs room or a pit (its own floor, cell 0,0) is cleared: neither
 * leads to the floor it stands on (a pit drops only to a floor below, pitDropOf).
 */
export const seedTravelTargets = (
  content: RoomContent,
  type: string,
  currentLevelId: string
): void => {
  const isStairsOrPit = type === "stairs-up" || type === "stairs-down" || type === "pit";
  const pointsAtOwnFloor = content.targetLevel === currentLevelId;
  const shouldClearSeed = isStairsOrPit && pointsAtOwnFloor;
  if (shouldClearSeed) {
    delete content.targetLevel;
    const isDefaultCell = content.targetCoords?.x === 0 && content.targetCoords?.y === 0;
    if (isDefaultCell) delete content.targetCoords;
  }
};

// Reset if current item is not in the strict dungeon list
const keepOrResetDungeonItem = (content: RoomContent, dungeonItems: { id: string }[]): void => {
  const currentDungeonItem = content.dungeon;
  const isValidDungeonItem = dungeonItems.some((i) => i.id === currentDungeonItem);
  const shouldResetDungeonItem = !currentDungeonItem || !isValidDungeonItem;
  if (shouldResetDungeonItem) {
    content.dungeon = "small-key";
  }
};

// Initialize with first key item if not set or invalid
const keepOrResetKeyItem = (content: RoomContent, keyItems: { id: string }[]): void => {
  const currentKeyItem = content.dungeon; // processing as same field 'dungeon' for ID
  const isValidKeyItem = keyItems.some((i) => i.id === currentKeyItem);
  const shouldResetKeyItem = !currentKeyItem || !isValidKeyItem;
  if (shouldResetKeyItem) {
    content.dungeon = keyItems[0]?.id;
  }
};

/** Picks a chest type and gives the content what that chest needs: a valid item, 50 GP, or a potion */
export const applyChestType = (
  content: RoomContent,
  typeId: string,
  dungeonItems: { id: string }[],
  keyItems: { id: string }[]
): void => {
  content.chest = typeId;
  if (typeId === "dungeon") {
    keepOrResetDungeonItem(content, dungeonItems);
  } else if (typeId === "key-item") {
    keepOrResetKeyItem(content, keyItems);
  } else if (typeId === "gold") {
    content.gold = content.gold || 50;
  } else if (typeId === "consumable") {
    content.items = content.items || ["potion"];
  }
};

/** Adds the consumable to the chest, or takes it off when it is already there (a chest always keeps one) */
export const toggleConsumableItem = (content: RoomContent, itemId: string): void => {
  const items = content.items;
  if (!items) {
    content.items = [itemId];
    return;
  }
  const isInChest = items.includes(itemId);
  if (!isInChest) {
    items.push(itemId);
    return;
  }
  const remaining = items.filter((i: string) => i !== itemId);
  const isEmptied = remaining.length === 0;
  content.items = isEmptied ? [itemId] : remaining; // Keep at least one
};
