/**
 * What the screens read off a finished project, kept out of them: how many days early it was cleared, the trophies
 * (cleared runs, newest first), which of the two finish moments a hero is still owed (the reward reveal, then the
 * credits), the credits roll's view of a run and the trophy sheet's view of a run. Pure: records, quests, log entries
 * and profiles go in; nothing is stored here (projectService.ts reads and writes).
 */
import { differenceInCalendarDays } from "date-fns";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { copyFor } from "@/lib/services/copy/copy";
import { heroCredits, type HeroCredit } from "@/lib/services/copy/credits";
import { FALLBACK_VOICE, type Voice } from "@/lib/services/copy/voices";
import { dateKey, parseLocalDate } from "@/lib/services/core/packs/packCommon";
import { projectTypeOf } from "@/lib/services/core/packs/projects";
import { phaseNameOf } from "./floorClock";
import { hasSeen, newestCleared } from "./projectProgress";
import type { ProjectRecord } from "./projectRecord";

/** The multiplier of a floor that earned no bonus (or of a record from before the multiplier was kept) */
const NO_BONUS = 1;

/** The name over the tower: its type's, or the plain "Project tower" for a type this version no longer has */
export const towerNameOf = (project: ProjectRecord, voice: Voice): string =>
  projectTypeOf(project.typeId)?.towerName ?? copyFor("projectTower.spot.fallbackName", voice);

/** When the project was cleared, or null for a record that kept no clear time or an unreadable one */
const clearedAtOf = (project: ProjectRecord): Date | null => {
  const at = project.clearedAt ? new Date(project.clearedAt) : null;
  const isReadable = at !== null && !Number.isNaN(at.getTime());
  return isReadable ? at : null;
};

/** The local day the project was cleared, "YYYY-MM-DD"; the end day for a record with no readable clear time */
const finishedOnOf = (project: ProjectRecord): string => {
  const at = clearedAtOf(project);
  return at ? dateKey(at) : project.endOn;
};

/**
 * How many days before its end day the project was cleared, counted in the local days the family lived: 0 when it was
 * cleared on the end day or after it (never negative), and 0 for a record with no readable clear time.
 */
export function daysEarly(project: ProjectRecord): number {
  const at = clearedAtOf(project);
  if (!at) return 0;
  return Math.max(0, differenceInCalendarDays(parseLocalDate(project.endOn), at));
}

/** Negative, zero or positive by plain character order (the stamps are ISO text, which sorts as time does) */
const compareText = (a: string, b: string): number => Number(a > b) - Number(a < b);

/** The cleared runs, the one cleared last first (a tie goes to the later id) */
export const trophiesOf = (records: readonly ProjectRecord[]): ProjectRecord[] =>
  records
    .filter((record) => record.status === "cleared")
    .sort((a, b) => compareText(b.clearedAt ?? "", a.clearedAt ?? "") || compareText(b.id, a.id));

/** A reward the family earned that nobody has handed over yet */
export const isRewardToGive = (record: ProjectRecord): boolean => Boolean(record.reward.earnedAt) && !record.reward.givenAt;

/** The cleared run whose reward waits for the Game Master (the newest): what "Mark as given" stamps, and what Approvals shows */
export const rewardToGive = (records: readonly ProjectRecord[]): ProjectRecord | null => newestCleared(records, isRewardToGive);

export type FinishStep = "reward" | "credits";

/**
 * What a hero is still owed from the project's finish: the reward reveal first, then the credits, then nothing. Only a
 * cleared project (the roof beaten) owes anything, and each hero is asked for themselves.
 */
export function finishStepFor(project: ProjectRecord | null, heroId: string): FinishStep | null {
  const isNotOver = project === null || project.status !== "cleared";
  if (isNotOver) return null;
  if (!hasSeen(project, heroId, "reward")) return "reward";
  return hasSeen(project, heroId, "credits") ? null : "credits";
}

/** As much of a profile as the credits read */
interface CreditProfile {
  id: unknown;
  name?: { nick?: string; first?: string; full?: string };
  jobClass?: unknown;
}

/** A hero as the credits name them: the nickname, else the first name, else the full name, and the class they play */
export interface CreditHero {
  id: string;
  name: string;
  className: string;
}

export const creditHeroesOf = (profiles: readonly CreditProfile[]): CreditHero[] =>
  profiles.map((profile) => ({
    id: String(profile.id),
    name: profile.name?.nick || profile.name?.first || profile.name?.full || "Hero",
    className: typeof profile.jobClass === "string" ? profile.jobClass : "",
  }));

// ---- The credits roll ------------------------------------------------------------------------------------------

/** The heroes' part of the roll: the tower, the dates ("YYYY-MM-DD"), the days early and who did what */
export interface CreditsView {
  towerName: string;
  startOn: string;
  finishedOn: string;
  daysEarly: number;
  heroes: HeroCredit[];
}

export const creditsViewOf = (
  project: ProjectRecord,
  quests: readonly Achievement[],
  paid: readonly QuestLogEntry[],
  heroes: readonly CreditHero[],
  voice: Voice = FALLBACK_VOICE
): CreditsView => ({
  towerName: towerNameOf(project, voice),
  startOn: project.startOn,
  finishedOn: finishedOnOf(project),
  daysEarly: daysEarly(project),
  heroes: heroCredits(project, quests, paid, heroes),
});

// ---- The trophy sheet ------------------------------------------------------------------------------------------

/** A floor of a cleared run with the multiplier it earned (x1 when it earned none) */
export interface TrophyFloor {
  floorKey: string;
  name: string;
  multiplier: number;
}

/** One cleared run as the trophy sheet lists it */
export interface TrophyView {
  id: string;
  typeId: string;
  towerName: string;
  startOn: string;
  finishedOn: string;
  daysEarly: number;
  rewardText: string;
  isRewardGiven: boolean;
  floors: TrophyFloor[];
}

export const trophyOf = (project: ProjectRecord, voice: Voice = FALLBACK_VOICE): TrophyView => ({
  id: project.id,
  typeId: project.typeId,
  towerName: towerNameOf(project, voice),
  startOn: project.startOn,
  finishedOn: finishedOnOf(project),
  daysEarly: daysEarly(project),
  rewardText: project.reward.text,
  isRewardGiven: Boolean(project.reward.givenAt),
  floors: project.floors.map((floor) => ({
    floorKey: floor.floorKey,
    name: phaseNameOf(project.typeId, floor, voice),
    multiplier: floor.multiplier ?? NO_BONUS,
  })),
});
