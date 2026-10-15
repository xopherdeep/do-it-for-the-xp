import { emitHeroRemoved, emitQuestPaid, onHeroRemoved, onQuestPaid, type QuestPaid } from "@/lib/services/multiplayer/gameSignals";
import debug from "@/lib/utils/debug";
import ProfileDb from "@/lib/databases/ProfileDb";

jest.mock("@/lib/utils/debug", () => ({ __esModule: true, default: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveProfiles: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/databases/DbStorageApi", () => {
  class MockDbStorageApi {
    constructor(public storage: unknown) {}
    remove = jest.fn().mockResolvedValue(undefined);
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, DbStorageApi: MockDbStorageApi, default: MockDbStorageApi };
});

const paid: QuestPaid = { heroId: "h-1", questId: "q1", xp: 30, fight: false };

describe("quest paid", () => {
  it("a listener hears each emit and stops after its unsubscribe", () => {
    const heard = jest.fn();
    const stop = onQuestPaid(heard);
    emitQuestPaid(paid);
    emitQuestPaid({ ...paid, questId: "q2" });
    expect(heard).toHaveBeenCalledTimes(2);
    expect(heard).toHaveBeenLastCalledWith({ ...paid, questId: "q2" });
    stop();
    emitQuestPaid(paid);
    expect(heard).toHaveBeenCalledTimes(2);
  });

  it("a throwing listener does not stop the next one, and is logged", () => {
    const next = jest.fn();
    const stopBad = onQuestPaid(() => {
      throw new Error("boom");
    });
    const stopNext = onQuestPaid(next);
    expect(() => emitQuestPaid(paid)).not.toThrow();
    expect(next).toHaveBeenCalledWith(paid);
    expect(debug.error).toHaveBeenCalled();
    stopBad();
    stopNext();
  });

  it("a listener that unsubscribes while hearing does not skip the next one", () => {
    const next = jest.fn();
    const stopFirst = onQuestPaid(() => stopFirst());
    const stopNext = onQuestPaid(next);
    emitQuestPaid(paid);
    expect(next).toHaveBeenCalledTimes(1);
    stopNext();
  });

  it("with no listener an emit does nothing", () => expect(() => emitQuestPaid(paid)).not.toThrow());
});

describe("hero removed", () => {
  it("a listener hears the hero id and stops after its unsubscribe", () => {
    const heard = jest.fn();
    const stop = onHeroRemoved(heard);
    emitHeroRemoved("h-1");
    expect(heard).toHaveBeenCalledWith("h-1");
    stop();
    emitHeroRemoved("h-2");
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("a throwing listener does not stop the next one", () => {
    const next = jest.fn();
    const stopBad = onHeroRemoved(() => {
      throw new Error("boom");
    });
    const stopNext = onHeroRemoved(next);
    emitHeroRemoved("h-1");
    expect(next).toHaveBeenCalledWith("h-1");
    stopBad();
    stopNext();
  });

  it("ProfileDb.removeProfile emits the hero id once the profile is gone", async () => {
    const db = new ProfileDb({} as never);
    const heard = jest.fn();
    const stop = onHeroRemoved(heard);
    await db.removeProfile("h-1");
    expect(db.remove).toHaveBeenCalledWith("h-1");
    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith("h-1");
    stop();
  });

  it("ProfileDb.removeProfile emits only after the removal", async () => {
    const db = new ProfileDb({} as never);
    const order: string[] = [];
    (db.remove as jest.Mock).mockImplementation(async () => {
      order.push("removed");
    });
    const stop = onHeroRemoved(() => order.push("heard"));
    await db.removeProfile("h-1");
    expect(order).toEqual(["removed", "heard"]);
    stop();
  });
});
