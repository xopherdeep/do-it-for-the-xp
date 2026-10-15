<template>
  <XpBeastSelectorItem v-if="beast" :id="beast.id" :name="beast.name" :avatar="beast.avatar" :bg1="beast.bg1"
    :bg2="beast.bg2" />
  <div v-else class="placeholder-beast" :class="tier">
    <i class="fad" :class="icon"></i>
    <span class="beast-name">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import XpBeastSelectorItem from "@/app/Admin/XpCompendium/views/XpBestiary/components/XpBeastSelectorItem.vue";
import type { Beast } from "@/lib/databases/BestiaryDb";

/** A classic beast room's card face: the beast it holds, else a dashed placeholder in the tier's colour. */
interface TempleBeastPortraitProps {
  beast: Beast | null;
  /** boss, miniboss or monster: the placeholder's colour */
  tier: string;
  icon: string;
  label: string;
}

defineProps<TempleBeastPortraitProps>();
</script>

<style lang="scss" scoped>
/* Placeholder Beast Cards */
.placeholder-beast {
  aspect-ratio: 1/1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(25, 27, 46, 0.6);
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  transition: all 0.2s ease;

  i {
    opacity: 0.5;
  }

  .beast-name {
    font-family: "Press Start 2P";
    font-size: 0.5rem;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
  }

  &.boss {
    border-color: rgba(255, 215, 0, 0.3);

    i {
      color: gold;
    }
  }

  &.miniboss {
    border-color: rgba(180, 100, 255, 0.3);

    i {
      color: #b464ff;
    }
  }

  &.monster {
    border-color: rgba(var(--ion-color-danger-rgb), 0.3);

    i {
      color: var(--ion-color-danger);
    }
  }
}
</style>
