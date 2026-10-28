/**
 * A project chore the Game Master deletes from the quest list may have been the last open chore of its floor: the floor
 * then reads cleared and the next one must wake, so the project is asked to settle what is ready, without anyone waiting on
 * it (a plain chore asks nothing, and nothing is asked when the delete failed).
 */
import { createPinia, setActivePinia } from "pinia";
import { deleteQuest } from "@/lib/services/compendium/deleteContent";

const mockCalls: string[] = [];
let mockDeleteFails = false;

jest.mock("@/lib/services/projects/settleInBackground", () => ({
  __esModule: true,
  settleInBackground: () => {
    mockCalls.push("settle");
    return Promise.resolve();
  },
}));

jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  achievementStorage: {},
  default: class {
    getTasks = async () => [];
    setTask = async () => undefined;
    deleteTask = async (task: { id: string }) => {
      if (mockDeleteFails) throw new Error("storage is full");
      mockCalls.push(`deleted ${task.id}`);
      return [];
    };
  },
}));

jest.mock("@/lib/databases/BestiaryDb", () => ({
  __esModule: true,
  beastStorage: {},
  default: class {
    getBeasts = async () => [];
    setBeast = async () => undefined;
  },
}));

jest.mock("@/lib/databases/TempleDb", () => ({
  __esModule: true,
  templeStorage: {},
  default: { getAll: async () => [], setTemple: async () => undefined, remove: async () => undefined },
}));

beforeEach(() => {
  setActivePinia(createPinia());
  mockCalls.length = 0;
  mockDeleteFails = false;
});

describe("deleteQuest and the tower", () => {
  it("asks the running project to settle what is ready once a project chore is gone", async () => {
    await deleteQuest({ id: "pq-spring-cleaning-2027-04-03-declutter:sort:kitchen" });

    expect(mockCalls).toEqual(["deleted pq-spring-cleaning-2027-04-03-declutter:sort:kitchen", "settle"]);
  });

  it("asks nothing for a chore that is not a project's", async () => {
    await deleteQuest({ id: "move-sort-closet" });

    expect(mockCalls).toEqual(["deleted move-sort-closet"]);
  });

  it("asks nothing when the chore could not be deleted", async () => {
    mockDeleteFails = true;

    await expect(deleteQuest({ id: "pq-spring-cleaning-2027-04-03-declutter:sort:kitchen" })).rejects.toThrow("storage is full");

    expect(mockCalls).toEqual([]);
  });
});
