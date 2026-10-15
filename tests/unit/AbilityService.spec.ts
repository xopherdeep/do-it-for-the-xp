import { createPinia, setActivePinia } from "pinia";
import { AbilityService } from "@/lib/services/abilities/AbilityService";
import { AbilityType, TimePeriod, type Ability } from "@/hooks/abilities/abilityConstants";
import { addHero, HERO, mp } from "./templeFixtures";
import { getCastLogDb } from "@/lib/databases/CastLogDb";
import { useChatStore } from "@/lib/store/stores/chat";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { showAlert } from "@/lib/services/notifications/alertBridge";
import { useUserStore } from "@/lib/store/stores/user";

// The user store is real; only what it writes to disk is faked.
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
jest.mock("@/lib/databases/AbilitiesDb", () => ({ __esModule: true, default: class {}, AbilitiesDb: class {} }));

// The ledger's four outlets are doubles: the spec checks what a cast hands to each.
jest.mock("@/lib/databases/CastLogDb", () => {
  const logCast = jest.fn(async (input: Record<string, unknown>) => ({
    id: "cast-1",
    castAt: "2026-10-11T16:12:00.000Z",
    ...input,
  }));
  return { __esModule: true, getCastLogDb: () => ({ logCast }) };
});
jest.mock("@/lib/store/stores/chat", () => {
  const chat = { postSystemLine: jest.fn(async () => ({})) };
  return { __esModule: true, FAMILY_CHAT_ROOM: "family-chat", useChatStore: () => chat };
});
jest.mock("@/lib/store/stores/notifications", () => {
  const notifications = { push: jest.fn() };
  return { __esModule: true, useNotificationsStore: () => notifications };
});
jest.mock("@/lib/services/notifications/alertBridge", () => ({
  __esModule: true,
  showAlert: jest.fn(async () => ({ shown: false })),
  POWER_CAST_ALERT_ID: 7002,
}));

const ability = (id: string, mpCost: number): Ability => ({
  id,
  name: id,
  description: "",
  type: AbilityType.InGame,
  frequency: TimePeriod.Daily,
  mpCost,
  apRequirement: { amount: 0, period: TimePeriod.Flat },
  icon: "",
  prerequisites: [],
  isPreset: false,
  position: { x: 0, y: 0 },
});

/** An in-memory abilities table standing in for AbilitiesDb. */
const table = new Map<string, Ability>();
const fakeDb = {
  setAbility: jest.fn(async (a: Ability) => { table.set(a.id, a); }),
  getAbilityById: jest.fn(async (id: string) => table.get(id) ?? null),
  getAbilities: jest.fn(async () => Array.from(table.values())),
  deleteAbility: jest.fn(async () => Array.from(table.values())),
};

const service = AbilityService.initialize(fakeDb as never);

beforeEach(() => {
  setActivePinia(createPinia());
  table.clear();
  table.set("blink", ability("blink", 8));
  table.set("gaze", ability("gaze", 0));
  fakeDb.setAbility.mockClear();
  jest.clearAllMocks();
});

const logCast = () => getCastLogDb().logCast as unknown as jest.Mock;
const postSystemLine = () => useChatStore().postSystemLine as unknown as jest.Mock;
const push = () => useNotificationsStore().push as unknown as jest.Mock;
const alert = showAlert as unknown as jest.Mock;

/** A second profile in the user store; `isAdult` makes it a Game Master. */
const addProfile = (id: string, isAdult: boolean): void => {
  useUserStore().users[id] = { id, name: { nick: id, full: id }, isAdult, stats: {} } as never;
};

describe("AbilityService.useAbility", () => {
  it("charges the ability's MP cost and stamps lastUsed", async () => {
    addHero({ mp: { now: 10, max: 40 } });

    await expect(service.useAbility("blink", HERO)).resolves.toMatchObject({ ok: true });

    expect(mp()).toBe(2);
    expect(table.get("blink")?.lastUsed).toBeTruthy();
    expect(fakeDb.setAbility).toHaveBeenCalledTimes(1);
  });

  it("refuses with reason mp, charging nothing, when the hero has less MP than it costs", async () => {
    addHero({ mp: { now: 7, max: 40 } });

    await expect(service.useAbility("blink", HERO)).resolves.toEqual({ ok: false, reason: "mp" });

    expect(mp()).toBe(7);
    expect(table.get("blink")?.lastUsed).toBeUndefined();
    expect(fakeDb.setAbility).not.toHaveBeenCalled();
  });

  it("casts a free ability at exactly 0 MP without touching the pool", async () => {
    addHero({ mp: { now: 0, max: 40 } });

    await expect(service.useAbility("gaze", HERO)).resolves.toMatchObject({ ok: true });
    expect(mp()).toBe(0);
  });

  it("refuses an unknown ability or hero", async () => {
    addHero();
    await expect(service.useAbility("nope", HERO)).resolves.toEqual({ ok: false, reason: "unknown" });
    await expect(service.useAbility("blink", "ghost")).resolves.toEqual({ ok: false, reason: "unknown" });
    expect(fakeDb.setAbility).not.toHaveBeenCalled();
  });
});

describe("AbilityService.useAbility, grounded (docs/Quest-Rooms-Spec.md 5.8)", () => {
  const groundHero = (hospitalBill: number) => {
    addHero({ mp: { now: 40, max: 40 }, gp: { wallet: 0, savings: 0, debt: 0, hospitalBill, limit: 1000 } });
  };

  it("refuses with reason grounded while a hospital bill is owed, charging and logging nothing", async () => {
    groundHero(60);

    await expect(service.useAbility("blink", HERO)).resolves.toEqual({ ok: false, reason: "grounded" });

    expect(mp()).toBe(40);
    expect(table.get("blink")?.lastUsed).toBeUndefined();
    expect(fakeDb.setAbility).not.toHaveBeenCalled();
    expect(logCast()).not.toHaveBeenCalled();
    expect(postSystemLine()).not.toHaveBeenCalled();
    expect(push()).not.toHaveBeenCalled();
  });

  it("checks the grounding before the MP: a grounded hero who is also out of MP is told they are grounded", async () => {
    addHero({ mp: { now: 1, max: 40 }, gp: { wallet: 0, savings: 0, debt: 0, hospitalBill: 100, limit: 1000 } });
    await expect(service.useAbility("blink", HERO)).resolves.toEqual({ ok: false, reason: "grounded" });
  });

  it("lifts the moment the bill reaches 0", async () => {
    groundHero(60);
    await expect(service.useAbility("blink", HERO)).resolves.toMatchObject({ ok: false, reason: "grounded" });

    useUserStore().users[HERO].stats.gp.hospitalBill = 0;

    await expect(service.useAbility("blink", HERO)).resolves.toMatchObject({ ok: true });
    expect(mp()).toBe(32);
  });

  it("is not grounded by plain debt", async () => {
    addHero({ mp: { now: 40, max: 40 }, gp: { wallet: 0, savings: 0, debt: 500, hospitalBill: 0, limit: 1000 } });
    await expect(service.useAbility("blink", HERO)).resolves.toMatchObject({ ok: true });
  });
});

describe("AbilityService.useAbility, the ledger", () => {
  it("logs one Cast Log entry with the MP the hero paid and returns it", async () => {
    addHero({ mp: { now: 10, max: 40 } });

    const result = await service.useAbility("blink", HERO);

    expect(logCast()).toHaveBeenCalledTimes(1);
    expect(logCast()).toHaveBeenCalledWith({
      userId: HERO,
      abilityId: "blink",
      abilityName: "blink",
      abilityType: AbilityType.InGame,
      mpPaid: 8,
    });
    expect(result).toMatchObject({ ok: true, entry: { id: "cast-1", mpPaid: 8 } });
  });

  it("posts one Town Crier line naming the hero, the Power, its MP cost and the time", async () => {
    addHero({ mp: { now: 10, max: 40 } });

    await service.useAbility("blink", HERO);

    expect(postSystemLine()).toHaveBeenCalledTimes(1);
    const [room, line] = postSystemLine().mock.calls[0];
    expect(room).toBe("family-chat");
    expect(line).toContain("Hero");
    expect(line).toContain("cast blink");
    expect(line).toContain("8 MP");
  });

  it("leaves the MP out of the Town Crier line when the Power is free", async () => {
    addHero({ mp: { now: 0, max: 40 } });

    await service.useAbility("gaze", HERO);

    expect(postSystemLine().mock.calls[0][1]).not.toContain("MP");
  });

  it("notifies every Game Master but the caster, once each, with the cast id as the reference", async () => {
    addHero({ mp: { now: 10, max: 40 } });
    useUserStore().users[HERO].isAdult = true; // a parent casting does not notify themselves
    addProfile("gm-1", true);
    addProfile("gm-2", true);
    addProfile("kid-2", false);

    await service.useAbility("blink", HERO);

    expect(push()).toHaveBeenCalledTimes(2);
    expect(push().mock.calls.map(([n]) => n.heroId).sort()).toEqual(["gm-1", "gm-2"]);
    expect(push()).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "power-cast", refId: "cast-1", title: "blink cast", link: "/game-master/chat" })
    );
  });

  it("rings one OS alert", async () => {
    addHero({ mp: { now: 10, max: 40 } });

    await service.useAbility("blink", HERO);

    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith(expect.objectContaining({ id: 7002, title: "blink cast" }));
  });

  it("stays cast when the chat, the notifications or the alert fail", async () => {
    addHero({ mp: { now: 10, max: 40 } });
    addProfile("gm-1", true);
    postSystemLine().mockRejectedValueOnce(new Error("chat down"));
    push().mockImplementationOnce(() => {
      throw new Error("feed down");
    });
    alert.mockRejectedValueOnce(new Error("no alerts"));

    await expect(service.useAbility("blink", HERO)).resolves.toMatchObject({ ok: true, entry: { id: "cast-1" } });
    expect(mp()).toBe(2);
  });

  it("logs, posts and pushes nothing when the hero cannot afford the cast", async () => {
    addHero({ mp: { now: 7, max: 40 } });
    addProfile("gm-1", true);

    await expect(service.useAbility("blink", HERO)).resolves.toEqual({ ok: false, reason: "mp" });

    expect(logCast()).not.toHaveBeenCalled();
    expect(postSystemLine()).not.toHaveBeenCalled();
    expect(push()).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  it("logs nothing for an unknown ability or hero", async () => {
    addHero();

    await service.useAbility("nope", HERO);
    await service.useAbility("blink", "ghost");

    expect(logCast()).not.toHaveBeenCalled();
    expect(postSystemLine()).not.toHaveBeenCalled();
    expect(push()).not.toHaveBeenCalled();
  });
});
