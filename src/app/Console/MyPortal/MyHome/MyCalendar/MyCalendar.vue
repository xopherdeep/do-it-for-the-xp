<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${heroId}/my-home`"></ion-back-button>
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
            <ion-col size="12" v-for="{ quest: item, status, pending } in filteredQuests" :key="item.id"
              class="ion-no-padding">
              <ion-card @click="activeModal = item.id" button class="item"
                :class="{ 'is-tamed': status === 'done' && !pending, 'is-pending': status === 'done' && pending }">
                <ion-card-header>
                  <ion-card-title v-html="sanitizeHtml(formatQuestName(item.achievementName || 'Untitled Quest'))"></ion-card-title>
                  <ion-card-subtitle v-if="item.dueByTime">
                    <i class="fal fa-clock"></i> {{ item.dueByTime }}
                  </ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  <div class="quest-rewards">
                    <!-- A used-up quest whose claim still waits for the Game Master is Pending, not Tamed -->
                    <ion-badge color="warning" class="pending-badge" v-if="status === 'done' && pending">
                      <ion-icon :icon="hourglassOutline" /> Pending
                    </ion-badge>
                    <ion-badge color="success" class="tamed-badge" v-else-if="status === 'done'">
                      <ion-icon :icon="checkmarkDone" /> Tamed
                    </ion-badge>
                    <ion-badge color="success" v-if="item.xp">{{ item.xp }} XP</ion-badge>
                    <ion-badge color="warning" v-if="item.gp">{{ item.gp }} GP</ion-badge>
                    <ion-badge color="tertiary" v-if="item.ap">{{ item.ap }} AP</ion-badge>
                  </div>
                </ion-card-content>
              </ion-card>

              <MyTask @didDismiss="onTaskDismissed" :item="item" :boardStatus="claimStatus(status)" :pending="pending"
                :userId="heroId" v-if="activeModal == item.id" />
            </ion-col>
          </ion-row>
        </ion-grid>
        <div v-else class="no-chores" data-test="no-chores">{{ emptyLine }}</div>
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
  watch
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
  checkmarkDone,
  hourglassOutline,
} from "ionicons/icons";
import { isToday } from "date-fns";
import MyTask from "../../UserHud/MyTask/MyTask.vue";
import { formatQuestName } from "@/lib/utils/format";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import { boardStatusInSegment, getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import type { QuestBoardItem, QuestBoardStatus } from "@/lib/engine/quests/QuestEngine";
import { emptyBoardLine } from "@/lib/engine/quests/QuestSchedule";
import type { TimeOfDay } from "@/lib/engine/quests/QuestSchedule";
import { useUserStore } from "@/lib/store/stores/user";

defineComponent({
  name: "MyCalendar",
  components: {
    MyTask
  }
});

const props = defineProps<{
  userId?: string | number;
}>();
const userStore = useUserStore();
// /calendar/:userId? may be opened without an id (the router hands over "" for it), so fall back to the active profile
const heroId = computed(() => String(props.userId || userStore.currentUser.id || ""));

// State
const selectedDate = ref(new Date());
const isLoading = ref(false);
const searchQuery = ref("");
const activeSegment = ref<"all" | TimeOfDay>("all");
const board = ref<QuestBoardItem[]>([]);
const activeModal = ref<any>(0);

// Computed
const calendarTitle = computed(() => {
  return selectedDate.value.toLocaleDateString("default", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
});

// Search and segment narrow the board; quests not due that day are hidden and tamed ones sink to the end.
// Under a time tab a quest that is done in only some of its times reads by that tab's slot.
const filteredQuests = computed(() => {
  const matches = new Set(
    getQuestEngine().filterQuests(board.value.map(({ quest }) => quest), {
      search: searchQuery.value,
      segment: activeSegment.value
    })
  );
  const shown = board.value
    .filter(({ quest, status }) => status !== "notDue" && matches.has(quest))
    .map((item) => ({ ...item, status: boardStatusInSegment(item, activeSegment.value) }));
  return [
    ...shown.filter(({ status }) => status === "open"),
    ...shown.filter(({ status }) => status === "done")
  ];
});

const emptyLine = computed(() => emptyBoardLine(activeSegment.value));

// Methods
const fetchBoard = async () => {
  const date = selectedDate.value;
  // The hero's item effects (snoozes, pull-ins, extensions) shape their own board
  const effects = userStore.getUserById(heroId.value)?.questEffects;
  const items = await getQuestEngine().getQuestBoardForUser(heroId.value, date, undefined, effects);
  // Ignore the answer if the hero has already moved on to another day
  if (date === selectedDate.value) board.value = items;
};

const loadLocalQuests = async (event?: any) => {
  isLoading.value = true;
  try {
    await fetchBoard();
  } finally {
    isLoading.value = false;
    if (event) event.target.complete();
  }
};

// Claiming stamps the quest done right now, so on any other day it can only be viewed
const claimStatus = (status: QuestBoardStatus): QuestBoardStatus =>
  status === "open" && !isToday(selectedDate.value) ? "notDue" : status;

// A claim made in the modal changes the board, so reload it once the modal closes
const onTaskDismissed = () => {
  activeModal.value = 0;
  void fetchBoard();
};

watch([selectedDate, heroId], fetchBoard);

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
<style scoped>
.item.is-tamed ion-card-header,
.item.is-tamed .quest-rewards ion-badge:not(.tamed-badge),
.item.is-pending ion-card-header,
.item.is-pending .quest-rewards ion-badge:not(.pending-badge) {
  opacity: 0.55;
}
</style>
