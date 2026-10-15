import { ref, watch, type ComputedRef, type Ref } from 'vue';
import { play$fx } from '@/assets/fx';
import { rumble } from '@/lib/services/feedback/haptics';
import { useTimers } from '@/hooks/useTimers';
import type { Room } from '@/lib/engine/core/dungeons/types';

/** How long the boss banner holds before it lifts on its own; a tap lifts it sooner. */
export const BOSS_BANNER_MS = 2400;

/** Opening the temple straight into a boss room: wait for the gate to finish opening before the banner. */
export const FIRST_ARRIVAL_DELAY_MS = 1300;

export type BossTier = 'boss' | 'miniboss';

export interface BossBanner {
  name: string;
  tier: BossTier;
}

const BOSS_TIERS: BossTier[] = ['boss', 'miniboss'];

export interface BossEntranceDeps {
  currentRoom: Ref<Room | undefined> | ComputedRef<Room | undefined>;
  currentPosition: Ref<[number, number]>;
  currentLevel: Ref<string>;
  isCombatRoomCleared: ComputedRef<boolean>;
  activeMonster: ComputedRef<{ name: string }>;
}

/**
 * Walking into a boss or miniboss room that still holds its beast: the room dims, the screen shakes, the encounter
 * sting plays and a banner names the beast. Once per arrival, so standing in the room never repeats it.
 */
export const useBossEntrance = (deps: BossEntranceDeps) => {
  const { currentRoom, currentPosition, currentLevel, isCombatRoomCleared, activeMonster } = deps;
  const bossBanner = ref<BossBanner | null>(null);
  const timers = useTimers();

  const dismissBossBanner = () => {
    timers.cancelAll();
    bossBanner.value = null;
  };

  const announce = () => {
    const tier = currentRoom.value?.type as BossTier | undefined;
    const isBossRoom = Boolean(tier && BOSS_TIERS.includes(tier));
    const isWaitingToFight = isBossRoom && !isCombatRoomCleared.value;
    if (!isWaitingToFight) {
      dismissBossBanner();
      return;
    }
    bossBanner.value = { name: activeMonster.value.name, tier: tier as BossTier };
    play$fx('enterBattle');
    rumble([[0, 'slam'], [180, 'thud'], [360, 'tick']]);
    timers.startTimeout(BOSS_BANNER_MS, () => (bossBanner.value = null));
  };

  // A new room (or floor) is an arrival; the beast's name may land a beat later, so the banner follows it
  watch(() => `${currentLevel.value}:${currentPosition.value?.join(',')}`, announce);
  timers.startTimeout(FIRST_ARRIVAL_DELAY_MS, announce);
  watch(
    () => activeMonster.value.name,
    (name) => {
      const banner = bossBanner.value;
      if (banner) bossBanner.value = { ...banner, name };
    }
  );

  return { bossBanner, dismissBossBanner };
};
