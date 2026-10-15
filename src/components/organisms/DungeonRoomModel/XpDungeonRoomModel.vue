<template>
  <div
    class="xp-dungeon-room-model-wrapper"
    :class="{
      'is-chest': isChest,
      'is-empty': isEmpty,
      'is-boss-chest': isBossChest,
    }"
    :style="wrapperStyle"
    @click="handleClick"
    :title="actionTitle"
    :aria-label="displayName"
    role="button"
    tabindex="0"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div
      class="room-entity"
      :class="{
        'is-luring': isChest && !isEmpty,
        'is-interactive': interactive,
      }"
    >
      <div class="canvas-box" :style="boxStyle">
        <canvas
          v-if="supported"
          ref="canvasRef"
          class="room-canvas"
        ></canvas>
        <div v-else class="flat-fallback icon-colors">
          <i class="fad fa-3x" :class="fallbackIconClass"></i>
        </div>
      </div>

      <div class="room-model-shadow" aria-hidden="true"></div>

      <div class="badge-wrap name-under" v-if="showBadge">
        <xp-landmark-badge :title="displayName" :cue="displayCue" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { Room } from "@/lib/engine/core/dungeons/types";
import XpLandmarkBadge from "@/components/atoms/Badge/XpLandmarkBadge.vue";
import { useDungeonRoomScene } from "./useDungeonRoomScene";
import type { DungeonRoomShapeOptions } from "./voxel/dungeonRoomShapes";
import { ROOM_ICONS } from "@/lib/engine/dungeons/roomTypes";
import { play$fx } from "@/assets/fx";

export interface DungeonRoomModelProps {
  room?: Room | null;
  roomType?: string;
  size?: number;
  cleared?: boolean;
  interactive?: boolean;
  showBadge?: boolean;
}

const props = withDefaults(defineProps<DungeonRoomModelProps>(), {
  room: null,
  roomType: "",
  size: 130,
  cleared: false,
  interactive: true,
  showBadge: true,
});

const emit = defineEmits<{
  (e: "click"): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

const COMBAT_ROOM_TYPES = ["monster", "miniboss", "boss"];

const rawType = computed(() => {
  const customType = props.roomType;
  if (customType) return customType;
  const currentType = props.room?.type;
  if (currentType) return currentType;
  return "empty";
});

const isCombatType = computed(() => COMBAT_ROOM_TYPES.includes(rawType.value));

const isChestEmpty = computed(() => {
  const currentRoom = props.room;
  const hasNoRoom = !currentRoom;
  if (hasNoRoom) return false;
  return Boolean(currentRoom.isEmpty || currentRoom.content?.empty || currentRoom.content?.opened);
});

const isBossChest = computed(() => {
  const content = props.room?.content;
  const isMasterRoom = rawType.value === "master";
  const hasBossPrize = Boolean(content?.pegasus || content?.bossKey || content?.masterKey);
  return isMasterRoom || hasBossPrize;
});

const resolvedType = computed(() => {
  const isCombatCleared = Boolean(props.cleared && isCombatType.value);
  if (isCombatCleared) return "cleared";

  const isLootRoom = rawType.value === "loot" || rawType.value === "lock";
  if (isLootRoom) {
    return isChestEmpty.value ? "empty-chest" : "loot";
  }

  return rawType.value;
});

const isChest = computed(() => ["loot", "empty-chest", "lock"].includes(resolvedType.value));
const isEmpty = computed(() => resolvedType.value === "empty-chest");

const shapeOptions = computed<DungeonRoomShapeOptions>(() => ({
  isEmpty: isEmpty.value,
  isBoss: isBossChest.value,
  cleared: props.cleared,
}));

const { supported } = useDungeonRoomScene(canvasRef, resolvedType, shapeOptions, {
  interactive: props.interactive,
});

const ROOM_TITLES: Record<string, string> = {
  loot: "Treasure Chest",
  lock: "Treasure Chest",
  "empty-chest": "Empty Chest",
  key: "Small Key",
  health: "Healing Spring",
  mana: "Mana Spring",
  camp: "Cozy Campfire",
  puzzle: "Ancient Glyphs",
  teleport: "Teleport Circle",
  shop: "Dungeon Shop",
  save: "Save Monument",
  master: "Pegasus Egg",
  secret: "Secret Chamber",
  "stairs-up": "Stairs Up",
  "stairs-down": "Stairs Down",
  entrance: "Temple Entrance",
  gate: "Exit Gate",
  trap: "Spike Trap",
  pit: "Dark Chasm",
  void: "Dark Chasm",
  cleared: "Victory Trophy",
  empty: "Dusty Chamber",
};

const ROOM_CUES: Record<string, string> = {
  loot: "Tap to open!",
  lock: "Tap to open!",
  "empty-chest": "Looted",
  key: "Tap to pick up",
  health: "Drink",
  mana: "Drink",
  camp: "Rest here",
  puzzle: "Solve riddle",
  shop: "Browse wares",
  save: "Save journey",
  gate: "Step through",
  entrance: "Leave temple",
  cleared: "Secured",
  empty: "Inspect",
};

const displayName = computed(() => {
  const type = resolvedType.value;
  const isTreasure = type === "loot" || type === "lock";
  const isBossTreasure = isTreasure && isBossChest.value;
  if (isBossTreasure) {
    return "Boss Chest";
  }
  return ROOM_TITLES[type] || props.room?.content?.name || "Dungeon Chamber";
});

const displayCue = computed(() => {
  const type = resolvedType.value;
  return ROOM_CUES[type] || "Inspect";
});

const actionTitle = computed(() => `${displayName.value} (${displayCue.value})`);

const fallbackIconClass = computed(() => {
  return (ROOM_ICONS as Record<string, string>)[resolvedType.value] || ROOM_ICONS.empty;
});

const boxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));

const wrapperStyle = computed(() => ({
  position: "relative" as const,
  zIndex: 90,
}));

const getSfxKey = () => {
  const isUnopenedChest = isChest.value && !isEmpty.value;
  if (isUnopenedChest) return "select";
  const isKeyRoom = resolvedType.value === "key";
  if (isKeyRoom) return "key";
  return "select";
};

const handleClick = () => {
  const hasPlayFx = typeof play$fx === "function";
  if (hasPlayFx) {
    play$fx(getSfxKey());
  }
  emit("click");
};
</script>

<style lang="scss" scoped>
.xp-dungeon-room-model-wrapper {
  cursor: pointer;
  user-select: none;
  touch-action: pan-y;
  outline: none;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;

  .room-entity {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));

    &.is-luring {
      animation: chest-bob 2.8s ease-in-out infinite alternate;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 16px rgba(255, 215, 0, 0.45));
    }

    &:hover {
      transform: translateY(-5px) scale(1.08);

      &.is-luring {
        filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.65)) drop-shadow(0 0 24px rgba(255, 215, 0, 0.85));
      }

      &:not(.is-luring) {
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 12px rgba(255, 255, 255, 0.5));
      }

      .badge-wrap {
        transform: scale(1.06);
      }
    }

    &:active {
      transform: translateY(-1px) scale(0.96);
    }
  }

  .canvas-box {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

    .room-canvas {
      width: 100%;
      height: 100%;
      display: block;
      touch-action: none;
    }

    .flat-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
  }

  .room-model-shadow {
    width: 65%;
    height: 12px;
    margin-top: -6px;
    background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 70%);
    border-radius: 50%;
    pointer-events: none;
  }

  .badge-wrap.name-under {
    margin-top: 4px;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

@keyframes chest-bob {
  0% {
    transform: translateY(0px);
  }
  100% {
    transform: translateY(-4px);
  }
}
</style>
