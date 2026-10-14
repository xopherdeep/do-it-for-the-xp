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
 * the grid size it measures, the rooms, and a floor to show that the maze has. Every loader goes through here, so the
 * working copy never keeps the defaults of an entrance, grid size or floor the record names.
 */
export const adoptStoredLayout = (store: CreatorStore, id: string, record: StoredTemple): void => {
  const layout = record.dungeonLayout;

  if (record.customName) {
    store.templeName = record.customName;
  } else if (record.name) {
    store.templeName = record.name;
  }
  if (record.customIcon) {
    store.templeIcon = record.customIcon;
  }

  if (layout.entrance) {
    store.entrancePosition = layout.entrance.join(",");
  }
  if (layout.maze) {
    store.templeMaze = clone(layout.maze);
    const measuredSize = measureGridSize(store.templeMaze);
    if (measuredSize !== null) {
      store.gridSize = measuredSize;
    }
  }
  if (layout.rooms) {
    store.roomsData = clone(layout.rooms);
  }

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
