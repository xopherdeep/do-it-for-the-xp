/**
 * Asking the running project to settle what is ready from a screen that changes the board without paying a chore (a chore
 * deleted from the quest list, a hero's quest board opening): it settles only while a project runs and never fails (the
 * callers do not wait on it: `void settleInBackground()`).
 */
import { settleInBackground } from "@/lib/services/projects/settleInBackground";

jest.mock("@/lib/databases/ProjectDb", () => ({ __esModule: true, getProjectDb: jest.fn() }));
jest.mock("@/lib/utils/debug", () => ({ __esModule: true, default: { warn: jest.fn(), log: jest.fn(), error: jest.fn() } }));

const asks = (isRunning: boolean) => ({ isRunning: jest.fn(async () => isRunning), settle: jest.fn(async () => null) });

describe("settleInBackground", () => {
  it("asks the project to settle what is ready while one is running", async () => {
    const live = asks(true);

    await settleInBackground(live);

    expect(live.settle).toHaveBeenCalledTimes(1);
  });

  it("asks nothing of the tower builder when no project is running", async () => {
    const live = asks(false);

    await settleInBackground(live);

    expect(live.settle).not.toHaveBeenCalled();
  });

  it("never fails: a settling that throws, or a project that cannot be read, is said and left", async () => {
    const broken = { isRunning: jest.fn(async () => true), settle: jest.fn(async () => Promise.reject(new Error("storage is full"))) };
    const unreadable = { isRunning: jest.fn(async () => Promise.reject(new Error("no storage"))), settle: jest.fn(async () => null) };

    await expect(settleInBackground(broken)).resolves.toBeUndefined();
    await expect(settleInBackground(unreadable)).resolves.toBeUndefined();
    expect(unreadable.settle).not.toHaveBeenCalled();
  });
});
