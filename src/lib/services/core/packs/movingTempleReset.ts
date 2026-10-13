/**
 * Forgetting every hero's walk through the Old House. A rebuilt house has its rooms in new places, so a saved
 * position, a visited room or a cleared fight from the old plan would point at the wrong room; each hero starts
 * again from the porch. This is the one helper of the Moving House pack that touches storage and the temple engine,
 * so the temple record itself (movingTemple.ts) stays pure.
 */
import { getTempleProgressDb } from "@/lib/databases/TempleProgressDb";
import type { TempleProgressDb } from "@/lib/databases/TempleProgressDb";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
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

/**
 * Drop the Old House run the temple engine still holds in memory, once the rebuilt house is loaded. A run outlives
 * the temple screen, so without this the next visit would put the old run (where the hero stood, the rooms won, the
 * chests and doors opened, the keys) on the new rooms and save it over the walk forgetOldHouseWalks cleared.
 */
export const forgetOldHouseRun = (temples: Pick<TempleSystem, "forgetTempleRun"> = TempleSystem.getInstance()): void => {
  temples.forgetTempleRun(MOVING_TEMPLE_ID);
};
