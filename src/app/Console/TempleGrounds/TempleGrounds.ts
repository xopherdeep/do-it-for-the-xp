import { defineComponent, onMounted, computed, ref } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import ionic from '@/lib/mixins/ionic';
import { ROOM_ICONS } from '@/lib/engine/dungeons/roomTypes';
import { useRoute, useRouter } from 'vue-router';
import { useTemple } from '@/hooks/temples/useTemple';
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
import WeatherFX from '@/components/organisms/WeatherFX/WeatherFX.vue';
import TempleFloor from './TempleFloor.vue';
import TempleWalls from './TempleWalls.vue';
import TempleChestReveal from './components/TempleChestReveal.vue';
import TempleChoiceReveal from './components/TempleChoiceReveal.vue';
import TempleDoorReveal from './components/TempleDoorReveal.vue';
import TempleWallReveal from './components/TempleWallReveal.vue';
import TemplePegasusReveal from './components/TemplePegasusReveal.vue';
import TempleLoading from './components/TempleLoading.vue';
import XpMonsterModel from '@/components/organisms/MonsterModel/XpMonsterModel.vue';
import XpDungeonRoomModel from '@/components/organisms/DungeonRoomModel/XpDungeonRoomModel.vue';
import { play$fx } from "@/assets/fx"
import { useToast } from '@/hooks/useToast';
import { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import { bloodMoonLine } from '@/lib/engine/core/dungeons/templeReset';
import { useEquipmentItems, type EquipmentItem } from '@/app/Console/MyPortal/UserHud/components/equipment/EquipmentItems';
import { readExits } from '@/lib/services/temples/RoomInteractions';
import { useItem as useEquippedItem } from '@/lib/services/temples/ItemUse';
import { getTempleWorldLocation, useTempleMeta } from './templeGrounds/useTempleMeta';
import { useTempleLayout } from './templeGrounds/useTempleLayout';
import { useChestReveal, useChoiceReveal, useDoorReveal, usePegasusReveal, useWallReveal } from './templeGrounds/templeReveals';
import { useRoomBeast } from './templeGrounds/useRoomBeast';
import { useRoomOutcomes } from './templeGrounds/useRoomOutcomes';
import { useTempleMovement } from './templeGrounds/useTempleMovement';
import { useTemplePreload } from './templeGrounds/useTemplePreload';
import { mapCellIconOf } from './templeGrounds/mapCellIcon';

// Route params arrive as strings ("0" included). Only a complete, numeric x/y pair is a start position.
const isBlankParam = (value: unknown): boolean => value === undefined || value === null || value === '';

const toStartPosition = (x: unknown, y: unknown): [number, number] | undefined => {
  const isStartIncomplete = isBlankParam(x) || isBlankParam(y);
  if (isStartIncomplete) return undefined;
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
    'temple-floor': TempleFloor,
    'temple-walls': TempleWalls,
    'temple-chest-reveal': TempleChestReveal,
    'temple-choice-reveal': TempleChoiceReveal,
    'temple-door-reveal': TempleDoorReveal,
    'temple-wall-reveal': TempleWallReveal,
    'temple-pegasus-reveal': TemplePegasusReveal,
    'temple-loading': TempleLoading,
    XpVitalsBar,
    XpPurseBar,
    XpEquipmentModal,
    XpWorldMapModal,
    UserProfileModal,
    XpBottomNav,
    XpMonsterModel,
    XpDungeonRoomModel
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

    // Register predefined temples with the engine (for gameplay, not editing). The temple being opened is left out:
    // useTemple registers it from the Game Master's copy in TempleDb (the shipped one only when there is none) before
    // the run starts, so the shipped layout is never registered, even for a moment, over an edited one.
    // registerAllTemples keeps any temple the engine already holds, so the others are only a starting point too.
    registerAllTemples(Object.fromEntries(Object.entries(temples).filter(([id]) => id !== props.temple)));

    // Sync the shipped temples into the database first (an old seed is refreshed, an edited copy is kept), and
    // only then register the temples the database holds (user-created content), so what registers is the fresh copy
    importAllTempleLayouts()
      .then(() => debug.log('Temple layouts checked/syncing with TempleDb'))
      .catch(err => debug.error('Failed to sync temple layouts:', err))
      .then(() => registerCustomTemples())
      .catch(err => debug.error('Failed to register custom temples:', err));

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
      keyChange,
      keyPulse,
      playKeyPulse,
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
      moveIcons,
      stepTo,
      isDoorLocked,
      claimChestItems,
      handleTeleport,
      toggleMap,
      showTempleMessage,
      registerMessageDisplay,
      chestContents,
      isCurrentRoomCleared,
      openMap,
      closeMap: closeMapQuietly,
      whenOpened,
      restoreIfGone,
      // Map and compass utilities
      showRoomDetails,
      getRoomVisibility,
      isCurrentRoom,
      getRoomIcon,
      getMapTileClass,
      isRoomVisited
    } = useTemple(props.temple, startPosition, startLevel, progressHeroId);
    const mapCellIcon = mapCellIconOf({
      rooms, hasCompass, getRoomVisibility, isCurrentRoom, showRoomDetails, getRoomIcon, isRoomVisited
    });

    const router = useRouter();

    // The page stays parked while the hero is on another screen, so a run put away meanwhile (Portal Home) is reopened on Back
    onIonViewWillEnter(restoreIfGone);

    // Messages are RPG-box toasts in the center with an X to dismiss
    const { showToast } = useToast();
    // Hushed while a reveal tells the news itself (the Pegasus chest), so the toast does not say it twice
    let hushMessages = false;
    const say = (message: string, duration = 2400) => {
      if (hushMessages) return;
      showToast(message, duration, 'middle').catch((error: unknown) => debug.error('Failed to show toast', error));
    };
    const setHushMessages = (hushed: boolean) => {
      hushMessages = hushed;
    };
    registerMessageDisplay(say);

    // A sound key from the fx table; the table is not there in every environment
    const fx = (key: string) => {
      if (typeof play$fx === 'function') play$fx(key);
    };

    // The map closes with the page-close sound, once: from the compass rose, from a tap outside, or from the modal's own dismiss
    const closeMap = () => {
      if (isMapOpen.value) fx('closePage');
      closeMapQuietly();
    };

    const templeSystem = TempleSystem.getInstance();

    // The game area and the floor it shows, measured on mount and again whenever it resizes; each room's walls
    const { layout, updateBg, getBgImage, getExitsAt: exitsAt, isNearHero } = useTempleLayout({
      props,
      currentPosition,
      maze,
      rooms,
      templeSystem
    });
    const { backgroundPosition, gameArea, tileWidth, tileHeight, validRoomCoords } = layout;

    // Which temple this is: its name for the map and the Area tab, its element for the walls and the beasts
    const {
      metadata: templeMeta,
      isGenerated,
      name: templeName,
      element: templeElement,
      shortName: templeShortName
    } = useTempleMeta(props);

    // The painted floors are fetched before the hero walks in, the room they start in first
    const { isLoadingShown, loadedFloors, totalFloors } = useTemplePreload(
      props.temple,
      ref<[number, number]>(startPosition ?? currentPosition.value ?? [0, 0])
    );

    // Get the world location for this temple and walk out to it
    const leaveTemple = () => {
      const templeWorldMap = getTempleWorldLocation(props.temple);
      router.push({ name: templeWorldMap.route, params: { userId: props.userId } });
    };

    // The reveals: a room's choices, the cleared temple and the chest
    const { choiceReveal, choiceRevealKey, openChoiceReveal, selectRevealChoice: chooseReveal, dismissReveal: leaveReveal } =
      useChoiceReveal();
    const { pegasusReveal, showTempleCleared, completeTempleCleared: finishTempleCleared } = usePegasusReveal(leaveTemple);
    const { isPegasusRevealOpen, pegasusShown, pegasusReward, pegasusLevelUp } = pegasusReveal;
    const { chest, showChestContentsDialog, showEmptyChest, claimChestLoot: takeChestLoot, closeChest: leaveChest } =
      useChestReveal({
        props,
        progressHeroId,
        chestContents,
        currentRoom,
        showTempleMessage,
        claimChestItems,
        showTempleCleared,
        setHushMessages
      });
    const { isChestOpen, chestLootShown, isChestClosed } = chest;

    // The beast of a combat room: the voxel monster, and the card its reveal shows
    const { isCombatRoomCleared, showVoxelMonster, activeMonster, getBeastCard: beastCard } = useRoomBeast({
      props,
      progressHeroId,
      currentRoom,
      currentPosition,
      currentLevel,
      isCurrentRoomCleared,
      templeMeta,
      isGenerated,
      templeElement
    });

    // What rooms and items do: fights, chests, riddles, shops, teleports, traps, the way out
    const { isShaking, getLiveContext: liveContext, applyOutcome, handleArrival: arrive, showRoomActions } = useRoomOutcomes({
      props,
      userStore,
      router,
      progressHeroId,
      templeSystem,
      currentPosition,
      currentLevel,
      showTempleMessage,
      handleTeleport,
      say,
      fx,
      updateBg,
      leaveTemple,
      showTempleCleared,
      showChestContentsDialog,
      showEmptyChest,
      openChoiceReveal,
      beastCard,
      activeMonster,
      templeElement
    });

    // The hero's hands, shared with the portal; the Area tab opens the equipment to change them
    const { equipment, leftHandItem, rightHandItem, setHandItem: clickItem } = useHeroEquipment(String(props.userId || userStore.currentUser.id));

    // The live item definitions: the copy stored on the profile has no click. The composable needs the
    // router and the game store; where those are missing the navigation items simply have no click.
    let itemCatalog: EquipmentItem[] = [];
    try {
      itemCatalog = useEquipmentItems().specialItems;
    } catch (error) {
      debug.warn('Equipment catalog unavailable', error);
    }

    // The locked door close up
    const { door, showLockedDoor, unlockShownDoor, completeShownDoor: finishShownDoor } = useDoorReveal({
      props,
      templeSystem,
      playerKeys,
      playKeyPulse,
      liveContext,
      applyOutcome
    });
    const { isDoorOpen, doorShown, doorResult } = door;

    // The cracked wall close up: a Bomb in a hand blows it open
    const { wall, showCrackedWall, triggerWallBlast, completeShownWall: finishShownWall, closeShownWall } = useWallReveal({
      liveContext,
      applyOutcome,
      heldItems: () => [leftHandItem.value, rightHandItem.value] as Array<EquipmentItem | null>,
      catalog: () => itemCatalog
    });
    const { isWallOpen, wallShown, wallResult } = wall;

    // Walking: swipes and arrows, and the floor following the hero
    const { handleTouchStart: onTouchStart, handleTouchEnd: onTouchEnd, handleMove: moveWithUpdate } = useTempleMovement({
      props,
      templeSystem,
      currentPosition,
      canMoveUp,
      canMoveDown,
      canMoveLeft,
      canMoveRight,
      isDoorLocked,
      stepTo,
      fx,
      updateBg,
      showLockedDoor,
      showCrackedWall,
      arrive
    });

    const isEquipmentOpen = ref(false);
    const isProfileOpen = ref(false);
    const isPegasusOpen = ref(false);
    const openEquipment = () => {
      fx('openMenu');
      isEquipmentOpen.value = true;
    };

    // A blood moon the Game Master scheduled has risen since the last visit: the temple starts over, and says so
    onMounted(() => {
      // The run starts after the temple's saved layout was read, and the hero's save is read once it has
      void whenOpened.then(() => templeSystem.whenProgressReady(props.temple)).then(() => {
        if (!templeSystem.bloodMoonRose(props.temple)) return;
        fx('no');
        say(bloodMoonLine(templeShortName.value.replace(/\b\w/g, (letter) => letter.toUpperCase())), 3600);
      });
    });

    // Tapping an equipped item: the select tick, then whatever the item does here
    const useHand = (item: EquipmentItem | null) => {
      if (!item) return;
      fx('select');
      const live = liveContext();
      if (!live) {
        showTempleMessage('Choose a profile first');
        return;
      }
      const { ctx, room } = live;
      const exits = readExits(ctx.templeId, ctx.level, ctx.position);
      void applyOutcome(useEquippedItem(item, { ...ctx, room, exits, catalog: itemCatalog }));
    };


    return {
      // From useTemple
      whenOpened,
      currentPosition,
      currentLevel,
      hasMap,
      hasCompass,
      playerKeys,
      keyChange,
      keyPulse,
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
      moveIcons,
      toggleMap,
      isCurrentRoom,

      // Map and compass utilities
      showRoomDetails,
      getRoomVisibility,
      getRoomIcon,
      getMapTileClass,
      isRoomVisited,
      mapCellIcon,

      // Local functions
      moveWithUpdate,
      onTouchStart,
      onTouchEnd,
      exitsAt,
      isNearHero,
      templeElement,
      isDoorLocked,
      showRoomActions,
      isChestOpen,
      isChestClosed,
      chestLootShown,
      takeChestLoot,
      leaveChest,
      choiceReveal,
      choiceRevealKey,
      chooseReveal,
      leaveReveal,
      isDoorOpen,
      doorShown,
      doorResult,
      unlockShownDoor,
      finishShownDoor,
      isWallOpen,
      wallShown,
      wallResult,
      triggerWallBlast,
      finishShownWall,
      closeShownWall,
      isPegasusRevealOpen,
      pegasusShown,
      pegasusReward,
      pegasusLevelUp,
      finishTempleCleared,
      getBgImage,
      validRoomCoords,
      templeName,
      isLoadingShown,
      loadedFloors,
      totalFloors,
      backgroundPosition,
      updateBg,

      // Tile dimensions for grid
      gameArea,
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
      isShaking,
      showVoxelMonster,
      activeMonster
    };
  },
  computed: {
    currentBgImage() {
      const [row, col] = this.currentPosition;
      try {
        return require(`@/assets/images/backgrounds/${this.temple}/[${row},${col}].webp`);
      } catch {
        return '';
      }
    }
  }
});
