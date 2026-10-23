/**
 * A Game Master's verdict (`claim.settled`), applied on the device holding the hero's turn (section 6 of the family sync
 * spec). The verdict names the quest log entry (`claimId`); it is applied only while the entry is still `pending`, so a
 * repeat, a replay of the same event or a second Game Master's verdict on the same claim pays nothing. `approve` pays
 * and marks `rewardsApplied` (approveCompletion), `reject` voids the entry with the note (rejectCompletion). Nothing
 * here reads a store or talks to the site: the caller hands the quest log in.
 */
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import type { ClaimSettled } from "@/lib/services/multiplayer/familyEvents";

/** Settled now, settled before (or nothing to settle), or the entry has not reached this device yet */
export type VerdictResult = "applied" | "already" | "missing";

export interface VerdictDeps {
  /** The quest log entry a verdict names, or null when this device does not have it */
  entry(id: string): Promise<QuestLogEntry | null>;
  approve(id: string): Promise<unknown>;
  reject(id: string, note: string): Promise<unknown>;
}

export const applyVerdict = async (settled: ClaimSettled, deps: VerdictDeps): Promise<VerdictResult> => {
  // A claim taken and held is not a verdict: nothing to apply
  const isHoldOnly = settled.status === "pending";
  if (isHoldOnly) return "already";
  const entry = await deps.entry(settled.claimId);
  if (!entry) return "missing";
  const isSettled = entry.status !== "pending";
  if (isSettled) return "already";
  const isApproval = settled.status === "approved";
  if (isApproval) await deps.approve(entry.id);
  else await deps.reject(entry.id, settled.note);
  return "applied";
};
