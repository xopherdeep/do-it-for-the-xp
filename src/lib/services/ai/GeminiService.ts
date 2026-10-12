/**
 * GeminiService - AI helpers (monster names, checklists, whole beasts, schedules).
 *
 * The calls go to the Gatekeeper XP Pro proxy, which checks the family's license, owns the prompts and
 * holds the Gemini key. Nothing here knows a key or talks to Google.
 */
import { useProStore } from "@/lib/store/stores/pro";
import { askAi, AiTask, ProClientError } from "@/lib/services/pro/proClient";
import { openProUpsell } from "@/lib/services/pro/proUi";

export const DAILY_LIMIT_MESSAGE = "Your party used today's AI magic. It recharges tomorrow.";

type Failure = { success: false; error?: string };

/** Send one task to the proxy. Maps every refusal to `{ success: false }`, opening the upsell when Pro is missing. */
async function runTask<T>(
  task: AiTask,
  input: Record<string, unknown>
): Promise<{ ok: true; data: T } | { ok: false; failure: Failure }> {
  const pro = useProStore();
  if (!pro.licenseKey) {
    await openProUpsell("aiHelpers");
    return { ok: false, failure: { success: false } };
  }
  try {
    return { ok: true, data: await askAi<T>(task, input, pro.licenseKey, pro.deviceId) };
  } catch (e) {
    if (!(e instanceof ProClientError)) throw e;
    switch (e.code) {
      case "pro_required":
        await openProUpsell("aiHelpers");
        return { ok: false, failure: { success: false } };
      case "daily_limit":
        return { ok: false, failure: { success: false, error: DAILY_LIMIT_MESSAGE } };
      case "network":
        return { ok: false, failure: { success: false, error: "Failed to connect to AI service. Check your internet connection." } };
      case "invalid_input":
        return { ok: false, failure: { success: false, error: "That was too long for the AI helper. Try something shorter." } };
      case "rate_limited":
        return { ok: false, failure: { success: false, error: "Slow down a little, then try again." } };
      default:
        return { ok: false, failure: { success: false, error: "The AI helper is resting. Please try again." } };
    }
  }
}

export interface GenerateMonsterNameOptions {
  checklistItems: string[];
}

export interface GeminiResponse {
  success: boolean;
  name?: string;
  error?: string;
}

/**
 * Generate a creative monster name based on a list of chores/tasks
 */
export async function generateMonsterName(
  options: GenerateMonsterNameOptions
): Promise<GeminiResponse> {
  if (!options.checklistItems.length) {
    return { success: false, error: "Please add some checklist items first." };
  }
  const res = await runTask<{ name?: string }>("monster_name", {
    checklistItems: options.checklistItems,
  });
  if (!res.ok) return res.failure;
  const name = typeof res.data?.name === "string" ? res.data.name.trim() : "";
  if (!name) return { success: false, error: "No response generated. Please try again." };
  return { success: true, name };
}

export interface GenerateChecklistOptions {
  monsterName: string;
}

export interface ChecklistResponse {
  success: boolean;
  checklist?: string[];
  error?: string;
}

const cleanList = (list: unknown): string[] =>
  Array.isArray(list) ? list.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];

/**
 * Generate a checklist of chores/tasks based on a monster name
 */
export async function generateChecklistFromName(
  options: GenerateChecklistOptions
): Promise<ChecklistResponse> {
  if (!options.monsterName?.trim()) {
    return { success: false, error: "Please enter a monster name first." };
  }
  const res = await runTask<{ checklist?: unknown }>("checklist", {
    monsterName: options.monsterName,
  });
  if (!res.ok) return res.failure;
  const checklist = cleanList(res.data?.checklist);
  if (!checklist.length) return { success: false, error: "Failed to parse AI response. Please try again." };
  return { success: true, checklist };
}

/**
 * XP Pro: the AI helpers are on when the family has Pro.
 */
export function isGeminiConfigured(): boolean {
  return useProStore().isPro;
}

export interface GenerateFullBeastOptions {
  theme?: string; // Optional theme/concept hint
}

export interface FullBeastResponse {
  success: boolean;
  name?: string;
  checklist?: string[];
  error?: string;
}

/**
 * Generate a complete beast with name and checklist in one call
 */
export async function generateFullBeast(
  options: GenerateFullBeastOptions = {}
): Promise<FullBeastResponse> {
  const input: Record<string, unknown> = {};
  if (options.theme) input.theme = options.theme;
  const res = await runTask<{ name?: string; checklist?: unknown }>("full_beast", input);
  if (!res.ok) return res.failure;
  const checklist = cleanList(res.data?.checklist);
  const name = res.data?.name;
  const isIncompleteBeast = !name || !checklist.length;
  if (isIncompleteBeast) {
    return { success: false, error: "Failed to parse AI response. Please try again." };
  }
  return { success: true, name, checklist };
}

export interface GenerateScheduleOptions {
  taskName: string;
  beastName?: string;
  checklist?: string[];
}

export interface ScheduleResponse {
  success: boolean;
  scheduleType?: "once" | "daily" | "weekly" | "custom";
  frequency?: number; // For custom (e.g., 2 times per day)
  periodType?: "day" | "week" | "month" | "year"; // For custom
  periodNumber?: number; // For custom (e.g., every 2 weeks)
  days?: string[]; // For weekly (sun, mon, etc.)
  reasoning?: string; // Why AI chose this
  error?: string;
}

/**
 * Generate a recommended schedule based on a task name
 */
export async function generateSchedule(
  options: GenerateScheduleOptions
): Promise<ScheduleResponse> {
  const taskName = options.taskName || "";
  if (!taskName.trim()) {
    return { success: false, error: "Task name is required." };
  }
  const input: Record<string, unknown> = { taskName };
  if (options.beastName) input.beastName = options.beastName;
  const hasChecklist = options.checklist && options.checklist.length > 0;
  if (hasChecklist) input.checklist = options.checklist;

  const res = await runTask<Omit<ScheduleResponse, "success">>("schedule", input);
  if (!res.ok) return res.failure;
  if (!res.data?.scheduleType) return { success: false, error: "No response" };
  return { success: true, ...res.data };
}

export default {
  generateMonsterName,
  generateChecklistFromName,
  generateFullBeast,
  generateSchedule,
  isGeminiConfigured,
};
