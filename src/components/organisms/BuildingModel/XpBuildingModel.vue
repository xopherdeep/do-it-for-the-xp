<template>
  <div
    class="xp-building-model-wrapper"
    :style="wrapperStyle"
    @click="handleClick"
    :title="`Enter ${displayName}`"
    role="button"
    tabindex="0"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div class="canvas-box" :style="canvasStyle">
      <canvas ref="canvasRef" class="building-canvas"></canvas>
    </div>

    <xp-landmark-badge
      v-if="showBadge"
      :title="displayName"
      :cue="displaySublabel"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, toRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getShopMetadata } from "@/lib/engine/core/shopRegistry";
import XpLandmarkBadge from "@/components/atoms/Badge/XpLandmarkBadge.vue";
import { useBuildingScene } from "./useBuildingScene";
import { play$fx } from "@/assets/fx";

const HOMETOWN_NAMES: Record<string, string> = {
  "hero-home": "Hero's Home",
  "my-home": "Hero's Home",
  "hometown-market": "Market",
  shop: "Shop",
  hospital: "Hospital",
  hotel: "Hotel",
  bank: "Gold Bank",
  "town-hall": "Town Hall",
  "home-town": "Hometown",
  hometown: "Hometown",
  pegasus: "Travel World",
  "home-calendar": "My Calendar",
  calendar: "My Calendar",
  "home-storage": "My Storage",
  storage: "My Storage",
  "home-workbench": "My Workbench",
  "craft-item": "My Workbench",
  "home-kitchen": "My Kitchen",
  "cook-food": "My Kitchen",
  "home-bed": "Cozy Bed",
  bed: "Cozy Bed",
  "home-door": "Front Door",
  "front-door": "Front Door",
  "world-plains": "The Plains",
  plains: "The Plains",
};

export default defineComponent({
  name: "xp-building-model",
  components: {
    XpLandmarkBadge,
  },
  props: {
    buildingId: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 120,
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
      default: "",
    },
  },
  emits: ["click"],
  setup(props, { emit }) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const buildingIdRef = toRef(props, "buildingId");
    const router = useRouter();
    const route = useRoute();

    useBuildingScene(canvasRef, buildingIdRef, {
      interactive: props.interactive,
    });

    const isShop = computed(() => {
      return ![
        "hero-home",
        "my-home",
        "hospital",
        "hotel",
        "bank",
        "town-hall",
        "home-town",
        "hometown",
        "pegasus",
        "home-calendar",
        "calendar",
        "home-storage",
        "storage",
        "home-workbench",
        "craft-item",
        "home-kitchen",
        "cook-food",
        "home-bed",
        "bed",
        "home-door",
        "front-door",
        "world-plains",
        "plains",
      ].includes(props.buildingId);
    });

    const displayName = computed(() => {
      if (props.label) return props.label;
      if (HOMETOWN_NAMES[props.buildingId]) return HOMETOWN_NAMES[props.buildingId];
      const shopMeta = getShopMetadata(props.buildingId);
      return shopMeta?.name || props.buildingId;
    });

    const displaySublabel = computed(() => {
      if (props.sublabel) return props.sublabel;
      if (props.buildingId === "home-town" || props.buildingId === "hometown") {
        return "Return home";
      }
      if (props.buildingId === "pegasus") {
        return "Fly to World Map";
      }
      if (props.buildingId === "home-calendar" || props.buildingId === "calendar") {
        return "View schedule";
      }
      if (props.buildingId === "home-storage" || props.buildingId === "storage") {
        return "Open vault";
      }
      if (props.buildingId === "home-workbench" || props.buildingId === "craft-item") {
        return "Craft gear";
      }
      if (props.buildingId === "home-kitchen" || props.buildingId === "cook-food") {
        return "Cook meals";
      }
      if (props.buildingId === "home-bed" || props.buildingId === "bed") {
        return "Rest & heal";
      }
      if (props.buildingId === "home-door" || props.buildingId === "front-door") {
        return "Go outside";
      }
      if (props.buildingId === "world-plains" || props.buildingId === "plains") {
        return "Leave town";
      }
      return isShop.value ? "Tap to shop" : "Tap to enter";
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
      emit("click", props.buildingId);

      const userId = route.params.userId;
      if (!userId) return;

      switch (props.buildingId) {
        case "hero-home":
        case "my-home":
          router.push({ name: "my-home", params: { userId } });
          break;
        case "home-town":
        case "hometown":
          router.push({ name: "home-town", params: { userId } });
          break;
        case "pegasus":
          router.push({ name: "world-map", params: { userId } });
          break;
        case "home-calendar":
        case "calendar":
          router.push({ name: "calendar", params: { userId } });
          break;
        case "home-storage":
        case "storage":
          router.push({ name: "storage", params: { userId } });
          break;
        case "home-workbench":
        case "craft-item":
          router.push({ name: "craft-item", params: { userId } });
          break;
        case "home-kitchen":
        case "cook-food":
          router.push({ name: "cook-food", params: { userId } });
          break;
        case "home-door":
        case "front-door":
          router.push({ name: "home-town", params: { userId } });
          break;
        case "home-bed":
        case "bed":
          // Emitted click handled by caller (restInBed)
          break;
        case "hometown-market":
        case "shop":
          router.push({ name: "shop", params: { userId } });
          break;
        case "hospital":
          router.push({ name: "hospital", params: { userId } });
          break;
        case "hotel":
          router.push({ name: "hotel", params: { userId } });
          break;
        case "bank":
          router.push({ name: "bank", params: { userId } });
          break;
        case "town-hall":
          router.push({ name: "town-hall", params: { userId } });
          break;
        case "world-plains":
        case "plains":
          router.push({ name: "world-plains", params: { userId } });
          break;
        default:
          // Land world shop
          router.push({
            name: "shop",
            params: {
              merchant: props.buildingId,
              userId,
            },
          });
          break;
      }
    };

    return {
      canvasRef,
      displayName,
      displaySublabel,
      wrapperStyle,
      canvasStyle,
      handleClick,
    };
  },
});
</script>

<style lang="scss" scoped>
.xp-building-model-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  touch-action: pan-y;
  outline: none;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4));

  &:hover {
    transform: translateY(-4px) scale(1.05);

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

  .canvas-box {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    .building-canvas {
      width: 100%;
      height: 100%;
      display: block;
      touch-action: none;
    }
  }
}
</style>
