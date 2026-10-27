/**
 * The battle return's drop reveal (see useTempleEntry): which room it was offered in, and whether this page shows it
 * now. A room is a floor plus a row and column: the temple route carries the floor as ?level (the same x and y name a
 * room on every floor), so the room the battle returned to and the room already offered are both told apart by floor.
 * Pure: no Vue, no storage.
 */
import { roomPositionKey } from '@/lib/engine/core/dungeons/roomPosition';

/** Where the hero stands, as the temple's live state tells it */
export interface StandingRoom {
  level: string;
  position: readonly number[];
}

/** What the page remembers for the room it offered a drop in: the floor first, so two floors never share a latch */
export const returnRoomKey = (level: string, position: readonly number[]): string => roomPositionKey(level, position);

/**
 * Whether the hero stands in the room the route names. The route may name no floor (a battle that left it out):
 * the row and column alone then decide, as they did before the floor rode along.
 */
export const isReturnRoom = (returnsTo: readonly number[], returnsLevel: string | undefined, standing: StandingRoom): boolean => {
  const isSamePosition = standing.position[0] === returnsTo[0] && standing.position[1] === returnsTo[1];
  const isSameFloor = returnsLevel === undefined || returnsLevel === standing.level;
  return isSamePosition && isSameFloor;
};

export interface ReturnDropCheck {
  /** The room the route names ([row, col]) and the floor it names, if any */
  returnsTo: readonly number[];
  returnsLevel: string | undefined;
  standing: StandingRoom;
  /** The rooms this page already offered a drop in (returnRoomKey) */
  offered: ReadonlySet<string>;
  /** Whether a won fight's drop waits in the room the hero stands in */
  isDropWaiting: boolean;
}

/** Whether the page opens the drop reveal now: the battle's room, a drop waiting there, and this room not offered yet */
export const shouldRevealReturnDrop = ({ returnsTo, returnsLevel, standing, offered, isDropWaiting }: ReturnDropCheck): boolean => {
  const isOnReturnRoom = isReturnRoom(returnsTo, returnsLevel, standing);
  const isOffered = offered.has(returnRoomKey(standing.level, standing.position));
  return isOnReturnRoom && !isOffered && isDropWaiting;
};
