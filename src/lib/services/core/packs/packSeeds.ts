/**
 * Short-hand for authoring content packs: a quest, a house rule or a reward is written as a one-line seed and
 * turned into the full record the Compendium stores. The starter world (Family pack) and every other built-in
 * pack are written this way, so they price and schedule things the same.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { DosDont } from "@/lib/databases/DosDontsDb";
import type { TimeOfDay } from "@/lib/engine/quests/QuestSchedule";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";

/** A fixed day in the past, so every repeating quest is already running */
export const PACK_STARTED_ON = "2026-01-01T00:00:00.000Z";

export interface QuestSeed {
  id: string;
  name: string;
  categoryId: string;
  beastId?: string;
  schedule: "daily" | "weekly";
  difficulty: 1 | 2 | 3;
  requiresApproval?: boolean;
  /** Ask for a photo when claimed; forces approval on (no pack in the catalogue sets it yet) */
  requiresPhoto?: boolean;
  /**
   * The parts of the day the chore belongs to. Two or more make one daily quest done that many times
   * (brushing teeth morning and night); none leaves it untimed, shown only under the calendar's All tab.
   */
  timesOfDay?: TimeOfDay[];
}

/** Rewards grow with difficulty: a daily tidy pays a little, a weekly haul pays a lot (GP = 15 x difficulty, AP = difficulty) */
export const SEED_REWARDS: Record<QuestSeed["difficulty"], { xp: number; gp: number; ap: number }> = {
  1: { xp: 60, gp: 15, ap: 1 },
  2: { xp: 120, gp: 30, ap: 2 },
  3: { xp: 220, gp: 45, ap: 3 },
};

export const questFromSeed = (seed: QuestSeed): Achievement => ({
  id: seed.id,
  achievementName: seed.name,
  categoryId: seed.categoryId,
  beastId: seed.beastId ?? "",
  subAchievementIds: [],
  requiresApproval: Boolean(seed.requiresApproval) || Boolean(seed.requiresPhoto),
  ...(seed.requiresPhoto ? { requiresPhoto: true } : {}),
  bonusAchievement: false,
  // An open bounty: any player the game already has can claim it, so a pack needs no profiles
  type: "asNeeded",
  assignee: [],
  startsOn: PACK_STARTED_ON,
  endsOn: "",
  dueByTime: "",
  ...(seed.timesOfDay?.length ? { timesOfDay: [...seed.timesOfDay] } : {}),
  basicSchedule: seed.schedule,
  scheduleType: "basic",
  showDailyUntilComplete: seed.schedule === "daily",
  customFrequency: 1,
  customPeriodType: "day",
  customPeriodNumber: 1,
  repeatOnDays: [],
  difficulty: seed.difficulty,
  ...SEED_REWARDS[seed.difficulty],
  adventureType: seed.beastId ? "beast" : "simple",
});

export interface DoDontSeed {
  id: string;
  type: DosDont["type"];
  whatFor: string;
  /** The Add Do form's Fibonacci effort scale (1, 2, 3, 5, 8, 13) */
  difficulty: 1 | 2 | 3 | 5;
  notes?: string;
}

/** GP per point of effort, as the Add Do form prices it (a do pays it, a don't takes it away): the chore rate, 15 GP per point */
export const DO_DONT_GP_PER_EFFORT = 15;

export const doDontFromSeed = (seed: DoDontSeed): DosDont => ({
  id: seed.id,
  type: seed.type,
  whatFor: seed.whatFor,
  difficulty: seed.difficulty,
  // GP only, the Add Do form's default: a do rewards gold, a don't costs it
  awardPoints: { xp: false, gp: true, ap: false },
  points: {
    xp: 0,
    gp: seed.difficulty * DO_DONT_GP_PER_EFFORT * (seed.type === "do" ? 1 : -1),
    ap: 0,
  },
  notes: seed.notes ?? "",
  createdAt: Date.parse(PACK_STARTED_ON),
  updatedAt: Date.parse(PACK_STARTED_ON),
});

/** A beast as the bestiary stores it: art, element and checklist, without the library's chore, room and age */
export const plainBeast = ({ id, name, element, avatar, bg1, bg2, aspectRatio, checklist }: Beast): Beast => ({
  id, name, ...(element ? { element } : {}), avatar, bg1, bg2, aspectRatio, checklist: [...checklist],
});

/** Library beasts by id, so a pack carries every beast its quests fight (an unknown id is a mistake and throws) */
export const libraryBeasts = (ids: readonly string[]): Beast[] =>
  ids.map((id) => {
    const beast = BEAST_LIBRARY.find((entry) => entry.id === id);
    if (!beast) throw new Error(`No library beast "${id}"`);
    return plainBeast(beast);
  });

/** The beasts a list of quests fights, from the library, each once */
export const beastsForQuests = (quests: readonly Achievement[]): Beast[] =>
  libraryBeasts(Array.from(new Set(quests.map((quest) => String(quest.beastId ?? "")).filter(Boolean))));
