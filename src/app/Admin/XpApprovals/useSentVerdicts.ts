import { useCopy } from "@/hooks/useVoice";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { useSyncStore } from "@/lib/store/stores/sync";

/**
 * The Approvals line for a claim whose verdict went to the device holding the hero's turn (family sync, section 6):
 * `sync.verdictSent` for an approval, `sync.verdictRejectedSent` for a rejection, until that device's copy of the entry
 * lands; "" while the claim still waits on this Game Master. Read from the sync store's `verdictsSent`, so the row
 * changes the moment the verdict is noted.
 */
export function useSentVerdicts(): (entry: QuestLogEntry, nick: string) => string {
  const sync = useSyncStore();
  const t = useCopy();
  return (entry, nick) => {
    const sent = sync.state.verdictsSent[entry.id];
    if (!sent) return "";
    return sent.approved ? t("sync.verdictSent", { nick }) : t("sync.verdictRejectedSent");
  };
}
