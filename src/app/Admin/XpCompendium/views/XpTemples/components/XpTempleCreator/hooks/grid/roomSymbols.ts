/**
 * Room symbols for the temple editor: which tokens are shared by many cells (the wall, the entrance, config tokens)
 * and which belong to exactly one room, which symbol a cell takes when its room type changes, promoting a shared
 * token to a unique coordinate symbol, and the room record written for a cell.
 */
import {
  _00_,
  ____,
  TELE,
  SHOP,
} from "@/lib/engine/dungeons/roomTypes";
import { isEntranceToken, isWallToken } from "@/lib/engine/dungeons/SpatialPalette";
import type { Room, RoomContent } from "@/lib/engine/core/dungeons/types";
import { hasNonDoorSide, lockBossSides } from "./doorSides";

// Room symbols mapping
export const roomSymbols: Record<string, string> = {
  wall: ____,
  entrance: _00_,
  empty: "O__O",
  monster: "q__q",
  loot: "$__$",
  boss: "X__X",
  miniboss: "x__x",
  teleport: TELE,
  shop: SHOP,
  health: "H__P",
};

// The wall and entrance symbols are shared by every cell; any other symbol belongs to one room. A saved maze holds the
// five-character tokens ("_____", "_00__"), not the single letters, so every spelling counts.
export const isUniqueRoomSymbol = (symbol: string) =>
  !isWallToken(symbol) && !isEntranceToken(symbol);

// A coordinate token is a letter and four digits (R0000, M0000): one room's own id
export const isCoordinateToken = (token: string): boolean =>
  /^[A-Za-z]\d{4}$/.test(token);

// A shared config token: not the entrance, not a room id, not already a unique coordinate id
export const isSharedConfigToken = (token: string): boolean =>
  !token.startsWith("R") && !isEntranceToken(token) && !isCoordinateToken(token);

// A cell symbol that owns a room record, so clearing the cell clears the record too
export const isClearableRoomSymbol = (cellSymbol: string): boolean =>
  cellSymbol.startsWith("R") || isCoordinateToken(cellSymbol);

/**
 * The symbol a cell takes when it becomes `newType`: walls and entrances use their shared symbols, a cell leaving
 * the wall or entrance (or changing room type) gets a fresh unique symbol, and a cell keeping its type keeps its symbol.
 */
export const chooseRoomSymbol = (
  currentSymbol: string,
  currentType: string,
  newType: string,
  generateSymbol: () => string
): string => {
  let symbolToUse = currentSymbol;

  if (newType === "wall") {
    symbolToUse = ____;
  } else if (newType === "entrance") {
    symbolToUse = _00_;
  } else if (isWallToken(currentSymbol) || isEntranceToken(currentSymbol)) {
    symbolToUse = generateSymbol();
  } else if (newType !== currentType) {
    symbolToUse = generateSymbol();
  }

  return symbolToUse;
};

/**
 * A shared token (the wall, or another shared config) cannot hold one cell's own data without changing every cell
 * that shares it, so editing such a cell swaps it for a unique symbol. A symbol that is already unique is kept.
 */
export const promoteToUniqueSymbol = (
  symbol: string,
  generateSymbol: () => string
): string => {
  if (isWallToken(symbol)) {
    return generateSymbol();
  }
  if (isSharedConfigToken(symbol)) {
    return generateSymbol();
  }
  return symbol;
};

/**
 * The room record written for a cell: its type, its sides when any side is not a plain door, and its content when it
 * has any. A boss room's doors are all locked with the boss key first.
 */
export const buildRoomRecord = (
  newType: string,
  contentData: RoomContent,
  sideData: Record<string, string>
): Room => {
  const roomData: Room = { type: newType };

  if (newType === "boss") {
    sideData = lockBossSides(sideData);
  }

  if (hasNonDoorSide(sideData)) {
    roomData.sides = sideData;
  }

  if (Object.keys(contentData).length > 0) {
    roomData.content = contentData;
  }

  return roomData;
};

/**
 * The room record after a beast is picked for one of its beast slots: the record the cell had is kept whole (sides,
 * lockOnEnter, difficulty, rewards) and only that slot changes. The picked beasts take the place of `replacedId` in
 * the list; a slot with no beast yet adds them at the end. A cell with no record starts one of `fallbackType`.
 */
export const withPickedBeast = (
  room: Room | undefined,
  fallbackType: string,
  replacedId: string,
  pickedIds: string[]
): Room => {
  const record: Room = room ? JSON.parse(JSON.stringify(room)) : { type: fallbackType };
  const content: RoomContent = record.content ?? {};
  const beasts = content.beasts ?? [];
  const slot = replacedId ? beasts.indexOf(replacedId) : -1;
  const holdsReplacedBeast = slot >= 0;

  content.beasts = holdsReplacedBeast
    ? [...beasts.slice(0, slot), ...pickedIds, ...beasts.slice(slot + 1)]
    : [...beasts, ...pickedIds];
  record.content = content;

  return record;
};
