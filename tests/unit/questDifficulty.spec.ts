import { difficultyOfQuest } from "@/lib/services/quests/questDifficulty";
import debug from "@/lib/utils/debug";

const mockGet = jest.fn();
jest.mock("@/lib/databases/AchievementDb", () => ({
  __esModule: true,
  achievementStorage: {},
  AchievementDb: class {
    get = (...args: unknown[]) => mockGet(...args);
  },
}));
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

beforeEach(() => {
  mockGet.mockReset();
  (debug.warn as jest.Mock).mockClear();
});

describe("difficultyOfQuest", () => {
  it("reads the Fibonacci size a quest was posted with", async () => {
    mockGet.mockResolvedValue({ id: "q1", difficulty: 5 });
    await expect(difficultyOfQuest("q1")).resolves.toBe(5);
    expect(mockGet).toHaveBeenCalledWith("q1");
  });

  it("reads a size saved as text", async () => {
    mockGet.mockResolvedValue({ id: "q1", difficulty: "8" });
    await expect(difficultyOfQuest("q1")).resolves.toBe(8);
  });

  it("gives 0 for a quest that is gone or has no usable size", async () => {
    mockGet.mockResolvedValueOnce(null);
    await expect(difficultyOfQuest("gone")).resolves.toBe(0);
    for (const difficulty of [undefined, 0, -2, "abc", null]) {
      mockGet.mockResolvedValueOnce({ id: "q2", difficulty });
      await expect(difficultyOfQuest("q2")).resolves.toBe(0);
    }
  });

  it("gives 0 and logs when the board cannot be read", async () => {
    mockGet.mockRejectedValue(new Error("storage is gone"));
    await expect(difficultyOfQuest("q1")).resolves.toBe(0);
    expect(debug.warn).toHaveBeenCalled();
  });
});
