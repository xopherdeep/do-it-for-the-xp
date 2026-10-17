import debug from "@/lib/utils/debug";

/**
 * Android 8+ drops a notification whose channel does not exist, so every path that schedules one creates the
 * channels first (creating an existing channel is a no-op).
 */
export const ensureAlertChannels = async (plugin: any): Promise<void> => {
  try {
    await plugin.createChannel({
      id: "battle-alerts",
      name: "Battle Alerts",
      description: "Ambush and battle alerts",
      importance: 4,
    });
    await plugin.createChannel({
      id: "chore-reminders",
      name: "Chore Reminders",
      description: "Upcoming chore deadlines",
      importance: 4,
    });
  } catch (error) {
    // the plugin lacks the method in mocks and on the web
    debug.warn("[alertChannels] could not create the alert channels", error);
  }
};
