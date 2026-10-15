<template>
  <teleport to="body">
    <transition name="rewards-pop">
      <div v-if="rewardsOverlay.card" class="xp-rewards-overlay" data-test="rewards-overlay">
        <BattleVictoryCard :visible="true" :card="rewardsOverlay.card" @continue="onContinue" @rolling="onRolling"
          @land="onLand" />
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";
import { play$fx } from "@/assets/fx";
import { feel, rumble } from "@/lib/services/feedback/haptics";
import BattleVictoryCard from "@/app/Console/BattleField/components/BattleVictoryCard.vue";
import { closeRewards, rewardsOverlay } from "./rewardsOverlay";

/**
 * The battle's victory card, for loot earned anywhere else (a quest marked done in the Beast Log). It sounds like the
 * battle's: a fanfare (the level-up one when the hero levels), the points roll while the tiles count, a chime as each lands.
 * It feels like it too: a success buzz on the fanfare (a double slam first for a level up), a tick as each tile lands.
 */
type Stat = "xp" | "gp" | "ap";
/** A level up lands as a slam, then the success buzz once the slam's second hit is through */
const LEVEL_UP_SUCCESS_MS = 220;
const LANDING: Record<Stat, string> = { xp: "select", gp: "gp", ap: "select" };

watch(
  () => rewardsOverlay.card,
  (card, previous) => {
    if (!card || card === previous) return;
    play$fx(card.levelUp ? "levelUp" : "win");
    if (card.levelUp) rumble([[0, "slam"], [LEVEL_UP_SUCCESS_MS, "success"]]);
    else feel("success");
  },
);

const onRolling = (on: boolean) => (on ? play$fx("fillPoints") : play$fx("fillPoints", { stop: true }));
const onLand = (stat: Stat) => {
  play$fx(LANDING[stat]);
  feel("tick");
};

const onContinue = () => {
  play$fx("cursor");
  closeRewards();
};

onBeforeUnmount(() => play$fx("fillPoints", { stop: true }));
</script>

<style lang="scss" scoped>
// Above the app and any closing Ionic modal (Ionic's overlays start at 20000)
.xp-rewards-overlay {
  position: fixed;
  inset: 0;
  z-index: 30000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.55);
}

.rewards-pop-enter-active {
  animation: rewards-pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.35);
}

.rewards-pop-leave-active {
  transition: opacity 0.2s ease;
}

.rewards-pop-leave-to {
  opacity: 0;
}

@keyframes rewards-pop {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rewards-pop-enter-active {
    animation: none;
  }
}
</style>
