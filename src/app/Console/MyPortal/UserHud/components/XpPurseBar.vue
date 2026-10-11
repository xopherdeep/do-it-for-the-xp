<template>
  <div class="xp-purse-bar" v-if="stats">
    <!-- XP fills from the left (progress to the next level), GP from the right (wallet against its limit) -->
    <div class="pool xp">
      <div class="fill" :style="{ width: xpProgress + '%' }"></div>
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

/** GP and XP on one hairline, for screens with no room for two bars (the temples). */
export default defineComponent({
  name: "xp-purse-bar",
  props: {
    stats: { type: Object, required: true },
  },
  setup(props) {
    const wallet = computed(() => Number(props.stats?.gp?.wallet) || 0);
    const limit = computed(() => walletLimitOf(props.stats?.gp));
    const gpProgress = computed(() => Math.max(0, Math.min(100, (wallet.value / Math.max(1, limit.value)) * 100)));

    const level = computed(() => Number(props.stats?.level) || 1);
    const xpInLevel = computed(() => Math.max(0, (Number(props.stats?.xp?.now) || 0) - getXpForLevel(level.value)));
    const xpNeeded = computed(() => Math.max(1, getXpForLevel(level.value + 1) - getXpForLevel(level.value)));
    const xpProgress = computed(() => Math.min(100, (xpInLevel.value / xpNeeded.value) * 100));

    const format = (n: number) => n.toLocaleString();
    return { POINT_ICONS, wallet, limit, gpProgress, level, xpInLevel, xpNeeded, xpProgress, format };
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
      transition: width 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
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
</style>
