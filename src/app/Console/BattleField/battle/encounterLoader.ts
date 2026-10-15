import AchievementDb, { Achievement, achievementStorage } from "@/lib/databases/AchievementDb";
import templeDb from "@/lib/databases/TempleDb";
import type { QuestRewards } from "@/lib/databases/QuestLogDb";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { readQuestBoard } from "@/lib/engine/core/dungeons/templeSystem/questRooms";
import { createBestiaryService } from "@/lib/services/battle";
import type { BestiaryService } from "@/lib/services/battle/BestiaryService";
import type { CombatTask, Enemy } from "@/lib/services/battle/BattleService";
import { adoptLibraryBeast } from "@/lib/services/bestiary/librarySuggest";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { questRewards } from "@/lib/services/quests/QuestCompletionService";
import { questAttackCooldown } from "@/lib/services/quests/questClock";
import { grudgeFactor, marksFor } from "@/lib/services/battle/questGrudge";
import { useUserStore } from "@/lib/store/stores/user";
import { isBossRoom } from "@/lib/services/temples/authoredDoors";
import {
  isQuestRoom,
  questBeastId,
  questTier,
  roomQuestState,
  tierAttackFactor,
  type QuestTier,
} from "@/lib/services/temples/questRooms";
import { pickRoomBeast, standInMonster, templeElementFor, type StandInMonster } from "@/lib/services/temples/RoomBeast";
import debug from "@/lib/utils/debug";
import { WORLD_REGIONS, type BattleContext } from "./battleContext";
import { THIEF_BEAST_ID, createThiefEnemy } from "@/lib/services/battle/thiefEncounter";

/**
 * Everything the battle page needs to start a fight, resolved from a BattleContext.
 * Always yields at least one enemy so the page never renders an empty arena.
 */
export interface Encounter {
  enemies: Enemy[];
  /** Game-Master-authored rewards; null means "use the formula". */
  rewards: QuestRewards | null;
  /** The quest the fight completes: a board fight's, an ambush's, or the one a temple room holds for the hero */
  quest?: Achievement;
  /** The temple room the fight is in; a quest room's fight carries its quest too */
  roomKey?: string;
  /**
   * The beast's grudge against the hero (docs/Quest-Rooms-Spec.md 5.7): the factor every strike of a quest fight is
   * multiplied by, 1 (no marks) to 1.75 (three). Only fights that carry a quest have one; its marks are on `enemies[0]`.
   */
  grudge?: number;
  background?: { bg1?: number; bg2?: number };
  label: string;
  /** A temple's boss room: the fight plays the boss theme and the boss victory song. */
  boss?: boolean;
  /** Special thief encounter where the beast robs the hero and flees automatically. */
  thief?: boolean;
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

/** A temple room the bestiary has nothing for fights the creature the room screen shows in its place. */
const standInEnemy = ({ name, avatarId }: StandInMonster): Enemy => ({
  id: `stand-in-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`,
  name,
  type: "beast",
  isBoss: false,
  health: 100,
  maxHealth: 100,
  avatar: avatarId,
  emoji: "👹",
  attack: 10,
  defense: 5,
  speed: 8,
  tasks: [],
});

/** The chore itself as the one move: for a quest whose beast has no checklist, or that has no beast. */
const choreAsTasks = (quest: Achievement): CombatTask[] => [
  { id: `${quest.id}-task`, name: quest.achievementName || "Finish the chore", isCompleted: false },
];

/**
 * A library beast the family has not adopted yet fights as itself (the room screen shows it the same way, and the
 * Game Master's quest form adopts it when the quest is saved). Null for an id the library does not know.
 */
const libraryEnemy = (beastId: string): Enemy | null => {
  const entry = BEAST_LIBRARY.find((candidate) => String(candidate.id) === beastId);
  if (!entry) return null;
  const beast = adoptLibraryBeast(entry);
  return {
    id: String(beast.id),
    name: beast.name,
    type: "beast",
    isBoss: false,
    health: 100,
    maxHealth: 100,
    avatar: beast.avatar,
    emoji: "👹",
    attack: 10,
    defense: 5,
    speed: 8,
    bg1: beast.bg1,
    bg2: beast.bg2,
    aspectRatio: beast.aspectRatio,
    tasks: beast.checklist.map((name, index) => ({ id: `task-${index}`, name, isCompleted: false })),
  };
};

/** The quest's beast (questBeastId: its own, else the library's suggestion): the family's, else the library's. */
const loadQuestBeast = async (quest: Achievement, bestiary: BestiaryService): Promise<Enemy | null> => {
  const beastId = questBeastId(quest);
  if (!beastId) return null;
  return (await bestiary.loadBeastById(beastId)) ?? libraryEnemy(beastId);
};

/**
 * A quest's fight, the same from the board, an ambush or a temple room (docs/Quest-Rooms-Spec.md 5.1, 5.5, 7.4):
 * - the quest's beast, or (no beast, or one nobody knows) the stand-in of its tier, which `standIn` names;
 * - the beast's checklist as the attacks, or the quest's name when it has none;
 * - the tier from the difficulty: a miniboss or a boss, hitting TIER_ATTACK_FACTOR harder;
 * - the strike clock: the quest's minutes spread over the checklist (questAttackCooldown);
 * - the grudge: the hero's marks on this quest (5.7). The beast carries them for the stage to show, and `grudge` is the
 *   factor the engine multiplies its strikes by. Each hero's marks are their own.
 */
const questFight = async (
  quest: Achievement,
  heroId: string,
  bestiary: BestiaryService,
  standIn: (tier: QuestTier) => StandInMonster
): Promise<{ enemy: Enemy; tier: QuestTier; grudge: number }> => {
  const tier = questTier(quest.difficulty);
  const beast = (await loadQuestBeast(quest, bestiary)) ?? standInEnemy(standIn(tier));
  const tasks = beast.tasks?.length ? beast.tasks : choreAsTasks(quest);
  const marks = marksFor(useUserStore().users[heroId]?.questGrudges, quest.id);
  const enemy: Enemy = {
    ...beast,
    type: tier === "monster" ? beast.type : tier,
    isBoss: tier === "boss",
    attack: (beast.attack || 10) * tierAttackFactor(tier),
    attackCooldown: questAttackCooldown(quest, tasks.length),
    tasks,
    ...(marks > 0 ? { grudgeMarks: marks } : {}),
  };
  return { enemy, tier, grudge: grudgeFactor(marks) };
};

const loadQuestEncounter = async (ctx: BattleContext, bestiary: BestiaryService): Promise<Encounter> => {
  const quest = ctx.questId ? await getAchievementDb().getTaskById(ctx.questId) : null;
  if (!quest) {
    debug.warn("Encounter: quest not found, falling back to a random beast", ctx.questId);
    const enemies = await fallbackEnemies(bestiary);
    return { enemies, rewards: null, label: labelFor(enemies) };
  }

  // Off the board there is no temple: the stand-in is the tier's, named for no element
  const { enemy, tier, grudge } = await questFight(quest, ctx.userId, bestiary, (standInTier) =>
    standInMonster({ type: standInTier }, "")
  );
  const enemies = [enemy];
  return { enemies, rewards: questRewards(quest), quest, grudge, label: labelFor(enemies), boss: tier === "boss" };
};

const findRoom = async (ctx: BattleContext) => {
  const { templeId, level, x, y } = ctx;
  const isMissingRoomAddress = !templeId || level === undefined || x === undefined || y === undefined;
  if (isMissingRoomAddress) return null;
  const temple = await templeDb.getTempleById(templeId);
  const maze = temple?.dungeonLayout?.maze || temple?.maze;
  const isMazeUnavailable = !temple || !maze;
  if (isMazeUnavailable) return null;

  const levelMaze = Array.isArray(maze) ? maze : (maze as Record<string, string[][]>)[level];
  const roomKey = levelMaze?.[y]?.[x];
  if (!roomKey) return null;

  const rooms = temple.dungeonLayout?.rooms || temple.rooms;
  const room = rooms?.[roomKey];
  return room ? { temple, roomKey, room } : null;
};

/** The beast the room screen shows for a room with no beast of its own, so the fight is the creature the hero saw. */
const roomEnemy = async (
  ctx: BattleContext,
  found: NonNullable<Awaited<ReturnType<typeof findRoom>>>,
  bestiary: BestiaryService
): Promise<Enemy> => {
  const element = templeElementFor(ctx.templeId!, found.temple.element);
  const picked = pickRoomBeast(found.room, element, ctx.y!, ctx.x!, await bestiary.listBeasts());
  const loaded = picked ? await bestiary.loadBeastById(String(picked.id)) : null;
  return loaded || standInEnemy(standInMonster(found.room, element));
};

/**
 * The quest a temple room holds for the hero (docs/Quest-Rooms-Spec.md 5.2), read from their board as the temple run
 * reads it. Null leaves the room to today's fight: a classic room, a dormant one (no family quest fills its template),
 * an empty lair, someone else's quest, or a board that cannot be read.
 */
const roomQuestFor = async (room: Room, heroId: string): Promise<Achievement | null> => {
  if (!isQuestRoom(room)) return null;
  const now = new Date();
  const read = await readQuestBoard(heroId, now);
  if (!read) return null;
  try {
    const state = roomQuestState(room, heroId, read.board, now, { effects: read.effects, liveQuests: read.liveQuests });
    return state.resolution.kind === "quest" ? state.resolution.quest : null;
  } catch (error) {
    // The family's quests are their own data: one the rules cannot read leaves the room to the classic fight
    debug.warn("Encounter: the room's quest could not be read; it fights as a classic room", error);
    return null;
  }
};

const loadTempleEncounter = async (ctx: BattleContext, bestiary: BestiaryService): Promise<Encounter> => {
  const found = await findRoom(ctx);
  if (!found) {
    debug.warn("Encounter: temple room not found, falling back to a random beast", ctx);
    const enemies = await fallbackEnemies(bestiary);
    return { enemies, rewards: null, label: labelFor(enemies) };
  }

  const content = found.room.content || {};
  const background = { bg1: content.bg1, bg2: content.bg2 };

  // A quest room fights its quest: the room's own xp/gp/ap give way to the quest's rewards
  const quest = await roomQuestFor(found.room, ctx.userId);
  if (quest) {
    const element = templeElementFor(ctx.templeId!, found.temple.element);
    // A stand-in keeps the room's own name and the temple's element; its size is the quest's tier
    const { enemy, tier, grudge } = await questFight(quest, ctx.userId, bestiary, (standInTier) =>
      standInMonster({ ...found.room, type: standInTier }, element)
    );
    const enemies = [enemy];
    return {
      enemies,
      rewards: questRewards(quest),
      quest,
      grudge,
      roomKey: found.roomKey,
      background,
      label: labelFor(enemies),
      boss: tier === "boss" || isBossRoom(found.room),
    };
  }

  const configured = await loadBeasts(bestiary, content.beasts || []);
  const enemies = configured.length ? configured : [await roomEnemy(ctx, found, bestiary)];
  const hasAuthoredRewards = [content.xp, content.gp, content.ap].some((value) => value !== undefined);

  return {
    enemies,
    rewards: hasAuthoredRewards ? { xp: content.xp || 0, gp: content.gp || 0, ap: content.ap || 0 } : null,
    roomKey: found.roomKey,
    background,
    label: labelFor(enemies),
    boss: isBossRoom(found.room) || content.difficulty === "boss",
  };
};

const loadFreeEncounter = async (ctx: BattleContext, bestiary: BestiaryService): Promise<Encounter> => {
  const isThief = ctx.encounter === "thief" || ctx.beastIds.includes(THIEF_BEAST_ID);
  if (isThief) {
    const thiefEnemy = createThiefEnemy();
    return {
      enemies: [thiefEnemy],
      rewards: null,
      label: thiefEnemy.name,
      thief: true,
      background: { bg1: thiefEnemy.bg1, bg2: thiefEnemy.bg2 },
    };
  }

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
