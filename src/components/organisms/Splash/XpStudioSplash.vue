<template>
  <div
    class="xp-studio-splash"
    :class="[`is-${phase}`, { 'is-static': reduced }]"
    :style="styleVars"
    role="img"
    aria-label="Presented by Hall of the Gods, Inc."
    tabindex="-1"
    @pointerdown.prevent="skip"
  >
    <div class="studio-mark">
      <img v-if="logoSrc" class="studio-logo" :src="logoSrc" alt="Hall of the Gods omega mark" />
      <span v-else class="studio-omega" aria-hidden="true">&Omega;</span>
      <p class="studio-presents">Presented by</p>
      <p class="studio-name">Hall of the Gods, Inc.</p>
    </div>
    <div class="studio-scanlines" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { play$fx } from "@/assets/fx";
import debug from "@/lib/utils/debug";
import { STUDIO_SPLASH_CHIME, prefersReducedMotion, splashTimings } from "./splash";

const emit = defineEmits<{ (event: "done"): void }>();

/* The real mark replaces the typographic omega the moment it lands in src/assets/images/brand.
 * The context is non-recursive and matches only that file, so nothing else gets bundled. */
const brand = require.context("@/assets/images/brand", false, /^\.\/hall-of-the-gods\.(svg|png)$/);
const logoSrc = computed<string | null>(() => {
  const key = brand.keys().find((k) => k.endsWith(".svg")) ?? brand.keys()[0];
  if (!key) return null;
  const mod = brand(key);
  return typeof mod === "string" ? mod : mod?.default ?? null;
});

type Phase = "in" | "hold" | "out";
const reduced = prefersReducedMotion();
const timings = splashTimings(reduced);
const phase = ref<Phase>("in");
const styleVars = {
  "--splash-fade-in": `${timings.fadeIn}ms`,
  "--splash-fade-out": `${timings.fadeOut}ms`,
};

let timers: ReturnType<typeof setTimeout>[] = [];
let finished = false;
let chimed = false;

const clearTimers = () => {
  timers.forEach(clearTimeout);
  timers = [];
};

/** One soft chime; play$fx already swallows autoplay refusals, the try/catch covers the rest. */
const chime = () => {
  if (chimed) return;
  try {
    play$fx(STUDIO_SPLASH_CHIME);
    chimed = true;
  } catch (err) {
    debug.warn("Studio splash chime skipped:", err);
  }
};

const finish = () => {
  if (finished) return;
  finished = true;
  clearTimers();
  window.removeEventListener("keydown", skip);
  emit("done");
};

const fadeOut = () => {
  if (finished) return;
  phase.value = "out";
  timers.push(setTimeout(finish, timings.fadeOut));
};

/** Tap or key: the gesture also unlocks audio, so the chime that autoplay refused can sound now. */
function skip() {
  if (finished) return;
  document.documentElement.setAttribute("data-user-interacted", "true");
  if (!chimed) chime();
  fadeOut();
}

onMounted(() => {
  window.addEventListener("keydown", skip);
  chime();
  timers.push(setTimeout(() => (phase.value = "hold"), timings.fadeIn));
  timers.push(setTimeout(fadeOut, timings.fadeIn + timings.hold));
});

onBeforeUnmount(() => {
  clearTimers();
  window.removeEventListener("keydown", skip);
});
</script>

<style lang="scss" scoped>
.xp-studio-splash {
  position: fixed;
  inset: 0;
  z-index: 100000; /* above the audio permission overlay (99999) */
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  color: #f7e8a8;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
  outline: none;
}

.studio-mark {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  font-family: "StatusPlz", "Apple Kid", monospace;
  opacity: 0;
  transform: scale(0.96);
  transition:
    opacity var(--splash-fade-in) ease-out,
    transform var(--splash-fade-in) ease-out;
  image-rendering: pixelated;
}

.is-hold .studio-mark {
  opacity: 1;
  transform: scale(1);
}

.is-out .studio-mark {
  opacity: 0;
  transform: scale(1.02);
  transition:
    opacity var(--splash-fade-out) ease-in,
    transform var(--splash-fade-out) ease-in;
}

.is-static .studio-mark {
  transition: none;
}

.is-static.is-in .studio-mark,
.is-static.is-hold .studio-mark {
  opacity: 1;
  transform: none;
}

.studio-omega {
  display: block;
  font-size: clamp(7rem, 32vmin, 13rem);
  line-height: 1;
  color: #ffd75e;
  text-shadow:
    0 0 6px rgba(255, 215, 94, 0.9),
    0 0 18px rgba(224, 160, 32, 0.55),
    0 0 42px rgba(224, 160, 32, 0.25),
    3px 3px 0 #6b4a00;
  animation: studio-glow 2.4s ease-in-out infinite;
}

.studio-logo {
  display: block;
  width: clamp(9rem, 38vmin, 16rem);
  height: auto;
  filter: drop-shadow(0 0 10px rgba(255, 215, 94, 0.6)) drop-shadow(0 0 28px rgba(224, 160, 32, 0.3));
}

.studio-presents {
  margin: 1.4rem 0 0.2rem;
  font-size: 0.85rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #d9c27a;
  opacity: 0.85;
}

.studio-name {
  margin: 0;
  font-size: clamp(1.1rem, 4.6vmin, 1.6rem);
  color: #ffd75e;
  text-shadow: 0 0 8px rgba(255, 215, 94, 0.5), 2px 2px 0 #4a3300;
}

/* CRT: faint scanlines plus a vignette; purely decorative. */
.studio-scanlines {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    repeating-linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0) 0px,
      rgba(0, 0, 0, 0) 2px,
      rgba(0, 0, 0, 0.28) 3px,
      rgba(0, 0, 0, 0.28) 4px
    ),
    radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 55%, rgba(0, 0, 0, 0.65) 100%);
  mix-blend-mode: multiply;
}

@keyframes studio-glow {
  0%,
  100% {
    text-shadow:
      0 0 6px rgba(255, 215, 94, 0.9),
      0 0 18px rgba(224, 160, 32, 0.55),
      0 0 42px rgba(224, 160, 32, 0.25),
      3px 3px 0 #6b4a00;
  }
  50% {
    text-shadow:
      0 0 9px rgba(255, 215, 94, 1),
      0 0 26px rgba(224, 160, 32, 0.7),
      0 0 56px rgba(224, 160, 32, 0.35),
      3px 3px 0 #6b4a00;
  }
}

@media (prefers-reduced-motion: reduce) {
  .studio-mark,
  .studio-omega {
    animation: none;
    transition: none;
  }
}
</style>
