import type { Ref } from "vue";
import { useIonRouter } from "@ionic/vue";
import { useTimers } from "@/hooks/useTimers";
import { useBestiarySelectionStore } from "@/lib/store/stores/bestiary-selection";
import { useTempleCreatorStore } from "@/lib/store/stores/temple-creator";
import { isSharedConfigToken, withPickedBeast } from "../components/XpTempleCreator/hooks/grid/roomSymbols";
import type { TempleBeast, useTempleData } from "./useTempleData";

type TempleData = ReturnType<typeof useTempleData>;

const resolveRoomTypeFromTier = (tier: string): "monster" | "miniboss" | "boss" => {
  const isLesserTier = tier === "monster" || tier === "miniboss";
  return isLesserTier ? tier : "boss";
};

/**
 * Where a room on the Beasts tab leads: the room editor on the room's own floor, or the bestiary to pick the beast
 * that room holds. A pick lands back here with the room to scroll to (`usePendingBeastScroll`).
 */
export const useBeastRoomActions = (templeId: string, temple: TempleData["temple"], saveTemple: TempleData["saveTemple"]) => {
  const ionRouter = useIonRouter();
  const selectionStore = useBestiarySelectionStore();
  const creatorStore = useTempleCreatorStore();

  // The address names the room's floor, so the editor opens the cell on that floor
  const openRoom = (entry: { floor: string; row: number; col: number }) => {
    ionRouter.push({
      name: "xp-temple-room-editor",
      params: {
        templeId,
        floor: entry.floor,
        row: entry.row.toString(),
        col: entry.col.toString(),
      },
    });
  };

  const openBeastSelector = (entry: TempleBeast) => {
    // Get current beasts for this room
    const currentBeasts = entry.beast ? [entry.beastId] : [];

    // Start selection with callback to update room data
    selectionStore.startSelection(
      currentBeasts,
      "temple-beasts-tab",
      (selectedIds) => {
        const layout = temple.value.dungeonLayout;
        if (!layout) return;

        const heldRoom = layout.rooms[entry.roomSymbol];
        let targetSymbol = entry.roomSymbol;

        // PROMOTION LOGIC:
        // A symbol many cells share (a config token like MINI, or the wall) cannot hold one cell's own beasts, so the
        // cell takes a symbol of its own. A room's own symbol (R001, M0201) is already its own and is edited in place.
        if (isSharedConfigToken(targetSymbol)) {
          const newSymbol = creatorStore.generateUniqueSymbol(entry.row, entry.col, heldRoom?.type ?? entry.tier);
          const maze = layout.maze;

          // Update the maze grid
          if (Array.isArray(maze)) {
            maze[entry.row][entry.col] = newSymbol;
          } else {
            const floorGrid = maze[entry.floor] as string[][];
            if (floorGrid) {
              floorGrid[entry.row][entry.col] = newSymbol;
            }
          }

          // Use the new symbol
          targetSymbol = newSymbol;
        }

        // The room keeps what it had (sides, lockOnEnter, difficulty); only the beast tapped is replaced
        const room = withPickedBeast(heldRoom, resolveRoomTypeFromTier(entry.tier), entry.beastId, selectedIds);
        layout.rooms[targetSymbol] = room;

        // Sync with creator store
        creatorStore.roomsData[targetSymbol] = JSON.parse(JSON.stringify(room));

        // Persist the change to DB
        saveTemple();

        // Set pending scroll target for return navigation
        creatorStore.pendingScrollId = targetSymbol;
      }
    );

    ionRouter.push({ name: "xp-bestiary-select" });
  };

  return { openRoom, openBeastSelector };
};

interface PendingScrollSources {
  activeTiers: Ref<string[]>;
  templeBeastsWithDetails: TempleData["templeBeastsWithDetails"];
  updateDefaultTiers: () => void;
}

/** Back on the tab after a pick (or from a #beast-card- link): open that room's tier, scroll to its card and light it. */
export const usePendingBeastScroll = ({ activeTiers, templeBeastsWithDetails, updateDefaultTiers }: PendingScrollSources) => {
  const timers = useTimers();
  const creatorStore = useTempleCreatorStore();

  // Auto-scroll logic when returning to the tab
  const showPendingRoom = (attempt = 0) => {
    const hash = window.location.hash;
    const targetId =
      creatorStore.pendingScrollId ||
      (hash.startsWith("#beast-card-") ? hash.substring(12) : null);

    if (!targetId) {
      const hasNoActiveTiers = activeTiers.value.length === 0;
      if (hasNoActiveTiers) updateDefaultTiers();
      return;
    }

    // Find the beast entry to determine its tier
    // We might need to wait if data is still loading/syncing
    const entry = templeBeastsWithDetails.value.find(
      (b) => b.roomSymbol === targetId
    );

    const shouldRetryLookup = !entry && attempt < 5;
    if (shouldRetryLookup) {
      timers.startTimeout(100, () => showPendingRoom(attempt + 1));
      return;
    }

    if (entry) {
      // FORCE the accordion to open ONLY this tier
      activeTiers.value = [entry.tier];

      // Use a slightly longer timeout to ensure Ionic's internals have registered the value change
      // and the transition has at least started.
      timers.startTimeout(300, () => {
        const elementId = `beast-card-${targetId}`;
        const element = document.getElementById(elementId);

        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("beast-card-highlight");
          timers.startTimeout(2000, () =>
            element.classList.remove("beast-card-highlight")
          );
        }

        // Final cleanup
        creatorStore.pendingScrollId = null;
        if (hash) {
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
        }
      });
    } else {
      updateDefaultTiers();
    }
  };

  return { showPendingRoom };
};
