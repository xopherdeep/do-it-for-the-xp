<template>
  <ion-modal
    ref="modal"
    :is-open="isOpen"
    @did-dismiss="$emit('close')"
    :class="['stat-selector-modal', { 'is-fullscreen': fullscreen }]"
    :style="modalStyle"
  >
    <div class="modal-content rpg-box icon-colors">
      <div class="modal-header">
        <span class="modal-title">{{ title }}</span>
        <xp-close-button
          size="lg"
          color="primary"
          @click="dismiss"
        />
      </div>

      <div
        class="options-grid"
        :style="gridStyle"
      >
        <button
          v-for="option in options"
          :key="option.name || option.value"
          class="option-btn"
          :class="{ 'active': isSelected(option), 'has-pillars': option.primaryPillar }"
          @click="selectOption(option)"
        >
          <div class="option-icon">
            <i :class="['fad', option.icon, 'fa-3x']"></i>
          </div>
          <span class="option-label">{{ option.name || option.value }}</span>
          <!-- Pillar Focus Icons - positioned at corners -->
          <template v-if="option.primaryPillar">
            <i
              class="pillar-icon pillar-primary fad"
              :class="getPillarIcon(option.primaryPillar)"
              :style="{ color: getPillarColor(option.primaryPillar) }"
            ></i>
            <i
              class="pillar-icon pillar-secondary fad"
              :class="getPillarIcon(option.secondaryPillar)"
              :style="{ color: getPillarColor(option.secondaryPillar) }"
            ></i>
            <i
              class="pillar-icon pillar-tertiary fad"
              :class="getPillarIcon(option.tertiaryPillar)"
              :style="{ color: getPillarColor(option.tertiaryPillar) }"
            ></i>
          </template>
        </button>
      </div>
    </div>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, ref } from 'vue';
import { IonModal } from '@ionic/vue';
import XpCloseButton from '@/components/atoms/CloseButton/XpCloseButton.vue';

export default defineComponent({
  name: 'XpStatSelectorModal',
  components: { IonModal, XpCloseButton },
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'Select Option'
    },
    options: {
      type: Array as PropType<any[]>,
      default: () => []
    },
    columns: {
      type: Number,
      default: 3
    },
    selectedValue: {
      type: String,
      default: ''
    },
    fullscreen: {
      type: Boolean,
      default: false
    },
    height: {
      type: String,
      default: 'auto'
    }
  },
  emits: ['close', 'select'],
  setup(props, { emit }) {
    const modal = ref<any>(null);

    const isSelected = (option: any) => {
      const val = option.name || option.value;
      return val === props.selectedValue;
    };

    const selectOption = (option: any) => {
      emit('select', option.name || option.value);
    };

    const dismiss = async () => {
      await modal.value?.$el?.dismiss();
    };

    const gridStyle = computed(() => ({
      gridTemplateColumns: `repeat(${props.columns}, 1fr)`
    }));

    const modalStyle = computed(() => {
      if (props.fullscreen) return {};
      return {
        '--height': props.height,
        '--max-height': props.height === 'auto' ? '80vh' : props.height
      };
    });

    // Get icon for each pillar
    const getPillarIcon = (pillar: string): string => {
      const iconMap: Record<string, string> = {
        physical: 'fa-heartbeat',
        mental: 'fa-brain',
        vibrational: 'fa-waveform',
        relational: 'fa-handshake-alt',
        eternal: 'fa-atom'
      };
      return iconMap[pillar] || 'fa-circle';
    };

    // Get color for each pillar
    const getPillarColor = (pillar: string): string => {
      const colorMap: Record<string, string> = {
        physical: 'var(--ion-color-danger)',
        mental: 'var(--ion-color-tertiary)',
        vibrational: 'var(--ion-color-secondary)',
        relational: 'var(--ion-color-warning)',
        eternal: 'var(--ion-color-success)'
      };
      return colorMap[pillar] || 'var(--ion-color-medium)';
    };

    return {
      isSelected,
      selectOption,
      gridStyle,
      modalStyle,
      getPillarIcon,
      getPillarColor,
      modal,
      dismiss
    };
  }
});
</script>

<style lang="scss" scoped>
  .stat-selector-modal {
    --width: 90%;
    --max-width: 450px;
    --height: auto;
    --max-height: 80vh;
    --background: transparent;

    &.is-fullscreen {
      --width: 95%;
      --max-width: 95%;
      --height: 95vh;
      --max-height: 95vh;
    }

    &::part(content) {
      background: transparent;
      border-radius: 20px;
      height: var(--height, auto);
      max-height: var(--max-height, 80vh);
    }
  }

  .modal-content {
    background: rgba(20, 20, 30, 0.95);
    backdrop-filter: blur(20px);
    padding: 24px;
    color: #fff;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 12px;

    .modal-title {
      font-family: "Press Start 2P";
      font-size: 0.8rem;
      color: var(--ion-color-primary);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .close-btn {
      --color: var(--ion-color-primary);
      margin: 0;
      opacity: 0.8;
      transition: opacity 0.2s;

      &:hover {
        opacity: 1;
      }

      i {
        // Icon size is handled by fa-2x class in template
      }
    }
  }

  .options-grid {
    flex: 1;
    display: grid;
    gap: 12px;
    overflow-y: auto;
    padding: 4px 12px 4px 4px;

    /* Scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: var(--ion-color-primary) transparent;

    &::-webkit-scrollbar {
      width: 10px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--ion-color-primary);
      border-radius: 10px;
      border-left: 4px solid transparent;
      /* This creates the visual margin on the left */
      background-clip: padding-box;
    }
  }

  .option-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 16px 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-color: rgba(var(--ion-color-primary-rgb), 0.3);
      transform: translateY(-2px);
    }

    &.active {
      background: rgba(var(--ion-color-primary-rgb), 0.2);
      border-color: var(--ion-color-primary);
      box-shadow: 0 0 15px rgba(var(--ion-color-primary-rgb), 0.3);

      .option-icon i {
        color: var(--ion-color-primary);
      }

      .option-label {
        color: #fff;
        font-weight: bold;
      }
    }

    .option-icon {
      i {
        color: rgba(255, 255, 255, 0.7);
        transition: all 0.25s;
      }
    }

    .option-label {
      font-family: "StatusPlz";
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.6);
      text-align: center;
      transition: all 0.25s;
    }

    // When showing pillar icons
    &.has-pillars {
      padding: 12px 8px;
      gap: 8px;
      position: relative;
    }
  }

  // Pillar icons positioned at corners
  .pillar-icon {
    position: absolute;
    font-size: 1rem;
    filter: drop-shadow(0 0 4px currentColor);

    // Primary: bottom-left
    &.pillar-primary {
      bottom: 6px;
      left: 8px;
    }

    // Secondary: top-center
    &.pillar-secondary {
      top: 6px;
      left: 50%;
      transform: translateX(-50%);
    }

    // Tertiary: bottom-right
    &.pillar-tertiary {
      bottom: 6px;
      right: 8px;
    }
  }
</style>
