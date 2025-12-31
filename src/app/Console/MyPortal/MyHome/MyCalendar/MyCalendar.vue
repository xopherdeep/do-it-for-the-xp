<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}/my-home`"></ion-back-button>
          <ion-icon :icon="calendarOutline" slot="icon-only" />
        </ion-buttons>
        <ion-title>
          {{ calendarTitle }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openAddQuest" color="light" fill="clear" slot="icon-only">
            <ion-icon :icon="addCircleOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="activeSegment" color="success" scrollable>
          <ion-segment-button value="all">
            <i class="fal fa-calendar-alt fa-2x"></i>
            All
          </ion-segment-button>
          <ion-segment-button value="morning">
            <i class="fal fa-sun fa-2x"></i>
            Morn
          </ion-segment-button>
          <ion-segment-button value="noon">
            <i class="fal fa-cloud-sun fa-2x"></i>
            Noon
          </ion-segment-button>
          <ion-segment-button value="evening">
            <i class="fal fa-cloud-moon fa-2x"></i>
            Eve
          </ion-segment-button>
          <ion-segment-button value="night">
            <i class="fal fa-moon-stars fa-2x"></i>
            Night
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-calendar" :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="loadLocalQuests"></ion-refresher>
      <xp-loading v-if="isLoading" />

      <div v-else class="quest-list">
        <ion-grid v-if="filteredQuests.length > 0">
          <ion-row>
            <ion-col size="12" v-for="item in filteredQuests" :key="item.id" class="ion-no-padding">
              <ion-card @click="activeModal = item.id" button class="item">
                <ion-card-header>
                  <ion-card-title v-html="formatQuestName(item.achievementName || 'Untitled Quest')"></ion-card-title>
                  <ion-card-subtitle v-if="item.dueByTime">
                    <i class="fal fa-clock"></i> {{ item.dueByTime }}
                  </ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  <div class="quest-rewards">
                    <ion-badge color="success" v-if="item.xp">{{ item.xp }} XP</ion-badge>
                    <ion-badge color="warning" v-if="item.gp">{{ item.gp }} GP</ion-badge>
                    <ion-badge color="tertiary" v-if="item.ap">{{ item.ap }} AP</ion-badge>
                  </div>
                </ion-card-content>
              </ion-card>

              <MyTask @didDismiss="activeModal = 0" :item="item" :userId="userId" v-if="activeModal == item.id" />
            </ion-col>
          </ion-row>
        </ion-grid>
        <div v-else class="no-quests ion-text-center ion-padding">
          <i class="fad fa-scroll-old fa-3x"></i>
          <p>No quests scheduled for this time.</p>
        </div>
      </div>

      <ion-fab vertical="bottom" horizontal="center" slot="fixed" @click.stop="presentActionSheet">
        <ion-fab-button>
          <ion-icon :icon="calendarOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
    <ion-footer>
      <ion-toolbar color="secondary">
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar color="light" :debounce="500" @ionChange="filterQuests" v-model="searchQuery"
                placeholder="Search Daily Quests..."></ion-searchbar>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col>
              <ion-button @click="prevDay" color="light" expand="block">
                <ion-icon :icon="chevronBack" slot="icon-only" />
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button @click="nextDay" color="light" expand="block">
                <ion-icon :icon="chevronForward" slot="icon-only" />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  defineComponent,
  toRef
} from "vue";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonFooter,
  IonGrid,
  IonRow,
  IonCol,
  IonSearchbar,
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonRefresher,
  actionSheetController,
} from "@ionic/vue";
import {
  calendarOutline,
  addCircleOutline,
  removeCircleOutline,
  close,
  chevronBack,
  chevronForward,
} from "ionicons/icons";
import AchievementDb, { achievementStorage } from "@/lib/databases/AchievementDb";
import MyTask from "../../UserHud/MyTask/MyTask.vue";
import { formatQuestName } from "@/lib/utils/format";
import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";

defineComponent({
  name: "MyCalendar",
  components: {
    MyTask
  }
});

const props = defineProps<{
  userId: string | number;
}>();
const userId = toRef(props, 'userId');

// State
const selectedDate = ref(new Date());
const isLoading = ref(false);
const searchQuery = ref("");
const activeSegment = ref("all");
const allQuests = ref<any[]>([]);
const activeModal = ref<any>(0);
const achievementDb = new AchievementDb(achievementStorage);

// Computed
const calendarTitle = computed(() => {
  return selectedDate.value.toLocaleDateString("default", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
});

const filteredQuests = computed(() => {
  const questEngine = getQuestEngine();
  return questEngine.filterQuests(allQuests.value, {
    userId: userId.value,
    search: searchQuery.value,
    segment: activeSegment.value as any
  });
});

// Methods
const loadLocalQuests = async (event?: any) => {
  isLoading.value = true;
  try {
    allQuests.value = await achievementDb.getTasks();
  } finally {
    isLoading.value = false;
    if (event) event.target.complete();
  }
};

const nextDay = () => {
  const next = new Date(selectedDate.value);
  next.setDate(next.getDate() + 1);
  selectedDate.value = next;
};

const prevDay = () => {
  const prev = new Date(selectedDate.value);
  prev.setDate(prev.getDate() - 1);
  selectedDate.value = prev;
};

const filterQuests = () => {
  // Computed property handles this automatically
};

const openAddQuest = () => {
  // Logic to open admin/create quest
};

const presentActionSheet = async () => {
  const actionSheet = await actionSheetController.create({
    header: "Daily Agenda Actions",
    buttons: [
      {
        text: "Add New Quest",
        icon: addCircleOutline,
        handler: openAddQuest,
      },
      {
        text: "Request Time Off",
        icon: removeCircleOutline,
        handler: () => { },
      },
      {
        text: "Cancel",
        icon: close,
        role: "cancel",
      },
    ],
  });
  await actionSheet.present();
};

// Lifecycle
onMounted(loadLocalQuests);
</script>

<style lang="scss" src="./_MyCalendar.scss" scoped></style>
