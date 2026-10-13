<template>
  <div
    class="temple-floor"
    :class="[
      `temple-floor--${floorTheme}`,
      `temple-floor--${floorKind}`,
      `temple-floor--${floorElement}`,
      specialRoomClass
    ]"
    aria-hidden="true"
  >
    <!-- Floor texture / pattern surface -->
    <div class="temple-floor__surface"></div>
    <!-- Deep perimeter vignette and torch light -->
    <div class="temple-floor__shade"></div>
    <!-- Room specific floor feature / emblem -->
    <div v-if="hasEmblem" class="temple-floor__emblem"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Room } from "@/lib/engine/core/dungeons/types";

const props = withDefaults(
  defineProps<{
    room?: Room;
    element?: string;
    temple?: string;
  }>(),
  {
    element: "wind",
    temple: "",
  }
);

const roomName = computed(() => (props.room?.content?.name || "").toLowerCase());

const isHouse = computed(() => {
  const isMovingHouse = props.temple === "moving-house";
  const isHomeTheme = props.room?.content?.theme === "home";
  return isMovingHouse || isHomeTheme;
});

const floorTheme = computed(() => (isHouse.value ? "house" : "dungeon"));

const floorKind = computed(() => {
  if (!isHouse.value) return "dungeon";
  const name = roomName.value;
  const isTiled = name.includes("kitchen") || name.includes("pantry") || name.includes("bath");
  if (isTiled) return "tile";
  const isDeck = name.includes("porch") || name.includes("deck") || name.includes("yard");
  if (isDeck) return "deck";
  const isSlab = name.includes("garage") || name.includes("basement") || name.includes("storage");
  if (isSlab) return "slab";
  return "wood";
});

const floorElement = computed(() => props.element || "wind");

const specialRoomClass = computed(() => {
  const type = props.room?.type;
  if (type === "boss") return "temple-floor--boss";
  if (type === "miniboss") return "temple-floor--miniboss";
  if (type === "entrance") return "temple-floor--entrance";
  if (type === "master") return "temple-floor--master";
  if (type === "camp" || type === "health") return "temple-floor--sanctuary";
  return "";
});

const hasEmblem = computed(() => Boolean(specialRoomClass.value));
</script>

<style lang="scss" scoped>
.temple-floor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;

  &__surface {
    position: absolute;
    inset: 0;
  }

  &__shade {
    position: absolute;
    inset: 0;
    box-shadow: inset 0 0 clamp(36px, 10vmin, 80px) rgba(0, 0, 0, 0.72);
    background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.06) 0%, transparent 68%);
  }

  // --- House Floor Varieties ---

  // Hardwood planks for living room, front hall, bedrooms, dining room, office
  &--wood &__surface {
    background-color: #634327;
    background-image:
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 3px,
        rgba(0, 0, 0, 0.05) 3px,
        transparent 4px,
        rgba(255, 230, 180, 0.04) 4px,
        transparent 7px
      ),
      repeating-linear-gradient(
        0deg,
        #785332 0px,
        #785332 40px,
        #4e331c 40px,
        #4e331c 42px,
        rgba(255, 220, 160, 0.12) 42px,
        #6e4a2b 44px,
        #664426 80px,
        #442a15 80px,
        #442a15 82px,
        rgba(255, 220, 160, 0.12) 82px,
        #724e2e 84px
      );
  }

  // Ceramic tile checkerboard for kitchen, pantry, bathrooms
  &--tile &__surface {
    background-color: #2b1f1a;
    background-image:
      linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, transparent 16%),
      conic-gradient(
        #d8cdb4 25%,
        #8a4731 0 50%,
        #d8cdb4 0 75%,
        #8a4731 0
      );
    background-size: 40px 40px;
  }

  // Outdoor decking planks for front porch, yard, deck
  &--deck &__surface {
    background-color: #3b2619;
    background-image:
      repeating-linear-gradient(
        0deg,
        #72553c 0px,
        #72553c 48px,
        #291a10 48px,
        #291a10 52px,
        rgba(255, 235, 200, 0.1) 52px,
        #684c34 54px
      );
  }

  // Heavy concrete / slate slabs for garage, basement, storage
  &--slab &__surface {
    background-color: #202227;
    background-image:
      repeating-linear-gradient(0deg, transparent 0 50px, #141518 50px 52px),
      repeating-linear-gradient(90deg, transparent 0 70px, #141518 70px 72px),
      linear-gradient(135deg, #3a3d45 0%, #292b31 100%);
    background-size: 72px 52px;
  }

  // --- Dungeon Elemental Flagstones ---
  &--dungeon {
    --tile: #746858;
    --tile-dark: #52483a;
    --grout: #322a20;
    --glow: rgba(255, 240, 200, 0.2);

    &.temple-floor--fire {
      --tile: #44302e;
      --tile-dark: #2c1e1c;
      --grout: #180d0b;
      --glow: rgba(255, 90, 20, 0.25);
    }
    &.temple-floor--ice {
      --tile: #7c98b3;
      --tile-dark: #587490;
      --grout: #364e66;
      --glow: rgba(220, 245, 255, 0.25);
    }
    &.temple-floor--water {
      --tile: #2e4d58;
      --tile-dark: #1c333c;
      --grout: #0f1d22;
      --glow: rgba(80, 210, 230, 0.25);
    }
    &.temple-floor--earth {
      --tile: #544432;
      --tile-dark: #382c1e;
      --grout: #20180e;
      --glow: rgba(130, 180, 70, 0.25);
    }
    &.temple-floor--light {
      --tile: #968668;
      --tile-dark: #70624a;
      --grout: #483e2c;
      --glow: rgba(255, 230, 140, 0.25);
    }
    &.temple-floor--shadow {
      --tile: #30243e;
      --tile-dark: #1e1628;
      --grout: #100b18;
      --glow: rgba(160, 90, 255, 0.25);
    }
    &.temple-floor--moon {
      --tile: #626478;
      --tile-dark: #444658;
      --grout: #2a2a38;
      --glow: rgba(210, 215, 255, 0.25);
    }
    &.temple-floor--storm {
      --tile: #3e4858;
      --tile-dark: #28303e;
      --grout: #161a24;
      --glow: rgba(255, 215, 70, 0.25);
    }
    &.temple-floor--wind {
      --tile: #746858;
      --tile-dark: #52483a;
      --grout: #322a20;
      --glow: rgba(255, 240, 200, 0.2);
    }

    .temple-floor__surface {
      background-color: var(--grout);
      background-image:
        linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 20%),
        repeating-linear-gradient(0deg, transparent 0 46px, var(--grout) 46px 48px),
        repeating-linear-gradient(90deg, transparent 0 46px, var(--grout) 46px 48px),
        linear-gradient(135deg, var(--tile) 0%, var(--tile-dark) 100%);
      background-size: 48px 48px;
    }
  }

  // --- Emblems and Accents ---

  // Boss / Master room: ornate circle
  &--boss &__emblem,
  &--master &__emblem {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: clamp(140px, 38vmin, 240px);
    height: clamp(140px, 38vmin, 240px);
    border-radius: 50%;
    border: 3px double var(--glow, rgba(255, 140, 40, 0.45));
    box-shadow: 0 0 24px var(--glow, rgba(255, 140, 40, 0.25)), inset 0 0 20px rgba(0, 0, 0, 0.5);
    background: radial-gradient(circle, rgba(0, 0, 0, 0.35) 0%, transparent 70%);
  }

  // Entrance room: welcome threshold mat
  &--entrance &__emblem {
    position: absolute;
    bottom: clamp(34px, 9vmin, 64px);
    left: 50%;
    transform: translateX(-50%);
    width: clamp(90px, 22vmin, 150px);
    height: 22px;
    background: rgba(0, 0, 0, 0.32);
    border-radius: 3px;
  }

  // Sanctuary / camp / heal: soft glowing ring
  &--sanctuary &__emblem {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: clamp(110px, 30vmin, 180px);
    height: clamp(110px, 30vmin, 180px);
    border-radius: 50%;
    border: 2px dashed rgba(255, 240, 160, 0.35);
    background: radial-gradient(circle, rgba(255, 230, 140, 0.08) 0%, transparent 65%);
  }
}
</style>
