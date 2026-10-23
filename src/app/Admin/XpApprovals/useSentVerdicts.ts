import { watch } from "vue";
import { useCopy } from "@/hooks/useVoice";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { useSyncStore } from "@/lib/store/stores/sync";

/**
 * The Approvals line for a claim whose verdict went to the device holding the hero's turn (family sync, section 6):
 * `sync.verdictSent` for an approval, `sync.verdictRejectedSent` for a rejection, until the verdict is applied; "" while
 * the claim still waits on this Game Master. Read from the sync store's `verdictsSent`, so the row changes the moment the
 * verdict is noted. A verdict that leaves `verdictsSent` was applied (here on a borrowed turn, or by the holder, whose copy
 * has landed): `landed` runs, so the screen reads its claims again instead of offering the buttons on a settled one.
 */
export function useSentVerdicts(landed: () => void): (entry: QuestLogEntry, nick: string) => string {
  const sync = useSyncStore();
  const t = useCopy();
  watch(
    () => Object.keys(sync.state.verdictsSent),
    (keys, before) => {
      const hasLanded = before.some((key) => !keys.includes(key));
      if (hasLanded) landed();
    }
  );
  return (entry, nick) => {
    const sent = sync.state.verdictsSent[entry.id];
    if (!sent) return "";
    return sent.approved ? t("sync.verdictSent", { nick }) : t("sync.verdictRejectedSent");
  };
}
