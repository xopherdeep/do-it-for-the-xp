<template>
  <nav class="party-switcher" aria-label="Choose a party">
    <button
      v-for="party in parties"
      :key="party.id"
      type="button"
      class="party-switcher__chip"
      :class="{ 'is-active': isActive(party) }"
      :aria-pressed="isActive(party)"
      :data-cy="`party-chip-${party.id}`"
      @click="emit('select', party.id)"
    >
      {{ party.name }}
    </button>
  </nav>
</template>

<script setup lang="ts">
import type { PartyChip } from "./partyChips";

const props = defineProps<{ parties: PartyChip[]; active: string }>();
const emit = defineEmits<{ (event: "select", id: string): void }>();

const isActive = (party: PartyChip): boolean => party.id === props.active;
</script>

<style scoped lang="scss">
@use "./partyUi" as *;

// The strip sits at the bottom of the page, where a thumb reaches
.party-switcher {
  display: flex;
  gap: 10px;
  padding: 10px 16px;
  overflow-x: auto;
  background: var(--gs-bar);
}

.party-switcher__chip {
  @include party-button();
  flex: 0 0 auto;
}
</style>
