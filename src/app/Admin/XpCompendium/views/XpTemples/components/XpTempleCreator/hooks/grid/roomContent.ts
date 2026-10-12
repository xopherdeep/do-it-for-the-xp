/**
 * Room records for the room editor page: tidying a stored room before it is edited (legacy fields, default sides,
 * the chest it already holds), what each room type sends the type picker to next, and the content a chosen chest,
 * consumable or travel room starts with.
 */
import type { Room, RoomContent } from "@/lib/engine/core/dungeons/types";
import { defaultSides, legacyLockedToSides } from "./doorSides";

/** The room's content object, created empty first when the room has none */
export const ensureContent = (room: Room): RoomContent => {
  if (!room.content) room.content = {} as RoomContent;
  return room.content;
};

// Migration: Move top-level properties to content (legacy support)
const moveLegacyFieldsIntoContent = (currentRoom: Room): void => {
  const content = ensureContent(currentRoom);
  const rd = currentRoom as Record<string, unknown>;
  if (rd.selectedBeastIds) {
    content.beasts = rd.selectedBeastIds as string[];
    delete rd.selectedBeastIds;
  }
  if (rd.isMimic !== undefined) {
    content.isMimic = rd.isMimic as boolean;
    delete rd.isMimic;
  }
  if (rd.mimicType) {
    content.mimicType = rd.mimicType as string;
    delete rd.mimicType;
  }
  if (rd.mimicBeastId) {
    content.mimicBeastId = rd.mimicBeastId as string;
    delete rd.mimicBeastId;
  }
  if (rd.lockOnEnter !== undefined) {
    content.lockOnEnter = rd.lockOnEnter as boolean;
    delete rd.lockOnEnter;
  }
  if (rd.chestType) {
    content.chest = rd.chestType as string;
    delete rd.chestType;
  }
};

// Auto-select chest type from content if it exists
const autoSelectChestType = (currentRoom: Room): void => {
  const content = ensureContent(currentRoom);
  if (currentRoom.type === "loot") {
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
 * `content.beasts` exists, the old `locked` flags become `sides`, `sides` exists, and a loot room's chest type
 * follows what it holds.
 */
export const prepareRoomForEditing = (currentRoom: Room): void => {
  const content = ensureContent(currentRoom);

  moveLegacyFieldsIntoContent(currentRoom);

  if (!content.beasts) content.beasts = [];

  // Migration: Move legacy locked to sides
  if (!currentRoom.sides && currentRoom.locked) {
    currentRoom.sides = legacyLockedToSides(currentRoom.locked);
    delete currentRoom.locked;
  }

  if (!currentRoom.sides) {
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
  if (type === "monster" || type === "miniboss") return "monster-config";
  if (type === "boss") return "boss";
  if (CONFIG_STEP_ROOM_TYPES.includes(type)) return "config";
  return "close";
};

/** A travel room (stairs, pit, void, teleport) starts out pointing at the current floor and cell 0,0 */
export const seedTravelTargets = (
  content: RoomContent,
  type: string,
  currentLevelId: string
): void => {
  if (TRAVEL_ROOM_TYPES.includes(type)) {
    if (!content.targetLevel) content.targetLevel = currentLevelId;
    if (!content.targetCoords) content.targetCoords = { x: 0, y: 0 };
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
  if (!content.items) {
    content.items = [itemId];
  } else if (content.items.includes(itemId)) {
    content.items = content.items.filter((i: string) => i !== itemId);
    if (content.items.length === 0) {
      content.items = [itemId]; // Keep at least one
    }
  } else {
    content.items.push(itemId);
  }
};
