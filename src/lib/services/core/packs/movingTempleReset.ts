/**
 * Forgetting every hero's walk through the Old House. A rebuilt house has its rooms in new places, so a saved
 * position, a visited room or a cleared fight from the old plan would point at the wrong room; each hero starts
 * again from the porch. This is the one helper of the Moving House pack that touches storage, so the temple record
 * itself (movingTemple.ts) stays pure.
 */
import { getTempleProgressDb } from "@/lib/databases/TempleProgressDb";
import type { TempleProgressDb } from "@/lib/databases/TempleProgressDb";
import debug from "@/lib/utils/debug";
import { MOVING_TEMPLE_ID } from "./movingTemple";

/**
 * Clear each hero's saved progress in the Old House. A hero whose clear fails is warned about and skipped, and
 * never stops the others or throws: the worst a failure leaves is one hero resuming in a room that moved.
 */
export const forgetOldHouseWalks = async (
  heroIds: readonly string[],
  db: Pick<TempleProgressDb, "clearProgress"> = getTempleProgressDb()
): Promise<void> => {
  const results = await Promise.allSettled(heroIds.map(async (heroId) => db.clearProgress(heroId, MOVING_TEMPLE_ID)));
  results.forEach((result, index) => {
    const didFail = result.status === "rejected";
    if (didFail) debug.warn(`[MovingHouse] could not forget ${heroIds[index]}'s walk through the Old House`, result.reason);
  });
};
