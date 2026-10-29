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
        <img v-else-if="faceUrl" :src="faceUrl" :alt="name" class="beast-avatar" />
        <div v-else class="beast-placeholder">?</div>
      </div>
      <span v-if="badge" class="beast-badge" :title="badge" data-test="beast-badge">{{ badge }}</span>
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
import debug from '@/lib/utils/debug';

export default defineComponent({
  name: 'XpBeastSelectorItem',
  props: {
    name: { type: String, required: true },
    avatar: { type: Number, default: 0 },
    // A picture of the beast's own (a kid's drawing): it wins over the library portrait
    picture: { type: String, default: '' },
    // A small chip over the card: "Waiting", "Came back" or "Drawn by Ronan"
    badge: { type: String, default: '' },
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
      const avatar = props.avatar;
      if (!avatar) return null;
      try {
        const pad = avatar.toString().padStart(3, '0');
        return require(`@/assets/images/beasts/${pad}.webp`);
      } catch {
        return null;
      }
    });

    const faceUrl = computed(() => props.picture || avatarUrl.value);

    const canAnimateEngine = () =>
      Boolean(engine && typeof engine.animate === 'function');
    const canStopEngine = () =>
      Boolean(engine && typeof engine.stop === 'function');

    const initEngine = () => {
      const isMissingCanvasOrBeastId = !bgCanvas.value || !props.id;
      if (isMissingCanvasOrBeastId) return;

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
        debug.warn('[BeastSelectorItem] failed to init EB engine for beast item', err);
      }
    };

    const startAnimation = () => {
      isHovered.value = true;
      if (canAnimateEngine()) {
        // Synchronously prime the canvas to avoid the black flash
        const canPrimeCanvas = props.id && bgCanvas.value;
        if (canPrimeCanvas) {
          backgroundManager.renderFrame(props.id, bgCanvas.value);
        }
        
        // Ensure the engine is using our current canvas
        const isOtherCanvas = engine.canvas !== bgCanvas.value;
        if (isOtherCanvas) {
          engine.canvas = bgCanvas.value;
        }
        engine.animate();
      }
    };

    const stopAnimation = () => {
      isHovered.value = false;
      if (canStopEngine()) {
        engine.stop();
      }
    };

    onMounted(() => {
      initEngine();
      
      // Render first frame then stop for "freeze frame" effect
      if (canAnimateEngine()) {
        // Synchronously render the first static frame to avoid initial black flash
        const canPrimeCanvas = props.id && bgCanvas.value;
        if (canPrimeCanvas) {
          backgroundManager.renderFrame(props.id, bgCanvas.value);
        }

        engine.animate();
        
        // A very short delay to ensure the engine re-captures the canvas 
        // and draws at least one frame before we freeze.
        requestAnimationFrame(() => {
          const shouldFreezeFrame = !isHovered.value && canStopEngine();
          if (shouldFreezeFrame) {
            engine.stop();
          }
        });
      }
    });

    onUnmounted(() => {
      if (canStopEngine()) {
        engine.stop();
      }
    });

    // Re-init if background settings change
    watch(() => [props.bg1, props.bg2], () => {
      if (canStopEngine()) {
        engine.stop();
      }
      initEngine();
    });

    return {
      bgCanvas,
      faceUrl,
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

// Over the card's top-left corner; the selection check has the top-right one
.beast-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  max-width: calc(100% - 12px);
  padding: 3px 5px;
  overflow: hidden;
  background: var(--gs-window, #280828);
  border: 1px solid var(--gs-text, #e7e6b3);
  border-radius: 2px;
  color: var(--gs-text, #e7e6b3);
  font-family: "Press Start 2P";
  font-size: 0.4rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
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
