/**
 * The creator store's working copy and the stored temple, both ways: a stored record into the store (the one adopter
 * every loader uses) and the store back out as the layout the database keeps (the one save path). Both take the store
 * instance, so the store keeps only its own state.
 */
import type { useTempleCreatorStore } from "@/lib/store/stores/temple-creator";
import type { TempleInterface } from "@/lib/databases/TempleDb";
import { levelIdAfterLoad, measureGridSize } from "../../components/XpTempleCreator/hooks/grid/floorLayers";
import { resolveEntranceCoordinates } from "../../components/XpTempleCreator/hooks/grid/mazeReadouts";

type CreatorStore = ReturnType<typeof useTempleCreatorStore>;
type StoredLayout = NonNullable<TempleInterface["dungeonLayout"]>;

/** A stored temple as the store adopts it: its name and icon, and a layout that may lack its maze or its rooms (a JSON import) */
export type StoredTemple = Pick<TempleInterface, "name" | "customName" | "customIcon"> & {
  dungeonLayout: Partial<StoredLayout>;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * Copies a stored temple into the store: name and icon, the entrance (with its floor, "floor,row,col"), the maze with
 * the grid size it measures, the rooms, the symbols they use, and a floor to show that the maze has. Every loader goes
 * through here, so the working copy never keeps the defaults of an entrance, grid size, floor or symbol set the record names.
 */
export const adoptStoredLayout = (store: CreatorStore, id: string, record: StoredTemple): void => {
  const layout = record.dungeonLayout;

  const { customName, name, customIcon } = record;
  if (customName) {
    store.templeName = customName;
  } else if (name) {
    store.templeName = name;
  }
  if (customIcon) {
    store.templeIcon = customIcon;
  }

  const entrance = layout.entrance;
  if (entrance) {
    store.entrancePosition = entrance.join(",");
  }
  const maze = layout.maze;
  if (maze) {
    store.templeMaze = clone(maze);
    const measuredSize = measureGridSize(store.templeMaze);
    const hasMeasuredSize = measuredSize !== null;
    if (hasMeasuredSize) {
      store.gridSize = measuredSize;
    }
  }
  const rooms = layout.rooms;
  if (rooms) {
    store.roomsData = clone(rooms);
  }

  // The symbols the stored rooms already hold, so a new room never reissues one (and overwrites its record)
  store.rebuildSymbols();

  // A floor the maze lacks would read as a blank grid, and the editor would offer to start the maze over
  store.currentLevelId = levelIdAfterLoad(store.templeMaze, store.currentLevelId);
  store.templeId = id;
  store.markAsLoaded(id);
};

/** The working copy as the database keeps it: the entrance as saved, the maze and the rooms, cloned. Every save goes through here. */
export const storedLayout = (store: CreatorStore): StoredLayout => ({
  entrance: resolveEntranceCoordinates(store.entrancePosition.split(",").map(Number), store.templeMaze),
  maze: clone(store.templeMaze),
  rooms: clone(store.roomsData),
});
