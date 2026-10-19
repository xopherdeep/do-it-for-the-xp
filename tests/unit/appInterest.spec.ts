import { payBankInterest, startAppInterest, type InterestStore } from "@/lib/services/gp/appInterest";
import { runAppWake } from "@/lib/services/notifications/appWake";

jest.mock("@/lib/databases/FamilySettingsDb", () => ({
  __esModule: true,
  getFamilySettingsDb: () => ({ getSettings: async () => null, saveSettings: async () => undefined }),
}));

// 2026-10-18 is a Sunday: with Monday weeks it is in the week of 2026-10-12, and the next Monday starts 2026-10-19
const thisWeek = new Date(2026, 9, 18, 12);
const nextWeek = new Date(2026, 9, 19, 9);

const on = { savingsInterest: { enabled: true, weeklyRatePercent: 2 }, weekStartsOn: 1 };
const off = { savingsInterest: { enabled: false, weeklyRatePercent: 2 }, weekStartsOn: 1 };

/** A roster and a store that moves savings the way updateUserGP does */
const makeStore = (users: Record<string, any>) => {
  const updateUserGP = jest.fn(async (payload: { userId: string; savings?: number }) => {
    const purse = users[payload.userId].stats.gp;
    purse.savings = (purse.savings || 0) + (payload.savings ?? 0);
  });
  const persistUser = jest.fn();
  const store: InterestStore = { users, updateUserGP, persistUser };
  return { store, updateUserGP, persistUser };
};

const hero = (savings: number, extra: Record<string, unknown> = {}) => ({ stats: { gp: { wallet: 5, savings, ...extra } } });

describe("Paying the bank interest", () => {
  it("pays nothing and marks nothing while the Game Master has it off", async () => {
    const users = { ava: hero(500) };
    const { store, updateUserGP, persistUser } = makeStore(users);
    const paid = await payBankInterest(store, off, thisWeek);
    expect(paid).toEqual([]);
    expect(updateUserGP).not.toHaveBeenCalled();
    expect(persistUser).not.toHaveBeenCalled();
    expect((users.ava.stats.gp as any).interestWeek).toBeUndefined();
  });

  it("pays each hero floor(savings x rate) into savings with the ledger note", async () => {
    const users = { ava: hero(150), ben: hero(1000) };
    const { store, updateUserGP } = makeStore(users);
    const paid = await payBankInterest(store, on, thisWeek);
    expect(paid).toEqual([
      { userId: "ava", gp: 3 },
      { userId: "ben", gp: 20 },
    ]);
    expect(updateUserGP).toHaveBeenCalledWith({ userId: "ava", savings: 3, kind: "earn", note: "Bank interest: +3 GP" });
    expect(updateUserGP).toHaveBeenCalledWith({ userId: "ben", savings: 20, kind: "earn", note: "Bank interest: +20 GP" });
    expect(users.ava.stats.gp.savings).toBe(153);
    expect(users.ava.stats.gp.wallet).toBe(5);
  });

  it("remembers the week on the hero's purse", async () => {
    const users = { ava: hero(150) };
    const { store } = makeStore(users);
    await payBankInterest(store, on, thisWeek);
    expect((users.ava.stats.gp as any).interestWeek).toBe("2026-10-12");
  });

  it("never pays the same week twice", async () => {
    const users = { ava: hero(150) };
    const { store, updateUserGP } = makeStore(users);
    await payBankInterest(store, on, thisWeek);
    await payBankInterest(store, on, new Date(2026, 9, 14, 8));
    await payBankInterest(store, on, new Date(2026, 9, 18, 23, 59));
    expect(updateUserGP).toHaveBeenCalledTimes(1);
  });

  it("pays once even when two wakes ring at the same moment", async () => {
    const users = { ava: hero(150) };
    const { store, updateUserGP } = makeStore(users);
    await Promise.all([payBankInterest(store, on, thisWeek), payBankInterest(store, on, thisWeek)]);
    expect(updateUserGP).toHaveBeenCalledTimes(1);
  });

  it("pays again on the new week, on the grown balance", async () => {
    const users = { ava: hero(150) };
    const { store, updateUserGP } = makeStore(users);
    await payBankInterest(store, on, thisWeek);
    const paid = await payBankInterest(store, on, nextWeek);
    expect(updateUserGP).toHaveBeenCalledTimes(2);
    expect(paid).toEqual([{ userId: "ava", gp: 3 }]);
    expect(users.ava.stats.gp.savings).toBe(156);
    expect((users.ava.stats.gp as any).interestWeek).toBe("2026-10-19");
  });

  it("follows the family's first day of the week", async () => {
    const users = { ava: hero(150) };
    const { store, updateUserGP } = makeStore(users);
    const sundays = { ...on, weekStartsOn: 0 };
    await payBankInterest(store, sundays, thisWeek);
    await payBankInterest(store, sundays, nextWeek);
    expect(updateUserGP).toHaveBeenCalledTimes(1);
    expect((users.ava.stats.gp as any).interestWeek).toBe("2026-10-18");
  });

  it("spends the week with no payment when the balance is too small to earn a GP", async () => {
    const users = { ava: hero(10) };
    const { store, updateUserGP, persistUser } = makeStore(users);
    const paid = await payBankInterest(store, on, thisWeek);
    expect(paid).toEqual([]);
    expect(updateUserGP).not.toHaveBeenCalled();
    expect(persistUser).toHaveBeenCalledWith("ava");
    expect((users.ava.stats.gp as any).interestWeek).toBe("2026-10-12");
  });

  it("leaves a hero with no purse alone", async () => {
    const users = { ava: { stats: {} }, ben: {}, cy: hero(150) };
    const { store, updateUserGP } = makeStore(users);
    const paid = await payBankInterest(store, on, thisWeek);
    expect(paid).toEqual([{ userId: "cy", gp: 3 }]);
    expect(updateUserGP).toHaveBeenCalledTimes(1);
  });

  it("keeps paying the others when one payout fails", async () => {
    const users = { ava: hero(150), ben: hero(200) };
    const { store, updateUserGP } = makeStore(users);
    updateUserGP.mockRejectedValueOnce(new Error("disk full"));
    const paid = await payBankInterest(store, on, thisWeek);
    expect(paid).toEqual([{ userId: "ben", gp: 4 }]);
  });

  it("gives the week back to a hero whose payout failed, so the next wake tries again", async () => {
    const users = { ava: hero(150) };
    const { store, updateUserGP } = makeStore(users);
    updateUserGP.mockRejectedValueOnce(new Error("disk full"));
    await payBankInterest(store, on, thisWeek);
    expect((users.ava.stats.gp as any).interestWeek).toBeUndefined();
    const paid = await payBankInterest(store, on, thisWeek);
    expect(paid).toEqual([{ userId: "ava", gp: 3 }]);
    expect((users.ava.stats.gp as any).interestWeek).toBe("2026-10-12");
  });
});

describe("The bank interest on the app wake", () => {
  it("pays when the app starts and again on a later resume in a new week", async () => {
    const users = { ava: hero(150) };
    const { store, updateUserGP } = makeStore(users);
    const stop = startAppInterest(store, { loadSettings: async () => on });
    await runAppWake("start", thisWeek);
    expect(updateUserGP).toHaveBeenCalledTimes(1);
    await runAppWake("resume", thisWeek);
    expect(updateUserGP).toHaveBeenCalledTimes(1);
    await runAppWake("resume", nextWeek);
    expect(updateUserGP).toHaveBeenCalledTimes(2);
    stop();
  });

  it("stops listening when asked", async () => {
    const { store } = makeStore({ ava: hero(150) });
    const loadSettings = jest.fn(async () => off);
    const stop = startAppInterest(store, { loadSettings });
    await new Promise((resolve) => setTimeout(resolve, 0));
    loadSettings.mockClear();
    stop();
    await runAppWake("resume", thisWeek);
    expect(loadSettings).not.toHaveBeenCalled();
  });

  it("catches up on a start that already rang", async () => {
    await runAppWake("start", thisWeek);
    const users = { ava: hero(150) };
    const { store, updateUserGP } = makeStore(users);
    const stop = startAppInterest(store, { loadSettings: async () => ({ ...on }) });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(updateUserGP).toHaveBeenCalledTimes(1);
    stop();
  });

  it("does not stop the wake when the settings cannot be read", async () => {
    const users = { ava: hero(150) };
    const { store, updateUserGP } = makeStore(users);
    const stop = startAppInterest(store, {
      loadSettings: async () => {
        throw new Error("no storage");
      },
    });
    await expect(runAppWake("resume", thisWeek)).resolves.toBeUndefined();
    expect(updateUserGP).not.toHaveBeenCalled();
    stop();
  });
});
