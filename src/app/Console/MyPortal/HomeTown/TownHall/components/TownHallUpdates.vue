<template>
  <div class="th-updates">
    <xp-loading v-if="loading && !notes.length" />

    <ion-card v-else-if="failed && !notes.length" class="th-late" data-cy="th-late">
      <ion-card-content class="ion-text-center">
        <p>The patch notes haven't arrived.</p>
        <ion-button size="small" @click="reload">Try again</ion-button>
      </ion-card-content>
    </ion-card>

    <ion-card v-else-if="!notes.length" data-cy="th-no-patch-notes">
      <ion-card-content class="ion-text-center">No patch notes yet</ion-card-content>
    </ion-card>

    <ion-card v-for="note in notes" :key="note.id" class="th-patch-note" data-cy="th-patch-note">
      <ion-card-header>
        <ion-card-subtitle>{{ formatTownDate(note.date) }}</ion-card-subtitle>
        <ion-card-title v-html="sanitizeHtml(note.title)"></ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <div v-html="sanitizeHtml(note.content)"></div>
      </ion-card-content>
    </ion-card>

    <ion-card class="th-stats" data-cy="th-stats">
      <ion-card-header>
        <ion-card-title>Game Statistics</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-list>
          <ion-item>
            <ion-label>Heroes</ion-label>
            <ion-badge color="success" slot="end">{{ stats.heroes }}</ion-badge>
          </ion-item>
          <ion-item>
            <ion-label>Quests Posted</ion-label>
            <ion-badge color="tertiary" slot="end">{{ stats.quests }}</ion-badge>
          </ion-item>
          <ion-item>
            <ion-label>Open Today</ion-label>
            <ion-badge color="primary" slot="end">{{ stats.openToday }}</ion-badge>
          </ion-item>
          <ion-item>
            <ion-label>Awaiting Approval</ion-label>
            <ion-badge color="warning" slot="end">{{ stats.pendingApprovals }}</ion-badge>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonItem, IonLabel, IonList } from "@ionic/vue";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import { fetchPatchNotes, type NewsItem } from "@/lib/services/townhall/townHallFeed";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import { formatTownDate, type TownStats } from "./townHallShared";
import { useTownHallLoad } from "./useTownHallLoad";

/** The Patch Notes from the site (newest first), above the family's own game statistics. */
defineProps<{ stats: TownStats }>();
const emit = defineEmits<{ (event: "trouble"): void }>();

const notes = ref<NewsItem[]>([]);
const { loading, failed, run } = useTownHallLoad(() => emit("trouble"));

const reload = () =>
  run(async () => {
    notes.value = await fetchPatchNotes();
  });

onMounted(reload);
defineExpose({ reload });
</script>
