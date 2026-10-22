<template>
  <div class="equipment" :class="{ 'is-retro': retro }">
    <section v-for="group in groups" :key="group.section.id" class="equipment-section" :data-cy="`section-${group.section.id}`">
      <header class="section-header">
        <i class="fad" :class="`fa-${group.section.icon}`"></i>
        <span class="section-label">{{ group.section.label }}</span>
        <span class="section-count">{{ unlockedCount(group.items) }}/{{ group.items.length }}</span>
      </header>
      <div class="grid-container">
        <div
          v-for="item in group.items"
          :key="item.faIcon"
          class="grid-item"
          :class="{
            'is-equipped': isItemEquipped(item.faIcon),
            'is-locked': isItemLocked(item.faIcon),
            'is-selected': selected === item.faIcon,
          }"
          :aria-label="isItemLocked(item.faIcon) ? 'Locked item' : item.name"
          role="button"
          @click="$emit('display-info', item)"
          :draggable="!isItemLocked(item.faIcon) && !noDrag"
          @dragstart="drag($event, item)"
        >
          <div class="item-inner">
            <i
              class="fad fa-3x"
              :class="`fa-${item.faIcon}`"
            ></i>
          </div>
          <div class="equipped-tag" v-if="isItemEquipped(item.faIcon)">
            <span v-if="handOf(item.faIcon)">{{ handOf(item.faIcon) === 'left' ? 'L' : 'R' }}</span>
            <i v-else class="fad fa-check"></i>
          </div>
          <div class="locked-tag" v-else-if="isItemLocked(item.faIcon)" :title="lockHint(item)">
            <i class="fad fa-lock"></i>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { EquipmentItem } from "./EquipmentItems";
import { groupBySection } from "@/lib/services/items/equipmentSections";

export default defineComponent({
  name: "equipment-grid",
  props: {
    items: {
      type: Array as PropType<EquipmentItem[]>,
      required: true
    },
    equippedItems: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    /** Icons of the items the hero has not unlocked yet: shown greyed with a lock, not draggable */
    lockedItems: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    /** How a locked item is earned, for its lock badge */
    lockHint: {
      type: Function as PropType<(item: EquipmentItem) => string>,
      default: () => ""
    },
    /** Tiles only tap (the bag in battle mode has no hands to drop them on) */
    noDrag: {
      type: Boolean,
      default: false
    },
    /** Icon of the item under the cursor */
    selected: {
      type: String as PropType<string | null>,
      default: null
    },
    /** Which hand holds an equipped item, for its L / R badge */
    handOf: {
      type: Function as PropType<(faIcon: string) => "left" | "right" | null>,
      default: () => null
    },
    /** The Retro skin: square SNES tiles and a blinking cursor */
    retro: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    groups() {
      return groupBySection(this.items);
    }
  },
  emits: ["display-info", "equip-item"],
  methods: {
    drag(event: DragEvent, item: EquipmentItem) {
      const isDragBlocked = this.noDrag || this.isItemLocked(item.faIcon);
      if (isDragBlocked) {
        event.preventDefault();
        return;
      }
      const dataTransfer = event.dataTransfer;
      if (dataTransfer) {
        dataTransfer.setData("item", JSON.stringify(item));
      }
    },
    isItemEquipped(faIcon: string) {
      return this.equippedItems.includes(faIcon);
    },
    isItemLocked(faIcon: string) {
      return this.lockedItems.includes(faIcon);
    },
    unlockedCount(items: EquipmentItem[]) {
      return items.filter((item) => !this.isItemLocked(item.faIcon)).length;
    }
  }
});
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

.equipment {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 4px 12px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px 6px;
  font-family: "StatusPlz", monospace;
  font-size: 0.85rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);

  i {
    font-size: 1rem;
  }

  .section-count {
    margin-left: auto;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 1px;
  }
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(7, 1fr);
  }
}

.grid-item {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.2s, background 0.2s;
  position: relative;
  -webkit-tap-highlight-color: transparent;

  .item-inner {
    display: flex;
    align-items: center;
    justify-content: center;

    i {
      font-size: 1.7rem;
      filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.35));
    }
  }

  .equipped-tag,
  .locked-tag {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 20px;
    height: 20px;
    padding: 0 4px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "StatusPlz", monospace;
    font-size: 0.7rem;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.3);
    z-index: 5;
  }

  .equipped-tag {
    background: var(--ion-color-success);
    color: #fff;
  }

  .locked-tag {
    background: rgba(30, 30, 40, 0.95);
    color: rgba(255, 255, 255, 0.75);
  }

  &.is-equipped {
    border-color: var(--ion-color-success);
  }

  // Not found yet: the item in greyscale, so the hero can see what there is to earn (owner 2026-10-21)
  &.is-locked {
    border-style: dashed;
    border-color: rgba(255, 255, 255, 0.1);

    .item-inner i {
      filter: grayscale(1) opacity(0.5);
    }
  }

  &.is-selected {
    background: rgba(255, 255, 255, 0.1);
    border-color: #fff;
    transform: scale(1.06);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.25), 0 8px 18px rgba(0, 0, 0, 0.45);
  }

  &:active {
    transform: scale(0.94);
  }
}

/* ---- Retro skin: square tiles in Earthbound colours and a blinking box cursor ---- */
.equipment.is-retro {
  .section-header {
    color: $eb-color-pale-yellow;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.6);
  }

  .grid-item {
    border-radius: 0;
    background: $eb-color-medium-purple;
    border: none;
    box-shadow: inset 0 0 0 2px $eb-color-slate;
    transition: none;

    &.is-equipped {
      box-shadow: inset 0 0 0 2px $eb-color-mint-green;
    }

    &.is-locked {
      background: rgba(0, 0, 0, 0.35);
    }

    &.is-selected {
      transform: none;
      box-shadow: inset 0 0 0 2px $eb-color-pale-yellow;

      &::after {
        content: "";
        position: absolute;
        inset: -5px;
        border: 3px solid $eb-color-pale-yellow;
        pointer-events: none;
        animation: equip-cursor-blink 0.8s steps(2, jump-none) infinite;
      }
    }
  }

  .equipped-tag,
  .locked-tag {
    border-radius: 0;
  }
}

@keyframes equip-cursor-blink {
  from {
    opacity: 1;
  }

  to {
    opacity: 0.2;
  }
}
</style>
