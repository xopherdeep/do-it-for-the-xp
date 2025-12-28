<template>
  <div
    button
    class="stat-box clickable text-center"
    @click="handleClick"
  >
    <i :class="`fad ${iconName} fa-2x ${iconColor ? 'text-' + iconColor : ''}`"></i>
    <xp-text variant="value" class="stat-value">
      <span v-if="isNaNValue">{{ value }}</span>
      <vue3-autocounter
        v-else
        ref="counter"
        :startAmount="0"
        :endAmount="numericValue"
        :duration="1.5"
        separator=","
        :autoinit="false"
      />
    </xp-text>

    <!-- Progress / Forecast Bar -->
    <div v-if="progress >= 0" class="mini-progress-track" :class="direction">
      <!-- Faded Bar (Max Extent) -->
      <div 
        class="mini-progress-fill faded" 
        :class="iconColor ? `bg-${iconColor}` : 'bg-primary'"
        :style="{ 
          width: `${Math.max(progress, forecast !== -1 ? forecast : 0) * 100}%`,
          [direction === 'rtl' ? 'right' : 'left']: 0
        }"
      ></div>
      
      <!-- Solid Bar (Min Extent / Current) -->
      <div 
        class="mini-progress-fill solid" 
        :class="iconColor ? `bg-${iconColor}` : 'bg-primary'"
        :style="{ 
          width: `${(forecast !== -1 ? Math.min(progress, forecast) : progress) * 100}%`,
          [direction === 'rtl' ? 'right' : 'left']: 0
        }"
      ></div>
    </div>

    <div v-if="ribbon" class="ribbon-marker" :class="`bg-${ribbonColor}`">
      <span>{{ ribbon }}</span>
    </div>
    <xp-label variant="stat">{{ label }}</xp-label>
  </div>
</template>

<script lang="ts">
  import Ionic from "@/mixins/ionic";
  import { defineComponent, watch, ref, onMounted } from "vue";
  import Vue3Autocounter from 'vue3-autocounter';
  import XpLabel from "@/components/atoms/Label/XpLabel.vue";
  import XpText from "@/components/atoms/Text/XpText.vue";

  export default defineComponent({
    name: "XpStatBox",
    mixins: [Ionic],
    components: {
      'vue3-autocounter': Vue3Autocounter,
      XpLabel,
      XpText
    },
    props: {
      value: {
        type: [Number, String],
        default: 0
      },
      label: {
        type: String,
        required: true
      },
      iconName: {
        type: String,
        required: true
      },
      iconColor: {
        type: String,
        default: ""
      },
      onClick: {
        type: Function,
        default: () => { }
      },
      // Delay before starting counter (ms)
      animationDelay: {
        type: Number,
        default: 600
      },
      progress: {
        type: Number,
        default: -1 // -1 means no progress bar
      },
      forecast: {
        type: Number,
        default: -1 // -1 means no forecast (snapshot)
      },
      direction: {
        type: String,
        default: 'ltr', // 'ltr' (Default) or 'rtl'
        validator: (val: string) => ['ltr', 'rtl'].includes(val)
      },
      ribbon: {
        type: String,
        default: ""
      },
      ribbonColor: {
        type: String,
        default: "danger"
      },
      // Watch this to restart animation (use slide index)
      animationKey: {
        type: [Number, String],
        default: 0
      },
      // Is this slide currently active?
      isActive: {
        type: Boolean,
        default: true
      }
    },
    setup(props) {
      const counter = ref<any>(null);
      
      const startCounter = () => {
        if (counter.value && props.isActive) {
          // Reset and start after delay
          setTimeout(() => {
            if (counter.value?.start) {
              counter.value.start();
            }
          }, props.animationDelay);
        }
      };

      // Start on mount if active
      onMounted(() => {
        if (props.isActive) {
          startCounter();
        }
      });

      // Restart when animationKey changes (slide change)
      watch(() => props.animationKey, () => {
        if (props.isActive) {
          // Reset counter first if possible
          if (counter.value?.reset) {
            counter.value.reset();
          }
          startCounter();
        }
      });

      // Also watch isActive
      watch(() => props.isActive, (active) => {
        if (active) {
          if (counter.value?.reset) {
            counter.value.reset();
          }
          startCounter();
        }
      });

      return { counter };
    },
    computed: {
      isNaNValue(): boolean {
        return isNaN(Number(this.value));
      },
      numericValue(): number {
        return Number(this.value) || 0;
      }
    },
    methods: {
      handleClick() {
        this.onClick();
      }
    }
  });
</script>

<style lang="scss" scoped>
  .stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
    gap: 8px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    position: relative;
    overflow: visible;

    .ribbon-marker {
      position: absolute;
      top: 90%;
      right: auto;
      width: 70%;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-family: "Apple Kid", sans-serif;
      font-weight: 800;
      text-transform: uppercase;
      color: #fff;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      z-index: 10;
      letter-spacing: 2.5px;
      white-space: nowrap;
      border: 1px solid rgba(255,255,255,0.2);
    }

    .stat-value {
      font-size: 1.2rem;
      margin: 0;
    }

    .mini-progress-track {
      width: 80%;
      height: 6px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 4px;
      overflow: hidden;
      margin: 4px 0 8px 0;
      border: 1px solid rgba(255,255,255,0.1);
      position: relative; /* Context for absolute bars */

      .mini-progress-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        position: absolute;
        top: 0; 
        /* Left/Right controlled by inline style */
        
        &.faded {
          opacity: 0.3;
          z-index: 1;
        }

        &.solid {
          opacity: 1;
          z-index: 2;
        }
        
        &.bg-primary { background: var(--ion-color-primary); }
        &.bg-secondary { background: var(--ion-color-secondary); }
        &.bg-tertiary { background: var(--ion-color-tertiary); }
        &.bg-success { background: var(--ion-color-success); }
        &.bg-warning { background: var(--ion-color-warning); }
        &.bg-danger { background: var(--ion-color-danger); }
        &.bg-medium { background: var(--ion-color-medium); }
        &.bg-light { background: var(--ion-color-light); }
        &.bg-dark { background: var(--ion-color-dark); }
      }
    }

    :deep(.xp-label) {
      margin: 0;
    }

    i {
      margin: 0;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    }
  }

  .clickable {
    cursor: pointer;

    &:hover {
      transform: translateY(-5px) scale(1.02);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);

      .stat-value {
        color: var(--eb-color-pale-yellow);
      }
    }

    &:active {
      transform: translateY(0) scale(0.98);
      background: rgba(255, 255, 255, 0.05);
    }
  }

  .text-success {
    color: var(--ion-color-success);
  }

  .text-primary {
    color: var(--ion-color-primary);
  }

  .text-danger {
    color: var(--ion-color-danger);
  }

  .text-warning {
    color: var(--ion-color-warning);
  }

  .text-tertiary {
    color: var(--ion-color-tertiary);
  }
</style>