<template>
  <div class="th-updates">
    <xp-loading v-if="isReadingFirst" />

    <ion-card v-else-if="isLate" class="th-late" data-cy="th-late">
      <ion-card-content class="ion-text-center">
        <p>The patch notes haven't arrived.</p>
        <ion-button size="small" color="rpg" @click="reload">Try again</ion-button>
      </ion-card-content>
    </ion-card>

    <ion-card v-else-if="hasNoCards" data-cy="th-no-patch-notes">
      <ion-card-content class="ion-text-center">No patch notes yet</ion-card-content>
    </ion-card>

    <ion-card
      v-for="note in cards"
      :key="`${note.isDraft ? 'draft' : 'note'}-${note.id}`"
      class="th-patch-note"
      :class="{ 'is-draft': note.isDraft }"
      :data-cy="note.isDraft ? 'th-draft' : 'th-patch-note'"
    >
      <ion-card-header>
        <ion-card-subtitle>{{ formatTownDate(note.date) }}</ion-card-subtitle>
        <ion-card-title v-html="sanitizeHtml(note.title)"></ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-chip v-if="note.isDraft" class="th-chip is-draft" data-cy="th-chip">
          <ion-label>Draft</ion-label>
        </ion-chip>
        <div v-html="sanitizeHtml(note.content)"></div>
        <div v-if="canPublish" class="th-post__actions">
          <ion-button v-if="note.isDraft" size="small" color="rpg" data-cy="th-publish" :disabled="isBusy(note.id)" @click="publish(note.id)">
            Publish
          </ion-button>
          <ion-button size="small" color="rpg" data-cy="th-edit" :disabled="isBusy(note.id)" @click="emit('edit-site', { type: 'post', id: note.id })">
            Edit
          </ion-button>
          <ion-button size="small" fill="outline" color="rpg" data-cy="th-bin" :disabled="isBusy(note.id)" @click="bin(note)">Bin</ion-button>
        </div>
        <p v-if="troubleOf(note.id)" class="th-trouble" data-cy="th-trouble">{{ troubleOf(note.id) }}</p>
      </ion-card-content>
    </ion-card>

    <town-hall-bug-net v-if="canPublish" :bugs="bugs" :desk="desk" />

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
import { computed, onMounted, ref, watch } from "vue";
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonItem,
  IonLabel,
  IonList,
} from "@ionic/vue";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import type { EditableType } from "@/lib/services/townhall/townHallDesk";
import { fetchDrafts, fetchPatchNotes, type BugItem, type NewsItem } from "@/lib/services/townhall/townHallFeed";
import debug from "@/lib/utils/debug";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import TownHallBugNet from "./TownHallBugNet.vue";
import { formatTownDate, type TownStats } from "./townHallShared";
import { NO_DESK, type DeskActions } from "./useTownHallDesk";
import { useTownHallLoad } from "./useTownHallLoad";

/**
 * The Patch Notes from the site (newest first), above the family's own game statistics. To a hero that is all of it.
 * To a Game Master's link there is more: the drafts first (publish one, edit it, bin it), Edit and Bin on the published
 * notes, and the Bug Net card between the notes and the statistics. Every tool goes through the desk, which also owns the bugs.
 */
const props = withDefaults(defineProps<{ stats: TownStats; canPublish?: boolean; bugs?: BugItem[]; desk?: DeskActions }>(), {
  canPublish: false,
  bugs: () => [],
  desk: undefined,
});
const emit = defineEmits<{
  (event: "trouble"): void;
  (event: "edit-site", target: { type: EditableType; id: number }): void;
}>();

const desk = computed<DeskActions>(() => props.desk ?? NO_DESK);

/** A patch note on the page: one the site has published, or a draft of the clerk's that it has not */
interface Card extends NewsItem {
  isDraft: boolean;
}

const notes = ref<NewsItem[]>([]);
const drafts = ref<NewsItem[]>([]);
const { isLoading, failed, run } = useTownHallLoad(() => emit("trouble"));

/** The drafts come first, and only while the link may publish: when its powers drop they go by themselves */
const cards = computed<Card[]>(() => {
  const draftCards = props.canPublish ? drafts.value.map((draft) => ({ ...draft, isDraft: true })) : [];
  const noteCards = notes.value.map((note) => ({ ...note, isDraft: false }));
  return [...draftCards, ...noteCards];
});
const hasNoCards = computed(() => cards.value.length === 0);
const isReadingFirst = computed(() => {
  const isReading = isLoading.value;
  const isFirstRead = isReading && hasNoCards.value;
  return isFirstRead;
});
const isLate = computed(() => {
  const hasFailed = failed.value;
  const isStillWaiting = hasFailed && hasNoCards.value;
  return isStillWaiting;
});

const loadNotes = async () => {
  notes.value = await fetchPatchNotes();
};

/** The drafts are the clerk's extra: if the site will not show them the notes still stand and the tab is not failed */
const loadDrafts = async () => {
  try {
    drafts.value = await fetchDrafts("patch-notes");
  } catch (error) {
    debug.error("Town Hall could not read the patch-note drafts:", error);
    drafts.value = [];
  }
};

const reload = () =>
  run(async () => {
    const reads = [loadNotes()];
    if (props.canPublish) reads.push(loadDrafts());
    await Promise.all(reads);
  });

const isBusy = (postId: number): boolean => desk.value.isBusy("post", postId);
const troubleOf = (postId: number): string | null => desk.value.troubleOf("post", postId);

/** Published, the draft is a note like any other: read the notes again so it shows once, and in its place */
const publish = async (postId: number) => {
  const isPublished = await desk.value.publish("post", postId);
  if (isPublished) await reload();
};

const removeCard = (card: Card) => {
  if (card.isDraft) drafts.value = drafts.value.filter((draft) => draft.id !== card.id);
  else notes.value = notes.value.filter((note) => note.id !== card.id);
};

/** The desk asks the clerk first when the note is on the site; the card goes only when the desk says it was binned */
const bin = async (card: Card) => {
  const isBinned = await desk.value.bin("post", card.id, !card.isDraft);
  if (isBinned) removeCard(card);
};

onMounted(reload);

/** The link's powers arrive after the tab has mounted: read again when the drafts become the clerk's to see. On a drop the lists stay and the tools go by themselves. */
watch(
  () => props.canPublish,
  (isOn) => {
    if (isOn) reload();
  },
);

defineExpose({ reload });
</script>
