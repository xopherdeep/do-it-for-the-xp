import { modalController } from "@ionic/vue";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { getClaimPhotoDb } from "@/lib/databases/ClaimPhotoDb";
import type { QuestLogSource } from "@/lib/databases/QuestLogDb";
import { completeQuest, type CompletionResult } from "@/lib/services/quests/QuestCompletionService";
import { isImageDataUrl, needsPhotoNow } from "@/lib/services/quests/claimPhotos";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import ClaimPhotoPrompt from "./ClaimPhotoPrompt.vue";

/** Opens the retro photo prompt; resolves with the photo (a JPEG data URL) or null when the hero backs out. */
export const askForClaimPhoto = async (questName: string): Promise<string | null> => {
  const modal = await modalController.create({
    component: ClaimPhotoPrompt,
    componentProps: { questName },
    cssClass: "claim-photo-modal",
    backdropDismiss: false,
  });
  await modal.present();
  const { data, role } = await modal.onDidDismiss();
  const isSent = role === "send" && isImageDataUrl(data);
  return isSent ? (data as string) : null;
};

/**
 * Claim a quest, asking for the picture first when the chore wants one. Resolves null when the hero backs out of the
 * prompt: nothing is claimed. Otherwise completeQuest runs and the photo is stored under the new log entry's id
 * (on this device only; see claimPhotos.ts). A photo that cannot be stored never undoes the claim: the Game Master
 * sees "No photo sent".
 */
export const claimWithProof = async (
  quest: Achievement,
  heroId: string,
  source: QuestLogSource = "claim"
): Promise<CompletionResult | null> => {
  const mustShowPhoto = needsPhotoNow(quest, heroId, useUserStore().users);
  let photo: string | null = null;
  if (mustShowPhoto) {
    photo = await askForClaimPhoto(quest.achievementName);
    const isCancelled = photo === null;
    if (isCancelled) return null;
  }
  const result = await completeQuest(quest, heroId, source);
  const hasPhoto = photo !== null;
  if (hasPhoto) {
    await getClaimPhotoDb()
      .setPhoto(result.entry.id, heroId, photo as string)
      .catch((error) => debug.warn("[ClaimPhoto] the photo could not be stored", error));
  }
  return result;
};
