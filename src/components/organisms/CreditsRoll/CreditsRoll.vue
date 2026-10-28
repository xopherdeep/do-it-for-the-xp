<template>
  <div class="credits-roll" role="dialog" aria-modal="true" :aria-label="heroesTitle" data-test="credits">
    <div class="credits-roll__stage">
      <div class="credits-roll__scroll" :style="{ '--credits-seconds': `${seconds}s` }" data-test="credits-scroll" @animationend.self="finish">
        <!-- 1. The heroes of the tower -->
        <section class="credits-roll__part" data-test="credits-heroes">
          <h1 class="credits-roll__title">{{ heroesTitle }}</h1>
          <p class="credits-roll__line">{{ t("projectFinish.credits.started", { date: dayText(credits.startOn) }) }}</p>
          <p class="credits-roll__line">{{ t("projectFinish.credits.finished", { date: dayText(credits.finishedOn) }) }}</p>
          <p class="credits-roll__early">{{ earlyLine }}</p>

          <article v-for="hero in credits.heroes" :key="hero.heroId" class="credits-roll__hero" data-test="credits-hero">
            <h2 class="credits-roll__name" data-test="credits-hero-name">{{ heroLine(hero) }}</h2>
            <p class="credits-roll__line">{{ t("projectFinish.credits.stats", { chores: hero.chores, bosses: hero.bosses }) }}</p>
            <p class="credits-roll__line">{{ t("projectFinish.credits.floors", { floors: hero.floors.join(", ") }) }}</p>
          </article>
          <p v-if="isNobodyNamed" class="credits-roll__line">{{ t("projectFinish.credits.nobody") }}</p>
        </section>

        <!-- 2. The makers of the game -->
        <section class="credits-roll__part" data-test="credits-makers">
          <h1 class="credits-roll__title">{{ t("projectFinish.credits.makers") }}</h1>
          <dl v-for="maker in makers" :key="maker.role" class="credits-roll__maker" data-test="credits-maker">
            <dt class="credits-roll__role">{{ maker.role }}</dt>
            <dd class="credits-roll__who">{{ maker.name }}</dd>
          </dl>
        </section>

        <!-- 3. The thank-you -->
        <p class="credits-roll__thanks" data-test="credits-thanks">{{ t("projectFinish.credits.thanks") }}</p>
      </div>
    </div>

    <!-- The way out sits at the bottom, in thumb reach -->
    <button type="button" class="credits-roll__skip" data-test="credits-skip" @click="finish">{{ t("projectFinish.credits.skip") }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { play$fx } from "@/assets/fx";
import { useCopy } from "@/hooks/useVoice";
import { MAKERS } from "@/lib/services/copy/credits";
import type { HeroCredit } from "@/lib/services/copy/credits";
import type { CreditsView } from "@/lib/services/projects/projectFinish";
import { dayText } from "@/lib/services/projects/projectWizard";

/**
 * The credits roll, full screen, SNES style: the heroes of the tower (class, chores, bosses, floors, the dates and the
 * days early), then the game's makers by role and name (credits.ts), then a thank-you. It scrolls by itself in CSS (the
 * tower's music plays on under it), can be skipped, and says `done` once when the scroll ends or it is skipped.
 */
const props = defineProps<{ credits: CreditsView }>();
const emit = defineEmits<{ (e: "done"): void }>();

const t = useCopy();
const makers = MAKERS;

/** The roll's pace: a base for the headings and the thank-you, then a little for every hero and every maker */
const BASE_SECONDS = 24;
const SECONDS_PER_HERO = 3;
const SECONDS_PER_MAKER = 2;

const seconds = computed(() => BASE_SECONDS + props.credits.heroes.length * SECONDS_PER_HERO + makers.length * SECONDS_PER_MAKER);

const isNobodyNamed = computed(() => props.credits.heroes.length === 0);

const heroesTitle = computed(() => t("projectFinish.credits.heroes", { tower: props.credits.towerName }));

const earlyLine = computed(() => {
  const days = props.credits.daysEarly;
  const isOnTime = days === 0;
  if (isOnTime) return t("projectFinish.credits.onTime");
  const isOneDay = days === 1;
  return isOneDay ? t("projectFinish.credits.earlyOne") : t("projectFinish.credits.early", { days });
});

/** "Twelve the Mage"; a hero with no class is named alone */
const heroLine = (hero: HeroCredit): string => (hero.className ? t("projectFinish.credits.hero", { name: hero.name, class: hero.className }) : hero.name);

let isDone = false;

const finish = () => {
  if (isDone) return;
  isDone = true;
  play$fx("select");
  emit("done");
};
</script>

<style lang="scss" scoped>
// Cream text on the theme's window colour, in the HUD font, from the Game Style tokens (--gs-*)
.credits-roll {
  position: fixed;
  inset: 0;
  z-index: 30000;
  background: var(--gs-window, var(--xp-app-bg));
  color: var(--gs-text);
  font-family: "StatusPlz", var(--gs-font), monospace;
  text-align: center;
  text-shadow: var(--gs-text-shadow, none);
}

.credits-roll__stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

// The scroll starts just below the screen and rises until its end stands in the middle, where it holds for a beat
.credits-roll__scroll {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  box-sizing: border-box;
  max-width: 560px;
  margin: 0 auto;
  padding: 0 24px;
  animation: credits-rise var(--credits-seconds, 40s) linear forwards;
}

.credits-roll__part {
  margin-bottom: 72px;
}

.credits-roll__title {
  margin: 0 0 20px;
  color: var(--gs-accent);
  font-family: "StatusPlz", var(--gs-font-title), monospace;
  font-size: 1.5rem;
  font-weight: normal;
  line-height: 1.3;
}

.credits-roll__line,
.credits-roll__early {
  margin: 0 0 6px;
  font-size: 1rem;
  line-height: 1.4;
}

.credits-roll__early {
  margin-bottom: 36px;
  color: var(--gs-accent);
}

.credits-roll__hero {
  margin-bottom: 32px;
}

.credits-roll__name {
  margin: 0 0 8px;
  color: var(--gs-accent);
  font-size: 1.15rem;
  font-weight: normal;
}

.credits-roll__maker {
  margin: 0 0 28px;
}

.credits-roll__role {
  margin: 0 0 6px;
  color: var(--gs-text-dim);
  font-size: 0.9rem;
}

.credits-roll__who {
  margin: 0;
  font-size: 1.2rem;
}

.credits-roll__thanks {
  margin: 0 0 40vh;
  color: var(--gs-accent);
  font-size: 1.5rem;
  line-height: 1.3;
}

.credits-roll__skip {
  position: absolute;
  right: 16px;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  min-width: 88px;
  min-height: 44px;
  padding: 0 16px;
  background: var(--gs-button, transparent);
  border: 2px solid var(--gs-text-dim);
  border-radius: var(--gs-radius, 1px);
  color: var(--gs-text);
  font-family: inherit;
  font-size: 1rem;
  cursor: pointer;

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid var(--gs-accent);
    outline-offset: 2px;
  }
}

@keyframes credits-rise {
  0% {
    transform: translateY(0);
  }
  94% {
    transform: translateY(calc(-100% - 12vh));
  }
  100% {
    transform: translateY(calc(-100% - 12vh));
  }
}

// No motion asked for: the roll stands still and can be read by scrolling it; Skip closes it
@media (prefers-reduced-motion: reduce) {
  .credits-roll__stage {
    overflow-y: auto;
  }

  .credits-roll__scroll {
    position: static;
    padding-top: 32px;
    animation: none;
  }

  .credits-roll__thanks {
    margin-bottom: 96px;
  }
}
</style>
