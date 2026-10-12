import { RouteLocationNormalized } from "vue-router";
import { useProStore } from "@/lib/store/stores/pro";
import type { ProGate } from "@/lib/services/pro/proPlans";

const GATES: ProGate[] = ["templeCreator", "advancedSchedule", "aiHelpers"];

/**
 * Routes with `meta.pro = '<gate>'` need XP Pro to create or edit. Returns false (after opening the
 * upsell) when the family is not Pro, otherwise undefined so the navigation continues.
 */
export async function handleProGuard(to: Pick<RouteLocationNormalized, "meta">): Promise<boolean | void> {
  const gate = to.meta?.pro as ProGate | undefined;
  if (!gate || !GATES.includes(gate)) return;

  const pro = useProStore();
  // A deep link arrives before the cached license is loaded; wait for it so a Pro family is not turned away.
  await pro.init().catch(() => undefined);
  if (pro.isPro) return;

  await pro.requirePro(gate);
  return false;
}
