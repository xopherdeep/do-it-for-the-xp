import { createPinia, setActivePinia } from "pinia";
import {
  MAX_NOTIFICATIONS_PER_HERO,
  approvedNotification,
  bloodMoonNotification,
  dedupeKeyOf,
  dueInCopy,
  iconOfKind,
  isDuplicate,
  levelUpNotification,
  makeNotification,
  purchaseNotification,
  questDueNotification,
  questOverdueNotification,
  rejectedNotification,
  sortNewestFirst,
  unreadCountOf,
  whenCopy,
} from "@/lib/services/notifications/Notifications";
import type { XpNotification } from "@/lib/services/notifications/Notifications";
import { DUE_SOON_MS, pickQuestAlerts, remindersOf } from "@/lib/services/notifications/questWatch";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  REMINDER_LEAD_MS,
  reminderIdOf,
  reminderTimeOf,
  IMMINENT_DELAY_MS,
  scheduleDueReminders,
} from "@/lib/services/notifications/deviceReminders";
import { POINT_ICONS } from "@/constants/POINT_ICONS";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { bloodMoon, notify } from "@/lib/services/notifications/notify";

/**
 * The notification system: the pure helpers (dedupe key, due copy, order), the quest watch's choice of
 * alerts, the store (push with dedupe, read marks, clear, persistence through a faked NotificationsDb)
 * and the device reminder shim's web path.
 */

const stored: Record<string, XpNotification[]> = {};
const mockDb = {
  getForHero: jest.fn(async (heroId: string) => stored[heroId] ?? []),
  saveForHero: jest.fn(async (heroId: string, list: XpNotification[]) => {
    stored[heroId] = JSON.parse(JSON.stringify(list));
  }),
  clearForHero: jest.fn(async (heroId: string) => {
    delete stored[heroId];
  }),
};
jest.mock("@/lib/databases/NotificationsDb", () => ({
  __esModule: true,
  getNotificationsDb: () => mockDb,
}));
jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/engine/quests/QuestEngine", () => ({
  __esModule: true,
  getQuestEngine: () => ({ getQuestBoardForUser: jest.fn().mockResolvedValue([]) }),
}));

const HERO = "hero-1";
const NOON = new Date(2026, 9, 10, 12, 0, 0);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const quest = (id: string, dueByTime: string, name = `Quest ${id}`) =>
  ({ id, achievementName: name, dueByTime } as QuestBoardItem["quest"]);
const row = (q: QuestBoardItem["quest"], extra: Partial<QuestBoardItem> = {}): QuestBoardItem => ({
  quest: q,
  status: "open",
  progress: null,
  pending: false,
  overdue: false,
  ...extra,
});

describe("Notifications helpers", () => {
  it("dedupes by kind, what it is about and the day", () => {
    expect(dedupeKeyOf("quest-due", "q1", new Date(2026, 9, 10, 8))).toBe("quest-due:q1:2026-10-10");
    expect(dedupeKeyOf("quest-due", "q1", new Date(2026, 9, 10, 23))).toBe("quest-due:q1:2026-10-10");
    expect(dedupeKeyOf("quest-due", "q1", new Date(2026, 9, 11, 1))).not.toBe(dedupeKeyOf("quest-due", "q1", NOON));

    const existing = [makeNotification(questDueNotification(HERO, quest("q1", "14:00"), new Date(2026, 9, 10, 14), NOON))];
    expect(isDuplicate(questDueNotification(HERO, quest("q1", "14:00"), new Date(2026, 9, 10, 14), NOON), existing)).toBe(true);
    // another kind about the same quest is new
    expect(isDuplicate(questOverdueNotification(HERO, quest("q1", "14:00"), null, NOON), existing)).toBe(false);
    // another hero's note never collides
    expect(isDuplicate(questDueNotification("hero-2", quest("q1", "14:00"), new Date(2026, 9, 10, 14), NOON), existing)).toBe(false);
    // the next day it is due again
    const tomorrow = new Date(2026, 9, 11, 12);
    expect(isDuplicate(questDueNotification(HERO, quest("q1", "14:00"), new Date(2026, 9, 11, 14), tomorrow), existing)).toBe(false);
    // notes without a refId are never duplicates
    expect(isDuplicate({ heroId: HERO, kind: "system", title: "Hi", body: "" }, existing)).toBe(false);
  });

  it("dedupes two power-cast notifications with the same refId on the same day", () => {
    const cast = { heroId: HERO, kind: "power-cast" as const, title: "Dad cast Video Games", body: "5 MP", refId: "cast-video-games" };
    const existing = [makeNotification(cast, NOON)];
    expect(isDuplicate({ ...cast, createdAt: new Date(NOON.getTime() + 3600e3).toISOString() }, existing)).toBe(true);
    // another power the same day is its own note
    expect(isDuplicate({ ...cast, refId: "cast-treats" }, existing)).toBe(false);
    // the same power the next day is a new note
    expect(isDuplicate({ ...cast, createdAt: new Date(2026, 9, 11, 12).toISOString() }, existing)).toBe(false);
    expect(iconOfKind("power-cast")).toBe(POINT_ICONS.ap.icon);
  });

  it("writes the due copy", () => {
    expect(dueInCopy(new Date(NOON.getTime() + 2 * 3600e3), NOON)).toBe("due in 2 h");
    expect(dueInCopy(new Date(NOON.getTime() + 90 * 60e3), NOON)).toBe("due in 1 h 30 min");
    expect(dueInCopy(new Date(NOON.getTime() + 45 * 60e3), NOON)).toBe("due in 45 min");
    expect(dueInCopy(new Date(NOON.getTime() + 20e3), NOON)).toBe("due now");
    expect(dueInCopy(new Date(NOON.getTime() - 3600e3), NOON)).toBe("1 h overdue");
    expect(questDueNotification(HERO, quest("q1", "14:00", "Dishes"), new Date(2026, 9, 10, 14), NOON)).toMatchObject({
      kind: "quest-due",
      refId: "q1",
      title: "Dishes",
      body: "Due in 2 h, by 2:00pm.",
      link: "/my-tasks/hero-1/task/q1/",
    });
    expect(questOverdueNotification(HERO, quest("q1", "11:00", "Dishes"), new Date(2026, 9, 10, 11), NOON).body).toBe(
      "Overdue: it was due by 11:00am."
    );
  });

  it("sorts newest first and counts the unread", () => {
    const a = makeNotification({ heroId: HERO, kind: "system", title: "a", body: "" }, new Date(2026, 9, 10, 9));
    const b = makeNotification({ heroId: HERO, kind: "system", title: "b", body: "" }, new Date(2026, 9, 10, 11));
    const c = makeNotification({ heroId: HERO, kind: "system", title: "c", body: "" }, new Date(2026, 9, 10, 10));
    expect(sortNewestFirst([a, b, c]).map((n) => n.title)).toEqual(["b", "c", "a"]);
    expect(unreadCountOf([a, { ...b, readAt: NOON.toISOString() }, c])).toBe(2);
    expect(whenCopy(a.createdAt, NOON)).toBe("9:00 AM");
    expect(whenCopy(a.createdAt, new Date(2026, 9, 12))).toBe("Oct 10, 9:00 AM");
  });

  it("builds the producers' copy", () => {
    expect(levelUpNotification(HERO, 7)).toMatchObject({ kind: "level-up", refId: "level-7", title: "Level 7!" });
    expect(levelUpNotification(HERO, 9, 2).body).toContain("2 levels");
    expect(approvedNotification(HERO, { id: "e1", questId: "q1", questName: "Dishes" }, "50 XP, 5 GP")).toMatchObject({
      kind: "approved",
      refId: "e1",
      body: '"Dishes" earned you 50 XP, 5 GP.',
      link: "/my-tasks/hero-1/",
    });
    expect(rejectedNotification(HERO, { id: "e1", questId: "q1", questName: "Dishes" }, "still dirty").body).toBe(
      '"Dishes" was not approved: still dirty'
    );
    expect(rejectedNotification(HERO, { id: "e1", questId: "q1", questName: "Dishes" }).body).toContain("open again");
    expect(bloodMoonNotification(HERO, { id: "forest", name: "Forest Temple" }).body).toContain("Forest Temple");
    expect(purchaseNotification(HERO, { id: "p1", itemName: "Cape", price: 30, status: "fulfilled" })).toMatchObject({
      kind: "purchase",
      title: "Delivered!",
      link: "/my-gold-points/hero-1/",
    });
    expect(purchaseNotification(HERO, { id: "p1", itemName: "Cape", price: 30, status: "refunded" }).body).toContain("30 GP");
  });
});

describe("questWatch.pickQuestAlerts", () => {
  it("warns about quests due within two hours and quests overdue, and leaves the rest alone", () => {
    const board = [
      row(quest("soon", "13:30")),
      row(quest("later", "16:00")),
      row(quest("late", "11:00"), { overdue: true }),
      row(quest("pending", "13:00"), { pending: true }),
      row(quest("done", "13:00"), { status: "done" }),
      row(quest("notDue", "13:00"), { status: "notDue" }),
      row(quest("noClock", "")),
    ];
    const alerts = pickQuestAlerts(board, undefined, NOON, HERO);
    expect(alerts.map((a) => [a.notification.kind, a.notification.refId])).toEqual([
      ["quest-due", "soon"],
      ["quest-overdue", "late"],
    ]);
    expect(alerts[0].notification.body).toBe("Due in 1 h 30 min, by 1:30pm.");
    expect(DUE_SOON_MS).toBe(2 * 3600e3);
  });

  it("respects the hero's items: an extension moves the deadline, a pause silences the watch", () => {
    const extended = { extendedUntil: { soon: new Date(2026, 9, 10, 18).toISOString() } };
    expect(pickQuestAlerts([row(quest("soon", "13:00"))], extended, NOON, HERO)).toEqual([]);
    const paused = { pause: { from: new Date(2026, 9, 10, 11).toISOString(), until: new Date(2026, 9, 10, 13).toISOString() } };
    expect(pickQuestAlerts([row(quest("soon", "12:30")), row(quest("late", "11:00"), { overdue: true })], paused, NOON, HERO)).toEqual([]);
  });

  it("warns about a weekly quest only on its week's last day (the one due-date rule)", () => {
    // The week runs Monday 5 to Sunday 11 Oct; NOON is Saturday 10, past the 11:00 due time
    const weekly = { ...quest("chores", "11:00"), basicSchedule: "weekly", startsOn: new Date(2026, 9, 5).toISOString() };
    const board = [row(weekly as QuestBoardItem["quest"])];
    expect(pickQuestAlerts(board, undefined, NOON, HERO)).toEqual([]);
    expect(remindersOf(board, undefined, NOON).map((r) => r.deadline)).toEqual([new Date(2026, 9, 11, 11, 0)]);
    const kindsAt = (now: Date) => pickQuestAlerts(board, undefined, now, HERO).map((a) => a.notification.kind);
    expect(kindsAt(new Date(2026, 9, 11, 10, 0))).toEqual(["quest-due"]);
    expect(kindsAt(new Date(2026, 9, 11, 12, 0))).toEqual(["quest-overdue"]);
  });

  it("lists device reminders for the open quests still ahead", () => {
    const reminders = remindersOf([row(quest("soon", "13:30", "Dishes")), row(quest("late", "11:00"), { overdue: true })], undefined, NOON);
    expect(reminders).toEqual([
      { questId: "soon", title: "Dishes", body: "Due by 1:30pm.", deadline: new Date(2026, 9, 10, 13, 30) },
    ]);
  });
});

describe("deviceReminders", () => {
  it("fires a stable id per quest and the lead time before the deadline", () => {
    expect(reminderIdOf("q1")).toBe(reminderIdOf("q1"));
    expect(reminderIdOf("q1")).not.toBe(reminderIdOf("q2"));
    expect(reminderTimeOf(new Date(NOON.getTime() + 3600e3), NOON)).toEqual(new Date(NOON.getTime() + 3600e3 - REMINDER_LEAD_MS));
    expect(reminderTimeOf(new Date(NOON.getTime() + 10 * 60e3), NOON)).toBeNull();
  });

  it("schedules nothing on the web and says why", async () => {
    const reminders = [{ questId: "q1", title: "Dishes", body: "Due by 2:00pm.", deadline: new Date(NOON.getTime() + 2 * 3600e3) }];
    expect(await scheduleDueReminders(reminders, NOON)).toEqual({ scheduled: 0, reason: "web" });
    expect(await scheduleDueReminders([], NOON)).toEqual({ scheduled: 0, reason: "nothing-due" });
    expect(await scheduleDueReminders(reminders, NOON, { isNative: async () => true, plugin: async () => null })).toEqual({
      scheduled: 0,
      reason: "plugin-missing",
    });
  });

  it("schedules through the plugin on a device that has it", async () => {
    const plugin = {
      checkPermissions: jest.fn().mockResolvedValue({ display: "prompt" }),
      requestPermissions: jest.fn().mockResolvedValue({ display: "granted" }),
      schedule: jest.fn().mockResolvedValue(undefined),
    };
    const reminders = [{ questId: "q1", title: "Dishes", body: "Due by 2:00pm.", deadline: new Date(NOON.getTime() + 2 * 3600e3) }];
    expect(await scheduleDueReminders(reminders, NOON, { isNative: async () => true, plugin: async () => plugin })).toEqual({ scheduled: 1 });
    expect(plugin.schedule).toHaveBeenCalledWith({
      notifications: [
        expect.objectContaining({ id: reminderIdOf("q1"), title: "Dishes", schedule: { at: new Date(NOON.getTime() + 1.5 * 3600e3), allowWhileIdle: true } }),
      ],
    });
    plugin.requestPermissions.mockResolvedValue({ display: "denied" });
    expect(await scheduleDueReminders(reminders, NOON, { isNative: async () => true, plugin: async () => plugin })).toEqual({ scheduled: 0, reason: "denied" });
  });

  it("creates the chore channel before booking and takes back reminders for quests no longer ahead", async () => {
    const calls: string[] = [];
    const plugin = {
      checkPermissions: jest.fn().mockResolvedValue({ display: "granted" }),
      createChannel: jest.fn(async ({ id }: any) => void calls.push(`channel:${id}`)),
      getPending: jest.fn().mockResolvedValue({
        notifications: [
          { id: reminderIdOf("gone"), extra: { questId: "gone" } },
          { id: 7001, extra: { kind: "battle-alert" } },
        ],
      }),
      cancel: jest.fn(async () => void calls.push("cancel")),
      schedule: jest.fn(async () => void calls.push("schedule")),
    };
    const reminders = [{ questId: "q1", title: "Dishes", body: "Due by 2:00pm.", deadline: new Date(NOON.getTime() + 2 * 3600e3) }];
    await scheduleDueReminders(reminders, NOON, { isNative: async () => true, plugin: async () => plugin });
    expect(calls).toEqual(["channel:battle-alerts", "channel:chore-reminders", "cancel", "schedule"]);
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: reminderIdOf("gone") }] });
  });

  it("rings once, soon, for a quest already inside its lead time, and never twice", async () => {
    localStorage.clear();
    const plugin = {
      checkPermissions: jest.fn().mockResolvedValue({ display: "granted" }),
      getPending: jest.fn().mockResolvedValue({ notifications: [] }),
      schedule: jest.fn().mockResolvedValue(undefined),
    };
    const deps = { isNative: async () => true, plugin: async () => plugin };
    const reminders = [{ questId: "q1", title: "Dishes", body: "Due by 12:10pm.", deadline: new Date(NOON.getTime() + 10 * 60e3) }];
    expect(await scheduleDueReminders(reminders, NOON, deps)).toEqual({ scheduled: 1 });
    expect(plugin.schedule).toHaveBeenCalledWith({
      notifications: [expect.objectContaining({ schedule: { at: new Date(NOON.getTime() + IMMINENT_DELAY_MS), allowWhileIdle: true } })],
    });
    expect(await scheduleDueReminders(reminders, NOON, deps)).toEqual({ scheduled: 0, reason: "nothing-due" });
    expect(plugin.schedule).toHaveBeenCalledTimes(1);
  });

  it("does not ring again inside the window for a quest whose lead-time reminder was booked", async () => {
    localStorage.clear();
    const plugin = {
      checkPermissions: jest.fn().mockResolvedValue({ display: "granted" }),
      getPending: jest.fn().mockResolvedValue({ notifications: [] }),
      schedule: jest.fn().mockResolvedValue(undefined),
    };
    const deps = { isNative: async () => true, plugin: async () => plugin };
    const deadline = new Date(NOON.getTime() + 2 * 3600e3);
    const reminders = [{ questId: "q1", title: "Dishes", body: "Due.", deadline }];
    await scheduleDueReminders(reminders, NOON, deps);
    const insideWindow = new Date(deadline.getTime() - 10 * 60e3);
    expect(await scheduleDueReminders(reminders, insideWindow, deps)).toEqual({ scheduled: 0, reason: "nothing-due" });
    expect(plugin.schedule).toHaveBeenCalledTimes(1);
  });

  it("takes back booked reminders when nothing is ahead or the hero turned reminders off", async () => {
    localStorage.clear();
    const plugin = {
      checkPermissions: jest.fn().mockResolvedValue({ display: "granted" }),
      getPending: jest.fn().mockResolvedValue({ notifications: [{ id: reminderIdOf("done"), extra: { questId: "done" } }] }),
      cancel: jest.fn().mockResolvedValue(undefined),
      schedule: jest.fn().mockResolvedValue(undefined),
    };
    const deps = { isNative: async () => true, plugin: async () => plugin };
    expect(await scheduleDueReminders([], NOON, deps)).toEqual({ scheduled: 0, reason: "nothing-due" });
    expect(plugin.cancel).toHaveBeenCalledWith({ notifications: [{ id: reminderIdOf("done") }] });

    localStorage.setItem("xp.choreReminders", "off");
    const reminders = [{ questId: "q1", title: "Dishes", body: "Due.", deadline: new Date(NOON.getTime() + 2 * 3600e3) }];
    expect(await scheduleDueReminders(reminders, NOON, deps)).toEqual({ scheduled: 0, reason: "off" });
    expect(plugin.schedule).not.toHaveBeenCalled();
    localStorage.clear();
  });
});

describe("notifications store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    for (const key of Object.keys(stored)) delete stored[key];
    mockDb.getForHero.mockClear();
    mockDb.saveForHero.mockClear();
  });

  it("pushes newest first, dedupes per kind + ref + day, and persists", async () => {
    const store = useNotificationsStore();
    const first = store.push(questDueNotification(HERO, quest("q1", "14:00"), new Date(2026, 9, 10, 14), NOON), NOON);
    expect(first?.id).toBeTruthy();
    expect(store.push(questDueNotification(HERO, quest("q1", "14:00"), new Date(2026, 9, 10, 14), NOON), NOON)).toBeNull();
    const later = new Date(NOON.getTime() + 60e3);
    store.push(levelUpNotification(HERO, 3), later);
    expect(store.forHero(HERO).map((n) => n.kind)).toEqual(["level-up", "quest-due"]);
    expect(store.unreadCount(HERO)).toBe(2);
    expect(store.forHero("hero-2")).toEqual([]);

    await flush();
    expect(mockDb.saveForHero).toHaveBeenCalledTimes(1);
    expect(stored[HERO]).toHaveLength(2);
  });

  it("marks read (one, all), removes and clears", async () => {
    const store = useNotificationsStore();
    const a = store.push({ heroId: HERO, kind: "system", title: "a", body: "" }, NOON)!;
    const b = store.push({ heroId: HERO, kind: "system", title: "b", body: "" }, NOON)!;
    expect(store.markRead(a.id)).toBe(true);
    expect(store.markRead("nope")).toBe(false);
    expect(store.unreadCount(HERO)).toBe(1);
    expect(store.forHero(HERO).find((n) => n.id === a.id)?.readAt).toBeTruthy();
    expect(store.markAllRead(HERO)).toBe(1);
    expect(store.markAllRead(HERO)).toBe(0);
    expect(store.unreadCount(HERO)).toBe(0);
    expect(store.remove(b.id)).toBe(true);
    expect(store.forHero(HERO)).toHaveLength(1);
    expect(store.clear(HERO)).toBe(1);
    expect(store.forHero(HERO)).toEqual([]);
    await flush();
    expect(stored[HERO]).toEqual([]);
  });

  it("reads a hero's feed from disk and keeps what was pushed before the read", async () => {
    const old = makeNotification({ heroId: HERO, kind: "system", title: "old", body: "" }, new Date(2026, 9, 9, 9));
    stored[HERO] = [old];
    const store = useNotificationsStore();
    store.push({ heroId: HERO, kind: "system", title: "fresh", body: "" }, NOON);
    await store.load(HERO);
    expect(store.isLoaded(HERO)).toBe(true);
    expect(store.forHero(HERO).map((n) => n.title)).toEqual(["fresh", "old"]);
    await flush();
    expect(stored[HERO].map((n) => n.title)).toEqual(["fresh", "old"]);
    // a second load is a no-op
    await store.load(HERO);
    expect(mockDb.getForHero).toHaveBeenCalledTimes(1);
  });

  it("keeps at most MAX_NOTIFICATIONS_PER_HERO, dropping the oldest", () => {
    const store = useNotificationsStore();
    for (let i = 0; i < MAX_NOTIFICATIONS_PER_HERO + 5; i++) {
      store.push({ heroId: HERO, kind: "system", title: `n${i}`, body: "" }, new Date(NOON.getTime() + i * 1000));
    }
    const feed = store.forHero(HERO);
    expect(feed).toHaveLength(MAX_NOTIFICATIONS_PER_HERO);
    expect(feed[0].title).toBe(`n${MAX_NOTIFICATIONS_PER_HERO + 4}`);
    expect(feed[feed.length - 1].title).toBe("n5");
  });

  it("notify and bloodMoon push into the active store and never throw", () => {
    const store = useNotificationsStore();
    expect(notify({ heroId: HERO, kind: "system", title: "hi", body: "" })?.kind).toBe("system");
    const night = new Date(2026, 9, 10, 23);
    expect(bloodMoon(HERO, { id: "forest", name: "Forest Temple" }, night)?.kind).toBe("blood-moon");
    // the same night again: one note per temple per night
    expect(bloodMoon(HERO, { id: "forest", name: "Forest Temple" }, night)).toBeNull();
    expect(store.forHero(HERO)).toHaveLength(2);
  });
});
