import { computed, ref, watch, type Ref } from 'vue';
import { onIonViewDidEnter } from '@ionic/vue';
import { useRevealPrompt } from '@/components/organisms/RevealPrompt/useRevealPrompt';
import { useVoice } from '@/hooks/useVoice';
import type { TempleSystem } from '@/lib/engine/core/dungeons/TempleSystem';
import { dateKey } from '@/lib/services/core/packs/packCommon';
import { floorClockView, phaseNameOf } from '@/lib/services/projects/floorClock';
import { markFloorSeen, onFloorReached, readTower, type TowerSnapshot } from '@/lib/services/projects/projectService';
import { PROJECT_TEMPLE_PREFIX } from '@/lib/services/projects/projectTower';
import { floorClearedPrompt } from '@/lib/services/projects/towerPrompts';
import { unseenClearedFloors } from '@/lib/services/projects/towerView';
import debug from '@/lib/utils/debug';

/** What the temple screen hands over: the temple, the hero walking in, the floor they stand on and the engine */
export interface ProjectTowerParts {
  temple: string;
  /** The hero whose progress is kept here; none when nobody is signed in */
  heroId: string | undefined;
  /** Settles once the temple's saved layout was read; true when the temple opened */
  whenOpened: Promise<boolean>;
  /** The floor the hero stands on: reaching another floor wakes it for the family */
  currentLevel: Ref<string>;
  templeSystem: Pick<TempleSystem, 'whenProgressReady' | 'refreshQuestRooms'>;
}

/**
 * A project tower in play (docs: Project Towers, section 5). Reaching a floor wakes it for the whole family and settles
 * what is ready, the floor clock and the early-finish offer follow the hero up, the stairs climb only from a floor that
 * reads cleared, and a floor cleared since the hero last looked is told once in the game's own prompt ("Floor cleared!").
 * Every refresh takes its turn, so an arrival and a page shown again never settle or tell twice. Inert for every temple
 * that is not a project tower: nothing is read, woken or watched, and `isFloorCleared` answers undefined (no lock).
 */
export const useProjectTower = (parts: ProjectTowerParts) => {
  const { temple, heroId, whenOpened, currentLevel, templeSystem } = parts;
  const isTower = temple.startsWith(PROJECT_TEMPLE_PREFIX);
  const { voice } = useVoice();
  const celebration = useRevealPrompt();

  const snapshot = ref<TowerSnapshot | null>(null);
  /** The tower was read at least once: until then its stairs stay shut, and a failed read keeps them so */
  const isRead = ref(false);
  const today = ref(dateKey(new Date()));

  /** The clock of the floor the hero stands on; none for another temple or before the tower is read */
  const floorClock = computed(() => {
    const read = snapshot.value;
    const hasNoClock = !isTower || !read;
    if (hasNoClock) return null;
    return floorClockView(read.project, currentLevel.value, today.value, voice.value);
  });

  /**
   * Whether the stairs of this floor may climb: true when every chore of the floor was done (or no project is running any
   * more), false while it is not or the tower is not read yet; undefined for another temple, which never uses the lock.
   */
  const isFloorCleared = (level: string): boolean | undefined => {
    if (!isTower) return undefined;
    if (!isRead.value) return false;
    const read = snapshot.value;
    return read ? read.cleared.includes(level) : true;
  };

  /** Wakes the floor the hero is on and settles what is ready; a failure is said, and the tower is read all the same */
  const reachFloor = async (): Promise<void> => {
    try {
      await onFloorReached(currentLevel.value, new Date());
    } catch (error) {
      debug.warn('[TempleGrounds] the floor could not be woken', error);
    }
  };

  /**
   * The rooms read the hero's board again. The run read it when it opened, and the chores of a floor woken since (by this
   * arrival, or by the last chore paid in a battle) are on it now: a room whose beast slept must fight.
   */
  const readBoardAgain = async (): Promise<void> => {
    try {
      await templeSystem.refreshQuestRooms(temple);
    } catch (error) {
      debug.warn('[TempleGrounds] the rooms could not read the board again', error);
    }
  };

  const readAgain = async (): Promise<void> => {
    try {
      snapshot.value = await readTower();
      isRead.value = true;
      today.value = dateKey(new Date());
    } catch (error) {
      debug.warn('[TempleGrounds] the tower could not be read', error);
    }
  };

  /** Each cleared floor the hero has not been told about, lowest first; marked told as it shows, so it is never shown twice */
  const celebrate = async (): Promise<void> => {
    const read = snapshot.value;
    const hasNobodyToTell = !read || !heroId;
    if (hasNobodyToTell) return;
    for (const floor of unseenClearedFloors(read.project, heroId)) {
      try {
        await markFloorSeen(heroId, floor.floorKey);
        await celebration.showPrompt(floorClearedPrompt(floor, phaseNameOf(read.project.typeId, floor), voice.value));
      } catch (error) {
        debug.warn('[TempleGrounds] the cleared floor could not be told', error);
      }
    }
  };

  const reachAndRead = async (): Promise<void> => {
    const isOpened = await whenOpened;
    if (!isOpened) return;
    await templeSystem.whenProgressReady(temple);
    await reachFloor();
    await readBoardAgain();
    await readAgain();
    await celebrate();
  };

  let turn: Promise<void> = Promise.resolve();
  const refresh = (): Promise<void> => {
    const run = turn.then(reachAndRead);
    turn = run.catch(() => undefined);
    return run.catch((error: unknown) => debug.warn('[TempleGrounds] the tower could not be refreshed', error));
  };

  if (isTower) {
    // Each time the page is shown (the first, and after a battle or another screen): chores may have been done since
    onIonViewDidEnter(() => void refresh());
    // Arriving on another floor (stairs, a pit, a teleport, a run resumed there)
    watch(currentLevel, () => void refresh());
  }

  return { floorClock, isFloorCleared, towerPrompt: celebration.prompt, answerTowerPrompt: celebration.submitAnswer };
};
