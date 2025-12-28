<template>
  <div class="xp-gp-bar" v-if="stats">
    <div class="progress-track">
      <div 
        class="progress-fill gp" 
        :style="{ width: gpProgress + '%' }"
      >
        <div class="progress-shine"></div>
      </div>
      
      <div class="bar-labels">
        <div class="label-left">
          <i :class="`fad ${POINT_ICONS.gp?.icon || 'fa-coin'} gp-icon`"></i>
          <span class="unit">GP</span>
          <span class="value">{{ formatNumber(stats.gp?.wallet || 0) }}</span>
        </div>
        <div class="label-right">
          <span class="limit-val">{{ formatNumber(gpLimit) }}</span>
          <span class="limit-label">LIMIT</span>
          <i class="fad fa-wallet gp-wallet-icon"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { POINT_ICONS } from "@/constants";

export default defineComponent({
  name: "xp-gp-bar",
  props: {
    stats: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const gpLimit = computed(() => props.stats?.gp?.limit || 1000);
    
    const gpProgress = computed(() => {
      const wallet = props.stats?.gp?.wallet || 0;
      return (wallet / Math.max(gpLimit.value, 1)) * 100;
    });

    const formatNumber = (num: number) => {
      return num.toLocaleString();
    };

    return {
      POINT_ICONS,
      gpProgress,
      gpLimit,
      formatNumber
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-gp-bar {
  width: 100%;
  padding: 0; // Seamless stack
  pointer-events: none;
  z-index: 5000;
  font-family: 'StatusPlz', sans-serif;
  margin: 0;
  background: rgba(0, 0, 0, 0.4);

  .progress-track {
    width: 100%;
    height: 20px;
    background: rgba(0, 0, 0, 0.6);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    // border-bottom: 1px solid rgba(0, 0, 0, 0.5); // Removed to merge with XP bar visual
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

    .gp-icon, .gp-wallet-icon {
      font-size: 1rem;
      color: #ffcc00;
      filter: drop-shadow(0 0 5px rgba(255, 204, 0, 0.8));
    }

    .unit, .limit-label {
      font-size: 0.6rem;
      opacity: 0.7;
      font-weight: 700;
      margin-left: -2px;
    }
    
    .limit-label {
      margin-left: 2px;
      margin-right: 2px;
    }
  }

  .progress-fill {
    height: 100%;
    // Gold gradient
    background: linear-gradient(90deg, #b8860b, #ffd700, #b8860b);
    background-size: 200% 100%;
    animation: mmo-gp-flow 4s linear infinite;
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
    transition: width 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    z-index: 1;

    .progress-shine {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.25),
        transparent
      );
    }
  }
}

@keyframes mmo-gp-flow {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
</style>
