import { createPinia, setActivePinia } from "pinia";
import {
  admitToHospital,
  announceBillPaid,
  forgiveBill,
  hospitalRoute,
  isHeroGrounded,
  takeAdmissionReceipt,
} from "@/lib/services/hometown/hospitalAdmission";
import { HOSPITAL_BILL } from "@/lib/services/hometown/hospitalBill";
import { useChatStore } from "@/lib/store/stores/chat";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";
import { addHero, HERO, hero, hp, mp, wallet } from "./templeFixtures";

/**
 * The Hospital admits a hero at 0 HP (docs/Quest-Rooms-Spec.md 5.8): full HP and MP, the flat bill out of the wallet
 * then savings, the rest owed (and the hero grounded), one notice each for the hero and the Game Masters, one chat line.
 * The user store is real; only what it writes to disk and the chat and notification outlets are faked.
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

/** A second profile in the user store; `isAdult` makes it a Game Master. */
const addProfile = (id: string, isAdult: boolean, nick = id): void => {
  useUserStore().users[id] = { id, name: { nick, full: nick }, isAdult, stats: {} } as never;
};

/** A hero knocked out to 0 HP with the given purse, as a lost fight leaves them. */
const knockedOut = (gp: Record<string, number>, extra: Record<string, unknown> = {}) =>
  addHero({ hp: { now: 0, max: 50 }, mp: { now: 3, max: 40 }, gp: { wallet: 0, savings: 0, debt: 0, limit: 1000, ...gp }, ...extra });

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
  takeAdmissionReceipt(HERO);
});

describe("admitToHospital: the treatment", () => {
  it("sets HP and MP to full, as the paid revive does", () => {
    knockedOut({ wallet: 300 });
    const admission = admitToHospital(HERO, "battle")!;

    expect(hp()).toBe(50);
    expect(mp()).toBe(40);
    expect(admission).toMatchObject({ userId: HERO, cause: "battle", hpGain: 50, mpGain: 37 });
  });

  it("leaves a hero with nothing to treat at full (a trap that left HP above 0 is not admitted by the caller)", () => {
    addHero({ hp: { now: 50, max: 50 }, mp: { now: 40, max: 40 } });
    expect(admitToHospital(HERO, "trap")).toMatchObject({ hpGain: 0, mpGain: 0 });
    expect(hp()).toBe(50);
  });

  it("returns null for a hero who is not loaded, and charges nothing", () => {
    expect(admitToHospital("nobody", "battle")).toBeNull();
    expect(push()).not.toHaveBeenCalled();
  });
});

describe("admitToHospital: the bill", () => {
  it("takes the flat bill from the wallet when it covers it: not grounded", () => {
    knockedOut({ wallet: 300 });
    const admission = admitToHospital(HERO)!;

    expect(wallet()).toBe(300 - HOSPITAL_BILL);
    expect(purse().hospitalBill).toBe(0);
    expect(admission.charge).toMatchObject({ bill: 100, fromWallet: 100, owed: 0 });
    expect(isHeroGrounded(HERO)).toBe(false);
  });

  it("takes the wallet first, owes the rest and grounds the hero (₲40 of ₲100)", () => {
    knockedOut({ wallet: 40 });
    const admission = admitToHospital(HERO)!;

    expect(wallet()).toBe(0);
    expect(purse().hospitalBill).toBe(60);
    expect(admission.charge).toMatchObject({ fromWallet: 40, fromSavings: 0, owed: 60, totalOwed: 60 });
    expect(isHeroGrounded(HERO)).toBe(true);
  });

  it("dips into savings before it owes anything", () => {
    knockedOut({ wallet: 40, savings: 25 });
    admitToHospital(HERO);

    expect(wallet()).toBe(0);
    expect(purse().savings).toBe(0);
    expect(purse().hospitalBill).toBe(35);
  });

  it("keeps plain debt apart from the bill", () => {
    knockedOut({ wallet: 0, debt: 70 });
    admitToHospital(HERO);

    expect(purse().debt).toBe(70);
    expect(purse().hospitalBill).toBe(100);
  });

  it("stacks: a second admission adds another 100", () => {
    knockedOut({ wallet: 40 });
    admitToHospital(HERO);
    useUserStore().updateUserHP({ userId: HERO, amount: -1000 });
    expect(hp()).toBe(0);
    const second = admitToHospital(HERO)!;

    expect(purse().hospitalBill).toBe(160);
    expect(second.charge).toMatchObject({ owed: 100, totalOwed: 160 });
    expect(hp()).toBe(50);
  });

  it("is flat at every level", () => {
    knockedOut({ wallet: 0 }, { level: 1 });
    admitToHospital(HERO);
    const atLevelOne = purse().hospitalBill;

    knockedOut({ wallet: 0 }, { level: 40 });
    admitToHospital(HERO);
    expect(atLevelOne).toBe(100);
    expect(purse().hospitalBill).toBe(100);
  });

  it("works for an old profile with no purse at all", () => {
    addHero({ hp: { now: 0, max: 50 }, gp: undefined });
    admitToHospital(HERO);
    expect(purse().hospitalBill).toBe(100);
  });
});

describe("admitToHospital: the family hears of it, once", () => {
  it("notifies the hero and each other Game Master once, and posts one chat line", async () => {
    addProfile("dad", true, "Dad");
    addProfile("mom", true, "Mom");
    addProfile("kid2", false, "Sib");
    knockedOut({ wallet: 40 });

    admitToHospital(HERO);
    await Promise.resolve();

    const calls = push().mock.calls.map(([note]) => note);
    expect(calls.filter((note) => note.heroId === HERO)).toHaveLength(1);
    expect(calls.filter((note) => note.heroId === "dad")).toHaveLength(1);
    expect(calls.filter((note) => note.heroId === "mom")).toHaveLength(1);
    expect(calls.some((note) => note.heroId === "kid2")).toBe(false);
    expect(calls.every((note) => note.kind === "hospital")).toBe(true);
    expect(calls.find((note) => note.heroId === HERO)).toMatchObject({ title: "Carried to the Hospital", link: `/bank/${HERO}/` });
    expect(calls.find((note) => note.heroId === "dad")).toMatchObject({
      title: "Hero was carried to the Hospital",
      link: "/game-master/chat",
    });

    expect(postSystemLine()).toHaveBeenCalledTimes(1);
    expect(postSystemLine()).toHaveBeenCalledWith("family-chat", "Hero was carried to the Hospital. Bill ₲100 (₲60 owed).");
  });

  it("does not tell a parent twice when the hero is a Game Master too", async () => {
    knockedOut({ wallet: 40 });
    useUserStore().users[HERO].isAdult = true;

    admitToHospital(HERO);
    await Promise.resolve();

    expect(push().mock.calls.filter(([note]) => note.heroId === HERO)).toHaveLength(1);
  });

  it("gives each admission its own notice, so two in one day are not folded into one", () => {
    knockedOut({ wallet: 0 });
    admitToHospital(HERO, "battle", new Date("2026-10-12T10:00:00Z"));
    admitToHospital(HERO, "battle", new Date("2026-10-12T11:00:00Z"));

    const refIds = push().mock.calls.map(([note]) => note.refId);
    expect(new Set(refIds).size).toBe(2);
  });

  it("never lets a failing chat or notification reach the caller", async () => {
    postSystemLine().mockRejectedValueOnce(new Error("chat down"));
    push().mockImplementationOnce(() => {
      throw new Error("notifications down");
    });
    knockedOut({ wallet: 300 });

    expect(() => admitToHospital(HERO)).not.toThrow();
    await Promise.resolve();
    expect(hp()).toBe(50);
  });
});

describe("the way to the Hospital", () => {
  it("is the Hospital screen with the cue that makes the nurse read the bill", () => {
    expect(hospitalRoute(HERO)).toEqual({ name: "hospital", params: { userId: HERO }, query: { admitted: "1" } });
  });
});

describe("the nurse's receipt", () => {
  it("is read once, then gone", () => {
    knockedOut({ wallet: 40 });
    admitToHospital(HERO);

    expect(takeAdmissionReceipt(HERO)).toMatchObject({ charge: { owed: 60 } });
    expect(takeAdmissionReceipt(HERO)).toBeNull();
  });
});

describe("paying off and forgiveness", () => {
  it("tells the Game Masters (and the family chat) once the bill is paid", async () => {
    addProfile("dad", true, "Dad");
    addHero();
    announceBillPaid(HERO);
    await Promise.resolve();

    expect(push()).toHaveBeenCalledTimes(1);
    expect(push().mock.calls[0][0]).toMatchObject({ heroId: "dad", kind: "hospital", title: "Hero paid the hospital bill" });
    expect(postSystemLine()).toHaveBeenCalledWith("family-chat", "Hero paid the hospital bill. No longer grounded.");
  });

  it("lets a Game Master forgive the bill: grounding lifts, the hero is told, the chat logs who", async () => {
    addProfile("dad", true, "Dad");
    knockedOut({ wallet: 40 });
    admitToHospital(HERO);
    jest.clearAllMocks();
    expect(isHeroGrounded(HERO)).toBe(true);

    const forgiven = forgiveBill(HERO, "dad");
    await Promise.resolve();

    expect(forgiven).toBe(60);
    expect(purse().hospitalBill).toBe(0);
    expect(isHeroGrounded(HERO)).toBe(false);
    expect(push()).toHaveBeenCalledWith(expect.objectContaining({ heroId: HERO, kind: "hospital", title: "Hospital bill forgiven" }));
    expect(postSystemLine()).toHaveBeenCalledWith("family-chat", "Dad forgave Hero's hospital bill (₲60).");
  });

  it("forgives nothing, and says nothing, for a hero who owes nothing", async () => {
    addProfile("dad", true, "Dad");
    addHero();
    expect(forgiveBill(HERO, "dad")).toBe(0);
    await Promise.resolve();
    expect(push()).not.toHaveBeenCalled();
    expect(postSystemLine()).not.toHaveBeenCalled();
  });
});
