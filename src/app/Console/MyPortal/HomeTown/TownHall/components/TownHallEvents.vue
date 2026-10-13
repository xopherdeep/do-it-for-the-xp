<template>
  <div class="th-events">
    <ion-list v-if="hasEvents">
      <ion-item-group v-for="(events, date) in groups" :key="date">
        <ion-item-divider sticky>
          <ion-label>{{ date }}</ion-label>
        </ion-item-divider>

        <ion-item v-for="event in events" :key="event.id" data-cy="th-event">
          <ion-label>
            <h2>{{ event.title }}</h2>
            <p>{{ event.description }}</p>
            <ion-note>{{ event.time }}</ion-note>
          </ion-label>
          <ion-badge :color="event.type === 'bounty' ? 'warning' : 'primary'" slot="end">
            {{ event.type }}
          </ion-badge>
        </ion-item>
      </ion-item-group>
    </ion-list>
    <ion-card v-else>
      <ion-card-content class="ion-text-center">No events posted</ion-card-content>
    </ion-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonBadge, IonCard, IonCardContent, IonItem, IonItemDivider, IonItemGroup, IonLabel, IonList, IonNote } from "@ionic/vue";
import type { TownEvent } from "./townHallShared";

/** The hero's scheduled quests for the week ahead, by day. The page reads the quest board; this only shows it. */
const props = defineProps<{ groups: Record<string, TownEvent[]> }>();

const hasEvents = computed(() => Object.keys(props.groups).length > 0);

// Nothing to fetch here (the quest board comes from the page), so there is nothing to try again
defineExpose({ reload: async () => undefined });
</script>
