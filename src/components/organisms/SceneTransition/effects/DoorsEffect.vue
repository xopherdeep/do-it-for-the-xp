<template>
  <div
    class="doors-effect"
    :class="[`is-${phase}`, `is-${plan.direction}`, `door-${door}`, { 'is-reduced': reduced, 'is-aimed': isAimed }]"
    :style="aimStyle"
  >
    <div class="doors-glow" />
    <div class="doors-frame">
      <div v-if="door === 'portal'" class="door-swirl" />
      <div v-if="door === 'vault'" class="vault-wall" />
      <div v-for="piece in pieces" :key="piece.name" class="door-piece" :class="`piece-${piece.name}`">
        <svg
          :viewBox="`0 0 ${piece.w} ${piece.h}`"
          :preserveAspectRatio="piece.fit === 'meet' ? 'xMidYMid meet' : 'none'"
          shape-rendering="crispEdges"
        >
          <pixel-runs :runs="piece.runs" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import type { TransitionPlan } from "@/lib/services/transitions/sceneTransitions";
import type { DoorType } from "@/lib/services/transitions/buildingDoors";
import PixelRuns from "@/app/Console/TempleGrounds/components/PixelRuns.vue";
import { rumble, type Feel } from "@/lib/services/feedback/haptics";
import { play$fx } from "@/assets/fx";
import { useTimers } from "@/hooks/useTimers";
import { prefersReducedMotion, state } from "../sceneTransitionController";
import { pushCamera, resetCamera, settleCamera } from "../cameraPush";
import { doorPieces } from "./doorSprites";

const props = defineProps<{ plan: TransitionPlan; phase: "cover" | "covered" | "reveal" }>();
const emit = defineEmits<{ (e: "covered"): void; (e: "revealed"): void }>();

/** The shut doors come up in front of the hero: they are never seen closing, only opening */
const COVER_MS = 280;
/** With a tapped building the camera pushes into its door first, a beat longer; the reveals are shorter to match */
const PUSH_MS = 320;
const FADE_MS = 150;
/** How far the page under the doors grows as the camera pushes in */
const PUSH_SCALE = 2.6;
/** No tapped building (the nav, a link): a gentler push into the middle of the screen */
const CENTER_PUSH_SCALE = 1.3;

/** Each door opens at its own pace, its own sound and its own buzz. Total with the cover stays at or under 760 ms. */
const OPENING: Record<DoorType, { ms: number; sound: string[]; buzz: Array<[number, Feel]> }> = {
  plank: { ms: 440, sound: ["openDoor"], buzz: [[0, "thud"]] },
  shop: { ms: 440, sound: ["doorBell", "openDoor"], buzz: [[0, "tap"], [160, "tick"]] },
  sliding: { ms: 360, sound: ["doorSlide"], buzz: [[0, "tick"]] },
  vault: { ms: 440, sound: ["doorVault"], buzz: [[0, "tick"], [80, "tick"], [200, "thud"]] },
  stone: { ms: 440, sound: ["doorStone"], buzz: [[0, "slam"], [140, "tick"], [280, "tick"]] },
  gate: { ms: 420, sound: ["doorGate"], buzz: [[0, "tick"], [60, "tick"], [120, "tick"], [180, "tick"], [240, "tick"]] },
  tent: { ms: 380, sound: ["doorTent"], buzz: [[0, "tick"]] },
  portal: { ms: 420, sound: ["doorPortal"], buzz: [[0, "grab"]] },
};

const reduced = prefersReducedMotion();
const door = computed<DoorType>(() => props.plan.door ?? "plank");
// The plan's variant names the building, in either direction (its title is the town on the way out)
const pieces = computed(() => doorPieces(door.value, props.plan.variant ?? props.plan.title));
const opening = computed(() => OPENING[door.value] ?? OPENING.plank);

// The tapped building's door, if the hero tapped one on the way in
const focus = props.plan.direction === "in" ? state.focus : null;
const isAimed = Boolean(focus) && !reduced;

/** Where the door starts: its spot on the building, as an offset from the middle of the screen and a squash */
const aimStyle = computed(() => {
  const openMs = { "--open-ms": `${opening.value.ms}ms` };
  const isUnaimed = !focus || typeof window === "undefined";
  if (isUnaimed) return openMs;
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  return {
    ...openMs,
    "--from-x": `${focus.x - w / 2}px`,
    "--from-y": `${focus.y - h / 2}px`,
    "--from-sx": String(Math.max(0.04, focus.size / w)),
    "--from-sy": String(Math.max(0.04, (focus.size * 1.5) / h)),
  };
});

const timers = useTimers();
const later = (fn: () => void, ms: number) => timers.startTimeout(ms, fn);

const centre = () => ({
  x: typeof window === "undefined" ? 0 : window.innerWidth / 2,
  y: typeof window === "undefined" ? 0 : window.innerHeight / 2,
  size: 0,
});

// The animations are CSS keyframes; these timers line the events and beats up with them
watch(
  () => props.phase,
  (phase) => {
    const isCover = phase === "cover";
    const isReveal = phase === "reveal";
    if (isCover) {
      const coverMs = reduced ? FADE_MS : isAimed ? PUSH_MS : COVER_MS;
      // The camera walks in toward the door; coming out there is no door on screen to walk to
      const isWalkingIn = !reduced && props.plan.direction === "in";
      if (isWalkingIn) {
        if (focus) pushCamera(focus, PUSH_SCALE, coverMs);
        else pushCamera(centre(), CENTER_PUSH_SCALE, coverMs);
      }
      later(() => emit("covered"), coverMs);
    }
    if (isReveal) {
      const { ms, sound, buzz } = opening.value;
      resetCamera();
      // The new page finishes the push (in) or the camera pulls back from the door (out)
      if (!reduced) settleCamera(props.plan.direction === "in" ? 1.08 : 1.12, ms);
      rumble(buzz);
      sound.forEach((key) => play$fx(key));
      later(() => emit("revealed"), reduced ? FADE_MS : ms);
    }
  },
  { immediate: true }
);

onBeforeUnmount(resetCamera);
</script>

<style scoped>
.doors-effect {
  position: fixed;
  inset: 0;
  z-index: 19000;
  overflow: hidden;
  pointer-events: all;
  --open-ms: 440ms;
  --disc: min(86vw, 58vh);
}
.doors-effect.is-reveal {
  pointer-events: none;
}

/* What lies beyond: warm lamplight going in, daylight coming out */
.doors-glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  background: radial-gradient(ellipse at 50% 55%, #fff1b0 0%, #f0b050 38%, #8a4a1c 100%);
}
.is-out .doors-glow {
  background: radial-gradient(ellipse at 50% 55%, #f4fbff 0%, #8cc8f4 40%, #3c78c0 100%);
}
.door-sliding.is-in .doors-glow {
  background: radial-gradient(ellipse at 50% 55%, #ffffff 0%, #e4f4fa 45%, #8ab8cc 100%);
}
.door-portal.is-in .doors-glow {
  background: radial-gradient(ellipse at 50% 55%, #f4eaff 0%, #a88cf4 40%, #2a1a6a 100%);
}
.door-vault.is-in .doors-glow {
  background: radial-gradient(ellipse at 50% 50%, #fffbe0 0%, #f6d060 35%, #7a5010 100%);
}

.doors-frame {
  position: absolute;
  inset: 0;
  transform-origin: 50% 50%;
  perspective: 900px;
}
.door-piece {
  position: absolute;
  image-rendering: pixelated;
  backface-visibility: hidden;
}
.door-piece svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* Two leaves meeting in the middle: plank, stone, glass and tent */
.piece-left,
.piece-right {
  top: 0;
  bottom: 0;
  width: 50%;
}
.piece-left {
  left: 0;
  transform-origin: 0 50%;
}
.piece-right {
  right: 0;
  transform-origin: 100% 50%;
}

/* The shop: one door hinged on the left, its bell hanging over the latch side */
.piece-shop-door {
  inset: 0;
  transform-origin: 0 50%;
}
.piece-bell {
  top: 0;
  right: 14%;
  width: 14vw;
  height: 16vw;
  transform-origin: 50% 0;
}

/* The bank: a steel wall with a round hole, the vault door and its wheel filling it */
.vault-wall {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(90deg, transparent 0 calc(25% - 2px), #1c1a22 calc(25% - 2px) 25%),
    repeating-linear-gradient(0deg, transparent 0 calc(20% - 2px), #1c1a22 calc(20% - 2px) 20%),
    linear-gradient(160deg, #807e90 0%, #5a5868 45%, #3a3844 100%);
  -webkit-mask: radial-gradient(circle at 50% 50%, transparent calc(var(--disc) * 0.47), #000 calc(var(--disc) * 0.47 + 1px));
  mask: radial-gradient(circle at 50% 50%, transparent calc(var(--disc) * 0.47), #000 calc(var(--disc) * 0.47 + 1px));
}
.door-vault .doors-frame {
  /* The bank vault's dark beyond the door until it rolls away */
  background: #0c0a10;
}
.piece-disc,
.piece-wheel {
  left: calc(50% - var(--disc) / 2);
  top: calc(50% - var(--disc) / 2);
  width: var(--disc);
  height: var(--disc);
}
.piece-wheel {
  left: calc(50% - var(--disc) / 4);
  top: calc(50% - var(--disc) / 4);
  width: calc(var(--disc) / 2);
  height: calc(var(--disc) / 2);
}

/* The citadel: a portcullis over a lamplit passage */
.door-gate .doors-frame {
  background: radial-gradient(ellipse at 50% 60%, #8a4a1c 0%, #3a1c0c 55%, #0c0604 100%);
}
.piece-portcullis {
  inset: 0;
}

/* The cave: a crystal swirl, no door */
.door-swirl {
  position: absolute;
  inset: -60%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 50%, #f4eaff 0%, #a88cf4 6%, transparent 16%),
    repeating-radial-gradient(circle at 50% 50%, transparent 0 18px, rgba(12, 8, 40, 0.45) 18px 30px),
    repeating-conic-gradient(from 0deg at 50% 50%, #1a1446 0deg 14deg, #5a48d0 14deg 22deg, #33288a 22deg 30deg);
  animation: swirl-spin 900ms linear infinite;
}
@keyframes swirl-spin {
  to { transform: rotate(360deg); }
}

/* Cover: the hero steps up to the shut door. It comes up out of the dark already closed, with a small step forward */
.is-cover .doors-frame { animation: doors-approach 280ms ease-out both; }
@keyframes doors-approach {
  from { opacity: 0; transform: scale(1.06); }
  to { opacity: 1; transform: none; }
}

/* Cover, aimed: the camera pushes into the tapped building. The door grows out of its spot on the model to fill the
   screen while the page behind it scales up around the same point (cameraPush.ts) */
.is-cover.is-aimed .doors-frame { animation: doors-push 320ms cubic-bezier(0.55, 0, 0.9, 0.55) both; }
@keyframes doors-push {
  from {
    opacity: 0;
    transform: translate(var(--from-x), var(--from-y)) scale(var(--from-sx), var(--from-sy));
  }
  30% { opacity: 1; }
  to { opacity: 1; transform: none; }
}

/* Every reveal: the light beyond holds, then fades as the room appears */
.is-reveal .doors-glow { animation: glow-out var(--open-ms) linear both; }
@keyframes glow-out {
  0% { opacity: 1; }
  60% { opacity: 1; }
  100% { opacity: 0; }
}

/* Plank: the leaves swing away into the building (in) or toward the viewer (out) */
.is-reveal.is-in.door-plank .piece-left { animation: open-in-left var(--open-ms) ease-in both; }
.is-reveal.is-in.door-plank .piece-right { animation: open-in-right var(--open-ms) ease-in both; }
@keyframes open-in-left {
  from { transform: scaleX(1) skewY(0deg); }
  to { transform: scaleX(0) skewY(6deg); }
}
@keyframes open-in-right {
  from { transform: scaleX(1) skewY(0deg); }
  to { transform: scaleX(0) skewY(-6deg); }
}
.is-reveal.is-out.door-plank .piece-left { animation: open-out-left var(--open-ms) ease-in both; }
.is-reveal.is-out.door-plank .piece-right { animation: open-out-right var(--open-ms) ease-in both; }
@keyframes open-out-left {
  from { transform: scaleX(1) scaleY(1); opacity: 1; }
  70% { opacity: 1; }
  to { transform: scaleX(0.05) scaleY(1.25) skewY(-8deg); opacity: 0; }
}
@keyframes open-out-right {
  from { transform: scaleX(1) scaleY(1); opacity: 1; }
  70% { opacity: 1; }
  to { transform: scaleX(0.05) scaleY(1.25) skewY(8deg); opacity: 0; }
}

/* Shop: the door swings on its hinge, the bell rings on its bracket */
.is-reveal.is-in .piece-shop-door { animation: shop-swing-in var(--open-ms) cubic-bezier(0.4, 0, 0.9, 0.6) both; }
.is-reveal.is-out .piece-shop-door { animation: shop-swing-out var(--open-ms) cubic-bezier(0.4, 0, 0.9, 0.6) both; }
@keyframes shop-swing-in {
  from { transform: perspective(900px) rotateY(0deg); }
  to { transform: perspective(900px) rotateY(88deg); }
}
@keyframes shop-swing-out {
  from { transform: perspective(900px) rotateY(0deg); opacity: 1; }
  75% { opacity: 1; }
  to { transform: perspective(900px) rotateY(-80deg); opacity: 0; }
}
.is-reveal .piece-bell { animation: bell-ring var(--open-ms) ease-out both; }
@keyframes bell-ring {
  0% { transform: rotate(0deg); opacity: 1; }
  15% { transform: rotate(28deg); }
  35% { transform: rotate(-22deg); }
  55% { transform: rotate(14deg); }
  70% { transform: rotate(-8deg); opacity: 1; }
  100% { transform: rotate(0deg); opacity: 0; }
}

/* Sliding glass: the panes glide apart, either way */
.is-reveal.door-sliding .piece-left { animation: slide-left var(--open-ms) cubic-bezier(0.5, 0, 0.3, 1) both; }
.is-reveal.door-sliding .piece-right { animation: slide-right var(--open-ms) cubic-bezier(0.5, 0, 0.3, 1) both; }
@keyframes slide-left {
  to { transform: translateX(-100%); }
}
@keyframes slide-right {
  to { transform: translateX(100%); }
}

/* Stone: the slabs shudder, then grind apart toward the hero, either way */
.is-reveal.door-stone .doors-frame { animation: stone-shake var(--open-ms) linear both; }
@keyframes stone-shake {
  0%, 30%, 100% { transform: none; }
  6% { transform: translate(-3px, 1px); }
  12% { transform: translate(3px, -1px); }
  18% { transform: translate(-2px, 0); }
  24% { transform: translate(2px, 1px); }
}
.is-reveal.door-stone .piece-left { animation: stone-open-left var(--open-ms) cubic-bezier(0.6, 0, 0.8, 0.6) both; }
.is-reveal.door-stone .piece-right { animation: stone-open-right var(--open-ms) cubic-bezier(0.6, 0, 0.8, 0.6) both; }
/* The slabs part and swing toward the hero: each grows a little as it grinds aside past the screen edge */
@keyframes stone-open-left {
  0%, 25% { transform: none; }
  to { transform: translateX(-104%) scale(1.12); }
}
@keyframes stone-open-right {
  0%, 25% { transform: none; }
  to { transform: translateX(104%) scale(1.12); }
}

/* Vault: the wheel spins, the door rolls aside, the camera goes through the hole */
.is-reveal.door-vault .piece-wheel { animation: vault-wheel var(--open-ms) ease-in-out both; }
.is-reveal.door-vault .piece-disc { animation: vault-roll var(--open-ms) ease-in-out both; }
.is-reveal.door-vault .vault-wall { animation: vault-through var(--open-ms) ease-in both; }
.is-reveal.door-vault .doors-frame { animation: frame-clear var(--open-ms) linear both; }
@keyframes vault-wheel {
  0% { transform: rotate(0deg); }
  40% { transform: rotate(240deg); }
  85%, 100% { transform: translateX(-120vw) rotate(-120deg); }
}
@keyframes vault-roll {
  0%, 40% { transform: none; }
  85%, 100% { transform: translateX(-120vw) rotate(-360deg); }
}
@keyframes vault-through {
  0%, 55% { transform: none; opacity: 1; }
  100% { transform: scale(3); opacity: 0; }
}
/* The dark beyond the door clears once the door is out of the way, showing the glow */
@keyframes frame-clear {
  0%, 45% { background-color: #0c0a10; }
  65%, 100% { background-color: transparent; }
}

/* Gate: the portcullis clanks up a chain link at a time, then the passage gives way to the room */
.is-reveal.door-gate .piece-portcullis { animation: gate-lift var(--open-ms) steps(7, end) both; }
.is-reveal.door-gate .doors-frame { animation: frame-fade var(--open-ms) linear both; }
@keyframes gate-lift {
  0% { transform: none; }
  80%, 100% { transform: translateY(-102%); }
}
@keyframes frame-fade {
  0%, 60% { opacity: 1; }
  100% { opacity: 0; }
}

/* Tent: the flaps are drawn back and tied at the top corners */
.is-reveal.door-tent .piece-left { transform-origin: 0 0; animation: flap-left var(--open-ms) cubic-bezier(0.3, 0, 0.4, 1) both; }
.is-reveal.door-tent .piece-right { transform-origin: 100% 0; animation: flap-right var(--open-ms) cubic-bezier(0.3, 0, 0.4, 1) both; }
@keyframes flap-left {
  from { transform: none; opacity: 1; }
  80% { opacity: 1; }
  to { transform: skewY(-24deg) scale(0.12, 0.4); opacity: 0; }
}
@keyframes flap-right {
  from { transform: none; opacity: 1; }
  80% { opacity: 1; }
  to { transform: skewY(24deg) scale(0.12, 0.4); opacity: 0; }
}

/* Portal: the swirl spins up and flings the hero through */
.is-reveal.door-portal .doors-frame { animation: portal-through var(--open-ms) cubic-bezier(0.5, 0, 0.9, 0.6) both; }
@keyframes portal-through {
  0% { transform: none; opacity: 1; }
  100% { transform: scale(3.5) rotate(120deg); opacity: 0; }
}

/* Reduced motion: the shut door fades in and out, nothing swings, nothing pushes */
.is-reduced .door-piece,
.is-reduced .doors-frame,
.is-reduced .vault-wall,
.is-reduced .door-swirl,
.is-reduced .doors-glow { animation: none !important; }
.is-reduced.is-cover { animation: doors-fade-in 150ms linear both; }
.is-reduced.is-reveal { animation: doors-fade-out 150ms linear both; }
.is-reduced .doors-glow { display: none; }
@keyframes doors-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes doors-fade-out { from { opacity: 1; } to { opacity: 0; } }
</style>
