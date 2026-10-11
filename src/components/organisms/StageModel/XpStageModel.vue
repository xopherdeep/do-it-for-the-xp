<template>
  <div
    class="xp-stage-model-wrapper"
    :style="wrapperStyle"
    @click="handleClick"
    :title="`Travel to ${displayName}`"
    role="button"
    tabindex="0"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div class="canvas-box" :style="canvasStyle">
      <canvas ref="canvasRef" class="stage-canvas"></canvas>
    </div>

    <xp-landmark-badge
      v-if="showBadge"
      :title="displayName"
      :cue="sublabel || 'Tap to travel'"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, toRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import XpLandmarkBadge from "@/components/atoms/Badge/XpLandmarkBadge.vue";
import { useStageScene } from "./useStageScene";
import { play$fx } from "@/assets/fx";

const STAGE_NAMES: Record<string, string> = {
  "world-plains": "The Plains",
  plains: "The Plains",
  "world-forest": "Forests",
  forest: "Forests",
  "world-islands": "Islands",
  islands: "Islands",
  "world-swamps": "Swamps",
  swamps: "Swamps",
  "world-mountains": "Mountains",
  mountains: "Mountains",
  "world-sands": "Sands",
  sands: "Sands",
  "world-clouds": "Clouds",
  clouds: "Clouds",
  "world-ice": "Tundras",
  ice: "Tundras",
  "the-moon": "The Moon",
  moon: "The Moon",
};

const STAGE_ROUTES: Record<string, string> = {
  "world-plains": "world-plains",
  plains: "world-plains",
  "world-forest": "world-forest",
  forest: "world-forest",
  "world-islands": "world-islands",
  islands: "world-islands",
  "world-swamps": "world-swamps",
  swamps: "world-swamps",
  "world-mountains": "world-mountains",
  mountains: "world-mountains",
  "world-sands": "world-sands",
  sands: "world-sands",
  "world-clouds": "world-clouds",
  clouds: "world-clouds",
  "world-ice": "world-ice",
  ice: "world-ice",
  "the-moon": "the-moon",
  moon: "the-moon",
};

export default defineComponent({
  name: "xp-stage-model",
  components: {
    XpLandmarkBadge,
  },
  props: {
    stageId: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 115,
    },
    interactive: {
      type: Boolean,
      default: true,
    },
    showBadge: {
      type: Boolean,
      default: true,
    },
    label: {
      type: String,
      default: "",
    },
    sublabel: {
      type: String,
      default: "Tap to travel",
    },
  },
  emits: ["click"],
  setup(props, { emit }) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const stageIdRef = toRef(props, "stageId");
    const router = useRouter();
    const route = useRoute();

    useStageScene(canvasRef, stageIdRef, {
      interactive: props.interactive,
    });

    const displayName = computed(() => {
      if (props.label) return props.label;
      return STAGE_NAMES[props.stageId] || props.stageId;
    });

    const wrapperStyle = computed(() => ({
      width: `${props.size}px`,
    }));

    const canvasStyle = computed(() => ({
      width: `${props.size}px`,
      height: `${props.size}px`,
    }));

    const handleClick = () => {
      try {
        play$fx("select");
      } catch {
        // audio optional
      }
      emit("click", props.stageId);

      const userId = route.params.userId;
      if (!userId) return;

      const targetRoute = STAGE_ROUTES[props.stageId] || "world-plains";
      router.push({
        name: targetRoute,
        params: { userId },
      });
    };

    return {
      canvasRef,
      displayName,
      wrapperStyle,
      canvasStyle,
      handleClick,
    };
  },
});
</script>

<style lang="scss" scoped>
.xp-stage-model-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  touch-action: pan-y;
  outline: none;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.45));
  z-index: 100;

  &:hover,
  &:focus-visible {
    transform: translateY(-4px) scale(1.05);

    :deep(.xp-landmark-badge) {
      background: rgba(22, 24, 38, 0.95);
      border-color: #ffe082;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.7), 0 0 10px rgba(255, 215, 0, 0.5);

      .landmark-title {
        color: #fff275;
      }

      .landmark-cue {
        color: #ffffff;
      }
    }
  }

  &:active {
    transform: translateY(-1px) scale(0.98);
  }

  .canvas-box {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    .stage-canvas {
      width: 100%;
      height: 100%;
      display: block;
      touch-action: none;
    }
  }
}
</style>
