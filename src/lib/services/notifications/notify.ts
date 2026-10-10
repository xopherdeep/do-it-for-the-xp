import { useNotificationsStore } from "@/lib/store/stores/notifications";
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

/**
 * The blood moon rose over a temple and reset it. For the temple engine (TempleSystem): one notification
 * per hero per temple per night, whatever the engine's reasons for calling it twice.
 */
export const bloodMoon = (
  heroId: string,
  temple: { id: string; name: string },
  night: Date = new Date()
): XpNotification | null => notify(bloodMoonNotification(heroId, temple, night));
