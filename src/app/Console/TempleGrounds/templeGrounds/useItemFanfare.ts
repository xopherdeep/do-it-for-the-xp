import { ref } from 'vue';
import { useTimers } from '@/hooks/useTimers';
import type { FoundItem } from '@/lib/services/temples/roomInteractions/vocabulary';

/** How long the hero holds a found key, map or compass overhead before play goes on (a tap ends it sooner). */
export const FANFARE_MS = 2200;

export interface ItemFanfare extends FoundItem {
  /** The line under the title, e.g. "You take Coral Key." */
  line: string;
  /** Grows by one per pickup, so a second key replays the fanfare */
  key: number;
}

/** The moment after a pickup: the item rises over the hero in a burst of light and its name is shown. */
export const useItemFanfare = () => {
  const fanfare = ref<ItemFanfare | null>(null);
  const timers = useTimers();

  const dismissFanfare = () => {
    timers.cancelAll();
    fanfare.value = null;
  };

  const showFanfare = (found: FoundItem, line = '') => {
    timers.cancelAll();
    fanfare.value = { ...found, line, key: (fanfare.value?.key ?? 0) + 1 };
    timers.startTimeout(FANFARE_MS, () => (fanfare.value = null));
  };

  return { fanfare, showFanfare, dismissFanfare };
};
