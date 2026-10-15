import { nextTick } from "vue";
import { START_LOCATION, Router } from "vue-router";
import { play$fx } from "@/assets/fx";
import { feel, rumble } from "@/lib/services/feedback/haptics";
import debug from "@/lib/utils/debug";
import { sceneOf, transitionFor, type TransitionPlan } from "@/lib/services/transitions/sceneTransitions";
import { cover, prefersReducedMotion, reveal, state } from "@/components/organisms/SceneTransition/sceneTransitionController";

/** Two animation frames: the new page has mounted and painted once. Falls back to a timer where rAF is paused. */
const afterPaint = (): Promise<void> =>
  new Promise((resolve) => {
    const fallback = setTimeout(resolve, 100);
    const done = () => {
      clearTimeout(fallback);
      resolve();
    };
    const hasAnimationFrames = typeof requestAnimationFrame === "function";
    if (!hasAnimationFrames) return done();
    requestAnimationFrame(() => requestAnimationFrame(done));
  });

/** The buzz that goes with each effect, felt as the screen goes dark (clouds) or is fully covered (the rest). */
const feelCoverStart = (plan: TransitionPlan) => {
  const isClouds = plan.effect === "clouds";
  if (isClouds) rumble([[0, "tick"], [140, "tick"], [280, "tick"]]);
};
// The doors slam on their own when the leaves meet, so they get no second hit here
const feelCovered = (plan: TransitionPlan) => {
  const isIris = plan.effect === "iris";
  if (isIris) feel("thud");
  const isSwirl = plan.effect === "swirl";
  if (isSwirl) feel("slam");
};

const isE2e = (): boolean => typeof window !== "undefined" && Boolean((window as unknown as { Cypress?: unknown }).Cypress);

/**
 * Scene transitions. Runs in beforeResolve, after every other guard has let the navigation through, covers the
 * screen with the plan's effect, and lifts the cover once the new page has mounted (afterEach). Never throws:
 * a transition is dressing, and the navigation must happen with or without it.
 */
export function handleTransitionGuard(router: Router): void {
  router.beforeResolve?.(async (to, from) => {
    try {
      // The first navigation of the session is app boot, and e2e specs must not wait on animations
      const shouldSkipEffect = from === START_LOCATION || isE2e();
      if (shouldSkipEffect) return;
      const plan = transitionFor(sceneOf(from), sceneOf(to));
      if (!plan) return;
      const { sound } = plan;
      if (sound) play$fx(sound);
      feelCoverStart(plan);
      const shouldHoldForSwirl = plan.effect === "swirl" && !prefersReducedMotion();
      if (shouldHoldForSwirl) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      await cover(plan);
      feelCovered(plan);
    } catch (error) {
      // Fall through: navigate without the effect
      debug.warn("[transition.guard] the scene transition failed, navigating without it", error);
    }
  });

  router.afterEach?.(async () => {
    try {
      const isIdle = state.phase === "idle";
      if (isIdle) return;
      // Covered and mounted, or the navigation failed or was aborted: either way the cover comes off.
      // (afterEach also runs for failures, with the failure as third argument; the wait is harmless then.)
      await nextTick();
      await afterPaint();
      await reveal();
    } catch {
      state.phase = "idle";
      state.plan = null;
    }
  });

  router.onError?.(() => {
    const isCovered = state.phase !== "idle";
    if (isCovered) void reveal();
  });
}
