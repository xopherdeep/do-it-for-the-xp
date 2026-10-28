/**
 * Asks the running project to settle what is ready, for the screens that change the board without paying a chore: a chore
 * deleted from the quest list (it may have been its floor's last open one), a hero's quest board opening. Settling is also
 * asked by every payment and arrival, but a floor emptied by a delete has neither, and would stay asleep until someone
 * opened the Hometown sheet. The callers never wait on it (`void settleInBackground()`), and it never fails: a failure is
 * said, and the next ask tries again. The tower builder is loaded only when a project is running, so a family with no
 * project pays one small read.
 */
import { getProjectDb } from "@/lib/databases/ProjectDb";
import debug from "@/lib/utils/debug";

/** What it asks of the project: whether one runs, and to settle what is ready (the live ones are below; the specs hand over their own) */
interface Asks {
  isRunning: () => Promise<boolean>;
  settle: () => Promise<unknown>;
}

const LIVE: Asks = {
  isRunning: async () => Boolean(await getProjectDb().getActive()),
  settle: async () => {
    const { settleReadyFloors } = await import("./projectService");
    return settleReadyFloors();
  },
};

export const settleInBackground = async (asks: Asks = LIVE): Promise<void> => {
  try {
    const isRunning = await asks.isRunning();
    if (isRunning) await asks.settle();
  } catch (error) {
    debug.warn("[Projects] could not settle what is ready", error);
  }
};
