<template>
  <div
    ref="spotRef"
    class="xp-draggable-spot"
    :class="{
      'is-organizing': isOrganizeMode,
      'is-dragging': isDragging,
      'is-scaling': isScaling,
    }"
    :style="spotStyle"
    @pointerdown.capture="handlePointerDownWrapper"
    @pointermove="handleInteraction"
    @pointerup="handleInteraction"
    @pointercancel="handleInteraction"
    @wheel.prevent="handleInteraction"
    @dblclick="handleInteraction"
    @click.capture="handleClickCapture"
  >
    <slot />
    <span v-if="isScaling" class="scale-bubble">{{ displayScalePercent }}%</span>

    <Teleport to="body">
      <div
        v-if="isToolbarOwner"
        class="xp-organize-toolbar"
      >
        <button
          type="button"
          class="organize-btn snap-btn"
          @click.stop="cycleSnapMode"
        >
          Snap: {{ snapModeLabel }}
        </button>
        <button
          type="button"
          class="organize-btn done-btn"
          @click.stop="disableOrganizeMode"
        >
          Done
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import { useRoute } from "vue-router";
import {
  useDraggableSpot,
  MIN_SPOT_SCALE,
  MAX_SPOT_SCALE,
  isOrganizeMode,
  activeOrganizeSpotId,
  snapMode,
  cycleSnapMode,
  disableOrganizeMode,
  type SnapMode,
} from "./useDraggableSpot";

const SNAP_LABELS: Record<SnapMode, string> = {
  drop: "Drop",
  drag: "Live",
  none: "Off",
};

export default defineComponent({
  name: "xp-draggable-spot",
  props: {
    spotId: {
      type: String,
      required: true,
    },
    screen: {
      type: String,
      required: true,
    },
    defaultX: {
      type: Number,
      required: true,
    },
    defaultY: {
      type: Number,
      required: true,
    },
    defaultScale: {
      type: Number,
      default: 1.0,
    },
    minScale: {
      type: Number,
      default: MIN_SPOT_SCALE,
    },
    maxScale: {
      type: Number,
      default: MAX_SPOT_SCALE,
    },
    zIndex: {
      type: Number,
      default: undefined,
    },
  },
  setup(props) {
    const spotRef = ref<HTMLElement | null>(null);
    const route = useRoute();

    const userIdRef = computed(() => {
      const routeParam = route?.params?.userId;
      const hasParam = Boolean(routeParam);
      if (!hasParam) return undefined;
      return Array.isArray(routeParam) ? routeParam[0] : routeParam;
    });

    const {
      position,
      isDragging,
      isScaling,
      handleInteraction,
      resetPosition,
    } = useDraggableSpot({
      spotId: props.spotId,
      screen: props.screen,
      defaultX: props.defaultX,
      defaultY: props.defaultY,
      defaultScale: props.defaultScale,
      minScale: props.minScale,
      maxScale: props.maxScale,
      userIdRef,
      spotRef,
    });

    const isToolbarOwner = computed(() => {
      const activeId = activeOrganizeSpotId.value;
      const isOrganizing = isOrganizeMode.value;
      const isMatchedSpot = activeId === props.spotId;
      return isOrganizing && isMatchedSpot;
    });

    const snapModeLabel = computed(() => SNAP_LABELS[snapMode.value] ?? "Drop");

    const spotStyle = computed(() => {
      const isDraggingActive = isDragging.value;
      const baseZIndex = props.zIndex ?? Math.round(position.value.y);
      const computedZIndex = isDraggingActive ? 300 : baseZIndex;
      const dragScaleMultiplier = isDraggingActive ? 1.08 : 1.0;
      const finalScale = position.value.scale * dragScaleMultiplier;

      return {
        left: `${position.value.x}%`,
        top: `${position.value.y}%`,
        transform: `translate(-50%, -50%) scale(${finalScale})`,
        "--spot-scale": `${finalScale}`,
        zIndex: computedZIndex,
      };
    });

    const displayScalePercent = computed(() =>
      Math.round(position.value.scale * 100)
    );

    const handlePointerDownWrapper = (event: PointerEvent) => {
      handleInteraction(event);
      const isOrganizing = isOrganizeMode.value;
      if (isOrganizing) {
        event.stopPropagation();
      }
    };

    const handleClickCapture = (event: MouseEvent) => {
      const isOrganizing = isOrganizeMode.value;
      const isInteracting = isDragging.value || isScaling.value;
      const shouldBlockClick = isOrganizing || isInteracting;
      if (shouldBlockClick) {
        event.stopPropagation();
        event.preventDefault();
      }
    };

    return {
      spotRef,
      position,
      isDragging,
      isScaling,
      isOrganizeMode,
      isToolbarOwner,
      snapModeLabel,
      spotStyle,
      displayScalePercent,
      cycleSnapMode,
      disableOrganizeMode,
      handleInteraction,
      handlePointerDownWrapper,
      handleClickCapture,
      resetPosition,
    };
  },
});
</script>

<style lang="scss" scoped>
.xp-draggable-spot {
  position: absolute;
  touch-action: none !important;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  cursor: grab;
  pointer-events: auto;
  transition: filter 0.15s ease;

  * {
    touch-action: none !important;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  &:hover {
    z-index: 200;
  }

  &.is-organizing {
    cursor: grab;
    animation: ios-wobble-1 0.28s ease-in-out infinite alternate;

    &:nth-child(2n) {
      animation-name: ios-wobble-2;
      animation-duration: 0.31s;
      animation-delay: -0.08s;
    }

    &:nth-child(3n) {
      animation-name: ios-wobble-3;
      animation-duration: 0.29s;
      animation-delay: -0.14s;
    }
  }

  &.is-dragging {
    cursor: grabbing;
    animation: none !important;
    filter: drop-shadow(0 18px 30px rgba(0, 0, 0, 0.8));
  }

  .scale-bubble {
    position: absolute;
    top: -24px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(18, 12, 14, 0.92);
    border: 2px solid #ffd700;
    border-radius: 4px;
    color: #ffd700;
    font-family: "Apple Kid", "StatusPlz", sans-serif;
    font-size: 0.9rem;
    padding: 1px 6px;
    line-height: 1.2;
    pointer-events: none;
    white-space: nowrap;
    text-shadow: 1px 1px 0 #000;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
    animation: scale-pop 0.15s ease-out;
  }
}

@keyframes ios-wobble-1 {
  0% {
    transform: translate(-50%, -50%) scale(var(--spot-scale, 1)) rotate(-1.5deg);
  }
  100% {
    transform: translate(-50%, -50%) scale(var(--spot-scale, 1)) rotate(1.5deg);
  }
}

@keyframes ios-wobble-2 {
  0% {
    transform: translate(-50%, -50%) scale(var(--spot-scale, 1)) rotate(1.8deg) translateY(-1px);
  }
  100% {
    transform: translate(-50%, -50%) scale(var(--spot-scale, 1)) rotate(-1.4deg) translateY(1px);
  }
}

@keyframes ios-wobble-3 {
  0% {
    transform: translate(-50%, -50%) scale(var(--spot-scale, 1)) rotate(-1.3deg) translateY(1px);
  }
  100% {
    transform: translate(-50%, -50%) scale(var(--spot-scale, 1)) rotate(1.6deg) translateY(-1px);
  }
}

@keyframes scale-pop {
  from {
    transform: translateX(-50%) scale(0.85);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
}
</style>

<style lang="scss">
.xp-organize-toolbar {
  position: fixed;
  top: calc(var(--ion-safe-area-top, 0px) + 16px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(18, 12, 14, 0.94);
  border: 2px solid #ffd700;
  border-radius: 24px;
  padding: 4px 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
  z-index: 10000;
  pointer-events: auto;
  animation: scale-pop 0.18s ease-out;

  .organize-btn {
    background: transparent;
    border: none;
    color: #ffd700;
    font-family: "Apple Kid", "StatusPlz", sans-serif;
    font-size: 1.05rem;
    padding: 4px 10px;
    border-radius: 16px;
    cursor: pointer;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-shadow: 1px 1px 0 #000;
    transition: background 0.15s ease, transform 0.1s ease;

    &:active {
      transform: scale(0.95);
    }

    &.snap-btn {
      background: rgba(255, 215, 0, 0.15);
      border: 1px solid rgba(255, 215, 0, 0.4);

      &:hover {
        background: rgba(255, 215, 0, 0.25);
      }
    }

    &.done-btn {
      background: #ffd700;
      color: #120c0e;
      font-weight: bold;
      text-shadow: none;

      &:hover {
        background: #ffe033;
      }
    }
  }
}
</style>
