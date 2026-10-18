<template>
  <ion-card class="pack-card" :data-cy="`pack-${pack.id}`">
    <ion-card-header>
      <div class="pack-card__head">
        <i :class="['fad', `fa-${pack.icon || 'box-open'}`, 'fa-2x', 'icon-colors']"></i>
        <div>
          <ion-card-title>{{ pack.name }}</ion-card-title>
          <ion-card-subtitle>{{ subtitle }}</ion-card-subtitle>
        </div>
        <ion-badge v-if="status.state !== 'none'" :color="status.state === 'loaded' ? 'success' : 'warning'" class="pack-card__badge">
          {{ status.state === "loaded" ? "Loaded" : "Partly loaded" }}
        </ion-badge>
      </div>
    </ion-card-header>
    <ion-card-content>
      <slot name="before"></slot>
      <p>{{ pack.description }}</p>
      <p class="pack-card__contents">{{ packSummary(pack) }}</p>
      <p v-if="termsLine" class="pack-card__terms">{{ termsLine }}</p>
      <div class="pack-card__actions">
        <ion-button size="small" :disabled="busy" data-cy="pack-load" @click="emit('load', pack)">
          {{ status.state === "none" ? loadLabel : "Load again" }}
        </ion-button>
        <ion-button
          v-if="status.state !== 'none' && removable"
          size="small"
          fill="outline"
          color="danger"
          :disabled="busy"
          data-cy="pack-remove"
          @click="emit('remove', pack)"
        >
          Remove
        </ion-button>
        <slot name="actions"></slot>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle } from "@ionic/vue";
import type { XpPack } from "@/lib/services/core/packs/packFormat";
import { packSummary } from "@/lib/services/core/packs/packService";
import type { PackStatus } from "@/lib/services/core/packs/packService";

/** One content pack: what it is, what is in it, whether it is loaded, and its Load and Remove buttons */
interface PackCardProps {
  pack: XpPack;
  status: PackStatus;
  busy?: boolean;
  removable?: boolean;
  loadLabel?: string;
}

const props = withDefaults(defineProps<PackCardProps>(), { busy: false, removable: true, loadLabel: "Load" });
const emit = defineEmits<{ (event: "load", pack: XpPack): void; (event: "remove", pack: XpPack): void }>();

const DEFAULT_TERMS = { members: "Heroes", gm: "Game Master" };

const subtitle = computed(() => (props.pack.author ? `${props.pack.audience} · by ${props.pack.author}` : props.pack.audience));

/** Only packs that rename the players say so; the Family pack keeps Heroes and the Game Master */
const termsLine = computed(() => {
  const terms = props.pack.terms;
  const keepsDefaultTerms = !terms || (terms.members === DEFAULT_TERMS.members && terms.gm === DEFAULT_TERMS.gm);
  if (keepsDefaultTerms) return "";
  return `Made for ${terms.members.toLowerCase()} and their ${terms.gm.toLowerCase()}.`;
});
</script>

<style lang="scss" scoped>
.pack-card {
  // beat the theme's ion-card width and margin (set under ion-app#earthbound)
  width: 100% !important;
  margin: 0 !important;
  display: flex;
  flex-direction: column;

  &__head {
    display: flex;
    align-items: center;
    gap: 12px;

    > div {
      flex: 1;
      min-width: 0;
    }
  }

  &__badge {
    align-self: flex-start;
  }

  &__contents {
    margin-top: 8px;
    opacity: 0.85;
    font-size: 0.9em;
  }

  &__terms {
    margin-top: 4px;
    font-style: italic;
    font-size: 0.9em;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: auto;
    padding-top: 12px;
  }

  ion-card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}
</style>
