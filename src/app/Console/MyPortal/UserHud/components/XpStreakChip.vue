<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { alertController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { useHeroStreak } from "@/hooks/useHeroStreak";
import { lostYesterday } from "@/lib/services/streaks/dailyStreak";
import { streakAriaLabel, streakChipLabel, streakHeader, streakLines } from "@/lib/services/streaks/streakCopy";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The daily streak flame on the HUD (services/streaks/dailyStreak.ts): the days in a row, lit once today is kept and
 * flickering while it is at risk; grey with a 0 on the day after a streak ended. Shields show as small pips. A tap
 * opens the streak box: days, next chest, shields, best. Draws nothing with streaks switched off, or with no streak.
 */
const route = useRoute();
const userStore = useUserStore();

/** The hero on this screen: the route's hero, else whoever is playing */
const heroId = computed(() => String(route.params.userId || userStore.currentUser?.id || ""));
const { streak, enabled } = useHeroStreak(heroId);

const justLost = computed(() => lostYesterday(streak.value) && streak.value.current === 0);
const visible = computed(() => enabled.value && (streak.value.current > 0 || justLost.value));
const label = computed(() => streakChipLabel(streak.value) || "0");

const openStreakBox = async () => {
  play$fx("openMenu");
  const lines = streakLines(streak.value)
    .map((line) => `<p>${line}</p>`)
    .join("");
  const alert = await alertController.create({
    header: streakHeader(streak.value),
    message: lines,
    cssClass: "rpg-alert streak-alert",
    buttons: [{ text: "OK", role: "cancel", handler: () => play$fx("closeMenu") }],
  });
  await alert.present();
};
</script>

<template>
  <button
    v-if="visible"
    type="button"
    class="streak-chip"
    :class="{ kept: streak.doneToday, 'at-risk': streak.atRisk, lost: justLost }"
    data-cy="streak-chip"
    :aria-label="justLost ? 'Your streak ended. Finish a quest to start a new one.' : streakAriaLabel(streak)"
    @click.stop="openStreakBox"
  >
    <i class="fad fa-fire" aria-hidden="true" />
    <span class="streak-days">{{ label }}</span>
    <span v-if="streak.shields > 0" class="streak-shields" aria-hidden="true">
      <i v-for="n in streak.shields" :key="n" class="fad fa-shield" />
    </span>
  </button>
</template>

<style lang="scss" scoped>
.streak-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 20px;
  padding: 1px 7px;
  border: 2px solid #ffe3b0;
  border-radius: 3px;
  background: linear-gradient(180deg, #5a3a12, #2b1a06);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.55);
  color: #fff;
  font-family: "StatusPlz", sans-serif;
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 1px;
  line-height: 1;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  // The HUD lets touches through; the chip is the one part that listens
  pointer-events: auto;
  cursor: pointer;

  .fa-fire {
    font-size: 0.8rem;
    --fa-primary-color: #ffd23f;
    --fa-secondary-color: #ff6a00;
    --fa-secondary-opacity: 1;
  }

  .streak-shields {
    display: inline-flex;
    gap: 1px;
    font-size: 0.55rem;
    --fa-primary-color: #bfe3ff;
    --fa-secondary-color: #4a8fd1;
  }

  &.kept {
    background: linear-gradient(180deg, #d96b0c, #8a2f00);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.55), 0 0 10px rgba(255, 140, 0, 0.55);
  }

  &.at-risk .fa-fire {
    animation: streak-flicker 1.2s steps(2) infinite;
  }

  &.lost {
    border-color: #9a9a9a;
    background: linear-gradient(180deg, #4a4a4a, #222);
    color: #ccc;

    .fa-fire {
      --fa-primary-color: #888;
      --fa-secondary-color: #555;
    }
  }
}

@keyframes streak-flicker {
  0% { opacity: 1; }
  50% { opacity: 0.35; }
  100% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .streak-chip.at-risk .fa-fire {
    animation: none;
    opacity: 0.6;
  }
}
</style>
