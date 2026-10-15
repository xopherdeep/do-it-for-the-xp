import { computed, ref } from "vue";
import { TownHallError } from "@/lib/services/townhall/townHallClient";
import debug from "@/lib/utils/debug";

/** The site not answering (no connection, a timeout, an error page) is the courier being late, not a bug. */
export const isCourierTrouble = (error: unknown): boolean =>
  error instanceof TownHallError && (error.code === "offline" || error.code === "server");

/**
 * What every Town Hall tab does around a read: show it is loading, remember it failed, and tell the page when the
 * courier is late so the clerk can say so. Anything else that goes wrong is logged and the tab shows its own gap.
 */
export function useTownHallLoad(onTrouble: () => void) {
  const pending = ref(0);
  const isLoading = computed(() => pending.value > 0);
  const failed = ref(false);

  const run = async (task: () => Promise<void>): Promise<void> => {
    pending.value += 1;
    failed.value = false;
    try {
      await task();
    } catch (error) {
      failed.value = true;
      if (isCourierTrouble(error)) onTrouble();
      else debug.error("Town Hall could not read the site:", error);
    } finally {
      pending.value -= 1;
    }
  };

  return { isLoading, failed, run };
}
