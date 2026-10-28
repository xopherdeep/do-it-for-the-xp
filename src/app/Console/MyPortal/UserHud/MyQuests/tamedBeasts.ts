import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { questBeastId } from "@/lib/services/temples/questRooms";
import { libraryEntryOf } from "@/lib/services/temples/templeQuestRows";
import { formatQuestName } from "@/lib/utils/format";
import { beastFaceOf } from "./questLogRows";

/**
 * The Beast Log's Tamed tab: every beast the hero has tamed, one tile each. Pure: no storage, no Vue.
 *
 * There is no tamed flag on a beast: the quest log is the record. A beast is tamed once a quest it stands for has an
 * approved entry for this hero (a claim the Game Master held back, or voided, does not count yet).
 */
export interface TamedBeast {
  /** The beast's id, else the quest's (a quest whose beast has no entry anywhere still shows once) */
  id: string;
  name: string;
  /** The portrait, else the family's picture; "" when the tile shows the scroll */
  image: string;
  /** How many times the hero has tamed it */
  count: number;
  /** ISO time of the latest taming, newest first */
  lastTamedAt: string;
  /** A quest this beast stands for, so a tap can open its card */
  quest: Achievement;
}

export interface TamedBeastsContext {
  quests: readonly Achievement[];
  beasts: readonly Beast[];
  portraitUrl: (avatar?: number | null) => string | null;
}

export function tamedBeastsOf(
  entries: readonly QuestLogEntry[],
  heroId: string,
  { quests, beasts, portraitUrl }: TamedBeastsContext,
): TamedBeast[] {
  const questsById = new Map(quests.map((quest) => [String(quest.id), quest]));
  const tamed = new Map<string, TamedBeast>();
  for (const entry of entries) {
    const isHeroTaming = entry.status === "approved" && String(entry.userId) === heroId;
    if (!isHeroTaming) continue;
    const quest = questsById.get(String(entry.questId));
    if (!quest) continue;
    const beastId = questBeastId(quest);
    if (!beastId) continue;
    const seen = tamed.get(beastId);
    if (seen) {
      seen.count += 1;
      const isNewerTaming = entry.completedAt > seen.lastTamedAt;
      if (isNewerTaming) seen.lastTamedAt = entry.completedAt;

      continue;
    }
    const own = beasts.find((beast) => String(beast.id) === beastId);
    const face = beastFaceOf(quest, beasts);
    tamed.set(beastId, {
      id: beastId,
      name: own?.name || libraryEntryOf(beastId)?.name || formatQuestName(quest.achievementName),
      // A kid's own picture of the beast wins over the library portrait it may also carry
      image: face.picture || portraitUrl(face.avatar) || "",
      count: 1,
      lastTamedAt: entry.completedAt,
      quest,
    });
  }
  return [...tamed.values()].sort((a, b) => b.lastTamedAt.localeCompare(a.lastTamedAt));
}

/** The tiles a search keeps: a beast whose name has the words typed. */
export function filterTamed(beasts: readonly TamedBeast[], search: string): TamedBeast[] {
  const words = search.trim().toLowerCase();
  if (!words) return [...beasts];
  return beasts.filter((beast) => beast.name.toLowerCase().includes(words));
}
