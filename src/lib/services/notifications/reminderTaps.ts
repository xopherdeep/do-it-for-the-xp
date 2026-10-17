import debug from "@/lib/utils/debug";
import { isNativeApp, loadLocalNotifications } from "./alertBridge";

/** The pages a tapped alert may open: a quest's card, or the Game Master's approvals */
const OPENABLE_LINKS = ["/my-tasks/", "/game-master/approvals"];

/** The page a tapped reminder points at, or null for any other alert (an ambush alert has no link). */
export const reminderLinkOf = (extra: unknown): string | null => {
  const link = (extra as { link?: unknown } | null | undefined)?.link;
  const isOpenable = typeof link === "string" && OPENABLE_LINKS.some((prefix) => link.startsWith(prefix));
  return isOpenable ? link : null;
};

/**
 * On a phone, a tap on a chore reminder opens the game on that quest's card. Returns the stop function (the
 * portal calls it when it unmounts). In a browser, or where the plugin cannot be loaded, nothing is listened for.
 */
export const startReminderTaps = (open: (link: string) => void): (() => void) => {
  let stopped = false;
  let listener: { remove: () => Promise<void> } | null = null;

  const register = async () => {
    if (!isNativeApp()) return;
    const plugin = await loadLocalNotifications();
    const canListen = Boolean(plugin?.addListener);
    if (!canListen) return;
    const added = await plugin.addListener("localNotificationActionPerformed", (event: any) => {
      const link = reminderLinkOf(event?.notification?.extra);
      if (link) open(link);
    });
    if (stopped) await added.remove();
    else listener = added;
  };
  register().catch((error) => debug.warn("[reminderTaps] could not listen for reminder taps", error));

  return () => {
    stopped = true;
    void listener?.remove();
    listener = null;
  };
};
