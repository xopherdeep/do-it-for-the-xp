import {
  battleReturnRoute,
  freeBattleRoute,
  questBattleRoute,
  resolveBattleContext,
  templeBattleRoute,
} from "@/app/Console/BattleField/battle/battleContext";
import { formulaRewards, resolveRewards, sumRewards } from "@/app/Console/BattleField/battle/battleRewards";
import type { Enemy } from "@/lib/services/battle/BattleService";

const route = (overrides: Record<string, unknown>) =>
  ({ name: "battle-free", params: {}, query: {}, meta: {}, ...overrides }) as any;

const enemy = (overrides: Partial<Enemy> = {}): Enemy => ({
  id: "b1",
  name: "Socktopus",
  type: "beast",
  isBoss: false,
  health: 100,
  maxHealth: 100,
  attack: 10,
  defense: 5,
  speed: 8,
  ...overrides,
});

describe("battleContext", () => {
  it("reads a quest battle from the route and returns to the Quest Log", () => {
    const ctx = resolveBattleContext(
      route({ name: "battle-quest", meta: { battleKind: "quest" }, params: { userId: "hero-1", questId: "q-9" } })
    );
    expect(ctx).toMatchObject({ kind: "quest", userId: "hero-1", questId: "q-9", beastIds: [] });
    expect(battleReturnRoute(ctx)).toEqual({ name: "my-tasks", params: { userId: "hero-1" } });
  });

  it("a quest ambush that sprang on a region page returns to that page, not the Quest Log", () => {
    const link = questBattleRoute("hero-1", "q-9", "ice");
    expect(link).toEqual({ name: "battle-quest", params: { userId: "hero-1", questId: "q-9" }, query: { region: "ice" } });
    const ctx = resolveBattleContext(route({ name: "battle-quest", params: { userId: "hero-1", questId: "q-9" }, query: { region: "ice" } }));
    expect(ctx).toMatchObject({ kind: "quest", questId: "q-9", region: "ice" });
    expect(battleReturnRoute(ctx)).toEqual({ name: "world-ice", params: { userId: "hero-1" } });
  });

  it("a quest battle with an unknown region still goes back to the Quest Log", () => {
    const ctx = resolveBattleContext(route({ name: "battle-quest", params: { userId: "hero-1", questId: "q-9" }, query: { region: "atlantis" } }));
    expect(battleReturnRoute(ctx)).toEqual({ name: "my-tasks", params: { userId: "hero-1" } });
  });

  it("reads a temple battle with numeric coordinates and returns to the same room", () => {
    const ctx = resolveBattleContext(
      route({
        name: "battle-temple",
        params: { userId: "hero-1", templeId: "wind-temple", level: "1F", x: "2", y: "5" },
      })
    );
    expect(ctx).toMatchObject({ kind: "temple", templeId: "wind-temple", level: "1F", x: 2, y: 5 });
    expect(battleReturnRoute(ctx)).toEqual({
      name: "temple",
      params: { temple: "wind-temple", userId: "hero-1", x: "2", y: "5" },
      query: { level: "1F" },
    });
  });

  it("carries the floor back to the temple so a fight on 2F does not resume on 1F", () => {
    const ctx = resolveBattleContext(
      route({
        name: "battle-temple",
        params: { userId: "hero-1", templeId: "wind-temple", level: "2F", x: "0", y: "1" },
      })
    );
    expect(battleReturnRoute(ctx)).toEqual({
      name: "temple",
      params: { temple: "wind-temple", userId: "hero-1", x: "0", y: "1" },
      query: { level: "2F" },
    });
  });

  it("collects beast ids from params and query, falls back to the current hero, and returns home", () => {
    const ctx = resolveBattleContext(
      route({ name: "battle-free", params: { beastIds: "a,b" }, query: { beastIds: "b,c" } }),
      "hero-2"
    );
    expect(ctx).toMatchObject({ kind: "free", userId: "hero-2", beastIds: ["a", "b", "c"] });
    expect(battleReturnRoute(ctx)).toEqual({ name: "home-town", params: { userId: "hero-2" } });
  });

  it("returns a region encounter to its region page", () => {
    const ctx = resolveBattleContext(route({ params: { userId: "h" }, query: { region: "desert" } }));
    expect(ctx.region).toBe("desert");
    expect(battleReturnRoute(ctx)).toEqual({ name: "world-sands", params: { userId: "h" } });
    expect(freeBattleRoute("h", [], "desert")).toEqual({
      name: "battle-free",
      params: { userId: "h" },
      query: { region: "desert" },
    });
  });

  it("builds links that match the route table", () => {
    expect(questBattleRoute("h", "q")).toEqual({ name: "battle-quest", params: { userId: "h", questId: "q" } });
    expect(questBattleRoute("h", "q", "")).toEqual({ name: "battle-quest", params: { userId: "h", questId: "q" } });
    expect(templeBattleRoute("h", "t", "1F", 3, 4)).toEqual({
      name: "battle-temple",
      params: { userId: "h", templeId: "t", level: "1F", x: "3", y: "4" },
    });
    expect(freeBattleRoute("h")).toEqual({ name: "battle-free", params: { userId: "h" } });
    expect(freeBattleRoute("h", ["a", "b"])).toEqual({ name: "battle-free", params: { userId: "h", beastIds: "a,b" } });
  });
});

describe("battleRewards", () => {
  it("scales the formula by beast rank", () => {
    expect(formulaRewards(enemy())).toEqual({ xp: 50, gp: 25, ap: 1 });
    expect(formulaRewards(enemy({ type: "miniboss" }))).toEqual({ xp: 63, gp: 31, ap: 2 });
    expect(formulaRewards(enemy({ isBoss: true, maxHealth: 200 }))).toEqual({ xp: 150, gp: 75, ap: 3 });
  });

  it("prefers Game-Master-authored rewards and otherwise sums every defeated beast", () => {
    const authored = { xp: 200, gp: 20, ap: 2 };
    expect(resolveRewards({ enemies: [], rewards: authored, label: "x" }, [enemy()])).toEqual(authored);
    // A temple room without authored rewards sums the formula; a free fight pays AP only
    expect(resolveRewards({ enemies: [], rewards: null, label: "x" }, [enemy(), enemy()], "temple")).toEqual({
      xp: 100,
      gp: 50,
      ap: 2,
    });
    expect(resolveRewards({ enemies: [], rewards: null, label: "x" }, [enemy(), enemy()], "free")).toEqual({
      xp: 0,
      gp: 0,
      ap: 2,
    });
    expect(sumRewards([])).toEqual({ xp: 0, gp: 0, ap: 0 });
  });
});
