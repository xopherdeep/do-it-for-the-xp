<template>
  <BattleSheet
    title="Powers"
    fa-icon="book-spells"
    subtitle="Casting one keeps your move."
    :busy="isBusy"
    cy="powers-sheet"
    @back="emit('cancel')"
  >
    <ul v-if="powers.length" class="sheet-list" role="list">
      <li v-for="{ ability, card } in powers" :key="ability.id">
        <XpPowerCard
          :ability="ability"
          status="available"
          :unlocked="true"
          :snapshot="snapshot"
          :battle="card"
          :casting="isBusy"
          @cast="cast"
        />
      </li>
    </ul>
    <p v-else class="empty-state">No battle Powers yet. Earn AP to unlock them.</p>
  </BattleSheet>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { HeroAbilitySnapshot } from "@/lib/services/abilities/heroAbilityStatus";
import type { BattlePowerEntry } from "@/lib/services/battle/BattlePowers";
import XpPowerCard from "@/app/Console/MyPortal/UserHud/MyAbilities/components/XpPowerCard.vue";
import BattleSheet from "./BattleSheet.vue";

/**
 * The Powers sheet: the hero's battle Powers as My Powers cards (MP and effect in place of the AP meter), each
 * greyed with its reason when it cannot be cast. The page decides what a cast does (BattlePowers) and plays the
 * cast sounds; this sheet only plays its own close sound (in the shell).
 */
defineProps<{
  powers: BattlePowerEntry[];
  snapshot: HeroAbilitySnapshot;
}>();

const emit = defineEmits<{
  (e: "cancel"): void;
  (e: "cast", abilityId: string): void;
}>();

/** Latched by a cast: the page closes the sheet next, so nothing else may fire from it before it is gone. */
const isBusy = ref(false);

const cast = (abilityId: string) => {
  if (isBusy.value) return;
  isBusy.value = true;
  emit("cast", abilityId);
};
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

// The card brings no styles of its own (My Powers styles it from the page), so the sheet dresses it:
// a plain bordered row inside the sheet's box, the same family as the potion rows.
.sheet-list :deep(.power-card) {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px;
  border: 2px solid color-mix(in srgb, var(--gs-text) 22%, transparent);
  border-radius: 2px;
  background: color-mix(in srgb, var(--gs-text) 4%, transparent);
  font-family: $eb-font-status, sans-serif;

  .power-head {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .power-icon {
    flex: 0 0 auto;
    width: 1.6rem;
    font-size: 1.3rem;
    text-align: center;
    color: var(--gs-accent);
  }

  .power-title {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
  }

  .power-name {
    margin: 0;
    font-family: var(--gs-font);
    font-size: 1.25rem;
    font-weight: normal;
    letter-spacing: 1px;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .power-chip {
    padding: 1px 6px;
    font-family: "StatusPlz", monospace;
    font-size: 0.85rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--gs-window-color);
    background: var(--gs-accent);
  }

  .power-desc {
    margin: 0;
    font-family: "StatusPlz", monospace;
    font-size: 0.85rem;
    line-height: 1.25;
    opacity: 0.85;
  }

  .power-cost {
    margin: 0;
    font-family: "StatusPlz", monospace;
    font-size: 0.95rem;
    color: var(--xp-color-mp, var(--gs-accent));
  }

  .power-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .power-state {
    margin: 0;
    font-family: "StatusPlz", monospace;
    font-size: 0.85rem;
    line-height: 1.25;
    color: var(--gs-danger);
  }

  .cast-btn {
    margin-left: auto;
    min-width: 96px;
    min-height: 48px;
    padding: 0 20px;
    border: 0;
    font-family: $eb-font-status, sans-serif;
    font-size: 1rem;
    color: var(--ion-color-rpg-contrast);
    background: var(--ion-color-rpg);
    box-shadow: 0 0 0 3px var(--gs-divider);

    &:active:not(:disabled) {
      background: var(--ion-color-rpg-tint);
    }

    &:focus-visible {
      outline: 2px solid var(--gs-accent);
      outline-offset: 3px;
    }

    &:disabled {
      opacity: 0.4;
    }
  }
}
</style>
