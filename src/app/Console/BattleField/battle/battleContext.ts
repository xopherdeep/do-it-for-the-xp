import type { RouteLocationNormalizedLoaded, RouteLocationRaw } from "vue-router";

/**
 * Where a battle came from and how to get back.
 *
 * Every battle route carries the hero (`:userId`) so rewards, the HUD and the
 * return trip never depend on "whoever is current". Three kinds exist:
 *   quest  -> /battle/:userId/quest/:questId                 (from the Quest Log)
 *   temple -> /battle/:userId/temple/:templeId/:level/:x/:y  (from a temple room)
 *   free   -> /battle/:userId/free/:beastIds?                (room-editor test fights, random encounters)
 */
export type BattleKind = "quest" | "temple" | "free";

export interface BattleContext {
  kind: BattleKind;
  userId: string;
  questId?: string;
  templeId?: string;
  level?: string;
  /** Column in the temple maze */
  x?: number;
  /** Row in the temple maze */
  y?: number;
  beastIds: string[];
}

export const BATTLE_ROUTE_NAMES = {
  quest: "battle-quest",
  temple: "battle-temple",
  free: "battle-free",
} as const;

const KIND_BY_ROUTE_NAME: Record<string, BattleKind> = {
  [BATTLE_ROUTE_NAMES.quest]: "quest",
  [BATTLE_ROUTE_NAMES.temple]: "temple",
  [BATTLE_ROUTE_NAMES.free]: "free",
};

const firstParam = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : undefined;
  return value === undefined || value === null || value === "" ? undefined : String(value);
};

const splitIds = (value: unknown): string[] =>
  (firstParam(value) || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

const toCoordinate = (value: unknown): number | undefined => {
  const raw = firstParam(value);
  if (raw === undefined) return undefined;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const resolveBattleContext = (
  route: RouteLocationNormalizedLoaded,
  fallbackUserId?: string | null
): BattleContext => {
  const kind = (route.meta?.battleKind as BattleKind) || KIND_BY_ROUTE_NAME[String(route.name)] || "free";
  const beastIds = [...splitIds(route.params.beastIds), ...splitIds(route.query.beastIds)];

  return {
    kind,
    userId: firstParam(route.params.userId) || fallbackUserId || "",
    questId: firstParam(route.params.questId),
    templeId: firstParam(route.params.templeId),
    level: firstParam(route.params.level),
    x: toCoordinate(route.params.x),
    y: toCoordinate(route.params.y),
    beastIds: Array.from(new Set(beastIds)),
  };
};

/** The screen a battle returns to after victory, escape or recovery. */
export const battleReturnRoute = (ctx: BattleContext): RouteLocationRaw => {
  switch (ctx.kind) {
    case "quest":
      return { name: "my-tasks", params: { userId: ctx.userId } };
    case "temple":
      return {
        name: "temple",
        params: {
          temple: ctx.templeId || "",
          userId: ctx.userId,
          x: String(ctx.x ?? 0),
          y: String(ctx.y ?? 0),
        },
        // The temple route has no :level segment, so the floor rides along as ?level=2F.
        // Without it a reload on the battle page would put the hero back on 1F.
        ...(ctx.level ? { query: { level: ctx.level } } : {}),
      };
    default:
      return { name: "home-town", params: { userId: ctx.userId } };
  }
};

// Navigator helpers: the only way other screens should build a battle link.
export const questBattleRoute = (userId: string, questId: string): RouteLocationRaw => ({
  name: BATTLE_ROUTE_NAMES.quest,
  params: { userId, questId },
});

export const templeBattleRoute = (
  userId: string,
  templeId: string,
  level: string,
  x: number,
  y: number
): RouteLocationRaw => ({
  name: BATTLE_ROUTE_NAMES.temple,
  params: { userId, templeId, level, x: String(x), y: String(y) },
});

export const freeBattleRoute = (userId: string, beastIds: string[] = []): RouteLocationRaw => ({
  name: BATTLE_ROUTE_NAMES.free,
  params: beastIds.length ? { userId, beastIds: beastIds.join(",") } : { userId },
});
