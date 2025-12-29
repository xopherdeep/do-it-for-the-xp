<template>
  <div class="xp-main-hud" v-if="stats">
    <div class="hud-organism">
      
      <!-- LEFT WING: HP -->
      <div class="hud-wing left">
        <div class="wing-content-stack">
          <div class="bar-row">
            <xp-hud-bar 
              :progress="hpProgress" 
              color="hp" 
              :flipped="true"
            />
          </div>
          <div class="stat-row stat-unit">
            <div class="stat-group">
              <span class="stat-value now">{{ formatNumber(stats.hp.now) }}</span>
              <span class="stat-divider">/</span>
              <span class="stat-value max">{{ formatNumber(stats.hp.max) }}</span>
            </div>
            <span class="stat-label">HP</span>
          </div>
        </div>
        <div class="wing-icon-col">
          <i :class="`fad ${POINT_ICONS.hp.icon} hp-icon`" :style="heartStyle"></i>
        </div>
      </div>

      <!-- CENTER: AVATAR / USER FAB -->
      <div class="hud-center">
        <div class="avatar-anchor">
          <slot name="avatar"></slot>
        </div>
      </div>

      <!-- RIGHT WING: MP -->
      <div class="hud-wing right">
        <div class="wing-icon-col">
          <i :class="`fad ${POINT_ICONS.mp.icon} mp-icon`"></i>
        </div>
        <div class="wing-content-stack">
          <div class="bar-row">
            <xp-hud-bar 
              :progress="mpProgress" 
              color="mp" 
              :flipped="false"
            />
          </div>
          <div class="stat-row stat-unit">
            <span class="stat-label">MP</span>
            <div class="stat-group">
              <span class="stat-value now">{{ formatNumber(stats.mp.now) }}</span>
              <span class="stat-divider">/</span>
              <span class="stat-value max">{{ formatNumber(stats.mp.max) }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { POINT_ICONS } from "@/constants";
import XpHudBar from "./XpHudBar.vue";

export default defineComponent({
  name: "xp-main-hud",
  components: { XpHudBar },
  props: {
    stats: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const hpProgress = computed(() => {
      if (!props.stats?.hp) return 0;
      return (props.stats.hp.now / Math.max(props.stats.hp.max, 1)) * 100;
    });

    const mpProgress = computed(() => {
      if (!props.stats?.mp) return 0;
      return (props.stats.mp.now / Math.max(props.stats.mp.max, 1)) * 100;
    });


    const heartStyle = computed(() => {
      // We can add the pulse logic here if needed, or keep it in SCSS
      return {};
    });

    const formatNumber = (num: number) => {
      return num ? num.toLocaleString() : "0";
    };

    return {
      POINT_ICONS,
      hpProgress,
      mpProgress,
      heartStyle,
      formatNumber
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-main-hud {
  position: fixed;
  top: 10px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 1500;
  font-family: 'StatusPlz', sans-serif;

  .hud-organism {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    width: 95vw;
    max-width: 800px;
    pointer-events: none;
  }

  .hud-wing {
    flex: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding-top: 5px;

    &.left {
      justify-content: flex-end;
      .wing-content-stack { align-items: flex-end; }
      .label-row, .stat-row { justify-content: flex-end; }
    }

    &.right {
      justify-content: flex-start;
      .wing-content-stack { align-items: flex-start; }
      .label-row, .stat-row { justify-content: flex-start; }
    }

    .wing-icon-col {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      flex-shrink: 0;
    }

    .wing-content-stack {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 0;
      padding: 0;
      max-width: 200px;

      .stat-row, .bar-row, .label-row {
        display: flex;
        width: 100%;
        margin: 0;
        padding: 0;
        line-height: 1;
      }

      .label-row {
        margin-bottom: -2px;
      }

      .bar-row {
        margin: 0;
        z-index: 5;
      }

      .stat-row {
        margin-top: -1px;
        align-items: baseline;
        gap: 4px;

        .stat-divider {
          font-size: 1.0rem;
          opacity: 0.8;
          margin: 0 3px;
          font-family: 'Twoson', sans-serif;
        }
      }
    }
  }

  .hud-center {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    pointer-events: auto;
    width: 70px;
    margin-top: -12px;

    .avatar-anchor {
      position: relative;
      z-index: 10;
    }

    .center-bottom {
      margin-top: -5px;
    }

  }

  .stat-unit {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-top: 1px; // Slight spacing from bar

    .stat-group {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .stat-label {
      font-size: 1.0rem;
      font-weight: 900;
      opacity: 0.9;
      color: #eeffaa; // Slight yellow tint for retro feel or strict white #fff
      text-shadow: 0 1px 3px rgba(0,0,0,1);
      font-family: 'Twoson', sans-serif;
    }

    .stat-value {
      font-weight: 900;
      color: #fff;
      text-shadow: 0 2px 4px rgba(0,0,0,0.8);
      letter-spacing: 1px;

      &.now {
        font-size: 1.1rem;
      }

      &.max {
        font-size: 0.85rem;
        opacity: 0.6;
      }
    }
  }

  i {
    font-size: 2.2rem;
    filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
    width: 40px;
    text-align: center;
    
    &.hp-icon {
      color: #ff3333;
      --fa-secondary-color: #ff0000;
      --fa-secondary-opacity: 1;
      --fa-primary-color: #880000; // Base EKG color
      animation: heartbeat 2s infinite ease-in-out;
      transform-origin: center;
    }

    &.mp-icon {
      color: var(--ion-color-tertiary);
      animation: mp-glow 3s infinite alternate ease-in-out;
    }
  }
}

@keyframes heartbeat {
  0% {
    transform: scale(1);
    filter: drop-shadow(0 0 2px rgba(80, 0, 0, 0.5));
    --fa-primary-color: #660000;
    --fa-primary-opacity: 0.6;
  }
  50% {
    transform: scale(1.1);
    filter: drop-shadow(0 0 15px rgba(220, 20, 60, 0.8)); // Crimson glow
    --fa-primary-color: #ff3333;
    --fa-primary-opacity: 1;
  }
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 2px rgba(80, 0, 0, 0.5));
    --fa-primary-color: #660000;
    --fa-primary-opacity: 0.6;
  }
}

@keyframes mp-glow {
  0% { transform: rotate(-5deg); filter: drop-shadow(0 0 5px rgba(var(--ion-color-tertiary-rgb), 0.4)); }
  100% { transform: rotate(5deg); filter: drop-shadow(0 0 15px rgba(var(--ion-color-tertiary-rgb), 0.8)); }
}
</style>
