<template>
  <div
    class="xp-temple-model-wrapper"
    :style="wrapperStyle"
    @click="handleClick"
    :title="`Enter ${templeName}`"
    role="button"
    tabindex="0"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div class="canvas-box" :style="canvasStyle">
      <canvas ref="canvasRef" class="temple-canvas"></canvas>
    </div>

    <xp-landmark-badge
      v-if="showBadge"
      :title="templeName"
      cue="Tap to enter"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, toRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getTempleMetadata } from "@/lib/engine/temples/templeRegistry";
import XpLandmarkBadge from "@/components/atoms/Badge/XpLandmarkBadge.vue";
import { useTempleScene } from "./useTempleScene";
import { play$fx } from "@/assets/fx";

export default defineComponent({
  name: "xp-temple-model",
  components: {
    XpLandmarkBadge,
  },
  props: {
    templeId: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 130,
    },
    interactive: {
      type: Boolean,
      default: true,
    },
    showBadge: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["click"],
  setup(props, { emit }) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const templeIdRef = toRef(props, "templeId");
    const router = useRouter();
    const route = useRoute();

    useTempleScene(canvasRef, templeIdRef, {
      interactive: props.interactive,
    });

    const meta = computed(() => getTempleMetadata(props.templeId));
    const templeName = computed(() => meta.value.name || "Temple");

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
      emit("click", props.templeId);

      const userId = route.params.userId;
      if (userId) {
        router.push({
          name: "temple",
          params: {
            userId,
            temple: props.templeId,
          },
        });
      }
    };

    return {
      canvasRef,
      templeName,
      wrapperStyle,
      canvasStyle,
      handleClick,
    };
  },
});
</script>

<style lang="scss" scoped>
.xp-temple-model-wrapper {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  user-select: none;
  outline: none;
  transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
  z-index: 100;

  &:hover,
  &:focus-visible {
    transform: translateY(-4px) scale(1.04);

    :deep(.xp-landmark-badge) {
      .landmark-title {
        color: #ffffff;
        transform: scale(1.08);
        text-shadow:
          -2px -2px 0 #000,
          2px -2px 0 #000,
          -2px 2px 0 #000,
          2px 2px 0 #000,
          0 0 10px rgba(255, 215, 0, 0.8),
          0 3px 6px rgba(0, 0, 0, 0.95);
      }
    }
  }

  &:active {
    transform: translateY(-1px) scale(0.98);
  }
}

.canvas-box {
  position: relative;
  min-width: 64px;
  min-height: 64px;
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.45));
}

.temple-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  outline: none;
}
</style>
