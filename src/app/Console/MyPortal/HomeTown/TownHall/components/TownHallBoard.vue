<template>
  <div class="th-board">
    <!-- The hero's own posts the site does not have yet come first, whether or not the Board has arrived -->
    <town-hall-waiting :posts="waiting" @dismiss="emit('dismiss', $event)" @edit="emit('edit', $event)" />

    <xp-loading v-if="isReadingFirst" />

    <ion-card v-else-if="isLate" class="th-late" data-cy="th-late">
      <ion-card-content class="ion-text-center">
        <p>The Board hasn't arrived.</p>
        <ion-button size="small" color="rpg" @click="reload">Try again</ion-button>
      </ion-card-content>
    </ion-card>

    <ion-card v-else-if="!board">
      <ion-card-content class="ion-text-center">This board is not up on the wall yet.</ion-card-content>
    </ion-card>

    <template v-else>
      <ion-card class="th-board__about">
        <ion-card-header>
          <ion-card-title v-html="sanitizeHtml(board.name)"></ion-card-title>
          <ion-card-subtitle v-if="board.description" v-html="sanitizeHtml(board.description)"></ion-card-subtitle>
        </ion-card-header>
      </ion-card>

      <ion-card v-if="isEmpty" data-cy="th-board-empty">
        <ion-card-content class="ion-text-center">Nothing posted here yet</ion-card-content>
      </ion-card>

      <ion-card
        v-for="card in cards"
        :key="`${card.isPending ? 'pending' : 'topic'}-${card.id}`"
        class="th-topic"
        :class="{ 'is-pending': card.isPending }"
        :data-cy="card.isPending ? 'th-pending-topic' : 'th-topic'"
      >
        <ion-card-header>
          <ion-card-subtitle>{{ card.author }} &middot; {{ formatTownDate(card.date) }}</ion-card-subtitle>
          <ion-card-title v-html="sanitizeHtml(card.title)"></ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-chip v-if="card.isPending" class="th-chip is-pending" data-cy="th-chip">
            <ion-label>Waiting</ion-label>
          </ion-chip>
          <div v-html="sanitizeHtml(card.content)"></div>
          <div class="th-post__actions">
            <!-- A waiting topic is not on the site yet: nothing to answer, only the clerk's tools -->
            <ion-button
              v-if="!card.isPending"
              size="small"
              fill="clear"
              color="rpg"
              data-cy="th-comment"
              @click="emit('comment', { postId: card.id, title: plainText(card.title) })"
            >
              {{ replyLabel(card.id) }}
              <ion-icon slot="end" :icon="arrowUndoOutline"></ion-icon>
            </ion-button>
            <template v-if="canPublish">
              <ion-button v-if="card.isPending" size="small" color="rpg" data-cy="th-publish" :disabled="isBusy(card.id)" @click="publish(card.id)">
                Publish
              </ion-button>
              <ion-button size="small" color="rpg" data-cy="th-edit" :disabled="isBusy(card.id)" @click="emit('edit-site', { type: 'topic', id: card.id })">
                Edit
              </ion-button>
              <ion-button size="small" fill="outline" color="rpg" data-cy="th-bin" :disabled="isBusy(card.id)" @click="bin(card)">Bin</ion-button>
            </template>
          </div>
          <p v-if="troubleOf(card.id)" class="th-trouble" data-cy="th-trouble">{{ troubleOf(card.id) }}</p>

          <town-hall-held-comments v-if="canModerate" :comments="heldFor(card)" :desk="desk" />
        </ion-card-content>
      </ion-card>

      <ion-button v-if="canLoadMore" class="th-more" expand="block" fill="outline" color="rpg" data-cy="th-more" @click="loadMore">
        Older topics
      </ion-button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonChip, IonIcon, IonLabel } from "@ionic/vue";
import { arrowUndoOutline } from "ionicons/icons";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import type { EditableType } from "@/lib/services/townhall/townHallDesk";
import {
  fetchBoards,
  fetchPendingTopics,
  fetchTopics,
  type BoardInfo,
  type HeldComment,
  type TopicItem,
} from "@/lib/services/townhall/townHallFeed";
import type { TownHallBoardSlug } from "@/lib/services/townhall/townHallSite";
import type { TownHallPost } from "@/lib/services/townhall/townHallTypes";
import debug from "@/lib/utils/debug";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import TownHallHeldComments from "./TownHallHeldComments.vue";
import TownHallWaiting from "./TownHallWaiting.vue";
import { formatTownDate, plainText, type CommentTarget } from "./townHallShared";
import { NO_DESK, type DeskActions } from "./useTownHallDesk";
import { useTownHallLoad } from "./useTownHallLoad";

/**
 * One board's topics, a page at a time, under the hero's own posts the site does not have yet. The component reads the
 * boards itself (it needs the board's id) and tells the page which of them the site has, so the page can put the picker
 * in its footer. A reply, and clearing or fixing a waiting post, are the page's to do.
 * To a Game Master's link there is more: the topics waiting for approval first (publish one, edit it, bin it), Edit and
 * Bin on the published topics, and the replies the site holds under the topic they answer. Every tool goes through the desk.
 */
interface BoardProps {
  boardSlug: TownHallBoardSlug;
  waiting: TownHallPost[];
  canPublish?: boolean;
  canModerate?: boolean;
  heldComments?: HeldComment[];
  desk?: DeskActions;
}
interface BoardEmits {
  (event: "trouble"): void;
  (event: "boards", boards: BoardInfo[]): void;
  (event: "comment", target: CommentTarget): void;
  (event: "dismiss", id: string): void;
  /** A hero's own post the site refused, to fix and send again */
  (event: "edit", post: TownHallPost): void;
  /** A topic that is on the site (or waiting there) whose words the clerk may change */
  (event: "edit-site", target: { type: EditableType; id: number }): void;
}

const props = withDefaults(defineProps<BoardProps>(), { canPublish: false, canModerate: false, heldComments: () => [], desk: undefined });
const emit = defineEmits<BoardEmits>();

/** A link without a desk (a hero's) has no tools to show; the template never asks whether there is one */
const desk = computed<DeskActions>(() => props.desk ?? NO_DESK);

/** A topic on the page: one the site has published, or one it holds for approval */
interface Card extends TopicItem {
  isPending: boolean;
}

const boards = ref<BoardInfo[]>([]);
const topics = ref<TopicItem[]>([]);
const pendingTopics = ref<TopicItem[]>([]);
const page = ref(1);
const hasMore = ref(false);
const board = computed(() => boards.value.find((candidate) => candidate.slug === props.boardSlug));
const { isLoading, failed, run } = useTownHallLoad(() => emit("trouble"));

/** The waiting topics come first, and only while the link may publish: when its powers drop they go by themselves */
const cards = computed<Card[]>(() => {
  const waitingCards = props.canPublish ? pendingTopics.value.map((topic) => ({ ...topic, isPending: true })) : [];
  const postedCards = topics.value.map((topic) => ({ ...topic, isPending: false }));
  return [...waitingCards, ...postedCards];
});
const hasNoCards = computed(() => cards.value.length === 0);
const isEmpty = computed(() => !isLoading.value && hasNoCards.value);
const isReadingFirst = computed(() => isLoading.value && hasNoCards.value);
const isLate = computed(() => failed.value && hasNoCards.value);
const canLoadMore = computed(() => !isLoading.value && hasMore.value);

/** Only the newest request may fill the list: a hero flipping between boards must not see the slow one land last. */
let ticket = 0;

/** The waiting topics are the clerk's extra: if the site will not show them the Board still stands and the tab is not failed. Null when this read is not theirs to make. */
const readPending = async (boardId: number, next: number): Promise<TopicItem[] | null> => {
  const isFirstPage = next === 1;
  const isWanted = props.canPublish && isFirstPage;
  if (!isWanted) return null;
  try {
    return await fetchPendingTopics(boardId);
  } catch (error) {
    debug.error("Town Hall could not read the waiting topics:", error);
    return [];
  }
};

const loadTopics = async (next: number) => {
  const current = board.value;
  if (!current) {
    topics.value = [];
    pendingTopics.value = [];
    hasMore.value = false;
    return;
  }
  const mine = ++ticket;
  const [result, waitingTopics] = await Promise.all([fetchTopics(current.id, next), readPending(current.id, next)]);
  const isStale = mine !== ticket;
  if (isStale) return;
  topics.value = next === 1 ? result.items : [...topics.value, ...result.items];
  if (waitingTopics) pendingTopics.value = waitingTopics;
  page.value = next;
  hasMore.value = next < result.totalPages;
};

const reload = () =>
  run(async () => {
    boards.value = await fetchBoards();
    emit("boards", boards.value);
    await loadTopics(1);
  });
const loadMore = () => run(() => loadTopics(page.value + 1));

const isBusy = (topicId: number): boolean => desk.value.isBusy("topic", topicId);
const troubleOf = (topicId: number): string | null => desk.value.troubleOf("topic", topicId);

/** Published, the topic is a topic like any other: read the board again so it shows once, and in its place */
const publish = async (topicId: number) => {
  const isPublished = await desk.value.publish("topic", topicId);
  if (isPublished) await reload();
};

const removeCard = (card: Card) => {
  if (card.isPending) pendingTopics.value = pendingTopics.value.filter((topic) => topic.id !== card.id);
  else topics.value = topics.value.filter((topic) => topic.id !== card.id);
};

/** The desk asks the clerk first when the topic is on the site; the card goes only when the desk says it was binned */
const bin = async (card: Card) => {
  const isBinned = await desk.value.bin("topic", card.id, !card.isPending);
  if (isBinned) removeCard(card);
};

/** The replies the site holds for approval under a topic, for a moderator */
const heldOn = (topicId: number): HeldComment[] => (props.canModerate ? props.heldComments.filter((held) => held.postId === topicId) : []);

/** A waiting topic is not on the site yet, so it has no replies to show */
const heldFor = (card: Card): HeldComment[] => (card.isPending ? [] : heldOn(card.id));

const replyLabel = (topicId: number): string => {
  const heldCount = heldOn(topicId).length;
  const hasHeld = heldCount > 0;
  return hasHeld ? `Reply (${heldCount} held)` : "Reply";
};

// Another board: its topics only (the boards are known)
watch(
  () => props.boardSlug,
  () => {
    topics.value = [];
    pendingTopics.value = [];
    const hasBoards = boards.value.length > 0;
    if (hasBoards) run(() => loadTopics(1));
  },
);

onMounted(reload);

/** The link's powers arrive after the tab has mounted: read again when the waiting topics become the clerk's to see. On a drop the lists stay and the tools go by themselves. */
watch(
  () => props.canPublish,
  (isOn) => {
    if (isOn) reload();
  },
);

defineExpose({ reload });
</script>
