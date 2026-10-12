import { defineComponent, onBeforeUnmount, onMounted, computed, ref, watch } from 'vue';
import ionic from '@/lib/mixins/ionic';
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
import TempleChestReveal from './components/TempleChestReveal.vue';
import TempleChoiceReveal from './components/TempleChoiceReveal.vue';
import TempleDoorReveal from './components/TempleDoorReveal.vue';
import TemplePegasusReveal from './components/TemplePegasusReveal.vue';
import XpMonsterModel from '@/components/organisms/MonsterModel/XpMonsterModel.vue';
import { BestiaryService } from '@/lib/services/battle/BestiaryService';
import BestiaryDb, { beastStorage } from '@/lib/databases/BestiaryDb';
import type { DoorView } from './components/doorView';
import type { ChestLoot } from '@/lib/services/temples/ChestLoot';
import { pegasusOfTemple, pegasusView, type PegasusView } from '@/lib/services/temples/TemplePegasus';
import { CIRCLE_FIZZLES } from '@/lib/engine/core/dungeons/teleportPairing';
import type { ExitKind, WallSide } from './templeWalls';
import { play$fx } from "@/assets/fx"
import { useToast } from '@/hooks/useToast';
import { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import { bloodMoonLine } from '@/lib/engine/core/dungeons/templeReset';
import { useEquipmentItems, type EquipmentItem } from '@/app/Console/MyPortal/UserHud/components/equipment/EquipmentItems';
import {
  answerRiddle,
  buyWare,
  clearTemple,
  doorActions,
  onEnterRoom,
  readExits,
  roomActions,
  SFX,
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
    'temple-chest-reveal': TempleChestReveal,
    'temple-choice-reveal': TempleChoiceReveal,
    'temple-door-reveal': TempleDoorReveal,
    'temple-pegasus-reveal': TemplePegasusReveal,
    XpVitalsBar,
    XpPurseBar,
    XpEquipmentModal,
    XpWorldMapModal,
    UserProfileModal,
    XpBottomNav,
    XpMonsterModel
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
      closeMap: closeMapQuietly,
      // Map and compass utilities
      showRoomDetails,
      getRoomVisibility,
      isCurrentRoom,
      getRoomIcon,
      getMapTileClass,
      isRoomVisited
    } = useTemple(props.temple, startPosition, startLevel, progressHeroId);

    const router = useRouter();

    // Messages are RPG-box toasts at the bottom, over the nav, so they never cover the dungeon (X or swipe to dismiss)
    const { showToast } = useToast();
    // Hushed while a reveal tells the news itself (the Pegasus chest), so the toast does not say it twice
    let hushMessages = false;
    const say = (message: string, duration = 2400) => {
      if (hushMessages) return;
      showToast(message, duration, 'bottom').catch((error: unknown) => debug.error('Failed to show toast', error));
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

    // A combat room whose beasts are already beaten: no second fight, and the room shows a mark
    const isCombatRoomCleared = computed(
      () => !!currentRoom.value && COMBAT_ROOM_TYPES.includes(currentRoom.value.type) && isCurrentRoomCleared.value
    );

    const bestiaryService = new BestiaryService();

    // The beast the room's first beast id names, once the bestiary has been asked (filled in by the watch below the
    // reveal's beast lookup). While it is being asked the voxel monster waits, so it never swaps in front of the hero.
    const roomBeast = ref<{ name: string; avatar: string } | null>(null);
    const beastPending = ref(false);

    // Uncleared combat encounter in the room displays 3D roaming voxel monster
    const showVoxelMonster = computed(
      () =>
        !!currentRoom.value &&
        COMBAT_ROOM_TYPES.includes(currentRoom.value.type) &&
        !isCombatRoomCleared.value &&
        !beastPending.value
    );

    const formatMonsterName = (text: string): string =>
      text
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[-_]+/g, ' ')
        .trim()
        .replace(/\b([a-z])/g, (l) => l.toUpperCase());

    const resolveMonsterInfo = (room: any, element: string) => {
      const authoredName = room.content?.name || room.content?.monsterName || room.content?.beastName;
      const rawMonsterType = room.content?.monsterType;
      const roomType = room.type;

      let name = '';
      if (authoredName) {
        name = authoredName;
      } else if (rawMonsterType && rawMonsterType !== 'small') {
        name = formatMonsterName(rawMonsterType);
      } else if (roomType === 'boss') {
        const bossNames: Record<string, string> = {
          fire: 'Ifrit',
          earth: 'Titan',
          water: 'Leviathan',
          ice: 'Frost Giant',
          light: 'Seraph',
          shadow: 'Shadowlord',
          wind: 'Tempest Wyrm',
          moon: 'Eclipse Dragon',
          storm: 'Thunder Drake',
        };
        name = bossNames[element] || 'Ancient Dragon';
      } else if (roomType === 'miniboss') {
        const minibossNames: Record<string, string> = {
          fire: 'Fire Elemental',
          earth: 'Stone Guardian',
          water: 'Giant Squid',
          ice: 'Ice Wyrm',
          light: 'Radiant Guardian',
          shadow: 'Dark Phantom',
          wind: 'Gale Chimera',
          moon: 'Lunar Phantom',
          storm: 'Storm Drake',
        };
        name = minibossNames[element] || 'Dungeon Chimera';
      } else {
        const mobNames: Record<string, string> = {
          fire: 'Fire Imp',
          earth: 'Rock Golem',
          water: 'Water Elemental',
          ice: 'Ice Golem',
          light: 'Light Sentinel',
          shadow: 'Shadow Stalker',
          wind: 'Gale Sprite',
          moon: 'Moon Bat',
          storm: 'Spark Wisp',
        };
        name = mobNames[element] || 'Dust Bunny';
      }

      let avatarId = 74;
      if (roomType === 'boss') {
        const bossAvatars: Record<string, number> = {
          fire: 46, earth: 14, water: 3, ice: 32, light: 5, shadow: 18, wind: 1, moon: 1, storm: 1,
        };
        avatarId = bossAvatars[element] || 1;
      } else if (roomType === 'miniboss') {
        const minibossAvatars: Record<string, number> = {
          fire: 22, earth: 28, water: 40, ice: 35, light: 25, shadow: 41, wind: 19, moon: 43, storm: 29,
        };
        avatarId = minibossAvatars[element] || 19;
      } else {
        const mobAvatars: Record<string, number> = {
          fire: 12, earth: 27, water: 21, ice: 31, light: 24, shadow: 42, wind: 74, moon: 74, storm: 74,
        };
        avatarId = mobAvatars[element] || 74;
      }

      return { name, avatarId };
    };

    const activeMonster = computed(() => {
      if (!currentRoom.value) {
        return { name: 'Dust Bunny', avatar: bestiaryService.getAvatar(74) };
      }

      if (roomBeast.value) return roomBeast.value;

      const element = templeElement.value || 'fire';
      const info = resolveMonsterInfo(currentRoom.value, element);
      return {
        name: info.name,
        avatar: bestiaryService.getAvatar(info.avatarId),
      };
    });

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

    // Tile dimensions for the background grid: one room fills the game area exactly,
    // so its south wall sits on the hairlines instead of running under the footer
    const gameArea = ref<{ $el: HTMLElement } | null>(null);
    const tileWidth = ref(window.innerWidth);
    const tileHeight = ref(window.innerHeight - 172);
    let gameAreaObserver: ResizeObserver | null = null;

    // Re-measure whenever the game area changes: a window resize, or the footer growing as the vitals load
    onMounted(() => {
      const el = gameArea.value?.$el;
      const updateDimensions = () => {
        const box = el?.getBoundingClientRect();
        if (box && box.height > 0) {
          tileWidth.value = box.width;
          tileHeight.value = box.height;
        }
        const [row, col] = currentPosition.value;
        updateBg(col, row);
      };

      if (el) {
        gameAreaObserver = new ResizeObserver(updateDimensions);
        gameAreaObserver.observe(el);
      }
      updateDimensions(); // Initial setup
    });
    onBeforeUnmount(() => gameAreaObserver?.disconnect());

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
      // Calculate translate values - invert for proper positioning
      const translateX = -x * tileWidth.value;
      const translateY = -y * tileHeight.value;

      // Update the background position directly in our reactive state
      backgroundPosition.value = { x: translateX, y: translateY };
    };

    // The door the hero walked into: a small lock asks for a key, the boss door for the Boss Key (RoomInteractions.doorActions)
    // The locked-door reveal: the door close up, its lock, and the key if the hero holds one
    const isDoorOpen = ref(false);
    const doorShown = ref<DoorView | null>(null);
    const doorResult = ref<'opened' | 'refused' | null>(null);
    let doorAction: RoomAction | null = null;
    let doorOutcome: RoomOutcome | null = null;

    const showLockedDoor = (direction: 'north' | 'south' | 'east' | 'west') => {
      const live = liveContext();
      if (!live) return;
      const door = doorActions(live.ctx, direction);
      const kind = templeSystem.doorKind(props.temple, live.ctx.position, direction, live.ctx.level);
      doorAction = door.actions[0] ?? null;
      doorOutcome = null;
      doorResult.value = null;
      doorShown.value = {
        kind: kind === 'master' ? 'master' : 'locked',
        canOpen: Boolean(doorAction),
        header: door.header,
        line: door.subHeader ?? '',
        keys: playerKeys.value
      };
      isDoorOpen.value = true;
    };

    // The key went in: the temple opens the door now, the reveal swings it open and hands back on `done`
    const unlockShownDoor = async () => {
      if (!doorAction) return;
      const outcome = await doorAction.run();
      if (outcome.sound === SFX.error) {
        doorResult.value = 'refused';
        isDoorOpen.value = false;
        await applyOutcome(outcome);
        return;
      }
      doorOutcome = outcome;
      doorResult.value = 'opened';
    };

    // The reveal already played the key and the door, so the outcome only has its message left to say
    const finishShownDoor = async () => {
      isDoorOpen.value = false;
      if (doorOutcome) await applyOutcome({ ...doorOutcome, sound: undefined });
      doorOutcome = null;
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

    // The riddle, the shopkeeper and a room's actions share one reveal (TempleChoiceReveal), one at a time. It keeps
    // what it showed when it closes (`open` goes false), so the panel can sink away; a new one replaces it.
    type RevealChoice = { id: string; label: string; hint?: string; disabled?: boolean; price?: number };
    interface ChoiceRevealState {
      open: boolean;
      kind: 'riddle' | 'shop' | 'sheet';
      title: string;
      subtitle?: string;
      body?: string;
      choices: RevealChoice[];
      cancelLabel?: string;
      /** A picture above the title: an encounter's beast */
      art?: { src: string; alt: string; frame?: 'beast' | 'room' };
      onChoose: (id: string) => void;
      onLeave: () => void;
    }
    const choiceReveal = ref<ChoiceRevealState | null>(null);
    // A new reveal is a new component, so nothing picked in the last one carries over
    const choiceRevealKey = ref(0);

    const openChoiceReveal = (state: Omit<ChoiceRevealState, 'open'>) => {
      choiceRevealKey.value += 1;
      choiceReveal.value = { ...state, open: true };
    };

    const closeChoiceReveal = () => {
      if (choiceReveal.value) choiceReveal.value = { ...choiceReveal.value, open: false };
    };

    // Close first, then act: the answer can open the next reveal (an action that leads to a riddle)
    const chooseReveal = (id: string) => {
      const reveal = choiceReveal.value;
      closeChoiceReveal();
      reveal?.onChoose(id);
    };

    const leaveReveal = () => {
      const reveal = choiceReveal.value;
      closeChoiceReveal();
      reveal?.onLeave();
    };

    // A riddle on the wall: pick an answer from the choices
    const showRiddleAlert = async (riddle: Riddle, room: any, ctx: RoomContext) => {
      openChoiceReveal({
        kind: 'riddle',
        title: 'The Glyphs',
        body: riddle.question,
        choices: riddle.choices.map((label, index) => ({ id: String(index), label })),
        onChoose: (id) => {
          void applyOutcome(answerRiddle(room, ctx, Number(id)));
        },
        onLeave: () => undefined
      });
    };

    // The shopkeeper's wares with the hero's wallet
    const showShopAlert = async (wares: Ware[], gp: number, room: any, ctx: RoomContext) => {
      openChoiceReveal({
        kind: 'shop',
        title: 'Wares',
        subtitle: `You carry ${gp} GP`,
        choices: wares.map((ware) => ({
          id: ware.id,
          label: ware.name,
          hint: ware.blurb,
          price: ware.price,
          disabled: Boolean(ware.soldOut)
        })),
        onChoose: (wareId) => {
          void applyOutcome(buyWare(room, ctx, wareId));
        },
        onLeave: () => undefined
      });
    };

    // Get the world location for this temple and walk out to it
    const leaveTemple = () => {
      const templeWorldMap = getTempleWorldLocation(props.temple);
      router.push({ name: templeWorldMap.route, params: { userId: props.userId } });
    };

    // The temple cleared: the Pegasus's egg cracks (or the temple lights up, for one without a Pegasus) and the reward
    // counts up. It keeps what it showed while it closes. `Fly home` is the way out of the temple.
    const isPegasusRevealOpen = ref(false);
    const pegasusShown = ref<PegasusView | null>(null);
    const pegasusReward = ref({ xp: 0, gp: 0, ap: 0 });
    const pegasusLevelUp = ref(false);

    const showTempleCleared = (
      pegasus: PegasusView | null,
      reward: { xp: number; gp: number; ap: number; levelUp?: boolean } = { xp: 0, gp: 0, ap: 0 }
    ) => {
      pegasusShown.value = pegasus;
      pegasusReward.value = { xp: reward.xp, gp: reward.gp, ap: reward.ap };
      pegasusLevelUp.value = Boolean(reward.levelUp);
      isPegasusRevealOpen.value = true;
    };

    const finishTempleCleared = () => {
      isPegasusRevealOpen.value = false;
      leaveTemple();
    };

    /** Show what a room or an item did: the sound, the shake, the toast, and whatever screen it opens. */
    const applyOutcome = async (outcome: RoomOutcome): Promise<void> => {
      // A cleared temple has its own reveal, with its own sounds and its own words: no toast, no sting
      const celebrating = Boolean(outcome.cleared);
      if (outcome.sound && !celebrating) fx(outcome.sound);
      if (outcome.shake) shake();
      if (outcome.message && !celebrating) say(outcome.message);

      if (outcome.defeated) {
        // Same as losing a battle: HP is already back, the game-over screen takes over
        fx('die');
        void router.replace({ name: 'game-over' });
        return;
      }

      const live = liveContext();
      switch (outcome.intent) {
        case 'leave': {
          if (outcome.cleared) {
            // The gate opened: the egg cracks and the reward counts up, and only then does the hero walk out
            const heroId = String(progressHeroId ?? '');
            const freed = pegasusOfTemple(props.temple);
            const hasFreed = Boolean(freed && userStore.getUserById(heroId)?.stats?.pegasi?.[freed.index]);
            showTempleCleared(hasFreed ? pegasusView(props.temple) : null, outcome.cleared);
            return;
          }
          leaveTemple();
          return;
        }
        case 'fight':
          startFight();
          break;
        case 'openChest':
          showChestContentsDialog();
          break;
        case 'emptyChest':
          showEmptyChest();
          break;
        case 'teleport':
          if (handleTeleport()) {
            // Update UI after teleport, then see what the new room does
            fx('okdesuka');
            setTimeout(() => updateBg(currentPosition.value[1], currentPosition.value[0]), 100);
            await arrive();
          } else {
            // A circle with no partner anywhere leads nowhere
            fx('no');
            displayMessage(CIRCLE_FIZZLES);
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

    /**
     * The beast an encounter names, as the reveal shows it: its name, and its portrait when it has an avatar.
     * Nothing (never a broken picture) for a beast the bestiary does not know or one that has no avatar.
     */
    type BeastCard = { name: string; art?: ChoiceRevealState['art'] } | null;
    const lookUpBeast = async (beastId: string): Promise<BeastCard> => {
      try {
        const beast = await new BestiaryDb(beastStorage).getBeastById(beastId);
        if (!beast) {
          const fallbackEnemy = await bestiaryService.loadBeastById(beastId);
          if (!fallbackEnemy) return null;
          const name = String(fallbackEnemy.name || '').trim();
          const src = fallbackEnemy.avatar ? bestiaryService.getAvatar(Number(fallbackEnemy.avatar)) : '';
          return { name, art: src ? { src, alt: name, frame: 'beast' } : undefined };
        }
        const name = String(beast.name || '').trim();
        if (!name) return null;
        const src = beast.imageUrl || beast.localImage || (beast.avatar ? bestiaryService.getAvatar(Number(beast.avatar)) : '');
        return { name, art: src ? { src, alt: name, frame: 'beast' } : undefined };
      } catch (error) {
        debug.warn('Could not look up the beast of this room', error);
        return null;
      }
    };
    // The bestiary is read from storage: each beast is looked up once, and the hero's arrival in its room warms the
    // lookup, so the tap on the monster opens the reveal with the picture already there
    const beastCards = new Map<string, Promise<BeastCard>>();
    const beastCard = (beastId: string): Promise<BeastCard> => {
      let card = beastCards.get(beastId);
      if (!card) {
        card = lookUpBeast(beastId);
        beastCards.set(beastId, card);
      }
      return card;
    };
    // Walking into a room with a beast warms the lookup (the tap on the monster then opens its reveal at once) and
    // hands the voxel monster the same beast, name and portrait. A beast with no portrait keeps the stand-in's face.
    watch(
      () => {
        const room = currentRoom.value;
        const pos = currentPosition.value;
        const lvl = currentLevel.value;
        if (!room || !COMBAT_ROOM_TYPES.includes(room.type) || isCombatRoomCleared.value) return undefined;
        return `${lvl}:${pos[0]}:${pos[1]}:${room.content?.beasts?.[0] ?? ''}`;
      },
      async (roomKey) => {
        roomBeast.value = null;
        if (!roomKey) {
          beastPending.value = false;
          return;
        }

        const room = currentRoom.value;
        if (!room) return;

        const authoredBeastId = room.content?.beasts?.[0];
        if (authoredBeastId) {
          beastPending.value = true;
          const card = await beastCard(String(authoredBeastId));
          if (currentRoom.value === room) {
            roomBeast.value = card ? { name: card.name, avatar: card.art?.src || bestiaryService.getAvatar(74) } : null;
          }
          beastPending.value = false;
          return;
        }

        // Query BestiaryDb for an actual beast matching this monsterType or temple element
        try {
          const beasts = await new BestiaryDb(beastStorage).getBeasts();
          if (beasts && beasts.length > 0) {
            const rawType = (room.content?.monsterType || '').toLowerCase().replace(/[-_ ]/g, '');
            const typeMatch = rawType && rawType !== 'small'
              ? beasts.find((b: any) => (b.name || '').toLowerCase().replace(/[-_ ]/g, '').includes(rawType))
              : undefined;

            const element = templeElement.value || 'fire';
            const elementBeasts = beasts.filter((b: any) => b.element === element);
            const chosen = typeMatch || (elementBeasts.length > 0 ? elementBeasts[(currentPosition.value[0] + currentPosition.value[1]) % elementBeasts.length] : undefined);

            if (chosen && chosen.name) {
              const src = chosen.imageUrl || chosen.localImage || (chosen.avatar ? bestiaryService.getAvatar(Number(chosen.avatar)) : '');
              if (currentRoom.value === room) {
                roomBeast.value = {
                  name: chosen.name,
                  avatar: src || bestiaryService.getAvatar(74),
                };
              }
            }
          }
        } catch {
          // Fall through to resolveMonsterInfo
        }
      },
      { immediate: true }
    );

    // Handle showing room actions
    const showRoomActions = async () => {
      const live = liveContext();
      if (!live) {
        displayMessage('Choose a profile first');
        return;
      }

      const sheet = roomActions(live.room, live.ctx);
      // A chest has no sheet: it comes up as the chest itself, shut with Open and Leave (or open and empty, with Leave)
      if (sheet.chest === 'closed') {
        showChestContentsDialog();
        return;
      }
      if (sheet.chest === 'empty') {
        showEmptyChest();
        return;
      }
      // An encounter shows its beast: the picture and the name are looked up first, so they are there as the reveal opens
      const beast = sheet.beastId ? await beastCard(sheet.beastId) : null;
      const monsterSubtitle = beast?.name ?? (activeMonster.value ? activeMonster.value.name : sheet.subHeader);
      const monsterArt = beast?.art ?? (activeMonster.value.avatar ? { src: activeMonster.value.avatar, alt: activeMonster.value.name, frame: 'beast' } : undefined);
      openChoiceReveal({
        kind: 'sheet',
        title: sheet.header,
        subtitle: monsterSubtitle,
        art: monsterArt,
        choices: sheet.actions.map((action, index) => ({ id: String(index), label: action.label })),
        // "Leave" would sit under the entrance's "Leave Temple": the way back is "Back"
        cancelLabel: 'Back',
        onChoose: (id) => {
          const action = sheet.actions[Number(id)];
          if (action) void runRoomAction(action);
        },
        onLeave: () => undefined
      });
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
        showLockedDoor(direction);
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

    // The chest reveal. It shows what the chest held when it opened, so the rows stay put while it closes
    const isChestOpen = ref(false);
    const chestLootShown = ref<ChestLoot[]>([]);
    // A chest comes up shut, with Open and Leave; only an empty one opens at once (with Leave alone)
    const isChestClosed = ref(false);

    const showChestContentsDialog = () => {
      chestLootShown.value = chestContents.value;
      isChestClosed.value = chestContents.value.length > 0;
      isChestOpen.value = true;
    };

    const takeChestLoot = (values: string[]) => {
      // Only what the hero ticked is taken. A take that names nothing takes nothing: the chest stays open and as it was.
      if (values.length === 0) {
        displayMessage('You took nothing.');
        return;
      }
      isChestOpen.value = false;
      // The Pegasus chest behind the boss: taking its prize frees the world's Pegasus and clears the temple
      const prize = currentRoom.value?.content;
      const pick = prize?.dungeon ? String(prize.dungeon) : '';
      const freesPegasus = prize?.pegasus === true && Boolean(pick) && values.includes(pick);
      const hasKey = values.some((value) => value.toLowerCase().includes('key'));
      if (!freesPegasus) play$fx(hasKey ? 'key' : 'takeItem');
      // The first clear pays the temple's reward, whether it comes through the chest or the gate; the chest's own call
      // to freeTemplePegasus then finds the temple cleared and pays nothing more
      const cleared = freesPegasus ? clearTemple(props.temple, progressHeroId) : null;
      // The reveal tells the news, so the toast about the freed Pegasus is left unsaid
      hushMessages = freesPegasus;
      try {
        processChestItems(values);
      } finally {
        hushMessages = false;
      }
      // The Pegasus the chest's prize names (the Game Master's pick), else the temple's own
      if (freesPegasus) showTempleCleared(pegasusView(props.temple, pick), cleared ?? undefined);
    };

    const leaveChest = () => {
      isChestOpen.value = false;
    };

    // An empty chest opens the same way, with nothing inside
    const showEmptyChest = () => {
      chestLootShown.value = [];
      isChestClosed.value = false;
      isChestOpen.value = true;
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
      currentLevel,
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
      isPegasusRevealOpen,
      pegasusShown,
      pegasusReward,
      pegasusLevelUp,
      finishTempleCleared,
      getBgImage,
      validRoomCoords,
      templeName,
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
        return require(`@/assets/images/backgrounds/${this.temple}/[${row},${col}].jpg`);
      } catch {
        return '';
      }
    }
  }
});