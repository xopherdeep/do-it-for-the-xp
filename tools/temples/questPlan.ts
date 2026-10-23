/**
 * The quest plan words of the temple tools: how a chore's schedule is spelled in a plan (section 11 of
 * docs/Quest-Rooms-Spec.md) and the quest template a plan entry stands for. `classic/dress.ts` deals these out to the
 * rooms of a converted dungeon (the generator's shipped temples, which shared them, all follow a classic dungeon now).
 */
import type { RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";

/**
 * When a chore is due, in the words of the plan (section 11):
 * - daily: due 19:00, "am" 08:00, "bed" 20:30; "am+night" is done in the morning and at night, due 20:30
 * - weekly: due 18:00 on the window's last day; "school" is weekly on mon to fri; "school bed" is due 20:30
 * - monthly: custom, one month, due 18:00 on the last day of it
 */
export type Schedule = "daily" | "daily am" | "daily bed" | "daily am+night" | "weekly" | "school" | "school bed" | "monthly";

/** One quest of a temple: the library beast's slug, the Fibonacci difficulty, and when it is due */
export type PlanQuest = [slug: string, difficulty: number, schedule: Schedule];

const SCHOOL_DAYS = ["mon", "tue", "wed", "thu", "fri"];

export type ScheduleFields = Pick<RoomQuestTemplate, "basicSchedule" | "dueByTime" | "repeatOnDays" | "timesOfDay" | "customPeriodType">;

/** The schedule fields each word of the plan stands for (section 11's template schedule rules) */
export const SCHEDULES: Record<Schedule, ScheduleFields> = {
  daily: { basicSchedule: "daily", dueByTime: "19:00" },
  "daily am": { basicSchedule: "daily", dueByTime: "08:00" },
  "daily bed": { basicSchedule: "daily", dueByTime: "20:30" },
  "daily am+night": { basicSchedule: "daily", timesOfDay: ["morning", "night"], dueByTime: "20:30" },
  weekly: { basicSchedule: "weekly", dueByTime: "18:00" },
  school: { basicSchedule: "weekly", repeatOnDays: SCHOOL_DAYS, dueByTime: "18:00" },
  "school bed": { basicSchedule: "weekly", repeatOnDays: SCHOOL_DAYS, dueByTime: "20:30" },
  monthly: { basicSchedule: "custom", customPeriodType: "month", dueByTime: "18:00" },
};

/** The quest template a plan entry stands for. The minutes are left out: the strike clock defaults them from the difficulty. */
export const templateFor = ([slug, difficulty, schedule]: PlanQuest): RoomQuestTemplate => ({
  beastId: `beast-${slug}`,
  difficulty,
  ...JSON.parse(JSON.stringify(SCHEDULES[schedule])),
});
