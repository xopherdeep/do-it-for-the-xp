import debug from "@/lib/utils/debug";

export type ReminderChoice = "on" | "off";

const REMINDERS_KEY = "xp.choreReminders";

/** Whether the hero wants chore reminders on this device. They are on until the hero turns them off. */
export const choreRemindersChoice = (): ReminderChoice => {
  try {
    const isOff = localStorage.getItem(REMINDERS_KEY) === "off";
    return isOff ? "off" : "on";
  } catch (error) {
    debug.warn("[reminderChoice] could not read the reminders choice", error);
    return "on";
  }
};

export const setChoreRemindersChoice = (choice: ReminderChoice): void => {
  try {
    localStorage.setItem(REMINDERS_KEY, choice);
  } catch (error) {
    // private mode or blocked storage: the hero keeps the default
    debug.warn("[reminderChoice] could not keep the reminders choice", error);
  }
};
