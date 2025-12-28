/**
 * Temple Room Editor Hooks
 * 
 * Feature-scoped hooks for the temple room editor.
 * Following project convention of keeping hooks near their feature unless globally reusable.
 */

export { 
  useTempleRoomEditor,
  ROOM_CATEGORIES,
  CHEST_TYPES,
  CONSUMABLE_ITEMS,
  DUNGEON_ITEMS,
  KEY_ITEMS
} from './useTempleRoomEditor';

export type { 
  UseTempleRoomEditorProps,
  UseTempleRoomEditorReturn 
} from './useTempleRoomEditor';

export { 
  useTempleRoomNavigation 
} from './useTempleRoomNavigation';

export type { 
  Direction,
  AdjacentRooms,
  UseTempleRoomNavigationProps,
  UseTempleRoomNavigationReturn 
} from './useTempleRoomNavigation';

export { 
  useTempleCreator,
  SIDE_TYPE_INFO
} from './useTempleCreator';

export type {
  UseTempleCreatorProps,
  UseTempleCreatorReturn
} from './useTempleCreator';
