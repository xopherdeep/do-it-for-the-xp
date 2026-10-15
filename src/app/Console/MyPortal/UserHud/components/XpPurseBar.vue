<template>
  <div class="xp-purse-bar" v-if="stats">
    <!-- XP fills from the left (progress to the next level), GP from the right (wallet against its limit) -->
    <div class="pool xp">
      <div class="fill" :style="{ width: xpProgress + '%' }"></div>
      <!-- A gain glints across the pool and floats its amount up; keyed on the count so each change plays once -->
      <div v-if="xpCount.pulse.value" :key="`xp-flash-${xpCount.pulse.value}`" class="flash"
        :class="xpCount.delta.value > 0 ? 'is-gain' : 'is-spend'" aria-hidden="true"></div>
      <span v-if="xpCount.delta.value > 0" :key="`xp-delta-${xpCount.pulse.value}`" class="delta"
        aria-hidden="true">+{{ format(xpCount.delta.value) }}</span>
      <div class="label">
        <i :class="`fad ${POINT_ICONS.xp.icon}`"></i>
        <span class="unit">XP</span>
        <span class="value">{{ format(xpInLevel) }}</span>
        <span class="slash">/</span>
        <span class="max">{{ format(xpNeeded) }}</span>
        <span class="unit">LVL</span>
        <span class="value">{{ level }}</span>
      </div>
    </div>
    <div class="pool gp">
      <div class="fill" :style="{ width: gpProgress + '%' }"></div>
      <div v-if="gpCount.pulse.value" :key="`gp-flash-${gpCount.pulse.value}`" class="flash"
        :class="gpCount.delta.value > 0 ? 'is-gain' : 'is-spend'" aria-hidden="true"></div>
      <span v-if="gpCount.delta.value" :key="`gp-delta-${gpCount.pulse.value}`" class="delta"
        :class="{ 'is-spend': gpCount.delta.value < 0 }" aria-hidden="true">{{ signed(gpCount.delta.value) }}</span>
      <div class="label">
        <span class="value">{{ format(wallet) }}</span>
        <span class="slash">/</span>
        <span class="max">{{ format(limit) }}</span>
        <span class="unit">GP</span>
        <i :class="`fad ${POINT_ICONS.gp?.icon || 'fa-coin'}`"></i>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { POINT_ICONS } from "@/constants";
import { getXpForLevel } from "@/lib/services/stats/PlayerStatsService";
import { walletLimitOf } from "@/lib/services/gp/wallet";
import { useCountUp } from "@/hooks/useCountUp";

/**
 * GP and XP on one hairline, for screens with no room for two bars (the temples). The numbers roll to a new total
 * instead of jumping, the pool glints, and the amount floats up, so a win or a purchase is felt at the top of the screen.
 */
export default defineComponent({
  name: "xp-purse-bar",
  props: {
    stats: { type: Object, required: true },
  },
  setup(props) {
    const gpCount = useCountUp(() => Number(props.stats?.gp?.wallet) || 0);
    const xpCount = useCountUp(() => Number(props.stats?.xp?.now) || 0);

    const wallet = computed(() => gpCount.shown.value);
    const limit = computed(() => walletLimitOf(props.stats?.gp));
    const gpProgress = computed(() => Math.max(0, Math.min(100, (wallet.value / Math.max(1, limit.value)) * 100)));

    const level = computed(() => Number(props.stats?.level) || 1);
    // Counted from the rolling total: right after a level up it starts from an empty bar and fills to where it lands
    const xpInLevel = computed(() => Math.max(0, xpCount.shown.value - getXpForLevel(level.value)));
    const xpNeeded = computed(() => Math.max(1, getXpForLevel(level.value + 1) - getXpForLevel(level.value)));
    const xpProgress = computed(() => Math.min(100, (xpInLevel.value / xpNeeded.value) * 100));

    const format = (n: number) => n.toLocaleString();
    const signed = (n: number) => (n > 0 ? `+${format(n)}` : `\u2212${format(-n)}`);
    return { POINT_ICONS, gpCount, xpCount, signed, wallet, limit, gpProgress, level, xpInLevel, xpNeeded, xpProgress, format };
  },
});
</script>

<style lang="scss" scoped>
.xp-purse-bar {
  display: flex;
  width: 100%;
  height: 20px;
  // A 25% track, same tint as the nav: the empty part of each bar shows the page behind it
  background: rgba(16, 12, 28, 0.25);
  font-family: "StatusPlz", sans-serif;
  pointer-events: none;

  .pool {
    position: relative;
    flex: 1;
    overflow: hidden;

    .fill {
      position: absolute;
      top: 0;
      bottom: 0;
      // The rolling number drives the width frame by frame; this only smooths the steps between frames
      transition: width 0.12s linear;
    }

    .flash {
      position: absolute;
      inset: 0;
      pointer-events: none;

      &.is-gain {
        background: linear-gradient(100deg, transparent 20%, rgba(255, 255, 255, 0.55) 50%, transparent 80%) no-repeat;
        background-size: 40% 100%;
        animation: purse-glint 0.8s ease-out forwards;
      }

      &.is-spend {
        background: rgba(255, 70, 70, 0.35);
        animation: purse-dim 0.5s ease-out forwards;
      }
    }

    .delta {
      position: absolute;
      top: 1px;
      font-size: 0.7rem;
      font-weight: 900;
      color: #fff;
      text-shadow: 0 0 6px rgba(68, 255, 102, 0.9), 0 1px 3px rgba(0, 0, 0, 0.9);
      animation: purse-delta 1.1s ease-out forwards;

      &.is-spend {
        text-shadow: 0 0 6px rgba(255, 90, 90, 0.9), 0 1px 3px rgba(0, 0, 0, 0.9);
      }
    }

    .label {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 0 12px;
      font-size: 0.7rem;
      font-weight: 900;
      color: #fff;
      letter-spacing: 1px;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);

      i {
        font-size: 0.95rem;
      }

      .unit,
      .slash {
        font-size: 0.6rem;
        opacity: 0.7;
      }
    }
  }

  .xp .fill {
    left: 0;
    background: linear-gradient(90deg, #1a6e2e, #44ff66);
    box-shadow: 0 0 12px rgba(68, 255, 102, 0.35);
  }

  .xp .label i {
    color: #44ff66;
  }

  // Each pool floats its amount up out of its own middle, away from the numbers at its edge
  .xp .delta {
    right: 14px;
  }

  .gp .delta {
    left: 14px;
    text-shadow: 0 0 6px rgba(242, 193, 78, 0.95), 0 1px 3px rgba(0, 0, 0, 0.9);
  }

  .gp {
    border-left: 1px solid rgba(255, 255, 255, 0.12);

    .fill {
      right: 0;
      background: linear-gradient(270deg, #7a5a10, #f2c14e);
      box-shadow: 0 0 12px rgba(242, 193, 78, 0.35);
    }

    .label {
      justify-content: flex-end;

      i {
        color: #f2c14e;
      }
    }
  }
}

@keyframes purse-glint {
  from {
    background-position: -60% 0;
    opacity: 1;
  }

  to {
    background-position: 160% 0;
    opacity: 0;
  }
}

@keyframes purse-dim {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

@keyframes purse-delta {
  0% {
    opacity: 0;
    transform: translateY(6px) scale(0.8);
  }

  20% {
    opacity: 1;
    transform: translateY(0) scale(1.15);
  }

  70% {
    opacity: 1;
    transform: translateY(-2px) scale(1);
  }

  100% {
    opacity: 0;
    transform: translateY(-8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .xp-purse-bar .pool .flash,
  .xp-purse-bar .pool .delta {
    animation: none;
    opacity: 0;
  }
}
</style>
