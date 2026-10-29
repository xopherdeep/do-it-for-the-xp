<template>
  <ion-card class="max-w-2xl party-modes" data-cy="party-hero-modes">
    <ion-card-header>
      <ion-card-title>Who may join parties</ion-card-title>
      <ion-card-subtitle>How each hero may party with other families</ion-card-subtitle>
    </ion-card-header>
    <ion-card-content>
      <p v-if="isReadOnly" class="party-modes__note">Only a Game Master can change who a hero may party with.</p>

      <ul class="party-modes__list">
        <li v-for="hero in heroes" :key="hero.id" class="party-modes__hero" :data-cy="`party-mode-${hero.id}`">
          <span class="party-modes__name">{{ hero.name }}</span>
          <div class="party-modes__choices" role="group" :aria-label="`How ${hero.name} may party`">
            <button
              v-for="option in MODE_OPTIONS"
              :key="option.id"
              type="button"
              class="party-modes__choice"
              :class="{ 'is-chosen': isChosen(hero.id, option.id) }"
              :aria-pressed="isChosen(hero.id, option.id)"
              :disabled="isReadOnly"
              :data-cy="`party-mode-${hero.id}-${option.id}`"
              @click="emit('change', hero.id, option.id)"
            >
              {{ option.label }}
            </button>
          </div>
        </li>
      </ul>

      <p class="party-modes__note">
        Open: joins a party once its leader accepts. Ask first: waits for a Game Master's yes, once per party. Home only:
        stays in the household party.
      </p>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle } from "@ionic/vue";
import type { HeroPartyMode } from "@/lib/services/party/partyRules";
import { MODE_OPTIONS, type HeroModeRow } from "./partyModes";

const props = defineProps<{ heroes: HeroModeRow[]; modes: Record<string, HeroPartyMode>; canEdit: boolean }>();
const emit = defineEmits<{ (event: "change", heroId: string, mode: HeroPartyMode): void }>();

const isReadOnly = computed(() => !props.canEdit);
const isChosen = (heroId: string, mode: HeroPartyMode): boolean => props.modes[heroId] === mode;
</script>

<style scoped lang="scss">
@use "@/app/Console/MyPortal/party/partyUi" as *;

.party-modes__list {
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}

.party-modes__hero {
  padding: 10px 0;
  border-bottom: 1px solid var(--gs-divider);
}

.party-modes__name {
  display: block;
  margin-bottom: 6px;
  font-weight: bold;
}

.party-modes__choices {
  display: flex;
  gap: 8px;
}

.party-modes__choice {
  @include party-button();
  flex: 1;
}

.party-modes__note {
  font-size: 0.9rem;
  opacity: 0.8;
}
</style>
