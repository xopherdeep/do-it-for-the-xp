import { RouteLocationNormalized } from "vue-router";
import { useProStore } from "@/lib/store/stores/pro";
import type { ProGate } from "@/lib/services/pro/proPlans";

const GATES: ProGate[] = ["templeCreator", "advancedSchedule", "aiHelpers"];

/**
 * Routes with `meta.pro = '<gate>'` need XP Pro to create or edit. Returns false (after opening the
 * upsell) when the family is not Pro (or a redirect to Go Pro on a first navigation), otherwise undefined so the navigation continues.
 */
export type ProGuardResult = boolean | { name: string } | void;

export async function handleProGuard(
  to: Pick<RouteLocationNormalized, "meta">,
  from?: Pick<RouteLocationNormalized, "matched">
): Promise<ProGuardResult> {
  const gate = to.meta?.pro as ProGate | undefined;
  if (!gate || !GATES.includes(gate)) return;

  const pro = useProStore();
  // A deep link arrives before the cached license is loaded; wait for it so a Pro family is not turned away.
  await pro.init().catch(() => undefined);
  if (pro.isPro) return;

  // A deep link or reload has nowhere to stay on: send it to the Go Pro page instead of a blank screen
  if (from && from.matched.length === 0) return { name: "xp-pro" };

  await pro.requirePro(gate);
  return false;
}
