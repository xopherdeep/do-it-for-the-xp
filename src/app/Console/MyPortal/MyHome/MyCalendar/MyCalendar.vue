<template>
  <ion-page :class="rootClass" :style="rootStyle">
    <ion-header>
      <ion-toolbar>
        <xp-app-header title="Calendar" icon="calendar-alt" :meta="dueMeta">
          <template #start>
            <xp-back-button />
          </template>
          <template #end>
            <!-- Every player can start a quest: the + opens the Quest Wizard on the day and time on screen -->
            <button type="button" class="xp-app-btn xp-app-btn--ghost app-icon-btn" aria-label="New quest"
              data-test="add-quest" @click="openAddQuest">
              <i class="fad fa-plus" aria-hidden="true" />
            </button>
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-calendar">
      <ion-refresher slot="fixed" @ionRefresh="loadLocalQuests"></ion-refresher>
      <xp-loading v-if="isLoading" />

      <template v-else>
        <!-- The agenda: the day's quests as rows, grouped by time of day (the Morn / Noon / Eve / Night tabs filter it) -->
        <xp-app-section v-for="group in agenda" :key="group.id" :label="group.label">
          <xp-app-row v-for="entry in group.items" :key="entry.quest.id" :title="questTitle(entry.quest)"
            :subtitle="dueLine(entry.quest)" :icon="rowIcon(entry, group.id)"
            :class="{ 'is-tamed': entry.status === 'done' && !entry.pending, 'is-pending': entry.status === 'done' && entry.pending }"
            @click="activeModal = entry.quest.id">
            <template v-if="hasChips(entry)" #chips>
              <xp-app-chips :chips="rowChips(entry)" />
            </template>
          </xp-app-row>
        </xp-app-section>

        <xp-app-empty v-if="!filteredQuests.length" icon="calendar-check" :text="emptyLine" data-test="no-chores" />
      </template>

      <!-- A tap on a row opens the quest's bestiary entry: the beast, its checklist, and Hunt / Claim -->
      <XpBeastCardModal v-if="activeEntry" @didDismiss="onTaskDismissed" :quest="activeEntry.quest"
        :status="cardStatus(activeEntry)" :due="cardDue(activeEntry.quest)" :dueLabel="cardDueLabel(activeEntry.quest)"
        :userId="heroId" />

      <!-- The Quest Wizard: a new quest for this day and part of the day; it is on the board once it is saved -->
      <XpQuestWizardModal :open="wizardOpen" :prefill="wizardPrefill" @close="wizardOpen = false"
        @saved="onQuestSaved" />

      <!-- FAB (the same one the town's buildings and the Gold Bank use) to open the calendar's actions -->
      <ion-fab vertical="bottom" horizontal="center" slot="fixed">
        <ion-fab-button color="warning" aria-label="Calendar actions" data-test="calendar-fab" @click="presentActionSheet">
          <i class="fad fa-calendar-star fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <ion-footer class="calendar-footer">
      <div class="xp-app-bar">
        <label class="xp-app-search">
          <i class="fad fa-search" aria-hidden="true"></i>
          <input v-model="searchQuery" type="search" placeholder="Search Daily Quests..." aria-label="Search daily quests"
            autocomplete="off" enterkeyhint="search" />
        </label>
        <!-- Day navigation -->
        <div class="day-nav">
          <button type="button" class="xp-app-btn xp-app-btn--ghost app-icon-btn" aria-label="Previous day"
            @click="prevDay">
            <i class="fad fa-chevron-left" aria-hidden="true" />
          </button>
          <span class="day-nav__label" aria-live="polite">
            {{ calendarTitle }}
            <xp-app-chip v-if="isSelectedToday" kind="tag" value="Today" />
          </span>
          <button type="button" class="xp-app-btn xp-app-btn--ghost app-icon-btn" aria-label="Next day"
            @click="nextDay">
            <i class="fad fa-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </div>

      <xp-app-bottom-nav
        :tabs="calendarTabs"
        v-model="activeSegment"
        aria-label="Calendar Navigation"
        @change="onTabChange"
      />
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
import { useRouter } from "vue-router";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonRefresher,
  IonFab,
  IonFabButton,
  actionSheetController,
  onIonViewWillEnter,
} from "@ionic/vue";
import { calendarOutline, close } from "ionicons/icons";
import { format, isToday } from "date-fns";
import XpBeastCardModal from "../../UserHud/MyQuests/components/XpBeastCardModal.vue";
import XpQuestWizardModal from "../../UserHud/MyQuests/components/XpQuestWizardModal.vue";
import { calendarCardStatus } from "../../UserHud/MyQuests/beastCard";
import type { BeastCardStatus } from "../../UserHud/MyQuests/beastCard";
import XpAppBottomNav from "@/components/organisms/BottomNav/XpAppBottomNav.vue";
import type { AppNavTab } from "@/components/organisms/BottomNav/appBottomNav";
import { appSheet, useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { rewardChips } from "@/components/organisms/XpApp/appChips";
import type { AppChipSpec } from "@/components/organisms/XpApp/appChips";
import { formatQuestName } from "@/lib/utils/format";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import { boardStatusInSegment, getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { dueTimeOn, emptyBoardLine, questTimesOfDay } from "@/lib/engine/quests/QuestSchedule";
import type { TimeOfDay } from "@/lib/engine/quests/QuestSchedule";
import { useUserStore } from "@/lib/store/stores/user";
import { useVoice } from "@/hooks/useVoice";
import { prefillQueryFor, questPrefill } from "@/lib/services/quests/questPrefill";
import { play$fx } from "@/assets/fx";
import { calendarActions, questLogRoute } from "./calendarActions";
import type { CalendarActionId } from "./calendarActions";
import type { Achievement } from "@/lib/databases/AchievementDb";

defineComponent({
  name: "MyCalendar",
  components: {
    XpBeastCardModal,
    XpAppBottomNav,
  }
});

const props = defineProps<{
  userId?: string | number;
}>();
const userStore = useUserStore();
const { voice } = useVoice();
const router = useRouter();
// The phone-app skin follows the Retro / Modern toggle of the profile
const { rootClass, rootStyle } = useAppSkin("calendar");
// /calendar/:userId? may be opened without an id (the router hands over "" for it), so fall back to the active profile
const heroId = computed(() => String(props.userId || userStore.currentUser.id || ""));

// Navigation tabs
const calendarTabs: AppNavTab[] = [
  { id: "all", label: "All", ionIcon: calendarOutline },
  { id: "morning", label: "Morn", faIcon: "sun" },
  { id: "noon", label: "Noon", faIcon: "cloud-sun" },
  { id: "evening", label: "Eve", faIcon: "cloud-moon" },
  { id: "night", label: "Night", faIcon: "moon-stars" },
];

const onTabChange = (tabId: string) => {
  activeSegment.value = tabId as "all" | TimeOfDay;
};

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

const emptyLine = computed(() => emptyBoardLine(activeSegment.value, voice.value));

type AgendaEntry = (typeof filteredQuests.value)[number];
type AgendaGroupId = TimeOfDay | "anytime";

const AGENDA_GROUPS: { id: AgendaGroupId; label: string; icon: string }[] = [
  { id: "morning", label: "Morning", icon: "sun" },
  { id: "noon", label: "Noon", icon: "cloud-sun" },
  { id: "evening", label: "Evening", icon: "cloud-moon" },
  { id: "night", label: "Night", icon: "moon-stars" },
  { id: "anytime", label: "Anytime", icon: "scroll" },
];

// The agenda groups the day's quests by time of day: under a time tab that is the one group, under All a quest sits in
// the first part of the day it is timed for (an untimed one is "Anytime"). Open quests stay ahead of tamed ones.
const agenda = computed(() => {
  const groups = new Map<AgendaGroupId, AgendaEntry[]>();
  for (const entry of filteredQuests.value) {
    const slot: AgendaGroupId =
      activeSegment.value !== "all" ? activeSegment.value : questTimesOfDay(entry.quest)[0] ?? "anytime";
    groups.set(slot, [...(groups.get(slot) ?? []), entry]);
  }
  return AGENDA_GROUPS.filter(({ id }) => groups.has(id)).map(({ id, label }) => ({
    id,
    label,
    items: groups.get(id) ?? []
  }));
});

// "4 due" in the app bar: what is still open on this day
const dueMeta = computed(() => {
  const open = filteredQuests.value.filter(({ status }) => status === "open").length;
  if (open) return `${open} due`;
  return filteredQuests.value.length ? "All done" : undefined;
});

const isSelectedToday = computed(() => isToday(selectedDate.value));

// The quest the hero tapped: its beast card opens
const activeEntry = computed(() =>
  activeModal.value ? filteredQuests.value.find(({ quest }) => String(quest.id) === String(activeModal.value)) : undefined
);

// Quest names are plain text; anything markup in a name is dropped, not shown
const questTitle = (quest: Achievement): string => {
  const name = formatQuestName(quest.achievementName || "Untitled Quest");
  return new DOMParser().parseFromString(sanitizeHtml(name), "text/html").body.textContent ?? "";
};

const dueLine = (quest: Achievement): string => {
  const dueByTime = quest.dueByTime;
  if (!dueByTime) return "";
  const due = dueTimeOn(dueByTime, selectedDate.value);
  return `Due ${due ? format(due, "h:mm a") : dueByTime}`;
};

// Tamed and pending quests wear a status icon; an open one wears the sun or moon of its part of the day
const rowIcon = ({ status, pending }: AgendaEntry, groupId: AgendaGroupId): string => {
  const isTamed = status === "done";
  if (isTamed) return pending ? "hourglass-half" : "check-circle";
  return AGENDA_GROUPS.find(({ id }) => id === groupId)?.icon ?? "scroll";
};

// A used-up quest whose claim still waits for the Game Master is Pending, not Tamed; then the rewards it pays
const rowChips = ({ quest, status, pending }: AgendaEntry): AppChipSpec[] => {
  const state: AppChipSpec[] = status === "done" ? [{ kind: "tag", value: pending ? "Pending" : "Tamed" }] : [];
  return [...state, ...rewardChips(quest)];
};

const hasChips = (entry: AgendaEntry): boolean => rowChips(entry).length > 0;

// Methods
const fetchBoard = async () => {
  const date = selectedDate.value;
  // The hero's item effects (snoozes, pull-ins, extensions) shape their own board
  const effects = userStore.getUserById(heroId.value)?.questEffects;
  const items = await getQuestEngine().getQuestBoardForUser(heroId.value, date, undefined, effects);
  // Ignore the answer if the hero has already moved on to another day
  const isStillSelected = date === selectedDate.value;
  if (isStillSelected) board.value = items;
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

// The beast card's view of the row. Claiming stamps the quest done right now, so on any other day it can only be viewed
const cardStatus = ({ status, pending }: AgendaEntry): BeastCardStatus =>
  calendarCardStatus(status, Boolean(pending), isToday(selectedDate.value));

// The due clock of the card: the quest's due time on the day shown, worded like the rows
const cardDue = (quest: Achievement): Date | null => dueTimeOn(quest.dueByTime, selectedDate.value);
const cardDueLabel = (quest: Achievement): string => {
  const due = cardDue(quest);
  return due ? format(due, "h:mm a") : "";
};

// A claim made on the card changes the board, so reload it once the card closes
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

// Every player can start a quest. The Quest Wizard opens on the day and part of the day on screen (a hero's quest waits
// for the Game Master's approval; the rules live in questWizard.ts)
const wizardOpen = ref(false);
const wizardPrefill = computed(() =>
  questPrefill(prefillQueryFor(selectedDate.value, activeSegment.value, heroId.value))
);

const openAddQuest = () => {
  play$fx("openMenu");
  wizardOpen.value = true;
};

// The new quest shows on the board as soon as it is saved (when it is due on the day on screen)
const onQuestSaved = () => {
  void fetchBoard();
};

const runAction = (id: CalendarActionId) => {
  const isNewQuest = id === "new-quest";
  if (isNewQuest) return openAddQuest();
  const isJumpToToday = id === "today";
  if (isJumpToToday) {

    selectedDate.value = new Date();
    return;
  }
  void router.push(questLogRoute(heroId.value));
};

const presentActionSheet = async () => {
  const actionSheet = await actionSheetController.create({
    ...appSheet("calendar"),
    header: "Daily Agenda",
    buttons: [
      ...calendarActions({ isToday: isSelectedToday.value }).map(({ id, text }) => ({
        text,
        handler: () => {
          runAction(id);
        },
      })),
      {
        text: "Cancel",
        icon: close,
        role: "cancel",
      },
    ],
  });
  play$fx("openMenu");
  await actionSheet.present();
};

// Lifecycle
// Back from the quest form (or another page) the board may have changed: a quest just saved shows on its day.
// Reads quietly (no spinner); the first entry just reads the board a second time, which costs nothing.
onMounted(loadLocalQuests);
onIonViewWillEnter(() => {
  void fetchBoard();
});
</script>

<style lang="scss" src="./_MyCalendar.scss" scoped></style>
