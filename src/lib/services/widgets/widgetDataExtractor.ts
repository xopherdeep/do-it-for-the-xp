import type { QuestListRow } from "@/lib/services/quests/QuestList";
import type {
  WidgetHeroPayload,
  WidgetQuestRowPayload,
  WidgetSyncPayload
} from "./widgetCatalog";

export const extractWidgetHeroPayload = (
  user: any,
  streakCount: number = 0
): WidgetHeroPayload => {
  const stats = user?.stats || {};
  const name =
    user?.nickname ||
    user?.name?.nick ||
    user?.name?.first ||
    (typeof user?.name === "string" ? user.name : "Hero");

  const level = Number(stats.level ?? user?.level ?? 1);
  const hp = Math.max(0, Number(stats.hp ?? 20));
  const maxHp = Math.max(1, Number(stats.maxHp ?? 20));
  const mp = Math.max(0, Number(stats.mp ?? 10));
  const maxMp = Math.max(1, Number(stats.maxMp ?? 10));
  const xp = Math.max(0, Number(stats.xp ?? 0));
  const nextLevelXp = Math.max(1, Number(stats.nextLevelXp ?? 100));
  const gp = Math.max(0, Number(stats.gp ?? user?.wallet ?? 0));
  const className = String(user?.jobClass || user?.class || "Novice");
  const avatarNumber = Number(user?.avatar ?? 1);

  return {
    name,
    level,
    hp,
    maxHp,
    mp,
    maxMp,
    xp,
    nextLevelXp,
    gp,
    streak: Math.max(0, streakCount),
    className,
    avatarNumber
  };
};

export const extractWidgetQuestPayload = (
  rows: QuestListRow[],
  limit: number = 8
): WidgetQuestRowPayload[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  const activeRows = rows
    .filter((row) => row && row.status !== "done")
    .slice(0, limit);

  return activeRows.map((row) => ({
    id: String(row.id || ""),
    title: String(row.title || "Untitled Quest"),
    dueLabel: String(row.dueLabel || "Today"),
    status: row.status,
    xpReward: Number(row.rewards?.xp ?? 0),
    gpReward: Number(row.rewards?.gp ?? 0),
    requiresPhoto: Boolean(row.requiresPhoto)
  }));
};

export const buildWidgetSyncPayload = (
  user: any,
  questRows: QuestListRow[],
  streakCount: number = 0,
  savingsAmount: number = 0
): WidgetSyncPayload => {
  const hero = extractWidgetHeroPayload(user, streakCount);
  const quests = extractWidgetQuestPayload(questRows);
  const multiplier = streakCount >= 7 ? 1.5 : streakCount >= 3 ? 1.2 : 1.0;

  return {
    hero,
    quests,
    streak: {
      current: streakCount,
      multiplier
    },
    bank: {
      wallet: hero.gp,
      savings: Math.max(0, savingsAmount)
    },
    timestamp: Date.now()
  };
};
