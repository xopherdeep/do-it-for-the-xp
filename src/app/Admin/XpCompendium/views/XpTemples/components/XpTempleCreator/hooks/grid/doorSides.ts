/**
 * Door sides for the temple editor: a room's four sides (door, locked, bombable, wall, boss lock), the plain defaults,
 * the order a tap cycles through, the boss lock, and the icon and class each side is drawn with on the room page.
 */
import type { Room } from "@/lib/engine/core/dungeons/types";

export type Direction = "north" | "east" | "south" | "west";

export interface AdjacentRooms {
  north: boolean;
  east: boolean;
  south: boolean;
  west: boolean;
}

/** Every side a plain door; a fresh object each time because callers edit it */
export const defaultSides = (): Record<string, string> => ({
  north: "door",
  east: "door",
  south: "door",
  west: "door",
});

/** The older `locked` flags of a room, as sides */
export const legacyLockedToSides = (
  locked: NonNullable<Room["locked"]>
): Record<string, string> => ({
  north: locked.north ? "locked" : "door",
  east: locked.east ? "locked" : "door",
  south: locked.south ? "locked" : "door",
  west: locked.west ? "locked" : "door",
});

export const hasNonDoorSide = (sides: Record<string, string>): boolean =>
  Object.values(sides).some((type) => type !== "door");

/** A copy of the sides with every door and small lock turned into the boss lock */
export const lockBossSides = (sideData: Record<string, string>): Record<string, string> => {
  const newSides = { ...sideData };

  Object.keys(newSides).forEach((dir) => {
    const isLockableSide =
      newSides[dir] === "door" || newSides[dir] === "locked";
    if (isLockableSide) {
      newSides[dir] = "masterlocked";
    }
  });

  return newSides;
};

/** Tapping a door steps it through these, then round again; any other state (the boss lock) restarts at the door */
export const nextDoorState = (currentState: string): string => {
  const states = ["door", "locked", "bombable", "wall"];
  const nextIdx = (states.indexOf(currentState) + 1) % states.length;
  return states[nextIdx];
};

/** What the toast says after a tap changes a door */
export const DOOR_STATE_INFO: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  door: { icon: "far fa-tombstone-alt", label: "Open Passage", color: "success" },
  locked: { icon: "fas fa-lock", label: "Locked Door", color: "warning" },
  bombable: { icon: "fal fa-bomb", label: "Bombable Wall", color: "secondary" },
  wall: { icon: "DYNAMIC_WALL", label: "Solid Wall", color: "medium" },
};

/** The wall icon stands in for the temple's own wall: wind for a "wall" wall, a dungeon door otherwise */
export const resolveSideIcon = (icon: string, wallType?: string): string => {
  const isDynamicWall = icon === "DYNAMIC_WALL";
  if (!isDynamicWall) {
    return icon;
  }
  const isWallType = wallType === "wall";
  return isWallType ? "fa-wind" : "fa-dungeon";
};

/** The icon name the door toast shows: no family prefix, and the wall always shows the wind icon */
export const doorToastIcon = (infoIcon: string, wallType?: string): string => {
  const resolvedIcon = resolveSideIcon(infoIcon, wallType);

  let finalIcon = resolvedIcon;
  const isDynamicWall = infoIcon === "DYNAMIC_WALL";
  if (isDynamicWall) {
    finalIcon = "fa-wind";
  }

  return finalIcon.replace("fad ", "").replace("fas ", "").replace("fal ", "");
};

export interface DoorFacts {
  /** The side as the room page shows it */
  state: string;
  neighborIsWall: boolean;
  /** The type of the room being edited, and whether it locks the party in on entry */
  roomType?: string;
  lockOnEnter?: boolean;
  /** The type of the room on the other side of the door */
  adjacentType: string;
}

// Boss and miniboss rooms are always trapped; other rooms trap when they lock on entry
const isTrappedRoom = (roomType?: string, lockOnEnter?: boolean) =>
  roomType === "boss" || roomType === "miniboss" || !!lockOnEnter;

/** The icon a door is drawn with, or "DYNAMIC_WALL" for the temple's wall icon */
export const doorIconFor = (facts: DoorFacts): string => {
  const { state, neighborIsWall, roomType, lockOnEnter, adjacentType } = facts;
  const isTrapped = isTrappedRoom(roomType, lockOnEnter);

  const isWalledOff = state === "wall" || neighborIsWall;
  if (isWalledOff) {
    return "DYNAMIC_WALL";
  }

  const isBossLocked = state === "masterlocked";
  if (isBossLocked) {
    return "fas fa-skull";
  }

  const isTrapDoor = isTrapped && state !== "bombable";
  if (isTrapDoor) {
    const isEntrance = adjacentType === "entrance";
    return `fad fa-dungeon${isEntrance ? " entrance-variant" : ""}`;
  }

  switch (state) {
    case "locked": return "fas fa-lock";
    case "bombable": return "fal fa-bomb";
    case "wall": return "DYNAMIC_WALL";
    default: return "far fa-tombstone-alt";
  }
};

/** The CSS class a door is drawn with */
export const doorClassFor = (facts: Omit<DoorFacts, "adjacentType">): string => {
  const { state, neighborIsWall, roomType, lockOnEnter } = facts;

  const isWalledOff = state === "wall" || neighborIsWall;
  if (isWalledOff) {
    return "state-wall";
  }

  const isBossLocked = state === "masterlocked";
  if (isBossLocked) {
    return "state-masterlocked";
  }

  const isTrapped = isTrappedRoom(roomType, lockOnEnter);
  const isTrapDoor = isTrapped && state !== "bombable";
  if (isTrapDoor) {
    return "state-trapped";
  }

  return `state-${state}`;
};
