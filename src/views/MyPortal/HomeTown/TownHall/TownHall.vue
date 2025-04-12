<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}/my-home`"></ion-back-button>
          <ion-icon
            :icon="businessOutline"
            slot="icon-only"
          />
        </ion-buttons>
        <ion-title>
          Town Hall
        </ion-title>
      </ion-toolbar>
      <ion-segment v-model="selectedTab">
        <ion-segment-button value="news">
          <ion-label>News</ion-label>
          <ion-icon :icon="newspaperOutline"></ion-icon>
        </ion-segment-button>
        <ion-segment-button value="events">
          <ion-label>Events</ion-label>
          <ion-icon :icon="calendarOutline"></ion-icon>
        </ion-segment-button>
        <ion-segment-button value="updates">
          <ion-label>Updates</ion-label>
          <ion-icon :icon="megaphoneOutline"></ion-icon>
        </ion-segment-button>
      </ion-segment>
    </ion-header>

    <ion-content class="ion-padding">
      <xp-loading v-if="isLoading" />
      
      <div v-else>
        <!-- News Tab -->
        <div v-if="selectedTab === 'news'">
          <ion-card v-for="news in newsItems" :key="news.id">
            <ion-img v-if="news.image" :src="news.image"></ion-img>
            <ion-card-header>
              <ion-card-subtitle>{{ news.date }}</ion-card-subtitle>
              <ion-card-title>{{ news.title }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>{{ news.content }}</p>
              <ion-chip v-for="tag in news.tags" :key="tag" color="secondary">
                <ion-label>{{ tag }}</ion-label>
              </ion-chip>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Events Tab -->
        <div v-if="selectedTab === 'events'">
          <ion-list>
            <ion-item-group v-for="(events, date) in groupedEvents" :key="date">
              <ion-item-divider sticky>
                <ion-label>{{ date }}</ion-label>
              </ion-item-divider>
              
              <ion-item v-for="event in events" :key="event.id">
                <ion-label>
                  <h2>{{ event.title }}</h2>
                  <p>{{ event.description }}</p>
                  <ion-note>{{ event.time }}</ion-note>
                </ion-label>
                <ion-badge :color="event.type === 'special' ? 'warning' : 'primary'" slot="end">
                  {{ event.type }}
                </ion-badge>
              </ion-item>
            </ion-item-group>
          </ion-list>
        </div>

        <!-- Updates Tab -->
        <div v-if="selectedTab === 'updates'">
          <ion-card class="stats-card">
            <ion-card-header>
              <ion-card-title>Game Statistics</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                <ion-item>
                  <ion-label>Active Players</ion-label>
                  <ion-badge color="success" slot="end">{{ stats.activePlayers }}</ion-badge>
                </ion-item>
                <ion-item>
                  <ion-label>Total XP Earned Today</ion-label>
                  <ion-badge color="warning" slot="end">{{ stats.dailyXP }}</ion-badge>
                </ion-item>
                <ion-item>
                  <ion-label>Active Quests</ion-label>
                  <ion-badge color="tertiary" slot="end">{{ stats.activeQuests }}</ion-badge>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <ion-card class="patch-notes">
            <ion-card-header>
              <ion-card-title>Latest Updates</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                <ion-item v-for="update in updates" :key="update.id">
                  <ion-label>
                    <h3>Version {{ update.version }}</h3>
                    <p>{{ update.description }}</p>
                    <ion-text color="medium">
                      <small>{{ update.date }}</small>
                    </ion-text>
                  </ion-label>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>
        </div>
      </div>

      <!-- Floating Action Button for Quick Actions -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button>
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button @click="submitAnnouncement">
            <ion-icon :icon="megaphoneOutline"></ion-icon>
          </ion-fab-button>
          <ion-fab-button @click="reportBug">
            <ion-icon :icon="bugOutline"></ion-icon>
          </ion-fab-button>
          <ion-fab-button @click="suggestFeature">
            <ion-icon :icon="bulbOutline"></ion-icon>
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonIcon, IonSegment, IonSegmentButton,
  IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonBadge, IonChip, IonList, IonItem, IonItemDivider,
  IonNote, IonFab, IonFabButton, IonFabList, IonImg
} from '@ionic/vue';
import {
  businessOutline, newspaperOutline, calendarOutline, megaphoneOutline,
  addOutline, bugOutline, bulbOutline
} from 'ionicons/icons';
import XpLoading from '@/components/XpLoading/XpLoading.vue';

export default defineComponent({
  name: 'TownHall',
  components: {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonBackButton, IonIcon, IonSegment, IonSegmentButton,
    IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
    IonCardContent, IonBadge, IonChip, IonList, IonItem, IonItemDivider,
    IonNote, IonFab, IonFabButton, IonFabList, IonImg, XpLoading
  },
  props: {
    userId: {
      type: String,
      required: true
    }
  },
  setup() {
    const isLoading = ref(false);
    const selectedTab = ref('news');

    // Mock data - Replace with actual API calls
    const newsItems = ref([
      {
        id: 1,
        title: "New Dungeon Released!",
        content: "Explore the Mystic Caves of Eldoria in our latest dungeon update!",
        date: "2025-04-11",
        image: "path/to/dungeon-image.jpg",
        tags: ["Update", "Dungeon", "New Content"]
      },
      // Add more news items...
    ]);

    const events = ref([
      {
        id: 1,
        title: "Double XP Weekend",
        description: "Earn double XP on all activities!",
        date: "2025-04-13",
        time: "All Day",
        type: "special"
      },
      // Add more events...
    ]);

    const stats = ref({
      activePlayers: 1234,
      dailyXP: "150,000",
      activeQuests: 45
    });

    const updates = ref([
      {
        id: 1,
        version: "2.1.0",
        description: "Added new quest line and improved performance",
        date: "2025-04-10"
      },
      // Add more updates...
    ]);

    const groupedEvents = computed(() => {
      // Group events by date
      return events.value.reduce((groups: any, event) => {
        const date = event.date;
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(event);
        return groups;
      }, {});
    });

    const submitAnnouncement = () => {
      // Implement announcement submission
      console.log('Submit announcement');
    };

    const reportBug = () => {
      // Implement bug reporting
      console.log('Report bug');
    };

    const suggestFeature = () => {
      // Implement feature suggestion
      console.log('Suggest feature');
    };

    return {
      isLoading,
      selectedTab,
      newsItems,
      groupedEvents,
      stats,
      updates,
      submitAnnouncement,
      reportBug,
      suggestFeature,
      // Icons
      businessOutline,
      newspaperOutline,
      calendarOutline,
      megaphoneOutline,
      addOutline,
      bugOutline,
      bulbOutline
    };
  }
});
</script>

<style lang="scss" scoped>
.stats-card {
  margin-bottom: 1rem;
}

.patch-notes {
  margin-bottom: 4rem;
}

ion-segment {
  --background: var(--ion-color-primary);
  ion-segment-button {
    --color: var(--ion-color-light);
    --color-checked: var(--ion-color-primary);
    --background-checked: var(--ion-color-light);
  }
}

ion-card {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

ion-chip {
  margin: 4px;
}
</style>