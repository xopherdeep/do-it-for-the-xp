<template>
  <div class="xp-xp-bar" v-if="stats">
    <div class="progress-track">
      <div 
        class="progress-fill xp" 
        :style="{ width: xpProgress + '%' }"
      >
        <div class="progress-shine"></div>
      </div>
      
      <div class="bar-labels">
        <div class="label-left">
          <i :class="`fad ${POINT_ICONS.xp.icon} xp-icon`"></i>
          <span class="unit">XP</span>
          <span class="value">{{ formatNumber(stats.xp?.now || 0) }}</span>
        </div>
        <div class="label-right">
          <span class="lvl-prefix">LVL</span>
          <span class="lvl-val">{{ (stats.level || 0) + 1 }}</span>
          <span class="at-sign">@</span>
          <span class="next-val">{{ formatNumber(stats.xp?.next_level || 0) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { POINT_ICONS } from "@/constants";

export default defineComponent({
  name: "xp-xp-bar",
  props: {
    stats: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const xpProgress = computed(() => {
      const now = props.stats?.xp?.now || 0;
      const next = props.stats?.xp?.next_level || 100;
      return (now / Math.max(next, 1)) * 100;
    });

    const formatNumber = (num: number) => {
      return num.toLocaleString();
    };

    return {
      POINT_ICONS,
      xpProgress,
      formatNumber
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-xp-bar {
  width: 100%;
  padding: 0;
  pointer-events: none;
  z-index: 5000;
  font-family: 'StatusPlz', sans-serif;
  margin: 0;
  background: rgba(0, 0, 0, 0.4);

  .progress-track {
    width: 100%;
    height: 20px;
    background: rgba(0, 0, 0, 0.6);
    border-bottom: 1px solid rgba(0, 0, 0, 0.5);
    overflow: hidden;
    position: relative;
    margin: 0;
  }

  .bar-labels {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 15px;
    z-index: 10;
    text-shadow: 0 1px 4px rgba(0,0,0,0.9);

    .label-left, .label-right {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.7rem;
      font-weight: 900;
      color: #fff;
      letter-spacing: 1px;
    }

    .xp-icon {
      font-size: 1rem;
      color: #44ff66;
      filter: drop-shadow(0 0 5px rgba(68, 255, 102, 0.8));
    }

    .unit, .lvl-prefix, .at-sign {
      font-size: 0.6rem;
      opacity: 0.7;
      font-weight: 700;
      margin-left: -2px;
    }
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #1a6e2e, #44ff66, #1a6e2e);
    background-size: 200% 100%;
    animation: mmo-xp-flow 4s linear infinite;
    box-shadow: 0 0 15px rgba(68, 255, 102, 0.4);
    transition: width 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    z-index: 1;

    .progress-shine {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.15),
        transparent
      );
    }
  }
}

@keyframes mmo-xp-flow {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
</style>
