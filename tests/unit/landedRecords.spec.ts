/**
 * Records another device wrote land in the raw stores during a download (Family Sync); the copies held in memory are read
 * again so they never show, nor save back, a stale copy: a hero's notification feed, the chat rooms and the family's game
 * rules. The databases are
 * faked; the stores and the signal are the real ones.
 */
import { createPinia, setActivePinia } from "pinia";
import { chatDb } from "@/lib/databases/ChatDb";
import { makeNotification, type XpNotification } from "@/lib/services/notifications/Notifications";
import { emitRecordsLanded } from "@/lib/services/sync/recordSignals";
import { useChatStore } from "@/lib/store/stores/chat";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useNotificationsStore } from "@/lib/store/stores/notifications";

const mockFeeds: Record<string, XpNotification[]> = {};
const mockDb = {
  getForHero: jest.fn(async (heroId: string) => JSON.parse(JSON.stringify(mockFeeds[heroId] ?? []))),
  saveForHero: jest.fn(async (heroId: string, list: XpNotification[]) => {
    mockFeeds[heroId] = JSON.parse(JSON.stringify(list));
  }),
};
jest.mock("@/lib/databases/NotificationsDb", () => ({ __esModule: true, getNotificationsDb: () => mockDb }));
jest.mock("@/lib/databases/ChatDb", () => ({
  __esModule: true,
  chatDb: { saveMessage: jest.fn().mockResolvedValue(undefined), getMessagesByRoom: jest.fn() },
}));
const mockLoadSettings = jest.fn();
jest.mock("@/lib/services/family/familySettings", () => {
  const actual = jest.requireActual("@/lib/services/family/familySettings");
  return { __esModule: true, ...actual, loadFamilySettings: () => mockLoadSettings() };
});
jest.mock("@/lib/engine/core/ChatEngine", () => ({ __esModule: true, chatEngine: { processIncomingMessage: jest.fn() } }));
jest.mock("@/lib/store/stores/user", () => ({
  __esModule: true,
  useUserStore: () => ({ currentUser: { id: "" }, getUserById: () => undefined }),
}));

const settle = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
};

const notice = (id: string, at: string): XpNotification =>
  makeNotification({ id, heroId: "h-1", kind: "level-up", title: id, body: "", createdAt: at } as never);

describe("records that land from the family", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.clearAllMocks();
    Object.keys(mockFeeds).forEach((heroId) => delete mockFeeds[heroId]);
  });

  it("a hero's feed that landed is read again, and the next save writes the landed feed, never the stale one", async () => {
    const old = notice("n-old", "2026-10-22T08:00:00.000Z");
    mockFeeds["h-1"] = [old];
    const store = useNotificationsStore();
    await store.load("h-1");
    expect(store.forHero("h-1").map((entry) => entry.id)).toEqual(["n-old"]);

    // the phone holding the hero wrote its feed; the download landed it in the raw store
    const fromPhone = notice("n-phone", "2026-10-22T09:00:00.000Z");
    mockFeeds["h-1"] = [fromPhone, old];
    emitRecordsLanded({ store: "__notifications", keys: ["h-1"] });
    await settle();

    expect(store.forHero("h-1").map((entry) => entry.id)).toEqual(["n-phone", "n-old"]);
    expect(mockDb.saveForHero).not.toHaveBeenCalled();
    store.markRead("n-old");
    await settle();
    expect(mockFeeds["h-1"].map((entry) => entry.id)).toEqual(["n-phone", "n-old"]);
  });

  it("a feed nobody read yet is left to its first read; a landing in another store changes no feed", async () => {
    const store = useNotificationsStore();
    emitRecordsLanded({ store: "__notifications", keys: ["h-2"] });
    emitRecordsLanded({ store: "__beasts", keys: ["h-1"] });
    await settle();
    expect(mockDb.getForHero).not.toHaveBeenCalled();
    expect(store.isLoaded("h-2")).toBe(false);
  });

  it("the open chat rooms are read again when chat lands, so a kid phone's post shows on the family device", async () => {
    const getMessages = chatDb.getMessagesByRoom as jest.Mock;
    const hello = { id: "m1", roomId: "family-chat", senderId: "dad", senderName: "Dad", text: "hi", timestamp: 1 };
    const fromPhone = { id: "m2", roomId: "family-chat", senderId: "h-1", senderName: "Mia", text: "done!", timestamp: 2 };
    getMessages.mockResolvedValueOnce([hello]);
    const store = useChatStore();
    await store.initRoom("family-chat");

    getMessages.mockResolvedValueOnce([hello, fromPhone]);
    emitRecordsLanded({ store: "__chat", keys: ["m2"] });
    await settle();

    expect(store.getRoomMessages("family-chat").map((message: { id: string }) => message.id)).toEqual(["m1", "m2"]);
    expect(getMessages).toHaveBeenLastCalledWith("family-chat", 50);
  });

  it("the family's game rules are read again when the family settings land", async () => {
    const { DEFAULT_FAMILY_SETTINGS } = jest.requireActual("@/lib/services/family/familySettings");
    mockLoadSettings.mockResolvedValue({ ...DEFAULT_FAMILY_SETTINGS, streaks: true });
    const rules = useGameRulesStore();
    await rules.load();
    expect(rules.streaks).toBe(true);

    mockLoadSettings.mockResolvedValue({ ...DEFAULT_FAMILY_SETTINGS, streaks: false });
    emitRecordsLanded({ store: "__family_settings", keys: ["settings"] });
    await settle();
    expect(rules.streaks).toBe(false);
  });
});
