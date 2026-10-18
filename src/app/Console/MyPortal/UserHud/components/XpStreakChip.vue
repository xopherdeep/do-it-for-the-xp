<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { play$fx } from "@/assets/fx";
import { useHeroStreak } from "@/hooks/useHeroStreak";
import { lostYesterday } from "@/lib/services/streaks/dailyStreak";
import { streakCardModel } from "@/lib/services/streaks/streakCard";
import { streakAriaLabel, streakChipLabel } from "@/lib/services/streaks/streakCopy";
import XpStreakCard from "./XpStreakCard.vue";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The daily streak flame (as a badge on the bottom nav's Profile tab) (services/streaks/dailyStreak.ts): the days in a row, lit once today is kept and
 * flickering while it is at risk; grey with a 0 on the day after a streak ended. Shields show as small pips. A tap
 * opens the streak box: days, next chest, shields, best, and a way to Hero Records. Draws nothing with streaks
 * switched off, or with no streak.
 */
const props = withDefaults(defineProps<{ variant?: "chip" | "badge" }>(), { variant: "chip" });

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

/** The hero on this screen: the route's hero, else whoever is playing */
const heroId = computed(() => String(route.params.userId || userStore.currentUser?.id || ""));
const { streak, enabled } = useHeroStreak(heroId);

const justLost = computed(() => lostYesterday(streak.value) && streak.value.current === 0);
const visible = computed(() => enabled.value && (streak.value.current > 0 || justLost.value));
const label = computed(() => streakChipLabel(streak.value) || "0");

const isOpen = ref(false);
const card = computed(() => streakCardModel(streak.value));

const openStreakBox = (): void => {
  play$fx("openMenu");
  isOpen.value = true;
};
const closeStreakBox = (): void => {
  play$fx("closeMenu");
  isOpen.value = false;
};
const openRecords = (): void => {
  play$fx("select");
  isOpen.value = false;
  void router.push({ name: "my-records", params: { userId: heroId.value } });
};
</script>

<template>
  <button
    v-if="visible"
    type="button"
    class="streak-chip"
    :class="{ 'streak-chip--badge': props.variant === 'badge', kept: streak.doneToday, 'at-risk': streak.atRisk, lost: justLost }"
    data-cy="streak-chip"
    :aria-label="justLost ? 'Your streak ended. Finish a quest to start a new one.' : streakAriaLabel(streak)"
    @click.stop="openStreakBox"
  >
    <i class="fad fa-fire" aria-hidden="true" />
    <span class="streak-days">{{ label }}</span>
    <span v-if="streak.shields > 0 && props.variant === 'chip'" class="streak-shields" aria-hidden="true">
      <i v-for="n in streak.shields" :key="n" class="fad fa-shield" />
    </span>
  </button>
  <Teleport to="body">
    <Transition name="streak-pop">
      <div v-if="isOpen" class="streak-overlay" data-cy="streak-overlay" @click.self="closeStreakBox">
        <div class="streak-stack" role="dialog" aria-modal="true" aria-label="Daily streak">
          <XpStreakCard :model="card" />
          <div class="streak-actions">
            <button type="button" class="streak-btn" data-cy="streak-records" @click="openRecords">Records</button>
            <button type="button" class="streak-btn streak-btn--close" data-cy="streak-close" @click="closeStreakBox">
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.streak-overlay {
  position: fixed;
  inset: 0;
  z-index: 30000;
  display: grid;
  place-items: center;
  padding: 16px;
  background: radial-gradient(ellipse at 50% 40%, rgba(40, 10, 0, 0.7), rgba(0, 0, 0, 0.88));
}

.streak-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 340px;
}

.streak-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.streak-btn {
  flex: 1;
  min-height: 42px;
  border: 2px solid #3fd0c0;
  border-radius: 4px;
  background: linear-gradient(180deg, #123a3e, #061a1e);
  box-shadow: inset 0 0 0 2px #061a1e, inset 0 0 0 3px #f6e9c8, 0 3px 0 rgba(0, 0, 0, 0.6);
  color: #fff6dc;
  font-family: "StatusPlz", sans-serif;
  font-size: 0.9rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;

  &:active {
    transform: translateY(2px);
  }

  &--close {
    border-color: #ffd23f;
    background: linear-gradient(180deg, #5a3a12, #2b1a06);
  }
}

.streak-pop-enter-active,
.streak-pop-leave-active {
  transition: opacity 0.2s ease;
}

.streak-pop-enter-from,
.streak-pop-leave-to {
  opacity: 0;
}

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

  // Small enough to sit on a nav icon; the padding keeps the tap target bigger than it looks
  &--badge {
    gap: 2px;
    min-height: 16px;
    padding: 1px 4px;
    border-width: 1.5px;
    border-radius: 8px;
    font-size: 0.6rem;
    letter-spacing: 0.5px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);

    .fa-fire {
      font-size: 0.65rem;
    }

    &::after {
      content: "";
      position: absolute;
      inset: -8px;
    }
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
