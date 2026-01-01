/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, computed, onMounted, watch, InjectionKey } from "vue";
// ... imports ...

// Exported at end of file to ensure ReturnType inference works

import {
  AchievementCategoryInterface,
  AchievementCategoryDb,
  achievementCategoryStorage,
} from "@/lib/databases/AchievementDb";
import { TempleDb, TempleInterface, templeStorage } from "@/lib/databases/TempleDb";
import BestiaryDb, { Beast, beastStorage } from "@/lib/databases/BestiaryDb";
import { sortCategoryByName } from "@/app/Admin/XpCompendium/views/XpAchievements//XpConfigAchievement/hooks/useAchievementForm";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import { ROOM_ICONS } from "@/lib/engine/dungeons/roomTypes";
import debug from "@/lib/utils/debug";
import { VOID as ROOM_VOID } from "@/lib/engine/dungeons/roomTypes";
import { isWallToken, isMonsterToken, isLootToken, isTeleportToken, isKeyToken } from "@/lib/engine/dungeons/SpatialPalette";
import { toastController } from "@ionic/vue";
import { saveOutline } from 'ionicons/icons';
import { useTempleCreatorStore } from "@/lib/store/stores/temple-creator";

const requireBg = require.context("@/assets/images/backgrounds/");

export interface ExtendedTempleInterface extends TempleInterface {
  smallMonsters?: number;
  mediumMonsters?: number;
  largeMonsters?: number;
  minibosses?: number;
  bosses?: number;
  hasBossKey?: boolean;
  customName?: string;
  customDescription?: string;
  categoryIds: string[];
  level?: number;
}

export interface ExtendedCategoryInterface extends AchievementCategoryInterface {
  color?: string;
  icon?: any;
}

export interface TempleBeast {
  beast: Beast | null;
  beastId: string;
  tier: 'boss' | 'miniboss' | 'monster';
  roomSymbol: string;
  floor: string;
  row: number;
  col: number;
}

export function useTempleData(templeId: string) {
  const categoryDb = new AchievementCategoryDb(achievementCategoryStorage);
  const categories = ref([] as ExtendedCategoryInterface[]);
  const templeDb = new TempleDb(templeStorage);
  const bestiaryDb = new BestiaryDb(beastStorage);
  const templeSystem = TempleSystem.getInstance();
  const creatorStore = useTempleCreatorStore();

  // Cached beasts from bestiary
  const allBeasts = ref<Beast[]>([]);
  const isLoading = ref(false);

  const temple = ref<ExtendedTempleInterface>({
    id: templeId,
    categoryIds: [] as string[],
    level: 1
  });

  const templeState = ref({
    hasMap: false,
    hasCompass: false,
    hasBossKey: false,
    playerKeys: 0,
    visitedPositions: new Set<string>()
  });

  const dungeonStats = ref({
    totalRooms: 0,
    visitedRooms: 0,
    totalTreasures: 0,
    foundTreasures: 0
  });

  const loadCategories = async () => {
    categories.value = await categoryDb.getAll();
    categories.value = categories.value.sort(sortCategoryByName);
  };

  const previewMaze = computed(() => {
    if (!temple.value.dungeonLayout || !temple.value.dungeonLayout.maze) return null;

    const maze = temple.value.dungeonLayout.maze;

    if (!Array.isArray(maze)) {
      if (maze['1F']) return maze['1F'];
      const floors = Object.keys(maze);
      if (floors.length > 0) return maze[floors[0]];
      return null;
    }

    return maze;
  });

  const isRoom = (cell: string) => {
    if (!cell || isWallToken(cell) || cell === ROOM_VOID) return false;
    // Anything that's not a wall or void is a room
    // This supports legacy single-char tokens (s, k, O, B, E, etc.)
    return true;
  };

  // Sync dungeonLayout with creatorStore when it changes
  watch(() => creatorStore.roomsData, (newRooms) => {
    if (creatorStore.loadedTempleId === templeId) {
      if (!temple.value.dungeonLayout) {
        temple.value.dungeonLayout = { entrance: [0, 0], maze: [], rooms: {} };
      }
      temple.value.dungeonLayout.rooms = { ...newRooms };
    }
  }, { deep: true });

  watch(() => creatorStore.templeMaze, (newMaze) => {
    if (creatorStore.loadedTempleId === templeId) {
      if (!temple.value.dungeonLayout) {
        temple.value.dungeonLayout = { entrance: [0, 0], maze: [], rooms: {} };
      }
      temple.value.dungeonLayout.maze = newMaze;
    }
  }, { deep: true });

  const getRoomTypeIcon = (type: string) => {
    return (ROOM_ICONS as any)[type] || 'fa-square';
  };

  const getMonsterIcon = (size: string) => {
    const icons = {
      boss: 'fa-crown',
      miniboss: 'fa-helmet-battle',
      large: 'fa-dragon',
      medium: 'fa-skull',
      small: 'fa-ghost'
    };
    return (icons as any)[size] || 'fa-ghost';
  };

  const getItemIcon = (name: string) => {
    const icons = {
      map: 'fa-map',
      compass: 'fa-compass',
      key: 'fa-key',
      master: 'fa-key-skeleton',
      'pegasus whistle': 'fa-megaphone'
    };
    return (icons as any)[name.toLowerCase()] || 'fa-treasure-chest';
  };

  const composition = computed(() => {
    const result = {
      hasRooms: false,
      roomTypes: [] as { type: string, count: number }[],
      keyItems: [] as { name: string, icon: string, found: boolean }[],
      monsters: [] as { size: string, count: number }[]
    };

    if (!temple.value.dungeonLayout?.maze || !temple.value.dungeonLayout?.rooms) return result;

    result.hasRooms = true;
    const maze = temple.value.dungeonLayout.maze;
    const roomDefs = temple.value.dungeonLayout.rooms;
    const sysState = templeSystem.getTempleState(templeId);

    const monCounts: Record<string, number> = {};
    const roomTypeCounts: Record<string, number> = {};
    const seenKeyItems = new Set<string>();

    const allFloors: string[][][] = [];
    if (Array.isArray(maze)) {
      allFloors.push(maze);
    } else {
      Object.values(maze).forEach(floor => {
        if (Array.isArray(floor)) allFloors.push(floor);
      });
    }

    allFloors.forEach(floor => {
      floor.forEach(row => {
        row.forEach(cellCode => {
          if (!cellCode || isWallToken(cellCode)) return;

          const roomDef = (roomDefs as any)[cellCode];
          if (!roomDef) return;

          const type = roomDef.type;
          if (!type || type === 'wall' || type === 'empty') return;

          roomTypeCounts[type] = (roomTypeCounts[type] || 0) + 1;

          if (type === 'monster') {
            const size = (roomDef.content?.monsterType || 'small').toLowerCase();
            monCounts[size] = (monCounts[size] || 0) + 1;
          } else if (type === 'boss') {
            monCounts['boss'] = (monCounts['boss'] || 0) + 1;
          } else if (type === 'miniboss') {
            monCounts['miniboss'] = (monCounts['miniboss'] || 0) + 1;
          }

          if (type === 'loot' && roomDef.content?.dungeon) {
            const dungeonItem = roomDef.content.dungeon;
            const itemName = dungeonItem.charAt(0).toUpperCase() + dungeonItem.slice(1);

            if (!seenKeyItems.has(itemName.toLowerCase())) {
              seenKeyItems.add(itemName.toLowerCase());
              const found = sysState?.[`has${itemName}`] || false;
              result.keyItems.push({
                name: itemName,
                icon: getItemIcon(dungeonItem),
                found
              });
            }
          }
        });
      });
    });

    Object.entries(roomTypeCounts).forEach(([type, count]) => {
      if (count > 0) result.roomTypes.push({ type, count });
    });

    Object.entries(monCounts).forEach(([size, count]) => {
      if (count > 0) result.monsters.push({ size, count });
    });

    return result;
  });

  const calculateDungeonStats = () => {
    const sysState = templeSystem.getTempleState(templeId);
    if (sysState) {
      templeState.value = {
        hasMap: sysState.hasMap,
        hasCompass: sysState.hasCompass,
        hasBossKey: !!temple.value.hasBossKey,
        playerKeys: sysState.playerKeys,
        visitedPositions: sysState.visitedRooms
      };
    }

    if (temple.value.dungeonLayout) {
      const layout = temple.value.dungeonLayout;
      let totalRooms = 0;
      let visitedRooms = 0;
      let totalTreasures = 0;
      let foundTreasures = 0;

      const maze = previewMaze.value;
      if (maze && Array.isArray(maze)) {
        maze.forEach(row => {
          row.forEach(cell => {
            if (isRoom(cell)) totalRooms++;
          });
        });
      }

      if (layout.rooms) {
        Object.values(layout.rooms).forEach((room: any) => {
          if (room.visited) visitedRooms++;
          if (room.type === 'chest' || room.type === 'treasure' || room.type === 'loot') {
            totalTreasures++;
            if (room.opened || room.visited) foundTreasures++;
          }
        });
      }

      dungeonStats.value = {
        totalRooms: totalRooms || (layout.rooms ? Object.keys(layout.rooms).length : 0),
        visitedRooms,
        totalTreasures,
        foundTreasures
      };
    }
  };

  const getTempleIcon = () => {
    const icons = {
      "wind-temple": "fad fa-wind",
      "earth-temple": "fad fa-mountain",
      "water-temple": "fad fa-water",
      "fire-temple": "fad fa-fire",
      "ice-temple": "fad fa-snowflake",
      "light-temple": "fad fa-sun",
      "shadow-temple": "fad fa-moon",
    };
    return (icons as any)[templeId] || "fad fa-place-of-worship";
  };

  const getTempleColor = () => {
    const colors = {
      "wind-temple": "primary",
      "earth-temple": "success",
      "water-temple": "tertiary",
      "fire-temple": "danger",
      "ice-temple": "light",
      "light-temple": "warning",
      "shadow-temple": "dark",
    };
    return (colors as any)[templeId] || "medium";
  };

  const getTempleBg = () => {
    const worlds = {
      "wind-temple": "plains",
      "earth-temple": "forest",
      "water-temple": "islands",
      "fire-temple": "mountains",
      "ice-temple": "ice",
      "light-temple": "desert",
      "shadow-temple": "moon",
    };
    const world = (worlds as any)[templeId] || "plains";
    try {
      const img = requireBg(`./world-${world}.jpg`);
      return `url(${img})`;
    } catch (err) {
      debug.log("Background load failed", err);
      return 'linear-gradient(135deg, #2c3e50, #4a69bd)';
    }
  };

  const getDisplayName = () => {
    return temple.value.customName || templeId;
  };

  const loadTemple = async (id: string, force = false) => {
    if (!id) return;

    // If already loading OR already loaded in creator store (and not forced), skip
    if (isLoading.value) return;
    if (!force && creatorStore.isLoaded(id)) {
      debug.log("useTempleData: Using existing creatorStore data for", id);
      // Sync temple ref with store once
      const templeData = await templeDb.getTempleById(id);
      if (templeData) {
        temple.value = { ...temple.value, ...templeData };
        if (temple.value.dungeonLayout) {
          temple.value.dungeonLayout.maze = creatorStore.templeMaze;
          temple.value.dungeonLayout.rooms = creatorStore.roomsData;
        }
        calculateDungeonStats();
      }
      return;
    }

    isLoading.value = true;
    try {
      const templeData = await templeDb.getTempleById(id);
      if (templeData) {
        temple.value = { ...temple.value, ...templeData };

        // Sync to creator store (Layer 2)
        if (templeData.dungeonLayout) {
          creatorStore.templeMaze = JSON.parse(JSON.stringify(templeData.dungeonLayout.maze));

          if (templeData.dungeonLayout.rooms) {
            if (templeData.dungeonLayout.rooms['____']) {
              templeData.dungeonLayout.rooms['____'] = { type: 'wall' };
            }
            creatorStore.roomsData = JSON.parse(JSON.stringify(templeData.dungeonLayout.rooms));
          }
          creatorStore.markAsLoaded(id);
        }

        calculateDungeonStats();
      }
    } finally {
      isLoading.value = false;
    }
  };

  const saveTemple = async () => {
    // Collect layout from creatorStore for ultimate consistency
    const layoutToSave = {
      entrance: temple.value.dungeonLayout?.entrance || [0, 0],
      maze: JSON.parse(JSON.stringify(creatorStore.templeMaze)),
      rooms: JSON.parse(JSON.stringify(creatorStore.roomsData))
    };

    const templeDataToSave: ExtendedTempleInterface = {
      ...temple.value,
      id: templeId,
      dungeonLayout: layoutToSave
    };

    await templeDb.setTemple(templeDataToSave);

    // Update local snapshot in store if needed (for change detection)
    creatorStore.markAsLoaded(templeId);

    const toast = await toastController.create({
      message: 'Temple settings saved!',
      duration: 2000,
      position: 'bottom',
      color: 'success',
      icon: saveOutline
    });
    await toast.present();

    // Recalculate stats after save
    calculateDungeonStats();
  };

  const applyRawJson = async (jsonStr: string) => {
    try {
      const parsedData = JSON.parse(jsonStr);

      // Basic validation
      if (!parsedData.id) throw new Error('Invalid JSON: templeId is required');

      // Normalization: Enforce coordinate-based or standard tokens for maze layout
      const tokenMapping = new Map<string, string>();
      const normalizeToken = (token: string, rowIdx?: number, colIdx?: number): string => {
        // 1. Preserve specialized tokens that already match the 5-char coordinate format
        if (/^[A-Za-z]\d{4}$/.test(token)) return token;

        let result = token;

        // 2. Map legacy/short tokens to standard formats
        if (['____', '_', 'WALL'].includes(token)) {
          result = '____';
        } else if (token === '_00_' || token === 'EXIT') {
          result = '_00_';
        } else if (/^[L$]\d{2,4}$/.test(token)) {
          // Loot
          result = token.startsWith('$') ? token.replace('$', 'L') : token;
        } else if (/^[MmB]\d{2,4}$/.test(token)) {
          // Monsters
          result = token;
        } else if (/^K\d{2,4}$/.test(token)) {
          // Keys
          result = token;
        } else if (/^T\d{2,4}$/.test(token)) {
          // Teleporters
          result = token;
        } else if (/^[HVAPXUDS]\d{4}$/.test(token)) {
          // Other 5-char dynamic tokens
          result = token;
        } else {
          // 3. Static Mapping for single characters
          const mapping: Record<string, string> = {
            'H': 'HEAL', 'M': 'MANA', 'V': 'SAVE',
            'K': 'MKEY', 'MSTK': 'MKEY',
            'P': 'SHOP', 'T': 'TRAP',
            'Z': 'PUZL', 'v': 'PIT_', '.': 'R000', 'U': 'ST_U', 'D': 'ST_D',
            '?': 'SCRT', 'C': 'CAMP', '0': 'R000',
            'COMP': 'COMP', '$MAP': '$MAP'
          };
          result = mapping[token] || (
            // Last resort: If 4 or 5 chars, keep it. Otherwise map to Wall (____)
            (token.length === 4 || token.length === 5) ? token : '____'
          );
        }

        // 4. Force migrate R-style or legacy tokens to coordinate format if possible (Standardization)
        // This ensures the current maze matches the TXXYY format we are moving towards.
        if ((result.startsWith('R') || result.length === 4) && rowIdx !== undefined && colIdx !== undefined && result !== '____' && result !== '_00_') {
          const type = parsedData.dungeonLayout?.rooms?.[result]?.type || 'empty';
          const typePrefixes: Record<string, string> = {
            monster: 'M', boss: 'B', miniboss: 'm', loot: 'L', shop: 'S',
            health: 'H', mana: 'A', key: 'K', teleport: 'T', puzzle: 'P',
            trap: 'X', savepoint: 'V', stairs_up: 'U', stairs_down: 'D', empty: 'R'
          };
          const prefix = typePrefixes[type] || 'R';
          const xx = colIdx.toString().padStart(2, '0');
          const yy = rowIdx.toString().padStart(2, '0');
          const coordToken = prefix + xx + yy;

          if (coordToken !== result) {
            tokenMapping.set(result, coordToken);
            result = coordToken;
          }
        }

        return result;
      };

      if (parsedData.dungeonLayout?.maze) {
        const maze = parsedData.dungeonLayout.maze;
        if (Array.isArray(maze)) {
          // Single floor maze
          parsedData.dungeonLayout.maze = maze.map((row: string[], rIdx: number) =>
            row.map((token: string, cIdx: number) => normalizeToken(token, rIdx, cIdx))
          );
        } else {
          // Multi-floor maze
          Object.keys(maze).forEach(floorId => {
            maze[floorId] = maze[floorId].map((row: string[], rIdx: number) =>
              row.map((token: string, cIdx: number) => normalizeToken(token, rIdx, cIdx))
            );
          });
        }
      }

      // 5. IMPORTANT: Synchronize the rooms object keys with the new maze tokens
      if (parsedData.dungeonLayout?.rooms && tokenMapping.size > 0) {
        const oldRooms = parsedData.dungeonLayout.rooms;
        const newRooms: Record<string, any> = {};

        // Transfer all room definitions, renaming those redirected by normalizeToken
        Object.entries(oldRooms).forEach(([key, room]) => {
          const newKey = tokenMapping.get(key) || key;
          // If multiple old keys map to the same new key (unlikely but possible), 
          // we keep the first one or merge. Usually it's unique.
          if (!newRooms[newKey]) {
            newRooms[newKey] = room;
          }
        });

        parsedData.dungeonLayout.rooms = newRooms;
        debug.log(`Normalized ${tokenMapping.size} room tokens in layout import.`);
      }

      // Update local state
      temple.value = { ...temple.value, ...parsedData };

      // Sync to creator store
      if (parsedData.dungeonLayout) {
        if (parsedData.dungeonLayout.maze) {
          creatorStore.templeMaze = JSON.parse(JSON.stringify(parsedData.dungeonLayout.maze));
        }
        if (parsedData.dungeonLayout.rooms) {
          // Sanitize wall token definition if present
          if (parsedData.dungeonLayout.rooms['____']) {
            parsedData.dungeonLayout.rooms['____'] = { type: 'wall' };
          }
          creatorStore.roomsData = JSON.parse(JSON.stringify(parsedData.dungeonLayout.rooms));
        }
      }

      // Save to database
      await saveTemple();

      return { success: true };
    } catch (err: any) {
      debug.error('applyRawJson failed', err);
      return { success: false, error: err.message };
    }
  };

  const calculatePowerRating = () => {
    const level = temple.value.level || 1;
    const monResult = composition.value.monsters;
    let monsterStrength = 0;
    monResult.forEach(m => {
      const size = m.size;
      const count = m.count;
      if (size === 'small') monsterStrength += count * 0.5;
      else if (size === 'medium') monsterStrength += count * 1;
      else if (size === 'large') monsterStrength += count * 2;
      else if (size === 'miniboss') monsterStrength += count * 5;
      else if (size === 'boss') monsterStrength += count * 10;
    });
    return Math.min(100, Math.round(level * 10 + monsterStrength * 0.5));
  };

  const getBeastsByTier = (tier: 'boss' | 'miniboss' | 'other') => {
    const monsters = composition.value.monsters;
    if (tier === 'boss') {
      return monsters.filter(m => m.size === 'boss');
    } else if (tier === 'miniboss') {
      return monsters.filter(m => m.size === 'miniboss');
    } else {
      return monsters.filter(m => !['boss', 'miniboss'].includes(m.size));
    }
  };

  const getCategoryColor = (catId: string) => {
    const category = categories.value.find(cat => cat.id === catId);
    if (category?.color) return category.color;
    return 'medium';
  };

  /*
  const getCategoryIcon = (catId: string) => {
    // This logic is currently handled in XpTempleAttributes.vue
    // If needed globally, add icon mapping logic here.
    return null;
  };
  */

  const getCategoryName = (catId: string) => {
    const category = categories.value.find(cat => cat.id === catId);
    return category ? category.name : 'Unknown';
  };

  // Load all beasts from bestiary
  const loadBeasts = async () => {
    allBeasts.value = await bestiaryDb.getBeasts();
  };

  // Get beasts with full details for this temple
  const templeBeastsWithDetails = computed((): TempleBeast[] => {
    const result: TempleBeast[] = [];

    if (!temple.value.dungeonLayout?.maze || !temple.value.dungeonLayout?.rooms) {
      return result;
    }

    const maze = temple.value.dungeonLayout.maze;
    const roomDefs = temple.value.dungeonLayout.rooms;

    const processFloor = (grid: string[][], floorId: string) => {
      grid.forEach((row, rowIndex) => {
        row.forEach((cellSymbol, colIndex) => {
          if (!cellSymbol || isWallToken(cellSymbol) || cellSymbol === ROOM_VOID) return;

          const roomData = (roomDefs as any)[cellSymbol];
          if (!roomData) return;

          const type = roomData.type;
          let tier: 'boss' | 'miniboss' | 'monster' | null = null;

          if (type === 'boss') tier = 'boss';
          else if (type === 'miniboss') tier = 'miniboss';
          else if (type === 'monster') tier = 'monster';

          if (!tier) return;

          // Get beast IDs from room content
          const beastIds = roomData.content?.beasts || [];

          beastIds.forEach((beastId: string) => {
            const beast = allBeasts.value.find(b => b.id === beastId) || null;
            result.push({
              beast,
              beastId,
              tier,
              roomSymbol: cellSymbol,
              floor: floorId,
              row: rowIndex,
              col: colIndex
            });
          });

          // If no specific beasts but room is a battle type, add placeholder
          if (beastIds.length === 0 && tier) {
            result.push({
              beast: null,
              beastId: '',
              tier,
              roomSymbol: cellSymbol,
              floor: floorId,
              row: rowIndex,
              col: colIndex
            });
          }
        });
      });
    };

    if (Array.isArray(maze)) {
      processFloor(maze, '1F');
    } else {
      Object.entries(maze).forEach(([floorId, grid]) => {
        processFloor(grid as string[][], floorId);
      });
    }

    // Sort: bosses first, then minibosses, then monsters
    const tierOrder = { boss: 0, miniboss: 1, monster: 2 };
    return result.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
  });

  onMounted(() => {
    loadCategories();
    loadBeasts();
    if (templeId) {
      loadTemple(templeId);
    }
  });

  watch(temple, () => {
    debug.log("Temple settings changed, skipping autosave");
  }, { deep: true });

  const dungeonAudit = computed(() => {
    const rooms = temple.value.dungeonLayout?.rooms || {};
    let hasMap = false;
    let hasCompass = false;
    let hasBossKey = false;
    let totalKeys = 0;
    let totalLockedDoors = 0;

    Object.values(rooms).forEach((room: any) => {
      // Check items
      if (room.type === 'loot' && room.content?.dungeon) {
        const item = room.content.dungeon;
        if (item === 'map') hasMap = true;
        if (item === 'compass') hasCompass = true;
        if (item === 'master-key') hasBossKey = true;
        if (item === 'key') totalKeys++;
      }

      // Check locked doors
      if (room.sides) {
        Object.values(room.sides).forEach(side => {
          if (side === 'locked') totalLockedDoors++;
        });
      }
    });

    // Locked doors are counted twice (once per room sharing the edge)
    // Except for edges leading outside which shouldn't happen for 'locked' type usually
    const actualLocks = Math.ceil(totalLockedDoors / 2);

    return {
      hasMap,
      hasCompass,
      hasBossKey,
      totalKeys,
      totalLockedDoors: actualLocks,
      keyBalance: totalKeys - actualLocks
    };
  });

  const itemMapData = computed(() => {
    if (!temple.value.dungeonLayout?.maze || !temple.value.dungeonLayout?.rooms) return {};

    const maze = temple.value.dungeonLayout.maze;
    const roomDefs = temple.value.dungeonLayout.rooms;
    const result: Record<string, any[][]> = {};

    const processGrid = (grid: string[][]) => {
      return grid.map((row) => row.map((cellSymbol) => {
        if (!cellSymbol || isWallToken(cellSymbol) || cellSymbol === ROOM_VOID) {
          return { isRoom: false };
        }

        const room = (roomDefs as any)[cellSymbol];
        const lockedEdges = {
          north: room?.sides?.north === 'locked',
          east: room?.sides?.east === 'locked',
          south: room?.sides?.south === 'locked',
          west: room?.sides?.west === 'locked'
        };

        return {
          isRoom: true,
          item: room?.type === 'loot' ? (room.content?.dungeon || null) : null,
          isBoss: room?.type === 'boss',
          isEntrance: room?.type === 'entrance',
          lockedEdges: lockedEdges
        };
      }));
    };

    if (Array.isArray(maze)) {
      result['1F'] = processGrid(maze);
    } else {
      Object.entries(maze).forEach(([floorId, grid]) => {
        result[floorId] = processGrid(grid as string[][]);
      });
    }

    return result;
  });

  return {
    temple: temple,
    templeState: templeState,
    categories: categories,
    dungeonStats: dungeonStats,
    composition: composition,
    previewMaze: previewMaze,
    loadCategories: loadCategories,
    loadTemple: loadTemple,
    saveTemple: saveTemple,
    calculatePowerRating: calculatePowerRating,
    getBeastsByTier: getBeastsByTier,
    getCategoryColor: getCategoryColor,
    getCategoryName: getCategoryName,
    getTempleIcon: getTempleIcon,
    getTempleColor: getTempleColor,
    getTempleBg: getTempleBg,
    getDisplayName: getDisplayName,
    isRoom: isRoom,
    getRoomTypeIcon: getRoomTypeIcon,
    getMonsterIcon: getMonsterIcon,
    templeBeastsWithDetails: templeBeastsWithDetails,
    allBeasts: allBeasts,
    getItemIcon: getItemIcon,
    dungeonAudit: dungeonAudit,
    itemMapData: itemMapData,
    isLoading: isLoading,
    applyRawJson: applyRawJson
  };
}

export const TempleDataInjectionKey: InjectionKey<ReturnType<typeof useTempleData>> = Symbol('TempleData');
