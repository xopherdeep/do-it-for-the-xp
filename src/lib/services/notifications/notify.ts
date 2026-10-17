import { useNotificationsStore } from "@/lib/store/stores/notifications";
import debug from "@/lib/utils/debug";
import { bloodMoonNotification } from "./Notifications";
import type { NewXpNotification, XpNotification } from "./Notifications";

/**
 * Fire-and-forget producers: push a notification into the hero's feed without the caller caring whether
 * a store is active (game-rule modules and the temple engine run in specs without Pinia). Never throws.
 */
export const notify = (input: NewXpNotification): XpNotification | null => {
  try {
    return useNotificationsStore().push(input);
  } catch {
    return null;
  }
};

/** A held claim was settled: its "waiting" notices are read in every Game Master's feed. Never throws. */
export const settleWaiting = (entryId: string): void => {
  try {
    useNotificationsStore().markReadByRef("claim-waiting", entryId);
  } catch (error) {
    // no store in a spec without Pinia: there are no notices to settle
    debug.warn("[notify] could not settle the waiting notices", error);
  }
};

/**
 * The blood moon rose over a temple and reset it. For the temple engine (TempleSystem): one notification
 * per hero per temple per night, whatever the engine's reasons for calling it twice.
 */
export const bloodMoon = (
  heroId: string,
  temple: { id: string; name: string },
  night: Date = new Date()
): XpNotification | null => notify(bloodMoonNotification(heroId, temple, night));
