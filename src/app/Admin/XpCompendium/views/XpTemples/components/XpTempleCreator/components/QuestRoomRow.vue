<template>
  <component
    :is="selectable ? 'button' : 'div'"
    :type="selectable ? 'button' : undefined"
    class="quest-row"
    :class="[card.tier ? `tier-${card.tier}` : 'tier-none', { 'is-selected': selected, 'is-static': !selectable }]"
    :aria-pressed="selectable ? selected : undefined"
    @click="selectable && emit('select')"
  >
    <span class="portrait">
      <img
        v-if="portrait"
        :src="portrait"
        :alt="card.portraitAlt"
      />
      <i
        v-else
        class="fad fa-paw-claws"
        aria-hidden="true"
      ></i>
    </span>

    <span class="body">
      <span class="name">{{ card.name }}</span>
      <span class="facts">
        <span
          v-if="card.tierName"
          class="chip chip-tier"
        >{{ card.tierName }}</span>
        <span class="facts-text">{{ card.facts }}</span>
      </span>
      <span class="when">
        <span class="when-text">{{ card.when }}</span>
        <span
          v-if="card.approval"
          class="chip chip-approval"
        ><i class="fad fa-clipboard-list-check" aria-hidden="true"></i> Approval</span>
      </span>
      <span
        v-if="card.note"
        class="note"
      >{{ card.note }}</span>
    </span>

    <i
      v-if="selectable"
      class="fad pick"
      :class="selected ? 'fa-check-circle' : 'fa-circle'"
      aria-hidden="true"
    ></i>
  </component>
</template>

<script setup lang="ts">
  import { computed } from "vue";
  import type { QuestCard } from "@/lib/services/temples/questRoomPicker";
  import { beastPortraitUrl } from "./beastPortrait";

  /**
   * One card of the quest picker, and the quest card of a quest room's config: the beast's portrait, the quest's name,
   * its tier and difficulty, when it comes and for whom, the approval badge, and "no due time: never ambushes".
   * What it says comes ready-made from services/temples/questRoomPicker (questCardOf, libraryCardOf).
   */
  const props = withDefaults(
    defineProps<{
      card: QuestCard;
      selected?: boolean;
      /** A button the picker taps; false is the plain card of the room's config */
      selectable?: boolean;
    }>(),
    { selected: false, selectable: true }
  );

  const emit = defineEmits<{ (e: "select"): void }>();

  const portrait = computed(() => beastPortraitUrl(props.card.avatar));
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound.scss" as *;

  // The Combat category's red, with a tier colour on the chip and the portrait ring
  $tier-monster: #68d0b8;
  $tier-miniboss: #ffd740;
  $tier-boss: #ff5252;
  $tier-none: #f7e8a8;

  .quest-row {
    --tier: #{$tier-none};
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    margin: 0;
    text-align: left;
    color: $eb-color-cream;
    font-family: $eb-font-status;
    background: rgba(20, 6, 28, 0.55);
    border: 2px solid rgba(231, 230, 179, 0.18);
    border-radius: 8px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &.tier-monster {
      --tier: #{$tier-monster};
    }

    &.tier-miniboss {
      --tier: #{$tier-miniboss};
    }

    &.tier-boss {
      --tier: #{$tier-boss};
    }

    &.is-static {
      cursor: default;
    }

    &.is-selected {
      border-color: $eb-color-pale-yellow;
      background: rgba(104, 208, 184, 0.16);
      box-shadow: 0 0 0 2px $eb-color-dark-purple, 0 0 14px 2px rgba(247, 232, 168, 0.35);
    }

    &:focus-visible {
      outline: 2px solid $eb-color-pale-yellow;
      outline-offset: 2px;
    }

    &:active:not(.is-static) {
      transform: translateY(1px);
    }
  }

  .portrait {
    flex: 0 0 56px;
    width: 56px;
    height: 56px;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.35);
    border: 3px solid var(--tier);

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    i {
      --fa-primary-color: var(--tier);
      --fa-secondary-color: var(--tier);
      --fa-secondary-opacity: 0.55;
      font-size: 1.5rem;
    }
  }

  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .name {
    font-size: 1.15rem;
    line-height: 1.2;
    color: #fff;
    overflow-wrap: anywhere;
  }

  .facts,
  .when {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    font-size: 0.9rem;
    line-height: 1.25;
    opacity: 0.9;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 7px;
    border-radius: 6px;
    font-size: 0.75rem;
    line-height: 1.3;
    white-space: nowrap;
  }

  .chip-tier {
    color: $eb-color-dark-purple;
    background: var(--tier);
  }

  .chip-approval {
    color: $eb-color-pale-yellow;
    background: rgba(247, 232, 168, 0.14);
    border: 1px solid rgba(247, 232, 168, 0.4);

    i {
      --fa-primary-color: currentColor;
      --fa-secondary-color: currentColor;
    }
  }

  .note {
    font-size: 0.8rem;
    line-height: 1.25;
    font-style: italic;
    color: $eb-color-sky-blue;
  }

  .pick {
    flex: 0 0 auto;
    font-size: 1.5rem;
    --fa-primary-color: #{$eb-color-cream};
    --fa-secondary-color: #{$eb-color-cream};
    --fa-secondary-opacity: 0.35;
    opacity: 0.6;
  }

  .is-selected .pick {
    --fa-primary-color: #{$eb-color-mint-green};
    --fa-secondary-color: #{$eb-color-mint-green};
    opacity: 1;
  }
</style>
