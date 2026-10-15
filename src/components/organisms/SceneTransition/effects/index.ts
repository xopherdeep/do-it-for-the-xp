// Scene transition effects. Each one is an async component with the same contract (full text in
// ../sceneTransitionController.ts):
//   props  { plan: TransitionPlan; phase: 'cover' | 'covered' | 'reveal' }
//   emits  'covered' (screen fully opaque) and 'revealed' (screen fully clear)
//   layout position fixed, inset 0, z-index 19000, pointer-events all while covering
//   timing 400 to 700 ms each way; the controller gives up waiting at 1200 ms
//   motion prefers-reduced-motion: a ~150 ms fade each way, same events; clear timers on unmount
//   haptics src/lib/services/feedback/haptics.ts only (the router guard fires the cover-end haptic)
// Owners: fade = T1, iris = T2, doors = T3, clouds = T4, swirl = T5, gate = the temple entrance. Replace a stub by rewriting its file only.
import { defineAsyncComponent, type Component } from "vue";
import type { EffectId } from "@/lib/services/transitions/sceneTransitions";

export const EFFECTS: Record<EffectId, Component> = {
  fade: defineAsyncComponent(() => import("./FadeEffect.vue")),
  iris: defineAsyncComponent(() => import("./IrisEffect.vue")),
  doors: defineAsyncComponent(() => import("./DoorsEffect.vue")),
  clouds: defineAsyncComponent(() => import("./CloudsEffect.vue")),
  swirl: defineAsyncComponent(() => import("./SwirlEffect.vue")),
  gate: defineAsyncComponent(() => import("./GateEffect.vue")),
};
