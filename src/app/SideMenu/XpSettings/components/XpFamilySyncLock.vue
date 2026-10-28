<template>
  <ion-item v-if="isShown" lines="none" class="fp-sync-lock" data-cy="family-sync-lock">
    <ion-label class="ion-text-wrap">
      <h2><i class="fad fa-crown fp-sync-crown" aria-hidden="true"></i>Family Sync</h2>
      <p>Play the whole game on a hero's own phone, with every device in step. Part of XP Pro.</p>
    </ion-label>
    <ion-button slot="end" size="small" aria-label="Unlock Family Sync" data-cy="family-sync-unlock" @click="unlock">Unlock</ion-button>
  </ion-item>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { IonButton, IonItem, IonLabel } from "@ionic/vue";
import { useProStore } from "@/lib/store/stores/pro";

/**
 * The locked door to Family Sync, under the hero phones of a family without XP Pro. Linking a phone and the hero's quest
 * board are free; this row says what Pro adds (the whole game on the hero's phone, every device in step), and Unlock
 * opens the Family Sync upsell. It waits for the cached license to be read, so a Pro family never sees it flash.
 */
const pro = useProStore();
const hasReadLicense = ref(false);
const isShown = computed(() => hasReadLicense.value && !pro.isPro);

onMounted(async () => {
  // a license that cannot be read leaves the family without Pro, which is what the lock says
  await pro.init().catch(() => undefined);
  hasReadLicense.value = true;
});

const unlock = (): Promise<boolean> => pro.requirePro("familySync");
</script>

<style lang="scss" scoped>
.fp-sync-lock {
  --background: var(--ion-color-light);

  h2 {
    font-size: 15px;
    font-weight: 600;
  }

  p {
    font-size: 13px;
  }

  .fp-sync-crown {
    margin-right: 6px;
    color: var(--ion-color-warning);
  }
}
</style>
