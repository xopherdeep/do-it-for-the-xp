<template>
  <div class="xp-vitals-bar" v-if="stats">
    <!-- HP fills from the left, MP from the right: one hairline, two vitals -->
    <div class="vital hp">
      <div class="fill" :style="{ width: hpProgress + '%' }"></div>
      <div class="label">
        <i :class="`fad ${POINT_ICONS.hp.icon}`"></i>
        <span class="unit">HP</span>
        <span class="value">{{ stats.hp?.now ?? 0 }}</span>
        <span class="slash">/</span>
        <span class="max">{{ stats.hp?.max ?? 0 }}</span>
      </div>
    </div>
    <div class="vital mp">
      <div class="fill" :style="{ width: mpProgress + '%' }"></div>
      <div class="label">
        <span class="max">{{ stats.mp?.max ?? 0 }}</span>
        <span class="slash">/</span>
        <span class="value">{{ stats.mp?.now ?? 0 }}</span>
        <span class="unit">MP</span>
        <i :class="`fad ${POINT_ICONS.mp.icon}`"></i>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { POINT_ICONS } from "@/constants";

/** HP and MP on one hairline, for screens with no room for the full HUD (the temples). */
export default defineComponent({
  name: "xp-vitals-bar",
  props: {
    stats: { type: Object, required: true },
  },
  setup(props) {
    const pct = (pool?: { now?: number; max?: number }) => {
      const max = Math.max(1, Number(pool?.max) || 0);
      return Math.max(0, Math.min(100, ((Number(pool?.now) || 0) / max) * 100));
    };
    const hpProgress = computed(() => pct(props.stats?.hp));
    const mpProgress = computed(() => pct(props.stats?.mp));
    return { POINT_ICONS, hpProgress, mpProgress };
  },
});
</script>

<style lang="scss" scoped>
.xp-vitals-bar {
  display: flex;
  width: 100%;
  height: 20px;
  // A 25% track, same tint as the nav: the empty part of each bar shows the page behind it
  background: rgba(16, 12, 28, 0.25);
  font-family: "StatusPlz", sans-serif;
  pointer-events: none;

  .vital {
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

  .hp .fill {
    left: 0;
    background: linear-gradient(90deg, #7a1a1a, #ff4444);
    box-shadow: 0 0 12px rgba(255, 68, 68, 0.35);
  }

  .hp .label i {
    color: #ff4444;
  }

  .mp {
    border-left: 1px solid rgba(255, 255, 255, 0.12);

    .fill {
      right: 0;
      background: linear-gradient(270deg, #1a3a7a, #4488ff);
      box-shadow: 0 0 12px rgba(68, 136, 255, 0.35);
    }

    .label {
      justify-content: flex-end;

      i {
        color: #4488ff;
      }
    }
  }
}
</style>
