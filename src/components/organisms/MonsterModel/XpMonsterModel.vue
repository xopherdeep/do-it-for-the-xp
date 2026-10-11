<template>
  <div
    class="xp-monster-model-wrapper"
    :style="computedWrapperStyle"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleClick"
    :title="`Attack ${monsterName}`"
    role="button"
    tabindex="0"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div class="monster-entity" :style="modelStyle">
      <div class="badge-wrap">
        <xp-landmark-badge v-if="monsterName" :title="monsterName" />
      </div>

      <div class="canvas-box" :style="boxStyle">
        <canvas ref="canvasRef" class="monster-canvas"></canvas>
      </div>

      <div class="monster-shadow" aria-hidden="true"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";
import XpLandmarkBadge from "@/components/atoms/Badge/XpLandmarkBadge.vue";
import { registerLandmark } from "@/components/organisms/BuildingModel/voxel/sharedLandmarkRenderer";
import type { LandmarkHandle } from "@/components/organisms/BuildingModel/voxel/sharedLandmarkRenderer";
import { createPlaceholderMonsterMesh, spriteToVoxelMesh } from "@/lib/engine/voxel/spriteToVoxel";
import type { MeshData } from "@/components/organisms/HeroModel/voxel/mesh";
import { useMonsterRoam } from "./useMonsterRoam";
import { play$fx } from "@/assets/fx";

export default defineComponent({
  name: "XpMonsterModel",
  components: {
    XpLandmarkBadge,
  },
  props: {
    monsterId: {
      type: String,
      default: "monster-1",
    },
    monsterName: {
      type: String,
      default: "Dungeon Monster",
    },
    avatarSrc: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 110,
    },
    roam: {
      type: Boolean,
      default: true,
    },
    spinSpeed: {
      type: Number,
      default: 0.9,
    },
  },
  emits: ["click"],
  setup(props, { emit }) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    let handle: LandmarkHandle | null = null;
    let currentMeshData: MeshData = createPlaceholderMonsterMesh();

    const { isHovered, wrapperStyle, modelStyle } = useMonsterRoam({}, false);

    const loadMesh = async () => {
      try {
        const mesh = await spriteToVoxelMesh(props.avatarSrc, 30, 2.5);
        currentMeshData = mesh;
        if (handle) {
          handle.rebuildMesh(() => mesh);
        }
      } catch {
        currentMeshData = createPlaceholderMonsterMesh();
      }
    };

    onMounted(() => {
      if (!canvasRef.value) return;

      handle = registerLandmark(canvasRef.value, {
        getMeshData: () => currentMeshData,
        interactive: false,
        elevation: 0.22,
        cameraDistance: 36,
        cameraTargetY: 10,
        spinSpeed: props.spinSpeed,
        initialYaw: 0,
        ambientIntensity: 1.2,
        dirLightIntensity: 1.4,
      });

      loadMesh();
    });

    watch(
      () => props.avatarSrc,
      () => {
        loadMesh();
      }
    );

    watch(
      () => props.spinSpeed,
      (newSpeed) => {
        if (handle?.setSpinSpeed) {
          handle.setSpinSpeed(newSpeed);
        }
      }
    );

    onBeforeUnmount(() => {
      if (handle) {
        handle.dispose();
        handle = null;
      }
    });

    const boxStyle = computed(() => ({
      width: `${props.size}px`,
      height: `${props.size}px`,
    }));

    const computedWrapperStyle = computed(() => {
      if (!props.roam) {
        return {
          position: "relative" as const,
          zIndex: 90,
        };
      }
      return wrapperStyle.value;
    });

    const handleClick = () => {
      if (typeof play$fx === "function") {
        play$fx("select");
      }
      emit("click");
    };

    return {
      canvasRef,
      isHovered,
      boxStyle,
      computedWrapperStyle,
      modelStyle,
      handleClick,
    };
  },
});
</script>

<style lang="scss" scoped>
.xp-monster-model-wrapper {
  cursor: pointer;
  user-select: none;
  touch-action: pan-y;
  outline: none;
  pointer-events: auto;

  .monster-entity {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    animation: monster-bob 2.2s ease-in-out infinite alternate;
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease;
    filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.5));

    &:hover {
      transform: translateY(-4px) scale(1.08);
      filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.65)) drop-shadow(0 0 12px rgba(255, 80, 80, 0.7));

      .badge-wrap {
        transform: scale(1.08);
      }
    }

    &:active {
      transform: translateY(-1px) scale(0.96);
    }
  }

  .badge-wrap {
    margin-bottom: 2px;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .canvas-box {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    .monster-canvas {
      width: 100%;
      height: 100%;
      display: block;
      touch-action: none;
    }
  }

  .monster-shadow {
    width: 65%;
    height: 12px;
    margin-top: -6px;
    background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0) 70%);
    border-radius: 50%;
    pointer-events: none;
  }
}

@keyframes monster-bob {
  0% {
    transform: translateY(0px);
  }
  100% {
    transform: translateY(-6px);
  }
}
</style>
