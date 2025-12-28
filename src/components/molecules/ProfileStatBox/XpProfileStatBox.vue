<template>
  <div
    class="profile-stat-box"
    :class="[`${type}-box`, boxClass]"
    @click="handleClick"
  >
    <div
      class="stat-icon"
      :class="iconAnimationClass"
    >
      <i :class="`fad ${icon} fa-2x`"></i>
    </div>

    <xp-label variant="stat">{{ label }}</xp-label>

    <div class="progress-track">
      <div
        class="progress-fill"
        :class="type"
        :style="{ width: (progress * 100) + '%' }"
      >
        <div class="progress-shine"></div>
      </div>
    </div>

    <xp-text
      variant="value"
      class="stat-value"
    >
      <template v-if="isPercentage">{{ displayCurrent }}%</template>
      <template v-else>{{ displayCurrent }}/{{ displayMax }}</template>
    </xp-text>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { abbreviateNumber } from '@/lib/utils/format';
import XpLabel from '@/components/atoms/Label/XpLabel.vue';
import XpText from '@/components/atoms/Text/XpText.vue';

export default defineComponent({
  name: 'XpProfileStatBox',
  components: {
    XpLabel,
    XpText
  },
  props: {
    type: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    color: {
      type: String,
      default: 'primary'
    },
    current: {
      type: [Number, String],
      default: 0
    },
    max: {
      type: [Number, String],
      default: 100
    },
    progress: {
      type: Number,
      default: 0
    },
    isPercentage: {
      type: Boolean,
      default: false
    },
    boxClass: {
      type: String,
      default: ''
    }
  },
  emits: ['click'],
  setup(props) {
    const iconAnimationClass = computed(() => {
      const animationMap: Record<string, string> = {
        hp: 'pulse-animation',
        mp: 'sparkle-animation',
        gp: 'tilt-animation',
        xp: 'grow-animation',
        ap: '' // AP uses fa-spin on the icon itself
      };
      return animationMap[props.type] || '';
    });

    const displayCurrent = computed(() => {
      if (props.isPercentage) return props.current;
      return abbreviateNumber(Number(props.current), 1);
    });

    const displayMax = computed(() => {
      return abbreviateNumber(Number(props.max), 1);
    });

    return { iconAnimationClass, displayCurrent, displayMax };
  },
  methods: {
    handleClick() {
      this.$emit('click');
    }
  }
});
</script>

<style lang="scss" scoped>
  .profile-stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 16px 8px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    height: 100%;
    cursor: pointer;
    overflow: hidden;
    text-align: center;

    &:hover {
      transform: translateY(-2px);
      background: rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      border-color: rgba(255, 255, 255, 0.2);
    }

    &:active {
      transform: translateY(0);
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      margin-bottom: 4px;

      i {
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
      }
    }

    .stat-value {
      font-size: 0.5rem !important;
      margin-top: 4px;
    }

    .progress-track {
      flex: none;
      /* Override flex: 1 from previous styling if needed, but flex:1 in column is usually 100% width */
      width: 100%;
      height: 8px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      position: relative;
      transition: width 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      overflow: hidden;

      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg,
            transparent,
            rgba(255, 255, 255, 0.35),
            transparent);
        animation: progress-shine-flow 2.5s linear infinite;
      }

      // Type-specific colors
      &.hp {
        background: linear-gradient(90deg, #8b0000, #ff4444);
      }

      &.mp {
        background: linear-gradient(90deg, #1a3a6e, #6699ff);
      }

      &.gp {
        background: linear-gradient(90deg, #8b6914, #ffcc00);
      }

      &.xp {
        background: linear-gradient(90deg, #1a6e2e, #44ff66);
      }

      &.ap {
        background: linear-gradient(90deg, #4a1a6e, #aa66ff);
      }
    }

    .progress-shine {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 50%;
      background: rgba(255, 255, 255, 0.2);
      pointer-events: none;
    }
  }

  // Icon animations
  .pulse-animation {
    animation: icon-pulse 2s infinite ease-in-out;
    color: var(--ion-color-danger);
  }

  .sparkle-animation {
    animation: icon-sparkle 3s infinite ease-in-out;
  }

  .tilt-animation {
    animation: icon-tilt 4s infinite ease-in-out;
  }

  .grow-animation {
    animation: icon-grow 6s infinite ease-in-out;
  }

  @keyframes progress-shine-flow {
    0% {
      transform: translateX(-100%);
    }

    100% {
      transform: translateX(100%);
    }
  }

  @keyframes icon-pulse {

    0%,
    100% {
      transform: scale(1);
      filter: drop-shadow(0 0 0px currentColor);
    }

    50% {
      transform: scale(1.15);
      filter: drop-shadow(0 0 6px currentColor);
    }
  }

  @keyframes icon-sparkle {

    0%,
    100% {
      filter: brightness(1);
    }

    50% {
      filter: brightness(1.3);
    }
  }

  @keyframes icon-tilt {

    0%,
    100% {
      transform: rotate(0deg);
    }

    25% {
      transform: rotate(8deg);
    }

    75% {
      transform: rotate(-8deg);
    }
  }

  @keyframes icon-grow {

    0%,
    100% {
      transform: scale(0.65);
    }

    50% {
      transform: scale(1.45);
    }
  }
</style>
