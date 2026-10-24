/**
 * A layout refresh's wake memory (owner 2026-10-23, "wake only the new beasts"): when a shipped temple's layout is
 * replaced (importAllTemples), each hero's woken floors of the OLD layout are swapped for the beasts those floors held
 * (`templesWokenBeasts`, rememberWokenBeasts), and wakeOnEntryPlan then wakes only the beasts that list does not hold.
 * The reading side (wokenBeastsOf) lives in wakeOnEntry; this is the writing side, loaded by importAllTemples only when
 * a refresh happens.
 */
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import { useUserStore } from "@/lib/store/stores/user";
import { monsterTemplateCells, wakeSlugOf } from "@/lib/services/temples/wakeTempleQuests";
import {
  WOKEN_BEASTS_FIELD,
  beastMemoryOf,
  entranceFloorOf,
  isRecord,
  wokenBeastsOf,
  wokenTemplesOf,
  type EntryHero,
  type PlayedLayout,
} from "@/lib/services/temples/wakeOnEntry";
import debug from "@/lib/utils/debug";

/**
 * The hero's questEffects as a refresh of the temple's layout leaves them: the beasts that the floors woken under `oldLayout`
 * held are added to the temple's remembered beasts, and the temple's woken floors are forgotten (the next arrival on any
 * floor of the new layout wakes what is not remembered). A wake remembered by the temple alone was the old layout's entrance
 * floor's. Other temples' wakes and memory and every other effect are kept, and nothing is changed in place. Null when the
 * hero has no floor of the temple woken: there is nothing to carry over and nothing to write.
 */
export const rememberWokenBeasts = (effects: HeroQuestEffects | null | undefined, templeId: string, oldLayout: PlayedLayout | null | undefined): HeroQuestEffects | null => {
  const woken = wokenTemplesOf(effects);
  const floorPrefix = `${templeId}@`;
  const isThisTemples = (key: string) => key === templeId || key.startsWith(floorPrefix);
  const hasNoWokenFloor = !Object.keys(woken).some(isThisTemples);
  if (hasNoWokenFloor) return null;

  const entranceFloor = entranceFloorOf(oldLayout);
  const wokenFloors = new Set(Object.keys(woken).filter(isThisTemples).map((key) => (key === templeId ? entranceFloor : key.slice(floorPrefix.length))));
  const held = monsterTemplateCells(oldLayout)
    .filter((cell) => wokenFloors.has(cell.floor))
    .map((cell) => wakeSlugOf(String(cell.room.content?.quest?.beastId)));

  const memory = beastMemoryOf(effects);
  const slugs = [...new Set([...wokenBeastsOf(effects, templeId), ...held])].sort();
  const hasBeasts = slugs.length > 0;
  if (hasBeasts) memory[templeId] = slugs;

  const next: HeroQuestEffects = {
    ...(isRecord(effects) ? effects : {}),
    templesWokenAt: Object.fromEntries(Object.entries(woken).filter(([key]) => !isThisTemples(key))),
  };
  const keepsMemory = Object.keys(memory).length > 0;
  if (keepsMemory) next[WOKEN_BEASTS_FIELD] = memory;
  else delete next[WOKEN_BEASTS_FIELD];
  return next;
};

/** What a layout refresh reads and writes of the family's heroes: each hero with the questEffects they hold, and the writer for them. */
export interface HeroEffectsStore {
  heroes: () => Promise<readonly EntryHero[]>;
  saveEffects: (heroId: string, effects: HeroQuestEffects) => unknown;
}

/** The user store's heroes and its setQuestEffects. A refresh runs as the app starts, so profiles that have not loaded yet are loaded first. */
export function familyHeroEffects(): HeroEffectsStore {
  const userStore = useUserStore();
  const rosterOf = () => (Object.values(userStore.users ?? {}) as EntryHero[]).filter((hero) => hero?.id);
  return {
    heroes: async () => {
      const hasNoHeroesLoaded = rosterOf().length === 0;
      if (hasNoHeroesLoaded) await userStore.loadUsers();
      return rosterOf();
    },
    saveEffects: (heroId, effects) => userStore.setQuestEffects(heroId, effects),
  };
}

/**
 * Carries every hero's wake of a temple from the layout being replaced to the one that replaces it (rememberWokenBeasts):
 * writes only the heroes who had a floor of it woken, one at a time, and a hero whose write fails is warned about and
 * does not keep the others from theirs. Returns the ids of the heroes written. Call it before the old layout is gone.
 */
export async function rememberWokenBeastsForHeroes(templeId: string, oldLayout: PlayedLayout | null | undefined, store: HeroEffectsStore): Promise<string[]> {
  const written: string[] = [];
  for (const hero of await store.heroes()) {
    const effects = rememberWokenBeasts(hero.questEffects, templeId, oldLayout);
    if (!effects) continue;
    try {
      await store.saveEffects(String(hero.id), effects);
      written.push(String(hero.id));
    } catch (error) {
      debug.warn(`[layoutRefreshWake] could not carry ${hero.id}'s woken ${templeId} beasts to its new layout`, error);
    }
  }
  return written;
}
