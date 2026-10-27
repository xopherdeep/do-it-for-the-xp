/**
 * What the Quick Start screen tells the Game Master about the Howling Spire (the Wind Temple): how many of tonight's
 * quests also wait there. The Spire's rooms decide it, not the pack: only the free fight rooms near the door take a quest
 * (quickStartPlan.ts), so on the Eagle layout two of the three do and the third stays on the quest board. The count is
 * read off the same plan the start runs, so the line cannot drift from what the heroes find. Pure.
 */
import { copyFor } from "@/lib/services/copy/copy";
import type { Voice } from "@/lib/services/copy/voices";
import { QUICK_START_QUEST_IDS, QUICK_START_TEMPLE_ID, quickStartTemplePlan } from "@/lib/services/temples/quickStartPlan";
import { shippedLayoutOf } from "@/lib/services/temples/wakeOnEntry";

/** How many of tonight's quests the Wind Temple as shipped puts in a room (a fresh family's copy is the shipped one) */
export function quickStartSpireCount(): number {
  const layout = shippedLayoutOf(QUICK_START_TEMPLE_ID);
  const plan = quickStartTemplePlan(layout, QUICK_START_QUEST_IDS, [], new Date());
  return plan.placed.length;
}

/** The catalogue key for a Spire that took `placed` of `total` quests; null when it took none (there is nothing to say) */
export function quickStartSpireKey(placed: number, total: number): string | null {
  const holdsNone = placed <= 0;
  if (holdsNone) return null;
  const holdsAll = placed >= total;
  if (holdsAll) return "quickStart.spireAll";
  const holdsOne = placed === 1;
  return holdsOne ? "quickStart.spireOne" : "quickStart.spireSome";
}

/** The Spire line in `voice`, or null when no quest of tonight's waits there */
export function quickStartSpireNote(
  voice: Voice,
  placed: number = quickStartSpireCount(),
  total: number = QUICK_START_QUEST_IDS.length
): string | null {
  const key = quickStartSpireKey(placed, total);
  if (!key) return null;
  return copyFor(key, voice, { count: placed });
}
