import { createPinia, setActivePinia } from "pinia";
import { chatDb } from "@/lib/databases/ChatDb";
import { chatEngine } from "@/lib/engine/core/ChatEngine";
import { FAMILY_CHAT_ROOM, TOWN_CRIER_ID, useChatStore } from "@/lib/store/stores/chat";

// The chat store writes through ChatDb and tells the engine (sound); both are faked.
jest.mock("@/lib/databases/ChatDb", () => ({
  __esModule: true,
  chatDb: {
    saveMessage: jest.fn().mockResolvedValue(undefined),
    getMessagesByRoom: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock("@/lib/engine/core/ChatEngine", () => ({
  __esModule: true,
  chatEngine: { processIncomingMessage: jest.fn() },
}));
// No hero is signed in: the Town Crier must not need one.
jest.mock("@/lib/store/stores/user", () => ({
  __esModule: true,
  useUserStore: () => ({ currentUser: { id: "" }, getUserById: () => undefined }),
}));

describe("chat store: Town Crier system lines", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.clearAllMocks();
    // a fresh array per read, as the real db gives: the store pushes into what it is handed
    (chatDb.getMessagesByRoom as jest.Mock).mockImplementation(async () => []);
  });

  it("posts a system line from the Town Crier with no hero signed in", async () => {
    const store = useChatStore();
    const line = await store.postSystemLine(FAMILY_CHAT_ROOM, "Dad cast Video Games");

    expect(FAMILY_CHAT_ROOM).toBe("family-chat");
    expect(TOWN_CRIER_ID).toBe("town-crier");
    expect(line).toMatchObject({
      roomId: "family-chat",
      senderId: "town-crier",
      senderName: "Town Crier",
      text: "Dad cast Video Games",
      kind: "system",
    });
    expect(line.id).toBeTruthy();
    expect(typeof line.timestamp).toBe("number");

    expect(chatDb.saveMessage).toHaveBeenCalledTimes(1);
    expect(chatDb.saveMessage).toHaveBeenCalledWith(line);
    expect(chatEngine.processIncomingMessage).toHaveBeenCalledWith(line);
    expect(store.getRoomMessages("family-chat")).toEqual([line]);
  });

  it("loads the room's history before the line, so opening the chat later still shows it", async () => {
    const earlier = { id: "m0", roomId: "family-chat", senderId: "kid", senderName: "Kid", text: "hi", timestamp: 1 };
    (chatDb.getMessagesByRoom as jest.Mock).mockResolvedValueOnce([earlier]);
    const store = useChatStore();
    const line = await store.postSystemLine("family-chat", "Dad cast Video Games");

    expect(chatDb.getMessagesByRoom).toHaveBeenCalledWith("family-chat", 50);
    expect(store.getRoomMessages("family-chat")).toEqual([earlier, line]);
  });

  it("appends after the lines already in the room and keeps rooms apart", async () => {
    const store = useChatStore();
    const first = await store.postSystemLine("family-chat", "one");
    const second = await store.postSystemLine("family-chat", "two");
    await store.postSystemLine("other-room", "elsewhere");

    expect(store.getRoomMessages("family-chat")).toEqual([first, second]);
    expect(store.getRoomMessages("other-room")).toHaveLength(1);
    expect(first.id).not.toBe(second.id);
  });
});
