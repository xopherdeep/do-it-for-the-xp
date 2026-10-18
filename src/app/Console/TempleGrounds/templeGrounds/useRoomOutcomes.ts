import { onBeforeUnmount, ref } from 'vue';
import type { Router } from 'vue-router';
import { templeBattleRoute } from '@/app/Console/BattleField/battle/battleContext';
import { useTimers } from '@/hooks/useTimers';
import { CIRCLE_FIZZLES } from '@/lib/engine/core/dungeons/teleportPairing';
import type { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import {
  answerRiddle,
  buyWare,
  onEnterRoom,
  roomActions,
  nameTheEncounter,
  roomKind,
  type Riddle,
  type RoomAction,
  type RoomContext,
  type RoomOutcome,
  type Ware
} from '@/lib/services/temples/RoomInteractions';
import { hospitalRoute } from '@/lib/services/hometown/hospitalAdmission';
import { CARRIED_TO_HOSPITAL_LINE } from '@/lib/services/hometown/hospitalBill';
import { pegasusOfTemple, pegasusView } from '@/lib/services/temples/TemplePegasus';
import type { useUserStore } from '@/lib/store/stores/user';
import { dungeonExitRuns, EXIT_W, EXIT_H } from '../components/exitSprite';
import type { useChestReveal, useChoiceReveal, usePegasusReveal } from './templeReveals';
import type { useItemFanfare } from './useItemFanfare';
import type { useRoomBeast } from './useRoomBeast';
import type { useTempleLayout } from './useTempleLayout';
import type { TempleGroundsProps, TempleState } from './useTempleMeta';

export interface RoomOutcomeDeps
  extends Pick<TempleState, 'currentPosition' | 'currentLevel' | 'showTempleMessage' | 'handleTeleport'> {
  props: TempleGroundsProps;
  userStore: ReturnType<typeof useUserStore>;
  router: Router;
  progressHeroId: string | undefined;
  templeSystem: TempleSystem;
  say: (message: string, duration?: number) => void;
  fx: (key: string) => void;
  /** A key, map or compass is held overhead with its name, in place of the toast */
  showFanfare: ReturnType<typeof useItemFanfare>['showFanfare'];
  updateBg: ReturnType<typeof useTempleLayout>['updateBg'];
  leaveTemple: () => void;
  showTempleCleared: ReturnType<typeof usePegasusReveal>['showTempleCleared'];
  showChestContentsDialog: ReturnType<typeof useChestReveal>['showChestContentsDialog'];
  showEmptyChest: ReturnType<typeof useChestReveal>['showEmptyChest'];
  openChoiceReveal: ReturnType<typeof useChoiceReveal>['openChoiceReveal'];
  beastCard: ReturnType<typeof useRoomBeast>['getBeastCard'];
  activeMonster: ReturnType<typeof useRoomBeast>['activeMonster'];
  templeElement?: { value: string } | string;
}

/** How long the temple holds the "carried to the Hospital" line before the Hospital screen takes over */
const CARRIED_TO_HOSPITAL_MS = 1800;

// --- Room actions: what each room says and does lives in RoomInteractions ---------------------

/**
 * What a room or an item does once it happens: the sound, the shake and the toast, then the fight, the chest, the
 * riddle, the shop, the teleport or the way out; and what the hero walking into a room sets off.
 */
export const useRoomOutcomes = (deps: RoomOutcomeDeps) => {
  const {
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
    showFanfare,
    updateBg,
    leaveTemple,
    showTempleCleared,
    showChestContentsDialog,
    showEmptyChest,
    openChoiceReveal,
    beastCard,
    activeMonster,
    templeElement
  } = deps;

  // Hand the hero to the battle screen for the combat room they stand in
  const startFight = () => {
    const heroId = props.userId || userStore.currentUser.id;
    if (!heroId) {
      showTempleMessage('Choose a profile first');
      return;
    }
    const [row, col] = currentPosition.value;
    router.push(templeBattleRoute(String(heroId), props.temple, currentLevel.value, col, row));
  };

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
  const timers = useTimers();

  /**
   * Where the hero stands right now, read from the temple itself: the refs of useTemple only catch up
   * on the next tick, and a trap has to know the room the hero just walked into.
   */
  const liveContext = (): { ctx: RoomContext; room: any } | null => {
    const state = templeSystem.getTempleState(props.temple);
    const room = templeSystem.getCurrentRoom(props.temple);
    const hasNoLiveRoom = !state || !room || !progressHeroId;
    if (hasNoLiveRoom) return null;
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
    openChoiceReveal({
      kind: 'riddle',
      title: 'The Glyphs',
      body: riddle.question,
      // Night's Light faded a wrong answer: its button is left out, the others keep their index as id
      choices: riddle.choices
        .map((label, index) => ({ id: String(index), label }))
        .filter((choice) => !riddle.faded?.includes(Number(choice.id))),
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

  /** Show what a room or an item did: the sound, the shake, the toast, and whatever screen it opens. */
  const applyOutcome = async (outcome: RoomOutcome): Promise<void> => {
    // A cleared temple has its own reveal, with its own sounds and its own words: no toast, no sting
    const celebrating = Boolean(outcome.cleared);
    const { sound, message } = outcome;
    const shouldPlaySound = sound && !celebrating;
    if (shouldPlaySound) fx(sound);
    const shouldShake = Boolean(outcome.shake);
    if (shouldShake) shake();
    const found = outcome.found;
    if (found) showFanfare(found, message);
    const shouldShowToast = message && !celebrating && !found;
    if (shouldShowToast) say(message);

    const isDefeated = Boolean(outcome.defeated);
    if (isDefeated) {
      // Same as losing a battle: the trap already admitted the hero (full HP and MP, billed). The temple says one line,
      // then the Hospital screen takes over and the nurse reads the bill. The run is saved where the hero fell.
      fx('die');
      say(CARRIED_TO_HOSPITAL_LINE, CARRIED_TO_HOSPITAL_MS);
      const heroId = String(progressHeroId ?? props.userId ?? userStore.currentUser.id);
      timers.startTimeout(CARRIED_TO_HOSPITAL_MS, () => void router.replace(hospitalRoute(heroId)));
      return;
    }

    const live = liveContext();
    switch (outcome.intent) {
      case 'leave': {
        const cleared = outcome.cleared;
        if (cleared) {
          // The gate opened: the egg cracks and the reward counts up, and only then does the hero walk out
          const heroId = String(progressHeroId ?? '');
          const freed = pegasusOfTemple(props.temple);
          const hasFreed = Boolean(freed && userStore.getUserById(heroId)?.stats?.pegasi?.[freed.index]);
          showTempleCleared(hasFreed ? pegasusView(props.temple) : null, cleared);
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
      case 'teleport': {
        const didTeleport = handleTeleport();
        if (didTeleport) {
          // Update UI after teleport, then see what the new room does
          fx('okdesuka');
          timers.startTimeout(100, () => updateBg(currentPosition.value[1], currentPosition.value[0]));
          await arrive();
        } else {
          // A circle with no partner anywhere leads nowhere
          fx('no');
          showTempleMessage(CIRCLE_FIZZLES);
        }
        break;
      }
      case 'riddle': {
        const canShowRiddle = Boolean(live && outcome.riddle);
        if (canShowRiddle) {
          await showRiddleAlert(outcome.riddle!, live!.room, live!.ctx);
        }
        break;
      }
      case 'shop': {
        const canShowShop = Boolean(live && outcome.wares);
        if (canShowShop) {
          await showShopAlert(outcome.wares!, outcome.gp ?? 0, live!.room, live!.ctx);
        }
        break;
      }
      case 'sheet':
        await showRoomActions();
        break;
    }

    const hasMoved = Boolean(outcome.moved);
    if (hasMoved) await arrive();
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
      showTempleMessage('Choose a profile first');
      return;
    }

    const sheet = roomActions(live.room, live.ctx);
    // A chest has no sheet: it comes up as the chest itself, shut with Open and Leave (or open and empty, with Leave)
    const isShutChest = sheet.chest === 'closed';
    if (isShutChest) {
      showChestContentsDialog();
      return;
    }
    const isEmptyChest = sheet.chest === 'empty';
    if (isEmptyChest) {
      showEmptyChest();
      return;
    }
    const roomType = live.room ? roomKind(live.room) : undefined;
    const isEntrance = roomType === 'entrance' || roomType === 'gate';
    const isCombatRoom = live.room ? ['monster', 'miniboss', 'boss'].includes(live.room.type) : false;

    // An encounter shows its beast: the picture and the name are looked up first, so they are there as the reveal opens
    const beast = sheet.beastId ? await beastCard(sheet.beastId, sheet.questBeast) : null;
    // A sheet that words its own subtitle (a quest room's, even an empty one) keeps it; an encounter shows its beast's name
    const monsterSubtitle = sheet.subHeader ?? beast?.name ?? (isCombatRoom && activeMonster.value ? activeMonster.value.name : undefined);
    // The beast's name leads the title ("A Mustwisp approaches!"), so it is not repeated under it
    const encounter = nameTheEncounter(sheet.header, sheet.subHeader === undefined ? monsterSubtitle : undefined);
    const portrait = beast?.art ?? (isCombatRoom && activeMonster.value?.avatar ? { src: activeMonster.value.avatar, alt: activeMonster.value.name, frame: 'beast' as const } : undefined);
    // A beaten beast is shown knocked out, not standing in its light as if the fight were still to come
    const monsterArt = portrait && sheet.beastDefeated ? { ...portrait, defeated: true } : portrait;

    const element = (typeof templeElement === 'string' ? templeElement : templeElement?.value) || 'wind';
    const beastSubtitle = encounter.named ? undefined : monsterSubtitle;
    const exitSprite = isEntrance ? { runs: dungeonExitRuns(element), width: EXIT_W, height: EXIT_H } : undefined;

    openChoiceReveal({
      kind: isEntrance ? 'exit' : 'sheet',
      title: encounter.title,
      subtitle: isEntrance ? sheet.subHeader : beastSubtitle,
      body: sheet.body,
      art: isEntrance ? undefined : monsterArt,
      sprite: exitSprite,
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

  return {
    isShaking,
    getLiveContext: liveContext,
    applyOutcome,
    handleArrival: arrive,
    showRoomActions
  };
};
