import { getClaimPhotoDb } from "@/lib/databases/ClaimPhotoDb";
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import { onHeroRemoved } from "@/lib/services/multiplayer/gameSignals";
import debug from "@/lib/utils/debug";

/**
 * How long a claim photo lives: until 7 days after its claim is settled (PHOTO_RETENTION_MS), or until its hero is removed.
 * The portal's quest watch calls runClaimPhotoPurge on mount and every five minutes. Never throws.
 */
let stopRemovalHook: (() => void) | null = null;

/** Delete a removed hero's photos. Idempotent: the first call subscribes, later calls do nothing. */
export const watchHeroRemovals = (): void => {
  const isWatching = stopRemovalHook !== null;
  if (isWatching) return;
  stopRemovalHook = onHeroRemoved((heroId) => {
    getClaimPhotoDb()
      .removeForHero(String(heroId))
      .catch((error) => debug.warn("[ClaimPhotos] could not delete a removed hero's photos", error));
  });
};

/** Delete the photos past their week. Returns how many went (0 when the read failed). */
export const runClaimPhotoPurge = async (now: number = Date.now()): Promise<number> => {
  watchHeroRemovals();
  try {
    const entries = await getQuestLogDb().getEntries();
    return await getClaimPhotoDb().purgeSettled(entries, undefined, now);
  } catch (error) {
    debug.warn("[ClaimPhotos] the purge failed", error);
    return 0;
  }
};
