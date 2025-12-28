<template>
  <div 
    class="xp-hud-bar" 
    :class="[color, { 'flipped': flipped }]"
    :style="barStyle"
  >
    <div class="progress-track">
      <div 
        class="progress-fill" 
        :style="fillStyle"
      >
        <div class="progress-shine"></div>
        <div class="progress-pulse" v-if="pulse"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";

export default defineComponent({
  name: "xp-hud-bar",
  props: {
    progress: {
      type: Number,
      required: true,
      default: 0
    },
    color: {
      type: String,
      default: "hp" // hp, mp, xp, ap
    },
    flipped: {
      type: Boolean,
      default: false
    },
    pulse: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const barStyle = computed(() => ({
      direction: props.flipped ? 'rtl' : 'ltr'
    } as any));

    const fillStyle = computed(() => ({
      width: `${Math.min(Math.max(props.progress, 0), 100)}%`
    }));

    return {
      barStyle,
      fillStyle
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-hud-bar {
  width: 100%;
  height: 12px;
  position: relative;

  .progress-track {
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
    border-radius: 6px;
    overflow: hidden;
    position: relative;
  }

  .progress-fill {
    height: 100%;
    position: relative;
    transition: width 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    border-radius: 4px;

    &::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      animation: bar-glow 3s linear infinite;
    }
  }

  &.hp .progress-fill {
    background: linear-gradient(90deg, #8b0000, #ff4444);
    box-shadow: 0 0 10px rgba(255, 68, 68, 0.3);
  }

  &.mp .progress-fill {
    background: linear-gradient(90deg, #1a3a6e, #6699ff);
    box-shadow: 0 0 10px rgba(102, 153, 255, 0.3);
  }

  &.ap .progress-fill {
    background: linear-gradient(90deg, #b388ff, #7c4dff);
    box-shadow: 0 0 10px rgba(124, 77, 255, 0.3);
  }

  @keyframes bar-glow {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
}
</style>
