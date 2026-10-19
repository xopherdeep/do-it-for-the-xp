import { onMounted } from 'vue';
import debug from '@/lib/utils/debug';
import type { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import { bloodMoonLine } from '@/lib/engine/core/dungeons/templeReset';
import { wakeTempleOnEntry } from '@/lib/services/temples/wakeOnEntry';

/** What the temple screen hands over: the temple, the hero walking in, and the screen's own toast and sound */
export interface TempleEntryParts {
  temple: string;
  /** The hero whose progress is kept here; none when nobody is signed in */
  heroId: string | undefined;
  /** Settles once the temple's saved layout was read; true when the temple opened */
  whenOpened: Promise<boolean>;
  templeSystem: TempleSystem;
  templeShortName: { value: string };
  say: (message: string, duration?: number) => void;
  fx: (key: string) => void;
}

/** What happens as a hero walks into a temple: the blood moon notice, and the first-visit wake of its beasts. */
export const useTempleEntry = ({ temple, heroId, whenOpened, templeSystem, templeShortName, say, fx }: TempleEntryParts) => {
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

  // The first time a hero walks into a shipped temple, its sleeping monster beasts wake as their quests for them
  // (wakeOnEntry). It waits for the temple's saved layout, and the run then reads the hero's board again so the rooms show them.
  onMounted(() => {
    void whenOpened
      .then((isOpened) => {
        const canWake = isOpened && Boolean(heroId);
        return canWake ? wakeTempleOnEntry(temple, String(heroId)) : null;
      })
      .then(async (woke) => {
        const hasNewQuests = Boolean(woke?.changed);
        if (!hasNewQuests) return;
        await templeSystem.whenProgressReady(temple);
        await templeSystem.refreshQuestRooms(temple);
      })
      .catch((error: unknown) => debug.warn('[TempleGrounds] the temple could not wake its beasts', error));
  });
};
