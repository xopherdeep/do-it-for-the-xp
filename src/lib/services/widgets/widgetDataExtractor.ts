import { statsOf } from "@/lib/services/multiplayer/heroSheet";
import { nextChest } from "@/lib/services/streaks/streakChests";
import { questListCounts, type QuestListRow } from "@/lib/services/quests/QuestList";
import {
  WIDGET_PAYLOAD_VERSION,
  type WidgetHeroPayload,
  type WidgetQuestRowPayload,
  type WidgetSyncPayload
} from "./widgetCatalog";

/** How many quest rows a widget list is worth sending: past this nobody scrolls a home screen. */
export const MAX_WIDGET_QUESTS = 8;

/** A widget can only draw a finite number. Anything else becomes the fallback rather than NaN. */
const finite = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nickOf = (user: any): string => {
  const name = user?.name;
  if (typeof name === "string" && name) return name;
  return name?.nick || name?.first || name?.full || "Hero";
};

/**
 * One hero's glanceable state.
 *
 * Stats come from `statsOf` (heroSheet.ts), which is the one place that knows the real
 * nested profile shape: `stats.hp.now`, `stats.xp.next_level`, `stats.gp.wallet`. Reading
 * those flat (`stats.hp`) yields NaN, which serialises to null and leaves every widget
 * showing a hardcoded native default.
 */
export const extractWidgetHeroPayload = (
  user: any,
  rows: QuestListRow[] = [],
  streakCount = 0
): WidgetHeroPayload => {
  const stats = statsOf(user);
  const purse = user?.stats?.gp ?? {};
  const streak = Math.max(0, Math.round(finite(streakCount)));
  const chest = nextChest(streak);

  return {
    id: String(user?.id ?? ""),
    name: nickOf(user),
    level: Math.max(1, stats.level),
    className: String(user?.jobClass || "Novice"),
    avatar: String(user?.avatar || ""),
    hp: Math.max(0, stats.hp),
    maxHp: Math.max(1, stats.maxHp),
    mp: Math.max(0, stats.mp),
    maxMp: Math.max(1, stats.maxMp),
    xp: Math.max(0, stats.xp),
    nextLevelXp: Math.max(1, stats.nextLevelXp),
    gp: Math.max(0, stats.gp),
    savings: Math.max(0, Math.round(finite(purse.savings))),
    ap: Math.max(0, stats.ap),
    streak,
    nextChestDay: chest.day,
    nextChestXp: chest.xp,
    nextChestGp: chest.gp,
    counts: questListCounts(Array.isArray(rows) ? rows : [])
  };
};

/** The rows a hero still has to do, nearest first: `questListFor` has already sorted them. */
export const extractWidgetQuestPayload = (
  rows: QuestListRow[],
  limit: number = MAX_WIDGET_QUESTS
): WidgetQuestRowPayload[] => {
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((row) => row && row.status !== "done")
    .slice(0, limit)
    .map((row) => ({
      id: String(row.id || ""),
      title: String(row.title || "Untitled Quest"),
      dueAt: row.due instanceof Date ? row.due.getTime() : null,
      dueLabel: String(row.dueLabel || "Anytime"),
      status: row.status,
      xpReward: Math.max(0, Math.round(finite(row.rewards?.xp))),
      gpReward: Math.max(0, Math.round(finite(row.rewards?.gp))),
      requiresPhoto: Boolean(row.requiresPhoto),
      requiresApproval: Boolean(row.requiresApproval)
    }));
};

/** One hero's slice of the payload, ready to merge into `heroes` / `questsByHero`. */
export interface WidgetHeroInput {
  user: any;
  rows?: QuestListRow[];
  streak?: number;
}

/**
 * The whole family's widget payload. Every hero the app knows goes in, so a widget bound
 * to a kid who is not signed in still has something true to draw; `primaryHeroId` is the
 * hero a widget falls back to when it has no binding of its own.
 */
export const buildWidgetSyncPayload = (
  primaryHeroId: string,
  heroes: WidgetHeroInput[],
  now: number = Date.now(),
  gameStyle?: string
): WidgetSyncPayload => {
  const payload: WidgetSyncPayload = {
    version: WIDGET_PAYLOAD_VERSION,
    primaryHeroId: String(primaryHeroId ?? ""),
    heroes: {},
    questsByHero: {},
    timestamp: now,
    ...(gameStyle ? { gameStyle } : {})
  };

  for (const entry of heroes) {
    const id = String(entry?.user?.id ?? "");
    if (!id) continue;
    const rows = entry.rows ?? [];
    const streak = entry.streak ?? 0;
    payload.heroes[id] = extractWidgetHeroPayload(entry.user, rows, streak);
    payload.questsByHero[id] = extractWidgetQuestPayload(rows);
  }

  return payload;
};
