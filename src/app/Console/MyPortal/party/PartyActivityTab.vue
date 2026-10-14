<template>
  <ion-card class="party-activity-card">
    <ion-card-header>
      <ion-card-title>
        <i class="fad fa-scroll-old mr-2"></i>
        Activity Feed
      </ion-card-title>
      <ion-card-subtitle>Recent party achievements</ion-card-subtitle>
    </ion-card-header>
    <ion-card-content>
      <ion-list v-if="hasActivities" data-cy="party-activity">
        <ion-item v-for="activity in activities" :key="activity.id" data-cy="party-activity-item">
          <ion-avatar slot="start" v-if="activity.user">
            <img :src="getMemberAvatar(activity.user)" :alt="activity.nickname" />
          </ion-avatar>
          <ion-label>
            <h2 class="activity-text">{{ activity.text }}</h2>
            <p v-if="activity.completedAt" class="text-medium">
              {{ formatRelativeTime(activity.completedAt) }}
            </p>
          </ion-label>
        </ion-item>
      </ion-list>
      <div v-else class="ion-text-center ion-padding" data-cy="party-activity-empty">
        <i class="fad fa-scroll fa-3x text-medium"></i>
        <p>No recent activity</p>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  IonAvatar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList,
} from "@ionic/vue";
import appConfig from "@/app.config";
import { formatTime, type PartyActivityItem } from "@/lib/services/party/partyStats";

const props = defineProps<{
  activities: PartyActivityItem[];
}>();

const hasActivities = computed(() => props.activities.length > 0);

const getMemberAvatar = (user: any): string => {
  return appConfig.$getUserAvatar(user);
};

const formatRelativeTime = (iso: string): string => {
  return formatTime(iso);
};
</script>
