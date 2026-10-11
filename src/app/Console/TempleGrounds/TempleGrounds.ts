import { defineComponent, onBeforeUnmount, onMounted, computed, ref, watch } from 'vue';
import ionic from '@/lib/mixins/ionic';
import { actionSheetController, alertController } from '@ionic/vue';
import { ROOM_ICONS } from '@/lib/engine/dungeons/roomTypes';
import { useRoute, useRouter } from 'vue-router';
import { useTemple } from '@/hooks/temples/useTemple';
import { metadataFor, metadataForAsync, type TempleMetadata } from '@/lib/engine/temples/templeRegistry';
import { registerAllTemples, registerCustomTemples } from '@/lib/engine/core/dungeons/TempleAdapter';
import { importAllTempleLayouts } from '@/lib/engine/core/dungeons/importAllTemples';
import temples from '../../../lib/engine/temples';
import XpVitalsBar from '../MyPortal/UserHud/components/XpVitalsBar.vue';
import XpPurseBar from '../MyPortal/UserHud/components/XpPurseBar.vue';
import XpEquipmentModal from '../MyPortal/UserHud/components/XpEquipmentModal.vue';
import XpWorldMapModal from '../MyPortal/UserHud/components/XpWorldMapModal.vue';
import UserProfileModal from '../MyPortal/UserHud/components/UserProfileModal.vue';
import XpBottomNav from '@/components/organisms/BottomNav/XpBottomNav.vue';
import { useHeroEquipment } from '@/hooks/useHeroEquipment';
import debug from '@/lib/utils/debug';
import { useUserStore } from '@/lib/store/stores/user';
import { templeBattleRoute } from '@/app/Console/BattleField/battle/battleContext';
import WeatherFX from '@/components/organisms/WeatherFX/WeatherFX.vue';
import TempleWalls from './TempleWalls.vue';
import type { ExitKind, WallSide } from './templeWalls';
import { play$fx } from "@/assets/fx"
import { useToast } from '@/hooks/useToast';
import { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import { bloodMoonLine } from '@/lib/engine/core/dungeons/templeReset';
import { useEquipmentItems, type EquipmentItem } from '@/app/Console/MyPortal/UserHud/components/equipment/EquipmentItems';
import {
  answerRiddle,
  buyWare,
  doorActions,
  onEnterRoom,
  readExits,
  roomActions,
  type Riddle,
  type RoomAction,
  type RoomContext,
  type RoomOutcome,
  type Ware
} from '@/lib/services/temples/RoomInteractions';
import { useItem as useEquippedItem } from '@/lib/services/temples/ItemUse';

const COMBAT_ROOM_TYPES = ['monster', 'miniboss', 'boss'];

// Route params arrive as strings ("0" included). Only a complete, numeric x/y pair is a start position.
const toStartPosition = (x: unknown, y: unknown): [number, number] | undefined => {
  if (x === undefined || x === null || x === '' || y === undefined || y === null || y === '') return undefined;
  const col = Number(x);
  const row = Number(y);
  return Number.isInteger(col) && Number.isInteger(row) && col >= 0 && row >= 0 ? [row, col] : undefined;
};

// The temple route has no :level segment: a battle returns with ?level=2F. A floor only means something
// next to the start position it qualifies, and the temple ignores floors it does not have.
const toStartLevel = (level: unknown, startPosition: [number, number] | undefined): string | undefined => {
  const raw = Array.isArray(level) ? level[0] : level;
  return startPosition && typeof raw === 'string' && raw !== '' ? raw : undefined;
};

export default defineComponent({
  props: ['userId', 'temple', 'x', 'y'],
  name: 'temple-grounds-engine',
  mixins: [ionic],
  components: {
    'weather-fx': WeatherFX,
    'temple-walls': TempleWalls,
    XpVitalsBar,
    XpPurseBar,
    XpEquipmentModal,
    XpWorldMapModal,
    UserProfileModal,
    XpBottomNav
  },
  setup(props) {
    const userStore = useUserStore();

    // Ensure users are loaded
    if (Object.keys(userStore.users).length === 0) {
      userStore.loadUsers();
    }

    const user = computed(() => {
      return userStore.getUserById(props.userId);
    });

    // Register predefined temples with the engine (for gameplay, not editing)
    registerAllTemples(temples);

    // Import all temple layouts into the database if they don't exist
    importAllTempleLayouts()
      .then(() => debug.log('Temple layouts checked/syncing with TempleDb'))
      .catch(err => debug.error('Failed to sync temple layouts:', err));

    // Register custom temples from the TempleDb (user-created content)
    registerCustomTemples().catch(err => debug.error('Failed to register custom temples:', err));

    // Where the hero starts: the room (and floor) a battle returns to, if the route names one.
    // A hero with a saved run in this temple resumes it instead, wherever it stopped.
    const route = useRoute();
    const startPosition = toStartPosition(props.x, props.y);
    const startLevel = toStartLevel(route.query.level, startPosition);

    // The hero whose progress in this temple is kept: the one the route names, else the signed-in one
    const progressHeroId: string | undefined = props.userId || userStore.currentUser.id || undefined;

    // Get temple features from the composable
    const {
      currentPosition,
      currentLevel,
      hasMap,
      hasCompass,
      playerKeys,
      isMapOpen,
      currentRoom,
      maze,
      rooms,
      actionColor,
      currentMessage,
      showMessage,
      canMoveUp,
      canMoveDown,
      canMoveLeft,
      canMoveRight,
      move,
      isDoorLocked,
      processChestItems,
      handleTeleport,
      toggleMap,
      displayMessage,
      registerMessageDisplay,
      chestContents,
      isCurrentRoomCleared,
      openMap,
      closeMap,
      // Map and compass utilities
      showRoomDetails,
      getRoomVisibility,
      isCurrentRoom,
      getRoomIcon,
      getMapTileClass,
      isRoomVisited
    } = useTemple(props.temple, startPosition, startLevel, progressHeroId);

    const router = useRouter();

    // Messages are toasts pinned to the top, in the game's own style
    const { showToast } = useToast();
    const say = (message: string, duration = 2400) => {
      showToast(message, duration, 'top').catch((error: unknown) => debug.error('Failed to show toast', error));
    };
    registerMessageDisplay(say);

    // A sound key from the fx table; the table is not there in every environment
    const fx = (key: string) => {
      if (typeof play$fx === 'function') play$fx(key);
    };

    // A combat room whose beasts are already beaten: no second fight, and the room shows a mark
    const isCombatRoomCleared = computed(
      () => !!currentRoom.value && COMBAT_ROOM_TYPES.includes(currentRoom.value.type) && isCurrentRoomCleared.value
    );

    // Hand the hero to the battle screen for the combat room they stand in
    const startFight = () => {
      const heroId = props.userId || userStore.currentUser.id;
      if (!heroId) {
        displayMessage('Choose a profile first');
        return;
      }
      const [row, col] = currentPosition.value;
      router.push(templeBattleRoute(String(heroId), props.temple, currentLevel.value, col, row));
    };

    // Background position state for CSS transforms - initialize with default values
    const backgroundPosition = ref({ x: 0, y: 0 });

    // Tile dimensions for the background grid
    const tileWidth = ref(window.innerWidth);
    const tileHeight = ref(window.innerHeight - 140);

    // Update tile dimensions when window resizes
    onMounted(() => {
      const updateDimensions = () => {
        tileWidth.value = window.innerWidth;
        tileHeight.value = window.innerHeight - 140;
        const [row, col] = currentPosition.value;
        updateBg(col, row);
      };

      window.addEventListener('resize', updateDimensions);
      updateDimensions(); // Initial setup
    });

    // Format the temple name for display
    // Registry temples and generated ones (gen-<slug>, from the TempleDb) share one metadata ref
    const templeMeta = ref<TempleMetadata | undefined>(metadataFor(props.temple));
    const isGenerated = computed(() => String(props.temple || '').startsWith('gen-'));
    const resolveTempleMeta = (id: string) => {
      templeMeta.value = metadataFor(id);
      if (id.startsWith('gen-')) {
        void metadataForAsync(id).then((meta) => { if (id === props.temple) templeMeta.value = meta; });
      }
    };
    resolveTempleMeta(props.temple);
    watch(() => props.temple, resolveTempleMeta);
    const templeName = computed(() => {
      if (isGenerated.value && templeMeta.value?.name) return templeMeta.value.name;
      return props.temple.replace(/-/g, ' ');
    });

    // Calculate valid room coordinates for background images
    const validRoomCoords = computed(() => {
      const coords: string[] = [];

      const mazeData = maze.value;
      for (let row = 0; row < mazeData.length; row++) {
        for (let col = 0; col < mazeData[row].length; col++) {
          const roomKey = mazeData[row][col];
          if (rooms.value[roomKey]?.type !== 'wall') {
            coords.push(`[${row},${col}]`);
          } else {
            coords.push(`[0,0]`);
          }
        }
      }

      return coords;
    });

    // Helper to get background images
    const getBgImage = (xy: string) => {
      try {
        return require(`@/assets/images/backgrounds/${props.temple}/${xy}.jpg`);
      } catch {
        return '';
      }
    };

    // Update the background position visually
    const updateBg = (x: number, y: number) => {
      // Get dimensions of a single image tile
      const tileWidth = window.innerWidth; // Full viewport width
      const tileHeight = window.innerHeight - 140; // Account for header/footer

      // Calculate translate values - invert for proper positioning
      const translateX = -x * tileWidth;
      const translateY = -y * tileHeight;

      // Update the background position directly in our reactive state
      backgroundPosition.value = { x: translateX, y: translateY };
    };

    // The door the hero walked into: a small lock asks for a key, the boss door for the Boss Key (RoomInteractions.doorActions)
    const showUnlockDoorAlert = async (direction: 'north' | 'south' | 'east' | 'west') => {
      const live = liveContext();
      if (!live) return;
      const door = doorActions(live.ctx, direction);
      const buttons = [
        { text: door.actions.length ? 'Cancel' : 'Ok', role: 'cancel' },
        ...door.actions.map((action) => ({ text: action.label, handler: () => void runRoomAction(action) }))
      ];

      const alert = await alertController.create({ header: door.header, message: door.subHeader, buttons });
      await alert.present();
    };

    // --- Room actions: what each room says and does lives in RoomInteractions ---------------------

    const templeSystem = TempleSystem.getInstance();

    // The shake on the game area when something hurts or blows up
    const isShaking = ref(false);
    let shakeTimer: ReturnType<typeof setTimeout> | undefined;
    const shake = () => {
      isShaking.value = true;
      if (shakeTimer) clearTimeout(shakeTimer);
      shakeTimer = setTimeout(() => (isShaking.value = false), 400);
    };
    onBeforeUnmount(() => {
      if (shakeTimer) clearTimeout(shakeTimer);
    });

    /**
     * Where the hero stands right now, read from the temple itself: the refs of useTemple only catch up
     * on the next tick, and a trap has to know the room the hero just walked into.
     */
    const liveContext = (): { ctx: RoomContext; room: any } | null => {
      const state = templeSystem.getTempleState(props.temple);
      const room = templeSystem.getCurrentRoom(props.temple);
      if (!state || !room || !progressHeroId) return null;
      return {
        room,
        ctx: {
          userId: String(progressHeroId),
          templeId: props.temple,
          level: state.currentLevel,
          position: [state.currentPosition[0], state.currentPosition[1]]
        }
      };
    };

    // A riddle on the wall: pick an answer from the choices
    const showRiddleAlert = async (riddle: Riddle, room: any, ctx: RoomContext) => {
      const alert = await alertController.create({
        header: 'The Glyphs',
        message: riddle.question,
        inputs: riddle.choices.map((choice, index) => ({ type: 'radio' as const, label: choice, value: index })),
        buttons: [
          { text: 'Step back', role: 'cancel' },
          {
            text: 'Answer',
            handler: (choice: number | undefined) => {
              if (choice === undefined || choice === null) return false;
              void applyOutcome(answerRiddle(room, ctx, Number(choice)));
              return true;
            }
          }
        ]
      });
      await alert.present();
    };

    // The shopkeeper's wares with the hero's wallet
    const showShopAlert = async (wares: Ware[], gp: number, room: any, ctx: RoomContext) => {
      const alert = await alertController.create({
        header: 'Wares',
        subHeader: `You carry ${gp} GP`,
        inputs: wares.map((ware, index) => ({
          type: 'radio' as const,
          label: `${ware.name}: ${ware.blurb}, ${ware.price} GP${ware.soldOut ? ' (sold out)' : ''}`,
          value: ware.id,
          checked: index === 0 && !ware.soldOut,
          disabled: ware.soldOut
        })),
        buttons: [
          { text: 'Leave', role: 'cancel' },
          {
            text: 'Buy',
            handler: (wareId: string | undefined) => {
              if (!wareId) return false;
              void applyOutcome(buyWare(room, ctx, wareId));
              return true;
            }
          }
        ]
      });
      await alert.present();
    };

    /** Show what a room or an item did: the sound, the shake, the toast, and whatever screen it opens. */
    const applyOutcome = async (outcome: RoomOutcome): Promise<void> => {
      if (outcome.sound) fx(outcome.sound);
      if (outcome.shake) shake();
      if (outcome.message) say(outcome.message);

      if (outcome.defeated) {
        // Same as losing a battle: HP is already back, the game-over screen takes over
        fx('die');
        void router.replace({ name: 'game-over' });
        return;
      }

      const live = liveContext();
      switch (outcome.intent) {
        case 'leave': {
          // Get the world location for this temple and walk out to it
          const templeWorldMap = getTempleWorldLocation(props.temple);
          router.push({ name: templeWorldMap.route, params: { userId: props.userId } });
          return;
        }
        case 'fight':
          startFight();
          break;
        case 'openChest':
          await showChestContentsDialog();
          break;
        case 'emptyChest':
          await showEmptyChestAlert();
          break;
        case 'teleport':
          if (handleTeleport()) {
            // Update UI after teleport, then see what the new room does
            fx('okdesuka');
            setTimeout(() => updateBg(currentPosition.value[1], currentPosition.value[0]), 100);
            await arrive();
          }
          break;
        case 'riddle':
          if (live && outcome.riddle) await showRiddleAlert(outcome.riddle, live.room, live.ctx);
          break;
        case 'shop':
          if (live && outcome.wares) await showShopAlert(outcome.wares, outcome.gp ?? 0, live.room, live.ctx);
          break;
        case 'sheet':
          await showRoomActions();
          break;
      }

      if (outcome.moved) await arrive();
    };

    /** The hero has just walked (or fallen, or jumped) into a room: traps and pits act at once. */
    const arrive = async (): Promise<void> => {
      const live = liveContext();
      if (!live) return;
      const outcome = onEnterRoom(live.room, live.ctx);
      if (outcome) await applyOutcome(outcome);
    };

    const runRoomAction = async (action: RoomAction) => {
      await applyOutcome(await action.run());
    };

    // Handle showing room actions
    const showRoomActions = async () => {
      const live = liveContext();
      if (!live) {
        displayMessage('Choose a profile first');
        return;
      }

      const sheet = roomActions(live.room, live.ctx);
      const buttons: any[] = sheet.actions.map((action) => ({
        text: action.label,
        handler: () => {
          void runRoomAction(action);
        }
      }));
      buttons.push({ text: 'Cancel', role: 'cancel' });

      const actionSheet = await actionSheetController.create({
        header: sheet.header,
        subHeader: sheet.subHeader,
        buttons
      });
      await actionSheet.present();
    };

    // Get the appropriate world location for a temple
    const getTempleWorldLocation = (templeId: string) => {
      // Map temples to their world locations and route names
      const templeWorldMap: Record<string, { world: string, route: string }> = {
        'wind-temple': { world: 'plains', route: 'world-plains' },
        'water-temple': { world: 'islands', route: 'world-islands' },
        'earth-temple': { world: 'forest', route: 'world-forest' },
        'fire-temple': { world: 'mountains', route: 'world-mountains' },
        'ice-temple': { world: 'ice', route: 'world-ice' },
        'light-temple': { world: 'sands', route: 'world-sands' },
        'shadow-temple': { world: 'swamps', route: 'world-swamps' },
        'moon-temple': { world: 'the-moon', route: 'the-moon' },
        'storm-temple': { world: 'clouds', route: 'world-clouds' }
      };

      // Return the world location or default to home-town if not found
      return templeWorldMap[templeId] || { world: 'plains', route: 'home-town' };
    };

    // What each side of a room is, for the wall layer: solid stone, an open door, or a locked one
    const exitsAt = (row: number, col: number): Record<WallSide, ExitKind> => {
      const roomAt = (r: number, c: number) => {
        const key = maze.value?.[r]?.[c];
        return key ? rooms.value?.[key] : undefined;
      };
      const here = roomAt(row, col);
      const kind = (side: WallSide, r: number, c: number): ExitKind => {
        const there = roomAt(r, c);
        if (!there || there.type === 'wall') return 'wall';
        if (templeSystem.doorKind(props.temple, [row, col], side) === 'master') return 'master';
        const lockedHere = Boolean(here?.locked?.[side]);
        const opposite = { north: 'south', south: 'north', east: 'west', west: 'east' }[side] as WallSide;
        const lockedThere = Boolean(there.locked?.[opposite]);
        return lockedHere || lockedThere ? 'locked' : 'door';
      };
      return {
        north: kind('north', row - 1, col),
        south: kind('south', row + 1, col),
        west: kind('west', row, col - 1),
        east: kind('east', row, col + 1),
      };
    };
    // Only the hero's room and its neighbours carry a wall layer: enough to scroll into, cheap to keep
    const isNearHero = (row: number, col: number) => {
      const [r, c] = currentPosition.value || [0, 0];
      return Math.abs(r - row) + Math.abs(c - col) <= 2;
    };
    const templeElement = computed(() => {
      const element = templeMeta.value?.element;
      if (isGenerated.value && element && element !== 'none') return element;
      return String(props.temple || '').replace('-temple', '') || 'wind';
    });

    // Swipe to walk: a swipe toward an open door moves the hero, a swipe into a wall does nothing.
    // Swipes shorter than the threshold, or more sideways than forwards, are ignored.
    const SWIPE_MIN_PX = 40;
    let swipeStart: { x: number; y: number } | null = null;
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      swipeStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const resolveSwipeDirection = (dx: number, dy: number): 'north' | 'south' | 'east' | 'west' => {
      const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);
      if (isHorizontalSwipe) {
        const isSwipingRight = dx > 0;
        return isSwipingRight ? 'west' : 'east';
      }
      const isSwipingDown = dy > 0;
      return isSwipingDown ? 'north' : 'south';
    };

    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!swipeStart || !touch) return;
      const dx = touch.clientX - swipeStart.x;
      const dy = touch.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return;
      // Dragging the world: a swipe to the right pulls the room on the left into view (west), and so on
      const direction = resolveSwipeDirection(dx, dy);
      const allowed = { north: canMoveUp, south: canMoveDown, west: canMoveLeft, east: canMoveRight }[direction];
      if (!allowed.value) return;
      moveWithUpdate(direction);
    };

    // Handle movement with UI updates
    const moveWithUpdate = (direction: 'north' | 'south' | 'east' | 'west') => {
      const [row, col] = currentPosition.value;
      let newRow = row;
      let newCol = col;

      switch (direction) {
        case 'north':
          newRow = row - 1;
          break;
        case 'south':
          newRow = row + 1;
          break;
        case 'west':
          newCol = col - 1;
          break;
        case 'east':
          newCol = col + 1;
          break;
      }

      // Check if door is locked (the boss door counts, bar or no bar in front of it)
      if (isDoorLocked(newRow, newCol) || templeSystem.doorKind(props.temple, [row, col], direction) === 'master') {
        showUnlockDoorAlert(direction);
        return;
      }

      // Update the background FIRST to create the immediate visual feedback
      // This makes the transition feel responsive right away
      updateBg(newCol, newRow);

      // THEN attempt to move in the game state
      const result = move(direction);

      // If movement failed for some reason, revert the background position
      if (!result) {
        updateBg(col, row);
        return;
      }

      // Traps and pits act the moment the hero walks in
      void arrive();
    };

    // Show a dialog with chest contents
    const showChestContentsDialog = async () => {
      // Play chest opening sound effect
      if (typeof play$fx === 'function') {
        play$fx('openChest');
      }

      const inputs = chestContents.value;

      if (inputs.length === 0) {
        showEmptyChestAlert();
        return;
      }

      const alert = await alertController.create({
        header: 'Chest Contents',
        inputs,
        buttons: [
          {
            text: 'Leave',
            role: 'cancel',
          },
          {
            text: 'Loot',
            handler: (selectedItems) => {
              if (selectedItems && selectedItems.length > 0) {
                const hasKey = selectedItems.some((i: string) => String(i).toLowerCase().includes('key'));
                if (typeof play$fx === 'function') {
                  play$fx(hasKey ? 'key' : 'takeItem');
                }
                processChestItems(selectedItems);
              } else if (typeof play$fx === 'function') {
                play$fx('yes');
              }
            },
          },
        ],
      });

      await alert.present();
    };


    // Show an alert for an empty chest
    const showEmptyChestAlert = async () => {
      // Play chest opening sound effect
      play$fx('openChest');


      const alert = await alertController.create({
        header: 'Chest is empty!',
        buttons: [
          {
            text: 'Ok',
            role: 'cancel',
            handler: () => {
              if (typeof play$fx === 'function') {
                play$fx('yes');
              }
            },
          },
        ],
      });

      await alert.present();
    };

    // Set up initial background position
    onMounted(() => {
      const [row, col] = currentPosition.value;
      updateBg(col, row);
    });

    // A saved run puts the hero back where it stopped once it has been read, which can be after the mount
    watch(currentPosition, ([row, col]) => updateBg(col, row));

    // The hero's hands, shared with the portal; the Area tab opens the equipment to change them
    const { equipment, leftHandItem, rightHandItem, clickItem } = useHeroEquipment(String(props.userId || userStore.currentUser.id));
    const isEquipmentOpen = ref(false);
    const isProfileOpen = ref(false);
    const isPegasusOpen = ref(false);
    const openEquipment = () => {
      fx('openMenu');
      isEquipmentOpen.value = true;
    };

    // The Area tab names the temple without the markup of the title
    const templeShortName = computed(() => String(templeName.value || 'Temple').replace(/<[^>]*>/g, '').trim() || 'Temple');

    // A blood moon the Game Master scheduled has risen since the last visit: the temple starts over, and says so
    onMounted(() => {
      void templeSystem.whenProgressReady(props.temple).then(() => {
        if (!templeSystem.bloodMoonRose(props.temple)) return;
        fx('no');
        say(bloodMoonLine(templeShortName.value.replace(/\b\w/g, (letter) => letter.toUpperCase())), 3600);
      });
    });

    // The live item definitions: the copy stored on the profile has no click. The composable needs the
    // router and the game store; where those are missing the navigation items simply have no click.
    let itemCatalog: EquipmentItem[] = [];
    try {
      itemCatalog = useEquipmentItems().specialItems;
    } catch (error) {
      debug.warn('Equipment catalog unavailable', error);
    }

    // Tapping an equipped item: the select tick, then whatever the item does here
    const useHand = (item: EquipmentItem | null) => {
      if (!item) return;
      fx('select');
      const live = liveContext();
      if (!live) {
        displayMessage('Choose a profile first');
        return;
      }
      const { ctx, room } = live;
      const exits = readExits(ctx.templeId, ctx.level, ctx.position);
      void applyOutcome(useEquippedItem(item, { ...ctx, room, exits, catalog: itemCatalog }));
    };


    return {
      // From useTemple
      currentPosition,
      hasMap,
      hasCompass,
      playerKeys,
      isMapOpen,
      currentRoom,
      isCombatRoomCleared,
      maze,
      rooms,
      actionColor,
      currentMessage,
      showMessage,
      canMoveUp,
      canMoveDown,
      canMoveLeft,
      canMoveRight,
      toggleMap,
      isCurrentRoom,

      // Map and compass utilities
      showRoomDetails,
      getRoomVisibility,
      getRoomIcon,
      getMapTileClass,
      isRoomVisited,

      // Local functions
      moveWithUpdate,
      onTouchStart,
      onTouchEnd,
      exitsAt,
      isNearHero,
      templeElement,
      isDoorLocked,
      showRoomActions,
      getBgImage,
      validRoomCoords,
      templeName,
      backgroundPosition,
      updateBg,

      // Tile dimensions for grid
      tileWidth,
      tileHeight,

      // Constants
      ROOM_ICONS,
      openMap,
      closeMap,
      user,
      leftHandItem,
      rightHandItem,
      equipment,
      clickItem,
      isEquipmentOpen,
      isProfileOpen,
      isPegasusOpen,
      openEquipment,
      templeShortName,
      useHand,
      isShaking
    };
  },
  computed: {
    currentBgImage() {
      const [row, col] = this.currentPosition;
      try {
        return require(`@/assets/images/backgrounds/${this.temple}/[${row},${col}].jpg`);
      } catch {
        return '';
      }
    }
  }
});