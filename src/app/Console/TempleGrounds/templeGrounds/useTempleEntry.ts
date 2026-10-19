import { onMounted, watch, type Ref } from 'vue';
import debug from '@/lib/utils/debug';
import { useCopy } from '@/hooks/useVoice';
import type { RevealPromptOptions } from '@/components/organisms/RevealPrompt/revealPrompt';
import type { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import { bloodMoonLine } from '@/lib/engine/core/dungeons/templeReset';
import { wakeTempleOnEntry, type EntryWakeDone } from '@/lib/services/temples/wakeOnEntry';

/** What the temple screen hands over: the temple, the hero walking in, and the screen's own toast and sound */
export interface TempleEntryParts {
  temple: string;
  /** The hero whose progress is kept here; none when nobody is signed in */
  heroId: string | undefined;
  /** Settles once the temple's saved layout was read; true when the temple opened */
  whenOpened: Promise<boolean>;
  /** The floor the hero stands on: arriving on another floor wakes that floor's beasts */
  currentLevel: Ref<string>;
  templeSystem: TempleSystem;
  templeShortName: { value: string };
  say: (message: string, duration?: number) => void;
  fx: (key: string) => void;
  /** The in-world prompt (useRevealPrompt): resolves with the id of the choice picked */
  showPrompt: (options: RevealPromptOptions) => Promise<string>;
}

/**
 * What happens as a hero walks into a temple: the blood moon notice, the first-visit wake of the entrance floor's
 * beasts, and the wake of every other floor the first time the hero arrives on it, told in the game's own prompt.
 */
export const useTempleEntry = ({ temple, heroId, whenOpened, currentLevel, templeSystem, templeShortName, say, fx, showPrompt }: TempleEntryParts) => {
  const t = useCopy();

  // A blood moon the Game Master scheduled has risen since the last visit: the temple starts over, and says so
  onMounted(() => {
    // The run starts after the temple's saved layout was read, and the hero's save is read once it has
    void whenOpened.then(() => templeSystem.whenProgressReady(temple)).then(() => {
      const hasBloodMoonRisen = templeSystem.bloodMoonRose(temple);
      if (!hasBloodMoonRisen) return;
      fx('no');
      say(bloodMoonLine(templeShortName.value.replace(/\b\w/g, (letter) => letter.toUpperCase())), 3600);
    });
  });

  /**
   * Wakes a floor of the temple for the hero (wakeOnEntry): the entrance floor when none is named. It waits for the
   * temple's saved layout, and the run then reads the hero's board again so the rooms show the new quests. Resolves to
   * what woke, or null when nothing did.
   */
  const wakeFloor = async (floor?: string): Promise<EntryWakeDone | null> => {
    const isOpened = await whenOpened;
    const canWake = isOpened && Boolean(heroId);
    if (!canWake) return null;
    const woke = await wakeTempleOnEntry(temple, String(heroId), undefined, new Date(), floor);
    const hasNewQuests = Boolean(woke?.changed);
    if (!hasNewQuests) return null;
    await templeSystem.whenProgressReady(temple);
    await templeSystem.refreshQuestRooms(temple);
    return woke;
  };

  /** The prompt that tells the hero how many beasts stirred ("3 beasts stir on 2F."), one Onward to go on */
  const stirredPrompt = (woke: EntryWakeDone): RevealPromptOptions => {
    const key = woke.stirred === 1 ? 'temple.floorWakeOne' : 'temple.floorWake';
    return {
      lines: [t(key, { count: woke.stirred, floor: woke.floor })],
      choices: [{ id: 'onward', label: 'Onward', icon: 'arrow-right', tone: 'primary' }],
      cancelId: 'onward',
    };
  };

  // The first time a hero walks into a shipped temple, the entrance floor's sleeping monster beasts wake as their quests for them
  onMounted(() => {
    void wakeFloor().catch((error: unknown) => debug.warn('[TempleGrounds] the temple could not wake its beasts', error));
  });

  // Arriving on another floor (stairs, a pit, a teleport, a run resumed there): that floor's beasts wake the first time,
  // and the hero is told. Waits for the run to be read, so the floor the hero arrived on is the one they stand on.
  watch(currentLevel, (floor) => {
    void whenOpened
      .then(() => templeSystem.whenProgressReady(temple))
      .then(() => wakeFloor(floor))
      .then(async (woke) => {
        if (woke) await showPrompt(stirredPrompt(woke));
      })
      .catch((error: unknown) => debug.warn('[TempleGrounds] the floor could not wake its beasts', error));
  });
};
