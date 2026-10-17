import { rewardChips } from "@/components/organisms/XpApp/appChips";
import type { AppChipSpec } from "@/components/organisms/XpApp/appChips";
import type { QuestRewards } from "@/lib/databases/QuestLogDb";

/** The chips on a claim row: what the hero earns (XP, GP, AP), then a camera chip when the chore asked for a photo. */
export const claimChips = (rewards: QuestRewards, requiresPhoto?: boolean): AppChipSpec[] => {
  const chips = rewardChips(rewards);
  if (requiresPhoto) chips.push({ kind: "tag", value: "Photo proof", icon: "fa-camera" });
  return chips;
};
