<template>
  <ion-card class="family-today-chores rpg-box">
    <ion-card-header class="chores-header">
      <ion-card-title class="earthbound-title">Today's Family Quests</ion-card-title>
      <ion-segment :value="filterSegment" @ionChange="filterSegment = $event.detail.value as any" class="chores-segment">
        <ion-segment-button value="all">
          <ion-label>All ({{ chores.length }})</ion-label>
        </ion-segment-button>
        <ion-segment-button value="open">
          <ion-label>Open ({{ openCount }})</ion-label>
        </ion-segment-button>
        <ion-segment-button value="pending">
          <ion-label>Pending ({{ pendingCount }})</ion-label>
        </ion-segment-button>
        <ion-segment-button value="done">
          <ion-label>Done ({{ doneCount }})</ion-label>
        </ion-segment-button>
      </ion-segment>
    </ion-card-header>

    <ion-card-content class="ion-no-padding">
      <ion-list v-if="filteredChores.length > 0" lines="full" class="chores-list">
        <ion-item v-for="chore in filteredChores" :key="`${chore.assigneeId}-${chore.id}`" class="chore-row">
          <ion-icon
            slot="start"
            :icon="statusIcon(chore.status)"
            :color="statusColor(chore.status)"
            class="chore-status-icon"
          />
          <ion-label class="ion-text-wrap">
            <ion-text>
              <h3 class="chore-title">{{ chore.title }}</h3>
            </ion-text>
            <ion-note class="chore-meta">
              {{ chore.assigneeName }} &bull; {{ chore.dueLabel }}
            </ion-note>
          </ion-label>
          <ion-badge slot="end" :color="statusColor(chore.status)" class="chore-status-badge">
            {{ chore.statusLabel }}
          </ion-badge>
          <ion-note slot="end" class="chore-rewards">
            +{{ chore.rewards.xp }}XP ₲{{ chore.rewards.gp }}
          </ion-note>
        </ion-item>
      </ion-list>

      <ion-item v-else lines="none" class="empty-chores-item">
        <ion-label class="ion-text-center">
          <ion-text color="medium">
            <p>No quests in this section today</p>
          </ion-text>
        </ion-label>
      </ion-item>
    </ion-card-content>
  </ion-card>
</template>

<script lang="ts">
import { computed, defineComponent, ref, type PropType } from "vue";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonIcon,
  IonText,
  IonNote,
  IonBadge,
} from "@ionic/vue";
import {
  checkmarkCircle,
  timeOutline,
  ellipseOutline,
  alertCircle,
} from "ionicons/icons";
import type { FamilyChoreItem } from "@/lib/services/family/familyOverviewService";
import type { QuestListStatus } from "@/lib/services/quests/QuestList";

/** The four segment buttons on the card; "all" is the unfiltered list. */
type ChoreSegment = "all" | "open" | "pending" | "done";
type ChorePredicate = (chore: FamilyChoreItem) => boolean;

/** An overdue chore is still open, so the Open segment and its count take both. */
const isOpen: ChorePredicate = (chore) => chore.status === "open" || chore.status === "overdue";
const isPending: ChorePredicate = (chore) => chore.status === "pending";
const isDone: ChorePredicate = (chore) => chore.status === "done";

/** What each segment lets through; the counts on the buttons ask the same questions. */
const SEGMENT_PREDICATES: Record<ChoreSegment, ChorePredicate> = {
  all: () => true,
  open: isOpen,
  pending: isPending,
  done: isDone,
};

/** Icon and colour per status, written out for every status so a new one cannot reach the card unstyled. */
const STATUS_ICONS: Record<QuestListStatus, string> = {
  overdue: alertCircle,
  open: ellipseOutline,
  later: ellipseOutline,
  pending: timeOutline,
  done: checkmarkCircle,
};

const STATUS_COLORS: Record<QuestListStatus, string> = {
  overdue: "danger",
  open: "medium",
  later: "medium",
  pending: "warning",
  done: "success",
};

export default defineComponent({
  name: "FamilyTodayChores",
  components: {
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonList,
    IonItem,
    IonIcon,
    IonText,
    IonNote,
    IonBadge,
  },
  props: {
    chores: {
      type: Array as PropType<FamilyChoreItem[]>,
      required: true,
    },
  },
  setup(props) {
    const filterSegment = ref<ChoreSegment>("all");

    const openCount = computed(() => props.chores.filter(isOpen).length);
    const pendingCount = computed(() => props.chores.filter(isPending).length);
    const doneCount = computed(() => props.chores.filter(isDone).length);

    // The template stores the segment event's value unchecked (as any), so it can be a name the card never offered.
    // Only a name the table owns counts: anything else, even an inherited one like "valueOf", reads as "all".
    const filteredChores = computed(() => {
      const segment = filterSegment.value;
      const isKnownSegment = Object.prototype.hasOwnProperty.call(SEGMENT_PREDICATES, segment);
      return props.chores.filter(SEGMENT_PREDICATES[isKnownSegment ? segment : "all"]);
    });

    const statusIcon = (status: QuestListStatus) => STATUS_ICONS[status];
    const statusColor = (status: QuestListStatus): string => STATUS_COLORS[status];

    return {
      filterSegment,
      openCount,
      pendingCount,
      doneCount,
      filteredChores,
      statusIcon,
      statusColor,
    };
  },
});
</script>

<style lang="scss" scoped>
.family-today-chores {
  margin: 0 0 16px 0;
  border-radius: 12px;
}
.chores-header {
  padding-bottom: 8px;
}
.chores-segment {
  margin-top: 8px;
}
.chores-list {
  background: transparent;
}
.chore-row {
  --background: transparent;
}
.chore-status-icon {
  font-size: 20px;
  margin-right: 8px;
}
.chore-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 2px 0;
}
.chore-meta {
  font-size: 12px;
  display: block;
}
.chore-status-badge {
  font-size: 11px;
  margin-right: 8px;
}
.chore-rewards {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.empty-chores-item {
  --background: transparent;
  padding: 16px 0;
}
</style>
