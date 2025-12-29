<template>
  <ion-page class="xp-beast-selection-page">
    <ion-header>
      <ion-toolbar class="rpg-box icon-colors">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="fas fa-arrow-left fa-lg"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>Select Beasts</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="confirm" color="primary" fill="solid" class="confirm-btn">
            Confirm
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <XpBeastSelector 
        v-if="beasts.length"
        :beasts="beasts"
        :initial-selected-ids="selectedIds"
        @update:selectedIds="onSelectedIdsUpdate"
      />
      <div v-else class="loading-container">
        <XpLoading />
        <p>Grooming beasts...</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { 
  IonPage, IonHeader, IonToolbar, IonButtons, IonButton, 
  IonTitle, IonContent 
} from '@ionic/vue';
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import { useRouter } from 'vue-router';
import XpBeastSelector from './components/XpBeastSelector.vue';
import BestiaryDb, { beastStorage, Beast } from '@/lib/databases/BestiaryDb';
import { useBestiarySelectionStore } from '@/lib/store/stores/bestiary-selection';

export default defineComponent({
  name: 'XpBeastSelectionPage',
  components: {
    IonPage, IonHeader, IonToolbar, IonButtons, IonButton, 
    IonTitle, IonContent,
    XpBeastSelector,
    XpLoading
  },
  setup() {
    const router = useRouter();
    const selectionStore = useBestiarySelectionStore();
    const bestiary = new BestiaryDb(beastStorage);
    
    const beasts = ref<Beast[]>([]);
    const selectedIds = ref<string[]>([...selectionStore.selectedBeastIds]);

    onMounted(async () => {
      try {
        beasts.value = await bestiary.getBeasts();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load beasts for selection:', err);
      }
    });

    const onSelectedIdsUpdate = (ids: string[]) => {
      selectedIds.value = ids;
      selectionStore.setSelectedBeasts(ids);
    };

    const confirm = () => {
      selectionStore.confirmSelection();
      router.back();
    };

    const goBack = () => {
      router.back();
    };

    return {
      beasts,
      selectedIds,
      onSelectedIdsUpdate,
      confirm,
      goBack
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-beast-selection-page {
  --background: #121212;

  ion-toolbar {
    --background: rgba(0, 0, 0, 0.8);
    --color: #fff;
  }

  .confirm-btn {
    --border-radius: 8px;
    font-family: "Press Start 2P";
    font-size: 0.6rem;
    height: 36px;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80%;
  color: rgba(255, 255, 255, 0.5);

  p {
    margin-top: 16px;
    font-family: "Press Start 2P";
    font-size: 0.7rem;
  }
}
</style>
