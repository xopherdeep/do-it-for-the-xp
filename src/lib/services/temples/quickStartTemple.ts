/**
 * Quick Start makes the Wind Temple live (owner 2026-10-18, "set world, wake on arrival"). Quick Start seeds tonight's
 * three quests and three rewards; without this the family walks into the Wind Temple, the plains temple a new hero
 * meets first, and finds only sleeping beasts. So, right after the seed, tonight's quests go into the monster rooms
 * nearest the door and the other monster rooms wake for every Quick Start hero (the rules are quickStartPlan.ts, pure).
 *
 * `runQuickStartTemple` writes only through the existing writers: the temple record (TempleDb.setTemple, the Temple
 * Creator's own save, which tells the engine through templeChanges), the quests and beasts (commitWake:
 * AchievementDb.setTask, BestiaryDb.setBeast) and each hero's questEffects (the wake remembered, wakeOnEntry.ts), so
 * walking into the temple later wakes nothing again. The record keeps its seed's signature: the seed sync reads
 * tonight's quests as Quick Start's (withoutQuickStartQuests), so the copy still refreshes when the shipped temple changes.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import templeDb, { templeStorage, type TempleInterface } from "@/lib/databases/TempleDb";
import { ensureBuiltInTemples } from "@/lib/engine/core/dungeons/importAllTemples";
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import {
  entranceFloorOf,
  familyWakeStores,
  floorsOfLayout,
  rememberWake,
  shippedLayoutOf,
  type FamilyWakeStores,
  type PlayedLayout,
} from "@/lib/services/temples/wakeOnEntry";
import { commitWake, planWake } from "@/lib/services/temples/wakeTempleQuests";
import { QUICK_START_QUEST_IDS, QUICK_START_TEMPLE_ID, quickStartTemplePlan, type PlacedQuest } from "./quickStartPlan";

export { QUICK_START_QUEST_IDS, QUICK_START_TEMPLE_ID, quickStartTemplePlan };
export type { PlacedQuest, QuickStartTemplePlan } from "./quickStartPlan";

export interface QuickStartTempleDeps extends FamilyWakeStores {
  /** The shipped temples are in the TempleDb (importAllTemples) */
  ensureTemples: () => Promise<void>;
  readRecord: (templeId: string) => Promise<TempleInterface | null>;
  /** The Temple Creator's save: TempleDb.setTemple */
  saveRecord: (record: TempleInterface) => Promise<unknown>;
}

export interface QuickStartTempleDone {
  placed: PlacedQuest[];
  woken: Achievement[];
  adopted: Beast[];
  /** The heroes the wake was remembered for */
  remembered: string[];
}

const quickStartTempleDeps = (): QuickStartTempleDeps => ({
  ...familyWakeStores(),
  ensureTemples: ensureBuiltInTemples,
  readRecord: async (templeId) => {
    // The storage has to be created before it is read
    await templeStorage.create();
    return templeDb.getTempleById(templeId);
  },
  saveRecord: (record) => templeDb.setTemple(record),
});

/**
 * Makes the Wind Temple live for the Quick Start heroes: tonight's quests into its record, the other monster rooms
 * woken for the heroes, the wake remembered on each hero. A temple with no record (the TempleDb could not take the
 * shipped temples) keeps its rooms as shipped, and its beasts still wake. A write that fails throws: what was written
 * stays, nothing is remembered, and the hero's first walk into the temple wakes what is left (wakeOnEntry.ts).
 */
export async function runQuickStartTemple(
  heroIds: readonly string[],
  deps: QuickStartTempleDeps = quickStartTempleDeps(),
  now: Date = new Date()
): Promise<QuickStartTempleDone> {
  await deps.ensureTemples();
  const record = await deps.readRecord(QUICK_START_TEMPLE_ID);
  const stored = record?.dungeonLayout ?? null;
  const played = stored ?? shippedLayoutOf(QUICK_START_TEMPLE_ID);
  const plan = quickStartTemplePlan<PlayedLayout>(played, QUICK_START_QUEST_IDS, heroIds, now);

  const placedLayout = plan.layout;
  const canPlace = Boolean(record && stored && placedLayout);
  if (canPlace) {
    await deps.saveRecord({ ...(record as TempleInterface), dungeonLayout: placedLayout as TempleInterface["dungeonLayout"] });
  }

  const done: QuickStartTempleDone = { placed: canPlace ? plan.placed : [], woken: [], adopted: [], remembered: [] };
  const hasSomethingToWake = plan.wake.templates.length > 0 && heroIds.length > 0;
  if (hasSomethingToWake) {
    const [quests, beasts] = await Promise.all([deps.readQuests(), deps.readBeasts()]);
    const made = await commitWake(planWake({ ...plan.wake, quests, beasts }), deps.writers);
    done.woken = made.woken;
    done.adopted = made.adopted;
  }

  // The plan woke the monster rooms of every floor, so every floor is remembered as woken (walking in is then quiet)
  const drawnFloors = floorsOfLayout(played);
  const floors = drawnFloors.length > 0 ? drawnFloors : [entranceFloorOf(played)];
  for (const heroId of heroIds) {
    const hero = deps.hero(heroId);
    if (!hero) continue;
    const remembered = floors.reduce<HeroQuestEffects>((effects, floor) => rememberWake(effects, QUICK_START_TEMPLE_ID, floor, now), hero.questEffects ?? {});
    await deps.saveEffects(heroId, remembered);
    done.remembered.push(heroId);
  }
  return done;
}
