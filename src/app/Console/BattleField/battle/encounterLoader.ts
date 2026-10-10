import AchievementDb, { Achievement, achievementStorage } from "@/lib/databases/AchievementDb";
import templeDb from "@/lib/databases/TempleDb";
import type { QuestRewards } from "@/lib/databases/QuestLogDb";
import { createBestiaryService } from "@/lib/services/battle";
import type { BestiaryService } from "@/lib/services/battle/BestiaryService";
import type { Enemy } from "@/lib/services/battle/BattleService";
import { questRewards } from "@/lib/services/quests/QuestCompletionService";
import debug from "@/lib/utils/debug";
import { WORLD_REGIONS, type BattleContext } from "./battleContext";

/**
 * Everything the battle page needs to start a fight, resolved from a BattleContext.
 * Always yields at least one enemy so the page never renders an empty arena.
 */
export interface Encounter {
  enemies: Enemy[];
  /** Game-Master-authored rewards; null means "use the formula". */
  rewards: QuestRewards | null;
  quest?: Achievement;
  roomKey?: string;
  background?: { bg1?: number; bg2?: number };
  label: string;
}

let achievementDb: AchievementDb | null = null;
const getAchievementDb = () => (achievementDb ??= new AchievementDb(achievementStorage));

const labelFor = (enemies: Enemy[]): string =>
  enemies.length > 1 ? `${enemies.length} enemies` : enemies[0]?.name || "Enemy";

const loadBeasts = async (bestiary: BestiaryService, beastIds: string[]): Promise<Enemy[]> => {
  const loaded = await Promise.all(beastIds.map((id) => bestiary.loadBeastById(id)));
  return loaded.filter((enemy): enemy is Enemy => Boolean(enemy));
};

const fallbackEnemies = async (bestiary: BestiaryService, element?: string): Promise<Enemy[]> => {
  const random = await bestiary.loadRandomBeast(element);
  return [random || bestiary.createSampleEnemy()];
};

/** A quest with no beast attached still deserves a monster: the chore itself. */
const enemyFromQuest = (quest: Achievement): Enemy => ({
  id: `quest-${quest.id}`,
  name: quest.achievementName || "Unnamed Chore",
  type: "beast",
  isBoss: false,
  health: 100,
  maxHealth: 100,
  attack: 10,
  defense: 5,
  speed: 8,
  emoji: "👹",
  tasks: [{ id: `${quest.id}-task`, name: quest.achievementName || "Finish the chore", isCompleted: false }],
});

const loadQuestEncounter = async (ctx: BattleContext, bestiary: BestiaryService): Promise<Encounter> => {
  const quest = ctx.questId ? await getAchievementDb().getTaskById(ctx.questId) : null;
  if (!quest) {
    debug.warn("Encounter: quest not found, falling back to a random beast", ctx.questId);
    const enemies = await fallbackEnemies(bestiary);
    return { enemies, rewards: null, label: labelFor(enemies) };
  }

  const beastEnemy = quest.beastId ? await bestiary.loadBeastById(quest.beastId) : null;
  // A beast with an empty checklist would otherwise be beaten with made-up attacks: the chore itself is the move
  if (beastEnemy && !beastEnemy.tasks?.length) beastEnemy.tasks = enemyFromQuest(quest).tasks;
  const enemies = [beastEnemy || enemyFromQuest(quest)];
  return { enemies, rewards: questRewards(quest), quest, label: labelFor(enemies) };
};

const findRoom = async (ctx: BattleContext) => {
  if (!ctx.templeId || ctx.level === undefined || ctx.x === undefined || ctx.y === undefined) return null;
  const temple = await templeDb.getTempleById(ctx.templeId);
  const maze = temple?.dungeonLayout?.maze || temple?.maze;
  if (!temple || !maze) return null;

  const levelMaze = Array.isArray(maze) ? maze : (maze as Record<string, string[][]>)[ctx.level];
  const roomKey = levelMaze?.[ctx.y]?.[ctx.x];
  if (!roomKey) return null;

  const rooms = temple.dungeonLayout?.rooms || temple.rooms;
  const room = rooms?.[roomKey];
  return room ? { roomKey, room } : null;
};

const loadTempleEncounter = async (ctx: BattleContext, bestiary: BestiaryService): Promise<Encounter> => {
  const found = await findRoom(ctx);
  if (!found) {
    debug.warn("Encounter: temple room not found, falling back to a random beast", ctx);
    const enemies = await fallbackEnemies(bestiary);
    return { enemies, rewards: null, label: labelFor(enemies) };
  }

  const content = found.room.content || {};
  const configured = await loadBeasts(bestiary, content.beasts || []);
  const enemies = configured.length ? configured : await fallbackEnemies(bestiary);
  const hasAuthoredRewards = [content.xp, content.gp, content.ap].some((value) => value !== undefined);

  return {
    enemies,
    rewards: hasAuthoredRewards ? { xp: content.xp || 0, gp: content.gp || 0, ap: content.ap || 0 } : null,
    roomKey: found.roomKey,
    background: { bg1: content.bg1, bg2: content.bg2 },
    label: labelFor(enemies),
  };
};

const loadFreeEncounter = async (ctx: BattleContext, bestiary: BestiaryService): Promise<Encounter> => {
  const configured = await loadBeasts(bestiary, ctx.beastIds);
  const element = ctx.region ? WORLD_REGIONS[ctx.region]?.element : undefined;
  const enemies = configured.length ? configured : await fallbackEnemies(bestiary, element);
  return { enemies, rewards: null, label: labelFor(enemies) };
};

export const loadEncounter = async (
  ctx: BattleContext,
  bestiary: BestiaryService = createBestiaryService()
): Promise<Encounter> => {
  switch (ctx.kind) {
    case "quest":
      return loadQuestEncounter(ctx, bestiary);
    case "temple":
      return loadTempleEncounter(ctx, bestiary);
    default:
      return loadFreeEncounter(ctx, bestiary);
  }
};
