<template>
  <div class="equipment-detail" :class="{ 'is-retro': retro, 'is-locked': locked }" data-cy="equipment-detail">
    <template v-if="item">
      <div class="detail-head">
        <div class="detail-icon">
          <i class="fad" :class="`fa-${item.faIcon}`"></i>
        </div>
        <div class="detail-title">
          <h3 class="detail-name">{{ locked ? "???" : item.name }}</h3>
          <div class="detail-pills">
            <span v-if="!locked && mp > 0" class="pill mp" data-cy="detail-mp">{{ mp }} MP</span>
            <span v-if="!locked && item.rechargeTime" class="pill recharge"><i class="fad fa-clock"></i> {{ item.rechargeTime }}</span>
            <span
              v-for="chip in chips"
              :key="chip.id"
              class="pill chip"
              :class="`chip-${chip.id}`"
              :data-cy="`chip-${chip.id}`"
            >
              <i class="fad" :class="`fa-${chip.icon}`"></i> {{ chip.label }}
            </span>
          </div>
        </div>
      </div>

      <p v-if="locked" class="detail-hint" data-cy="detail-hint">{{ lockHint }}</p>
      <ul v-else-if="usesWithLines.length" class="detail-uses">
        <li v-for="chip in usesWithLines" :key="chip.id">
          <i class="fad" :class="`fa-${chip.icon}`"></i>
          <span>{{ chip.line }}</span>
        </li>
      </ul>
      <p v-else class="detail-desc">{{ plainDesc }}</p>

      <div class="detail-actions">
        <button
          v-for="hand in HANDS"
          :key="hand"
          type="button"
          class="hand-btn"
          :class="{ 'is-holding': heldIn === hand }"
          :disabled="locked"
          :data-cy="`equip-${hand}`"
          @click="heldIn === hand ? $emit('unequip', hand) : $emit('equip', hand)"
        >
          <template v-if="heldIn === hand">
            <i class="fad fa-hand-paper"></i> Take off
          </template>
          <template v-else>
            <i v-if="hand === 'left'" class="fad fa-arrow-left"></i>
            {{ hand === "left" ? "Left hand" : "Right hand" }}
            <i v-if="hand === 'right'" class="fad fa-arrow-right"></i>
          </template>
        </button>
      </div>
    </template>
    <p v-else class="detail-empty">Tap an item to see what it does.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { PropType } from "vue";
import { mpCostOf, whereItWorks } from "@/lib/services/items/equipmentSections";
import type { EquipmentItem } from "./EquipmentItems";

/**
 * The card under the cursor on the Equipment screen: what the item is, what it costs, where it works and what it
 * does there, and a button per hand. The hand already holding it reads "Take off". A locked item shows as ???
 * with how it is earned.
 */
type Hand = "left" | "right";
const HANDS: Hand[] = ["left", "right"];

const props = defineProps({
  item: { type: Object as PropType<EquipmentItem | null>, default: null },
  /** The hand holding this item, if any */
  heldIn: { type: String as PropType<Hand | null>, default: null },
  locked: { type: Boolean, default: false },
  lockHint: { type: String, default: "" },
  retro: { type: Boolean, default: false },
});

defineEmits<{
  (e: "equip", hand: Hand): void;
  (e: "unequip", hand: Hand): void;
}>();

const mp = computed(() => (props.item ? mpCostOf(props.item.name, props.item.mpCost ?? 0) : 0));
const chips = computed(() => (props.item && !props.locked ? whereItWorks(props.item.name) : []));
const usesWithLines = computed(() => chips.value.filter((chip) => chip.line));
// A page or relic: its catalogue text, without the "10MP | " price the pill already shows
const plainDesc = computed(() => (props.item?.desc ?? "").replace(/^\d+\s*MP\s*\|\s*/i, ""));
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

.equipment-detail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
  color: #fff;
}

.detail-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-icon {
  flex: none;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);

  i {
    font-size: 1.9rem;
  }
}

.is-locked .detail-icon i {
  filter: brightness(0) opacity(0.55);
}

.detail-name {
  margin: 0 0 4px;
  font-family: "StatusPlz", monospace;
  font-size: 1.05rem;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.detail-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-family: "StatusPlz", monospace;
  font-size: 0.7rem;
  letter-spacing: 1px;
  background: rgba(255, 255, 255, 0.1);

  &.mp {
    background: #2f5fb3;
  }

  &.chip-temple {
    background: rgba(198, 140, 60, 0.35);
    color: #f7d9a0;
  }

  &.chip-battle {
    background: rgba(200, 60, 60, 0.35);
    color: #ffc0b8;
  }

  &.chip-anywhere {
    background: rgba(80, 180, 140, 0.3);
    color: #b8f0d8;
  }
}

.detail-uses {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li {
    display: flex;
    gap: 8px;
    align-items: baseline;
    font-size: 0.9rem;
    line-height: 1.3;
  }
}

.detail-desc,
.detail-hint,
.detail-empty {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.85);
}

.detail-empty {
  text-align: center;
  padding: 18px 0;
  color: rgba(255, 255, 255, 0.55);
}

.detail-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.hand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(var(--ion-color-primary-rgb), 0.85);
  color: #fff;
  font-family: "StatusPlz", monospace;
  font-size: 0.8rem;
  letter-spacing: 1px;
  text-transform: uppercase;

  &.is-holding {
    background: rgba(255, 255, 255, 0.08);
    color: #ffb4a8;
    border-color: rgba(255, 140, 120, 0.5);
  }

  &:disabled {
    opacity: 0.35;
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
}

/* ---- Retro skin: an Earthbound window ---- */
.equipment-detail.is-retro {
  color: $eb-color-cream;

  .detail-icon,
  .pill,
  .hand-btn {
    border-radius: 0;
  }

  .detail-icon {
    background: $eb-color-medium-purple;
    border: none;
    box-shadow: inset 0 0 0 2px $eb-color-pale-yellow;
  }

  .detail-name {
    color: $eb-color-pale-yellow;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.6);
  }

  .hand-btn {
    background: $eb-color-medium-purple;
    border: none;
    box-shadow: inset 0 0 0 2px $eb-color-minty-blue;

    &.is-holding {
      background: $eb-color-dark-purple;
      box-shadow: inset 0 0 0 2px #e87060;
    }
  }
}
</style>
