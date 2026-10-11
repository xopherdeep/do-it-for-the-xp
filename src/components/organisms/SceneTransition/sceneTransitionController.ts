// Scene transition controller: a tiny reactive singleton between the router guard and the effect components.
//
// CONTRACT (for the effect authors: IrisEffect, DoorsEffect, CloudsEffect, SwirlEffect; also in effects/index.ts)
//  - Effect props: { plan: TransitionPlan; phase: 'cover' | 'covered' | 'reveal' } (types in
//    @/lib/services/transitions/sceneTransitions). The component is mounted for the whole transition.
//  - Effect emits: 'covered' once the screen is fully opaque, 'revealed' once it is fully clear again.
//    Emit 'covered' when phase is 'cover' and your cover animation ends; emit 'revealed' when phase is 'reveal'
//    and your reveal animation ends. The controller never waits more than HARD_CAP_MS for either.
//  - Layout: position fixed, inset 0, z-index 19000 (above the app and the temple reveals at 1100, below Ionic's own
//    overlays at ~20000 so system dialogs still win). pointer-events: all while covering, so taps do not
//    reach the page under it. Never block input longer than your own duration.
//  - Timing: aim for 400 to 700 ms each way. The hard cap is 1200 ms per phase.
//  - Reduced motion: when `prefersReducedMotion()` is true (matchMedia prefers-reduced-motion), run a ~150 ms fade
//    both ways and still emit both events. Clear every timer on unmount.
//  - Haptics: only src/lib/services/feedback/haptics.ts. The guard already fires the per-effect haptic (doors and
//    iris 'thud', clouds 'tick' x3, swirl 'slam') so effects add none unless they have a mid-animation beat.
import { computed, reactive } from "vue";
import type { TransitionPlan } from "@/lib/services/transitions/sceneTransitions";

export type TransitionPhase = "idle" | "cover" | "covered" | "reveal";

/** The longest the controller waits for an effect to report in, so a broken effect can never trap the screen. */
export const HARD_CAP_MS = 1200;

/** How long the place-name card stays up; it outlives the cover, so it has its own slot in the state. */
export const CARD_MS = 1500;

export interface AreaCard {
  title: string;
  subtitle?: string;
  element?: string;
}

export const state = reactive<{ plan: TransitionPlan | null; phase: TransitionPhase; card: AreaCard | null }>({
  plan: null,
  phase: "idle",
  card: null,
});

let cardTimer: ReturnType<typeof setTimeout> | undefined;

const showCard = (plan: TransitionPlan) => {
  clearTimeout(cardTimer);
  if (!plan.title) {
    state.card = null;
    return;
  }
  state.card = { title: plan.title, subtitle: plan.subtitle, element: plan.element };
  cardTimer = setTimeout(() => (state.card = null), CARD_MS);
};

export const isActive = computed(() => state.phase !== "idle");

/** True when the player asked their system for less motion. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Waiter = { done: () => void; timer: ReturnType<typeof setTimeout> };
let coverWaiter: Waiter | null = null;
let revealWaiter: Waiter | null = null;

const settle = (waiter: Waiter | null) => {
  if (!waiter) return;
  clearTimeout(waiter.timer);
  waiter.done();
};

/** Wait for an effect event, or the hard cap. */
const wait = (assign: (waiter: Waiter) => void): Promise<void> =>
  new Promise<void>((resolve) => {
    const waiter: Waiter = {
      done: resolve,
      timer: setTimeout(resolve, HARD_CAP_MS),
    };
    assign(waiter);
  });

/** Cover the screen with the plan's effect. Resolves when the effect reports 'covered', or at the hard cap. */
export const cover = (plan: TransitionPlan): Promise<void> => {
  settle(coverWaiter);
  settle(revealWaiter);
  state.plan = plan;
  state.phase = "cover";
  return wait((waiter) => {
    coverWaiter = waiter;
  }).then(() => {
    coverWaiter = null;
    if (state.phase === "cover") state.phase = "covered";
  });
};

/** Lift the cover. Resolves when the effect reports 'revealed', or at the hard cap; then back to idle. */
export const reveal = (): Promise<void> => {
  if (state.phase === "idle") return Promise.resolve();
  settle(coverWaiter);
  state.phase = "reveal";
  if (state.plan) showCard(state.plan);
  return wait((waiter) => {
    revealWaiter = waiter;
  }).then(() => {
    revealWaiter = null;
    state.phase = "idle";
    state.plan = null;
  });
};

/** Called by XpSceneTransition when the effect emits 'covered'. */
export const notifyCovered = () => settle(coverWaiter);

/** Called by XpSceneTransition when the effect emits 'revealed'. */
export const notifyRevealed = () => settle(revealWaiter);

export const sceneTransitionController = { state, isActive, cover, reveal, notifyCovered, notifyRevealed };
export default sceneTransitionController;
