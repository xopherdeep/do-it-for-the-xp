import { ref } from 'vue';
import { play$fx } from '@/assets/fx';
import type { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import type { ChestLoot } from '@/lib/services/temples/ChestLoot';
import { clearTemple, doorActions, SFX, type RoomAction, type RoomOutcome } from '@/lib/services/temples/RoomInteractions';
import { pegasusView, type PegasusView } from '@/lib/services/temples/TemplePegasus';
import type { DoorView } from '../components/doorView';
import type { useRoomOutcomes } from './useRoomOutcomes';
import type { TempleGroundsProps, TempleState } from './useTempleMeta';

// The riddle, the shopkeeper and a room's actions share one reveal (TempleChoiceReveal), one at a time. It keeps
// what it showed when it closes (`open` goes false), so the panel can sink away; a new one replaces it.
type RevealChoice = { id: string; label: string; hint?: string; disabled?: boolean; price?: number };
export interface ChoiceRevealState {
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

export const useChoiceReveal = () => {
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

  return {
    choiceReveal,
    choiceRevealKey,
    openChoiceReveal,
    selectRevealChoice: chooseReveal,
    dismissReveal: leaveReveal
  };
};

export const usePegasusReveal = (leaveTemple: () => void) => {
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

  return {
    pegasusReveal: { isPegasusRevealOpen, pegasusShown, pegasusReward, pegasusLevelUp },
    showTempleCleared,
    completeTempleCleared: finishTempleCleared
  };
};

export interface ChestRevealDeps
  extends Pick<TempleState, 'chestContents' | 'currentRoom' | 'displayMessage' | 'processChestItems'> {
  props: TempleGroundsProps;
  progressHeroId: string | undefined;
  showTempleCleared: ReturnType<typeof usePegasusReveal>['showTempleCleared'];
  /** The toast keeps quiet while a reveal tells the news itself */
  setHushMessages: (hushed: boolean) => void;
}

export const useChestReveal = (deps: ChestRevealDeps) => {
  const { props, progressHeroId, chestContents, currentRoom, displayMessage, processChestItems, showTempleCleared, setHushMessages } =
    deps;

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
    setHushMessages(freesPegasus);
    try {
      processChestItems(values);
    } finally {
      setHushMessages(false);
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

  return {
    chest: { isChestOpen, chestLootShown, isChestClosed },
    showChestContentsDialog,
    showEmptyChest,
    claimChestLoot: takeChestLoot,
    closeChest: leaveChest
  };
};

export interface DoorRevealDeps extends Pick<TempleState, 'playerKeys' | 'replayKeyPulse'> {
  props: TempleGroundsProps;
  templeSystem: TempleSystem;
  liveContext: ReturnType<typeof useRoomOutcomes>['getLiveContext'];
  applyOutcome: ReturnType<typeof useRoomOutcomes>['applyOutcome'];
}

export const useDoorReveal = (deps: DoorRevealDeps) => {
  const { props, templeSystem, playerKeys, replayKeyPulse, liveContext, applyOutcome } = deps;

  // The door the hero walked into: a small lock asks for a key, the boss door for the Boss Key (RoomInteractions.doorActions)
  // The locked-door reveal: the door close up, its lock, and the key if the hero holds one
  const isDoorOpen = ref(false);
  const doorShown = ref<DoorView | null>(null);
  const doorResult = ref<'opened' | 'refused' | null>(null);
  let doorAction: RoomAction | null = null;
  let doorOutcome: RoomOutcome | null = null;
  // The small keys the hero held when the door came up: the header's number rolls again once the reveal lets go of it
  let keysAtDoor = 0;

  const showLockedDoor = (direction: 'north' | 'south' | 'east' | 'west') => {
    const live = liveContext();
    if (!live) return;
    const door = doorActions(live.ctx, direction);
    const kind = templeSystem.doorKind(props.temple, live.ctx.position, direction, live.ctx.level);
    doorAction = door.actions[0] ?? null;
    doorOutcome = null;
    keysAtDoor = playerKeys.value;
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
    // The key is spent: the count on the door goes down with it
    if (doorShown.value) doorShown.value = { ...doorShown.value, keys: playerKeys.value };
  };

  // The reveal already played the key and the door, so the outcome only has its message left to say
  const finishShownDoor = async () => {
    isDoorOpen.value = false;
    if (playerKeys.value !== keysAtDoor) replayKeyPulse();
    if (doorOutcome) await applyOutcome({ ...doorOutcome, sound: undefined });
    doorOutcome = null;
  };

  return {
    door: { isDoorOpen, doorShown, doorResult },
    showLockedDoor,
    unlockShownDoor,
    completeShownDoor: finishShownDoor
  };
};
