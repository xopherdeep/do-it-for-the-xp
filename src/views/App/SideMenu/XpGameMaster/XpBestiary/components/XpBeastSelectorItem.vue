<template>
  <div 
    class="beast-selector-item" 
    :class="{ 'selected': selected }"
    @mouseenter="startAnimation"
    @mouseleave="stopAnimation"
    @click="$emit('select')"
  >
    <div class="card-inner">
      <canvas ref="bgCanvas" class="beast-bg"></canvas>
      <div class="beast-avatar-container">
        <i v-if="icon" :class="['fad', icon, 'fa-3x', 'beast-icon']"></i>
        <img v-else-if="avatarUrl" :src="avatarUrl" class="beast-avatar" />
        <div v-else class="beast-placeholder">?</div>
      </div>
      <div v-if="selected" class="selection-overlay">
        <i class="fas fa-check-circle"></i>
      </div>
    </div>
    <div class="beast-name">{{ name }}</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { BackgroundLayer } from "earthbound-battle-backgrounds";
import { backgroundManager } from '@/lib/engine/core/BackgroundManager';

export default defineComponent({
  name: 'XpBeastSelectorItem',
  props: {
    name: { type: String, required: true },
    avatar: { type: Number, default: 0 },
    bg1: { type: Number, default: 0 },
    bg2: { type: Number, default: 0 },
    selected: { type: Boolean, default: false },
    icon: { type: String, default: null },
    id: { type: String, default: null }
  },
  emits: ['select'],
  setup(props) {
    const bgCanvas = ref<HTMLCanvasElement | null>(null);
    let engine: any = null;
    const isHovered = ref(false);

    const avatarUrl = computed(() => {
      if (!props.avatar) return null;
      try {
        const pad = props.avatar.toString().padStart(3, '0');
        return require(`@/assets/images/beasts/${pad}.png`);
      } catch {
        return null;
      }
    });

    const initEngine = () => {
      if (!bgCanvas.value || !props.id) return;

      try {
        const layer1 = new BackgroundLayer(props.bg1);
        const layer2 = new BackgroundLayer(props.bg2);
        
        // Use the pool for persistence
        engine = backgroundManager.getOrCreateEngine(props.id, [layer1, layer2], {
          aspectRatio: 0,
          canvas: bgCanvas.value,
        });

        // If we found an existing engine, it might already have a tick 
        // that's more accurate than our lastTick ref.
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to init EB engine for beast item:', err);
      }
    };

    const startAnimation = () => {
      isHovered.value = true;
      if (engine && typeof engine.animate === 'function') {
        // Synchronously prime the canvas to avoid the black flash
        if (props.id && bgCanvas.value) {
          backgroundManager.renderFrame(props.id, bgCanvas.value);
        }
        
        // Ensure the engine is using our current canvas
        if (engine.canvas !== bgCanvas.value) {
          engine.canvas = bgCanvas.value;
        }
        engine.animate();
      }
    };

    const stopAnimation = () => {
      isHovered.value = false;
      if (engine && typeof engine.stop === 'function') {
        engine.stop();
      }
    };

    onMounted(() => {
      initEngine();
      
      // Render first frame then stop for "freeze frame" effect
      if (engine && typeof engine.animate === 'function') {
        // Synchronously render the first static frame to avoid initial black flash
        if (props.id && bgCanvas.value) {
          backgroundManager.renderFrame(props.id, bgCanvas.value);
        }

        engine.animate();
        
        // A very short delay to ensure the engine re-captures the canvas 
        // and draws at least one frame before we freeze.
        requestAnimationFrame(() => {
          if (!isHovered.value && engine && typeof engine.stop === 'function') {
            engine.stop();
          }
        });
      }
    });

    onUnmounted(() => {
      if (engine && typeof engine.stop === 'function') {
        engine.stop();
      }
    });

    // Re-init if background settings change
    watch(() => [props.bg1, props.bg2], () => {
      if (engine && typeof engine.stop === 'function') {
        engine.stop();
      }
      initEngine();
    });

    return {
      bgCanvas,
      avatarUrl,
      startAnimation,
      stopAnimation,
      isHovered
    };
  }
});
</script>

<style lang="scss" scoped>
.beast-selector-item {
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;

  &:hover {
    transform: translateY(-5px);
    
    .card-inner {
      box-shadow: 0 10px 20px rgba(0,0,0,0.4);
      border-color: var(--ion-color-primary);
    }

    .beast-name {
      color: var(--ion-color-primary);
    }
  }

  &.selected {
    .card-inner {
      border: 3px solid var(--ion-color-success);
      box-shadow: 0 0 15px rgba(var(--ion-color-success-rgb), 0.5);
    }
    .beast-name {
      color: var(--ion-color-success);
    }
  }
}

.card-inner {
  position: relative;
  width: 100%;
  aspect-ratio: 1/1;
  background: var(--card-bg, #000);
  border: var(--card-border, 4px solid #333);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.beast-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.beast-selector-item:hover .beast-bg {
  opacity: 1;
}

.beast-avatar-container {
  position: relative;
  z-index: 1;
  width: 70%;
  height: 70%;
  display: flex;
  align-items: center;
  justify-content: center;

  .beast-avatar {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 5px 10px rgba(0,0,0,0.5));
  }

  .beast-placeholder {
    font-size: 3rem;
    color: rgba(255,255,255,0.2);
    font-family: "Press Start 2P";
  }

  .beast-icon {
    color: #fff;
    filter: drop-shadow(0 5px 15px rgba(var(--ion-color-primary-rgb), 0.5));
    transition: all 0.3s ease;
  }
}

.beast-selector-item:hover .beast-icon {
  color: var(--ion-color-primary);
  transform: scale(1.1);
}

.selection-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  font-size: 1.5rem;
  color: var(--ion-color-success);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.beast-name {
  font-family: "Press Start 2P";
  font-size: 0.6rem;
  text-align: center;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}
</style>
