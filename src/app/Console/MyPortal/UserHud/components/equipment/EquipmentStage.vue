<template>
  <div class="equipment-stage" :class="{ 'is-retro': retro }">
    <button
      v-for="hand in HANDS"
      :key="hand"
      type="button"
      class="hand-slot equipment-slot"
      :class="[`hand-${hand}`, { 'has-item': !!itemIn(hand), 'is-selected': isSelected(hand) }]"
      :data-cy="`hand-${hand}`"
      @click="$emit('select-hand', hand)"
      @drop.prevent="onDrop($event, hand)"
      @dragover.prevent
    >
      <span class="hand-label">{{ hand === "left" ? "Left hand" : "Right hand" }}</span>
      <span class="hand-icon">
        <i v-if="itemIn(hand)" class="fad" :class="`fa-${itemIn(hand)?.faIcon}`"></i>
        <i v-else class="fad fa-hand-paper empty"></i>
      </span>
      <span class="hand-name">{{ itemIn(hand)?.name ?? "Empty" }}</span>
    </button>

    <div class="stage-hero">
      <xp-hero-model v-if="heroLook" :look="heroLook" animation="idle" :interactive="false" class="stage-voxel" />
      <i v-else class="fad fa-4x stage-crest" :class="classIcon"></i>
      <button type="button" class="class-pill" data-cy="change-class" @click="$emit('change-class')">
        <i class="fad" :class="classIcon"></i>
        <span>{{ jobClass || "Class" }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { PropType } from "vue";
import XpHeroModel from "@/components/organisms/HeroModel/XpHeroModel.vue";
import { withHands } from "@/components/organisms/HeroModel/lookEditor";
import { isHeroLook } from "@/lib/hero-look/types";
import { JOB_CLASS_OPTIONS } from "@/constants";
import type { EquipmentItem } from "./EquipmentItems";

/**
 * The top of the Equipment screen: the two hands the bottom nav uses, either side of the voxel hero holding what
 * is in them. Tapping a hand puts the cursor on its item; dropping a dragged tile on one equips it there.
 * A hero with no voxel look shows their class crest instead.
 */
type Hand = "left" | "right";
const HANDS: Hand[] = ["left", "right"];

const props = defineProps({
  leftItem: { type: Object as PropType<EquipmentItem | null>, default: null },
  rightItem: { type: Object as PropType<EquipmentItem | null>, default: null },
  look: { type: Object as PropType<unknown>, default: null },
  jobClass: { type: String, default: "" },
  selected: { type: String as PropType<string | null>, default: null },
  retro: { type: Boolean, default: false },
});

const emit = defineEmits<{
  (e: "select-hand", hand: Hand): void;
  (e: "change-class"): void;
  (e: "drop", item: EquipmentItem, hand: Hand): void;
}>();

const itemIn = (hand: Hand): EquipmentItem | null => (hand === "left" ? props.leftItem : props.rightItem);
const isSelected = (hand: Hand): boolean => Boolean(props.selected) && itemIn(hand)?.faIcon === props.selected;

const heroLook = computed(() => {
  const look = props.look;
  if (!isHeroLook(look)) return null;
  return withHands(look, { leftHand: props.leftItem ? [props.leftItem] : [], rightHand: props.rightItem ? [props.rightItem] : [] });
});

const classIcon = computed(() => {
  const job = JOB_CLASS_OPTIONS.find((j) => j.name === props.jobClass);
  return job?.icon || "fa-shield-alt";
});

const onDrop = (event: DragEvent, hand: Hand) => {
  const raw = event.dataTransfer?.getData("item");
  if (!raw) return;
  try {
    emit("drop", JSON.parse(raw) as EquipmentItem, hand);
  } catch {
    // chemx-allow: best-effort a drop from outside the bag carries no item JSON, so there is nothing to equip
  }
};
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

.equipment-stage {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  align-items: center;
  gap: 8px;
  padding: 10px 8px 4px;
}

.hand-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  font: inherit;
  -webkit-tap-highlight-color: transparent;

  &.hand-left {
    grid-column: 1;
    grid-row: 1;
  }

  &.hand-right {
    grid-column: 3;
    grid-row: 1;
  }

  &.has-item {
    border-style: solid;
    border-color: var(--ion-color-success);
    background: rgba(var(--ion-color-success-rgb), 0.12);
  }

  &.is-selected {
    box-shadow: 0 0 0 2px #fff;
  }

  .hand-label {
    font-family: "StatusPlz", monospace;
    font-size: 0.65rem;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.6);
  }

  .hand-icon i {
    font-size: 2rem;

    &.empty {
      opacity: 0.25;
    }
  }

  .hand-name {
    font-size: 0.75rem;
    line-height: 1.1;
    min-height: 2.2em;
    text-align: center;
    color: rgba(255, 255, 255, 0.85);
  }
}

.stage-hero {
  grid-column: 2;
  grid-row: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 210px;

  .stage-voxel {
    position: absolute;
    inset: 0 0 26px;
    width: auto;
    height: auto;
  }

  .stage-crest {
    margin: auto 0;
  }

  .class-pill {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(0, 0, 0, 0.45);
    color: #fff;
    font-family: "StatusPlz", monospace;
    font-size: 0.7rem;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
}

.equipment-stage.is-retro {
  .hand-slot {
    border-radius: 0;
    border: none;
    background: $eb-color-medium-purple;
    box-shadow: inset 0 0 0 2px $eb-color-slate;

    &.has-item {
      box-shadow: inset 0 0 0 2px $eb-color-mint-green;
    }

    &.is-selected {
      box-shadow: inset 0 0 0 2px $eb-color-pale-yellow, 0 0 0 3px $eb-color-pale-yellow;
    }

    .hand-label {
      color: $eb-color-pale-yellow;
    }
  }

  .class-pill {
    border-radius: 0;
    background: $eb-color-dark-purple;
    box-shadow: 0 0 0 2px $eb-color-pale-yellow;
    border: none;
    color: $eb-color-cream;
  }
}
</style>
