import {
  IMMINENT_DELAY_MS,
  cancelHeroReminders,
  reminderIdOf,
  scheduleDueReminders,
} from "@/lib/services/notifications/deviceReminders";
import { reminderLinkOf } from "@/lib/services/notifications/reminderTaps";

/** The phone path of the device reminders: channels, the soon reminder, and taking back finished chores. */
const NOON = new Date(2026, 9, 10, 12, 0);
const HERO = "hero-1";
const SIS = "hero-2";

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
          { id: reminderIdOf(HERO, "gone"), extra: { questId: "gone", heroId: HERO } },
          { id: 7001, extra: { kind: "battle-alert" } },
        ],
      }),
      cancel: jest.fn(async () => void calls.push("cancel")),
      schedule: jest.fn(async () => void calls.push("schedule")),
    });
    await scheduleDueReminders(HERO, dishes(new Date(NOON.getTime() + 2 * 3600e3)), NOON, onPhone(plugin));
    expect(calls).toEqual(["channel:battle-alerts", "channel:chore-reminders", "cancel", "schedule"]);
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: reminderIdOf(HERO, "gone") }] });
  });

  it("rings once, soon, for a quest already inside its lead time, and never twice", async () => {
    const plugin = pluginWith();
    const reminders = dishes(new Date(NOON.getTime() + 10 * 60e3));
    expect(await scheduleDueReminders(HERO, reminders, NOON, onPhone(plugin))).toEqual({ scheduled: 1 });
    expect(plugin.schedule).toHaveBeenCalledWith({
      notifications: [expect.objectContaining({ schedule: { at: new Date(NOON.getTime() + IMMINENT_DELAY_MS), allowWhileIdle: true } })],
    });
    expect(await scheduleDueReminders(HERO, reminders, NOON, onPhone(plugin))).toEqual({ scheduled: 0, reason: "nothing-due" });
    expect(plugin.schedule).toHaveBeenCalledTimes(1);
  });

  it("does not ring again inside the window for a quest whose lead-time reminder was booked", async () => {
    const plugin = pluginWith();
    const deadline = new Date(NOON.getTime() + 2 * 3600e3);
    await scheduleDueReminders(HERO, dishes(deadline), NOON, onPhone(plugin));
    const insideWindow = new Date(deadline.getTime() - 10 * 60e3);
    expect(await scheduleDueReminders(HERO, dishes(deadline), insideWindow, onPhone(plugin))).toEqual({ scheduled: 0, reason: "nothing-due" });
    expect(plugin.schedule).toHaveBeenCalledTimes(1);
  });

  it("takes back booked reminders when nothing is ahead or the hero turned reminders off", async () => {
    const plugin = pluginWith({
      getPending: jest.fn().mockResolvedValue({ notifications: [{ id: reminderIdOf(HERO, "done"), extra: { questId: "done", heroId: HERO } }] }),
    });
    expect(await scheduleDueReminders(HERO, [], NOON, onPhone(plugin))).toEqual({ scheduled: 0, reason: "nothing-due" });
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: reminderIdOf(HERO, "done") }] });

    localStorage.setItem("xp.choreReminders", "off");
    const reminders = dishes(new Date(NOON.getTime() + 2 * 3600e3));
    expect(await scheduleDueReminders(HERO, reminders, NOON, onPhone(plugin))).toEqual({ scheduled: 0, reason: "off" });
    expect(plugin.schedule).not.toHaveBeenCalled();
  });
});

describe("deviceReminders on a shared phone", () => {
  beforeEach(() => localStorage.clear());
  afterAll(() => localStorage.clear());

  const sisDishes = { id: reminderIdOf(SIS, "q1"), extra: { questId: "q1", heroId: SIS } };
  const inTwoHours = new Date(NOON.getTime() + 2 * 3600e3);

  it("leaves another hero's reminders booked when a hero books theirs or has nothing due", async () => {
    const plugin = pluginWith({
      getPending: jest.fn().mockResolvedValue({
        notifications: [sisDishes, { id: reminderIdOf(HERO, "old"), extra: { questId: "old", heroId: HERO } }],
      }),
    });
    await scheduleDueReminders(HERO, dishes(inTwoHours), NOON, onPhone(plugin));
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: reminderIdOf(HERO, "old") }] });

    plugin.cancel.mockClear();
    plugin.getPending.mockResolvedValue({ notifications: [sisDishes] });
    expect(await scheduleDueReminders(HERO, [], NOON, onPhone(plugin))).toEqual({ scheduled: 0, reason: "nothing-due" });
    expect(plugin.cancel).not.toHaveBeenCalled();
  });

  it("books a quest shared by two heroes once for each of them", async () => {
    const plugin = pluginWith();
    await scheduleDueReminders(HERO, dishes(inTwoHours), NOON, onPhone(plugin));
    await scheduleDueReminders(SIS, dishes(inTwoHours), NOON, onPhone(plugin));
    const ids = plugin.schedule.mock.calls.map(([{ notifications }]: any) => notifications[0].id);
    expect(ids).toEqual([reminderIdOf(HERO, "q1"), reminderIdOf(SIS, "q1")]);
  });

  it("rings soon for each hero on a shared quest already inside its lead time", async () => {
    const plugin = pluginWith();
    const soon = dishes(new Date(NOON.getTime() + 10 * 60e3));
    expect(await scheduleDueReminders(HERO, soon, NOON, onPhone(plugin))).toEqual({ scheduled: 1 });
    expect(await scheduleDueReminders(SIS, soon, NOON, onPhone(plugin))).toEqual({ scheduled: 1 });
  });

  it("takes back reminders booked before they carried their hero", async () => {
    const legacy = { id: 4242, extra: { questId: "q9" } };
    const plugin = pluginWith({ getPending: jest.fn().mockResolvedValue({ notifications: [legacy, sisDishes] }) });
    await scheduleDueReminders(HERO, [], NOON, onPhone(plugin));
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: 4242 }] });
  });

  it("takes back only a removed hero's reminders", async () => {
    const mine = { id: reminderIdOf(HERO, "q1"), extra: { questId: "q1", heroId: HERO } };
    const plugin = pluginWith({ getPending: jest.fn().mockResolvedValue({ notifications: [mine, sisDishes] }) });
    await cancelHeroReminders(HERO, onPhone(plugin));
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: reminderIdOf(HERO, "q1") }] });
    await cancelHeroReminders(HERO, { isNative: async () => false, plugin: async () => plugin });
    expect(plugin.cancel).toHaveBeenCalledTimes(1);
  });

  it("takes back every hero's reminders when reminders are turned off for the device", async () => {
    const plugin = pluginWith({ getPending: jest.fn().mockResolvedValue({ notifications: [sisDishes] }) });
    localStorage.setItem("xp.choreReminders", "off");
    expect(await scheduleDueReminders(HERO, dishes(inTwoHours), NOON, onPhone(plugin))).toEqual({ scheduled: 0, reason: "off" });
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: sisDishes.id }] });
  });
});

describe("reminder taps", () => {
  it("only follows a reminder's quest link", () => {
    expect(reminderLinkOf({ questId: "q1", link: "/my-tasks/hero-1/task/q1/" })).toBe("/my-tasks/hero-1/task/q1/");
    expect(reminderLinkOf({ kind: "battle-alert" })).toBeNull();
    expect(reminderLinkOf({ link: "https://elsewhere.example" })).toBeNull();
    expect(reminderLinkOf(undefined)).toBeNull();
  });

  it("books the link on the reminder so the tap knows where to go", async () => {
    localStorage.clear();
    const plugin = pluginWith();
    const link = "/my-tasks/hero-1/task/q1/";
    const reminders = [{ questId: "q1", title: "Dishes", body: "Due.", deadline: new Date(NOON.getTime() + 2 * 3600e3), link }];
    await scheduleDueReminders(HERO, reminders, NOON, onPhone(plugin));
    expect(plugin.schedule).toHaveBeenCalledWith({
      notifications: [expect.objectContaining({ extra: { questId: "q1", heroId: HERO, link } })],
    });
    localStorage.clear();
  });
});
