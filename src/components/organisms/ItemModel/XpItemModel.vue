<template>
  <div class="xp-item-model" :style="boxStyle">
    <!-- The Game Master's photo, drawn small and blown up so it reads as pixel art -->
    <canvas v-if="showPhoto" ref="photoRef" class="xp-item-model__photo" :aria-label="name" role="img" />
    <!-- No WebGL: the flat duotone icon in its colours -->
    <span v-else-if="flat" class="xp-item-model__flat icon-colors" :aria-label="name" role="img">
      <i :class="iconClass" />
    </span>
    <canvas v-else ref="voxelRef" class="xp-item-model__voxel" :aria-label="name" role="img" />
    <div class="xp-item-model__shadow" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { registerLandmark } from "@/components/organisms/BuildingModel/voxel/sharedLandmarkRenderer";
import type { LandmarkHandle } from "@/components/organisms/BuildingModel/voxel/sharedLandmarkRenderer";
import type { MeshData } from "@/components/organisms/HeroModel/voxel/mesh";
import { createPlaceholderItemMesh, iconToVoxelMesh, itemIconClass } from "@/lib/engine/voxel/iconToVoxel";

const props = withDefaults(
  defineProps<{
    /** Font Awesome duotone name ("film") or class ("fad fa-film") */
    icon?: string;
    /** An uploaded picture's address; wins over the icon while it loads */
    photo?: string;
    name?: string;
    size?: number;
    /** Turns slowly on the spot (the item the shelf is showing) */
    spinning?: boolean;
  }>(),
  { icon: "", photo: "", name: "", size: 150, spinning: false }
);

const PHOTO_PIXELS = 36;
const SPIN_SPEED = 0.9;
const RESTING_YAW = 0.5;

const voxelRef = ref<HTMLCanvasElement | null>(null);
const photoRef = ref<HTMLCanvasElement | null>(null);
const photoFailed = ref(false);
const flat = ref(false);
const iconClass = computed(() => itemIconClass(props.icon));
const showPhoto = computed(() => Boolean(props.photo) && !photoFailed.value);
const boxStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }));

let handle: LandmarkHandle | null = null;
let mesh: MeshData = createPlaceholderItemMesh();
let latestIcon = 0;

const loadIcon = async () => {
  const thisLoad = ++latestIcon;
  const next = await iconToVoxelMesh(props.icon);
  if (thisLoad !== latestIcon) return;
  mesh = next;
  handle?.rebuildMesh(() => mesh);
};

const stopVoxel = () => {
  handle?.dispose();
  handle = null;
};

const startVoxel = () => {
  stopVoxel();
  if (!voxelRef.value) return;
  handle = registerLandmark(voxelRef.value, {
    getMeshData: () => mesh,
    interactive: false,
    elevation: 0.22,
    cameraDistance: 78,
    cameraTargetY: 12,
    spinSpeed: props.spinning ? SPIN_SPEED : 0,
    initialYaw: RESTING_YAW,
    ambientIntensity: 1.2,
    dirLightIntensity: 1.4,
  });
  if (!handle) {
    flat.value = true;
    return;
  }
  void loadIcon();
};

// Cover-crops the photo onto a tiny canvas; the CSS scales it up with hard pixel edges.
const drawPhoto = () => {
  const canvas = photoRef.value;
  if (!canvas || !props.photo) return;
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = PHOTO_PIXELS;
    canvas.height = PHOTO_PIXELS;
    const side = Math.min(img.width, img.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, PHOTO_PIXELS, PHOTO_PIXELS);
  };
  img.onerror = () => {
    photoFailed.value = true;
  };
  img.src = props.photo;
};

const show = async () => {
  await nextTick();
  if (showPhoto.value) {
    stopVoxel();
    drawPhoto();
  } else if (!flat.value && !handle) {
    startVoxel();
  }
};

onMounted(show);
watch(showPhoto, show);
watch(
  () => props.photo,
  () => {
    photoFailed.value = false;
    void show();
  }
);
watch(
  () => props.icon,
  () => {
    if (handle) void loadIcon();
  }
);
watch(
  () => props.spinning,
  (spinning) => {
    handle?.setSpinSpeed?.(spinning ? SPIN_SPEED : 0);
    if (!spinning) handle?.setYaw?.(RESTING_YAW);
  }
);
onBeforeUnmount(stopVoxel);
</script>

<style lang="scss" scoped>
.xp-item-model {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;

  &__voxel {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }

  &__photo {
    width: 72%;
    height: 72%;
    margin-bottom: 10%;
    image-rendering: pixelated;
    border-radius: 4px;
    box-shadow: 0 0 0 3px rgba(20, 9, 31, 0.85), 0 0 0 5px rgba(247, 232, 168, 0.7);
  }

  &__flat {
    margin-bottom: 10%;

    i {
      font-size: 4.5rem;
    }
  }

  // Only the photo and the flat icon need a floor; the voxel scene brings its own shadow.
  &__shadow {
    display: none;
  }

  &__photo + &__shadow,
  &__flat + &__shadow {
    display: block;
    position: absolute;
    bottom: 4%;
    width: 46%;
    height: 8%;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.3);
  }
}
</style>
