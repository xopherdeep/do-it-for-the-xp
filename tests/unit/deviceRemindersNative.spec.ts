import {
  IMMINENT_DELAY_MS,
  reminderIdOf,
  scheduleDueReminders,
} from "@/lib/services/notifications/deviceReminders";

/** The phone path of the device reminders: channels, the soon reminder, and taking back finished chores. */
const NOON = new Date(2026, 9, 10, 12, 0);

const pluginWith = (extra: Record<string, jest.Mock> = {}) => ({
  checkPermissions: jest.fn().mockResolvedValue({ display: "granted" }),
  getPending: jest.fn().mockResolvedValue({ notifications: [] }),
  cancel: jest.fn().mockResolvedValue(undefined),
  schedule: jest.fn().mockResolvedValue(undefined),
  ...extra,
});

const onPhone = (plugin: unknown) => ({ isNative: async () => true, plugin: async () => plugin });

const dishes = (deadline: Date) => [{ questId: "q1", title: "Dishes", body: "Due.", deadline }];

describe("deviceReminders on a phone", () => {
  beforeEach(() => localStorage.clear());
  afterAll(() => localStorage.clear());

  it("creates the chore channel before booking and takes back reminders for quests no longer ahead", async () => {
    const calls: string[] = [];
    const plugin = pluginWith({
      createChannel: jest.fn(async ({ id }: any) => void calls.push(`channel:${id}`)),
      getPending: jest.fn().mockResolvedValue({
        notifications: [
          { id: reminderIdOf("gone"), extra: { questId: "gone" } },
          { id: 7001, extra: { kind: "battle-alert" } },
        ],
      }),
      cancel: jest.fn(async () => void calls.push("cancel")),
      schedule: jest.fn(async () => void calls.push("schedule")),
    });
    await scheduleDueReminders(dishes(new Date(NOON.getTime() + 2 * 3600e3)), NOON, onPhone(plugin));
    expect(calls).toEqual(["channel:battle-alerts", "channel:chore-reminders", "cancel", "schedule"]);
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: reminderIdOf("gone") }] });
  });

  it("rings once, soon, for a quest already inside its lead time, and never twice", async () => {
    const plugin = pluginWith();
    const reminders = dishes(new Date(NOON.getTime() + 10 * 60e3));
    expect(await scheduleDueReminders(reminders, NOON, onPhone(plugin))).toEqual({ scheduled: 1 });
    expect(plugin.schedule).toHaveBeenCalledWith({
      notifications: [expect.objectContaining({ schedule: { at: new Date(NOON.getTime() + IMMINENT_DELAY_MS), allowWhileIdle: true } })],
    });
    expect(await scheduleDueReminders(reminders, NOON, onPhone(plugin))).toEqual({ scheduled: 0, reason: "nothing-due" });
    expect(plugin.schedule).toHaveBeenCalledTimes(1);
  });

  it("does not ring again inside the window for a quest whose lead-time reminder was booked", async () => {
    const plugin = pluginWith();
    const deadline = new Date(NOON.getTime() + 2 * 3600e3);
    await scheduleDueReminders(dishes(deadline), NOON, onPhone(plugin));
    const insideWindow = new Date(deadline.getTime() - 10 * 60e3);
    expect(await scheduleDueReminders(dishes(deadline), insideWindow, onPhone(plugin))).toEqual({ scheduled: 0, reason: "nothing-due" });
    expect(plugin.schedule).toHaveBeenCalledTimes(1);
  });

  it("takes back booked reminders when nothing is ahead or the hero turned reminders off", async () => {
    const plugin = pluginWith({
      getPending: jest.fn().mockResolvedValue({ notifications: [{ id: reminderIdOf("done"), extra: { questId: "done" } }] }),
    });
    expect(await scheduleDueReminders([], NOON, onPhone(plugin))).toEqual({ scheduled: 0, reason: "nothing-due" });
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: reminderIdOf("done") }] });

    localStorage.setItem("xp.choreReminders", "off");
    const reminders = dishes(new Date(NOON.getTime() + 2 * 3600e3));
    expect(await scheduleDueReminders(reminders, NOON, onPhone(plugin))).toEqual({ scheduled: 0, reason: "off" });
    expect(plugin.schedule).not.toHaveBeenCalled();
  });
});
