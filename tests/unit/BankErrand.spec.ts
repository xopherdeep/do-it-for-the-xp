import { createPinia, setActivePinia } from "pinia";
import { ATM_NOTES, runBankErrand } from "@/lib/services/gp/bankErrand";
import { isHeroGrounded } from "@/lib/services/hometown/hospitalAdmission";
import { useChatStore } from "@/lib/store/stores/chat";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";
import { addHero, HERO, hero } from "./templeFixtures";

/**
 * Every ATM (the shop's, the hotel lobby's) and the wallet app move money through runBankErrand: the bank's rules,
 * one wallet-history line, and paying the Hospital's bill to 0 lifts the grounding and tells the family.
 */

jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/store/stores/chat", () => {
  const chat = { postSystemLine: jest.fn(async () => ({})) };
  return { __esModule: true, FAMILY_CHAT_ROOM: "family-chat", useChatStore: () => chat };
});
jest.mock("@/lib/store/stores/notifications", () => {
  const notifications = { push: jest.fn() };
  return { __esModule: true, useNotificationsStore: () => notifications };
});
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const postSystemLine = () => useChatStore().postSystemLine as unknown as jest.Mock;
const push = () => useNotificationsStore().push as unknown as jest.Mock;
const purse = () => hero().stats.gp;
const grounded = (gp: Record<string, number>) =>
  addHero({ gp: { wallet: 0, savings: 0, debt: 0, limit: 1000, ...gp } });

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
});

describe("runBankErrand: paying the Hospital's bill", () => {
  it("clears the bill in full, lifts the grounding and tells the family", () => {
    grounded({ wallet: 150, hospitalBill: 60 });
    useUserStore().users.gm = { id: "gm", name: { nick: "Mom", full: "Mom" }, isAdult: true, stats: {} } as never;
    expect(isHeroGrounded(HERO)).toBe(true);

    const errand = runBankErrand(HERO, "payDebt", 60, "adventure", `ATM: ${ATM_NOTES.payDebt}`);

    expect(errand).toMatchObject({ ok: true, clearsBill: true });
    expect(purse()).toMatchObject({ wallet: 90, hospitalBill: 0 });
    expect(isHeroGrounded(HERO)).toBe(false);
    expect(push()).toHaveBeenCalled();
    expect(postSystemLine()).toHaveBeenCalledTimes(1);
  });

  it("pays the bill before plain debt, and keeps the hero grounded while any of it is owed", () => {
    grounded({ wallet: 40, hospitalBill: 60, debt: 30 });

    const errand = runBankErrand(HERO, "payDebt", 40);

    expect(errand).toMatchObject({ ok: true, clearsBill: false });
    expect(purse()).toMatchObject({ wallet: 0, hospitalBill: 20, debt: 30 });
    expect(isHeroGrounded(HERO)).toBe(true);
    expect(postSystemLine()).not.toHaveBeenCalled();
  });

  it("writes one line in the wallet's history with the counter's note", () => {
    grounded({ wallet: 100, hospitalBill: 50 });
    runBankErrand(HERO, "payDebt", 50, "adventure", "ATM: paid debt");

    const ledger = purse().ledger;
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ kind: "payDebt", note: "ATM: paid debt" });
  });
});

describe("runBankErrand: refusals and no-ops", () => {
  it("refuses with the teller's reason when nothing can move, and saves nothing", () => {
    grounded({ wallet: 0, hospitalBill: 60 });

    const errand = runBankErrand(HERO, "payDebt", 60);

    expect(errand).toMatchObject({ ok: false });
    expect(errand?.line).toBeTruthy();
    expect(purse().hospitalBill).toBe(60);
    expect(purse().ledger ?? []).toHaveLength(0);
  });

  it("returns null for no amount or a hero who is not loaded", () => {
    grounded({ wallet: 100 });
    expect(runBankErrand(HERO, "deposit", 0)).toBeNull();
    expect(runBankErrand("nobody", "deposit", 10)).toBeNull();
  });

  it("moves savings by the bank's rules too", () => {
    grounded({ wallet: 100, savings: 0 });
    expect(runBankErrand(HERO, "deposit", 40)).toMatchObject({ ok: true, clearsBill: false });
    expect(purse()).toMatchObject({ wallet: 60, savings: 40 });
  });
});
