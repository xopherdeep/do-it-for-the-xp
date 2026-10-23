import { nextTick, onMounted, watch, type Ref } from 'vue';
import { onIonViewDidEnter } from '@ionic/vue';
import debug from '@/lib/utils/debug';
import { useCopy } from '@/hooks/useVoice';
import type { RevealPromptOptions } from '@/components/organisms/RevealPrompt/revealPrompt';
import { useRevealPrompt } from '@/components/organisms/RevealPrompt/useRevealPrompt';
import type { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import { bloodMoonLine } from '@/lib/engine/core/dungeons/templeReset';
import { returnRoomKey, shouldRevealReturnDrop } from '@/lib/services/temples/battleReturnDrop';
import { roomActions } from '@/lib/services/temples/RoomInteractions';
import { wakeTempleOnEntry, type EntryWakeDone } from '@/lib/services/temples/wakeOnEntry';
import type { useRoomOutcomes } from './useRoomOutcomes';

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
  /** The room a battle returns the hero to ([row, col], the route's x and y); none when the hero walked in */
  returnsTo?: [number, number];
  /**
   * The floor the battle returns to, read each time the page is shown (the floor rides in the route's ?level, which
   * changes without a new page: the same x and y on another floor share one page); none when the route names no floor
   */
  returnsLevel?: () => string | undefined;
  /** The room the hero stands in, read from the temple itself (useRoomOutcomes) */
  liveContext: ReturnType<typeof useRoomOutcomes>['getLiveContext'];
  /** Opens the chest reveal on what a beaten beast dropped in the room the hero stands in */
  showDropReveal: () => void;
}

/**
 * The battle return (design spec, "Fight-room drops"): on a win the beast drops what it held, and the hero takes it
 * through the chest reveal on coming back to the room. Each time Ionic shows the page of a battle return (a second
 * battle in the same room shows that parked page again rather than a new one), a won fight's drop waiting in the room
 * the route names opens in that reveal, once per room of the page: a hero who leaves it shut finds "Take it" on the
 * room's sheet, and a later arrival in the room, or the page shown again, opens nothing. A room is a floor and a row and
 * column (battleReturnDrop), so a drop won at the same x and y on another floor opens in its turn.
 */
const useBattleReturnDrop = ({ temple, whenOpened, templeSystem, returnsTo, returnsLevel, liveContext, showDropReveal }: TempleEntryParts): void => {
  if (!returnsTo) return;
  const offeredRooms = new Set<string>();

  /** The key of the battle's room when the hero stands in it with a won fight's drop waiting there that this page has not shown */
  const roomToOffer = (): string | null => {
    const live = liveContext();
    if (!live) return null;
    const standing = { level: live.ctx.level, position: live.ctx.position };
    const shouldOffer = shouldRevealReturnDrop({
      returnsTo,
      returnsLevel: returnsLevel?.(),
      standing,
      offered: offeredRooms,
      isDropWaiting: roomActions(live.room, live.ctx).drop === 'waiting',
    });
    return shouldOffer ? returnRoomKey(standing.level, standing.position) : null;
  };

  // Waits for the run to be read (the battle recorded the win in it) and for the screen to catch up with where it stands
  const offerWaitingDrop = async (): Promise<void> => {
    const isOpened = await whenOpened;
    if (!isOpened) return;
    await templeSystem.whenProgressReady(temple);
    await nextTick();
    const room = roomToOffer();
    if (room === null) return;
    offeredRooms.add(room);
    showDropReveal();
  };

  onIonViewDidEnter(() => {
    void offerWaitingDrop().catch((error: unknown) => debug.warn('[TempleGrounds] the drop could not be shown', error));
  });
};

/**
 * What happens as a hero walks into a temple: the blood moon notice, the first-visit wake of the entrance floor's
 * beasts, and the wake of every other floor the first time the hero arrives on it, told in the game's own prompt; and,
 * coming back from a won fight, the drop it left (useBattleReturnDrop).
 * Returns that prompt for the screen to render (XpRevealPrompt) and the answer it hands back.
 */
export const useTempleEntry = (parts: TempleEntryParts) => {
  const { temple, heroId, whenOpened, currentLevel, templeSystem, templeShortName, say, fx } = parts;
  const t = useCopy();
  const floorWake = useRevealPrompt();
  useBattleReturnDrop(parts);

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
        if (woke) await floorWake.showPrompt(stirredPrompt(woke));
      })
      .catch((error: unknown) => debug.warn('[TempleGrounds] the floor could not wake its beasts', error));
  });

  return { floorWakePrompt: floorWake.prompt, answerFloorWake: floorWake.submitAnswer };
};
