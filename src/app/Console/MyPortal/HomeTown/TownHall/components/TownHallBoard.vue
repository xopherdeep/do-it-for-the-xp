<template>
  <div class="th-board">
    <!-- The hero's own posts the site does not have yet come first, whether or not the Board has arrived -->
    <town-hall-waiting :posts="waiting" @dismiss="emit('dismiss', $event)" @edit="emit('edit', $event)" />

    <xp-loading v-if="isLoading && !topics.length" />

    <ion-card v-else-if="failed && !topics.length" class="th-late" data-cy="th-late">
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

      <ion-card v-if="!topics.length && !isLoading" data-cy="th-board-empty">
        <ion-card-content class="ion-text-center">Nothing posted here yet</ion-card-content>
      </ion-card>

      <ion-card v-for="topic in topics" :key="topic.id" class="th-topic" data-cy="th-topic">
        <ion-card-header>
          <ion-card-subtitle>{{ topic.author }} &middot; {{ formatTownDate(topic.date) }}</ion-card-subtitle>
          <ion-card-title v-html="sanitizeHtml(topic.title)"></ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div v-html="sanitizeHtml(topic.content)"></div>
          <div class="th-post__actions">
            <ion-button
              size="small"
              fill="clear"
              color="rpg"
              data-cy="th-comment"
              @click="emit('comment', { postId: topic.id, title: plainText(topic.title) })"
            >
              Reply
              <ion-icon slot="end" :icon="arrowUndoOutline"></ion-icon>
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-button v-if="hasMore && !isLoading" class="th-more" expand="block" fill="outline" color="rpg" data-cy="th-more" @click="loadMore">
        Older topics
      </ion-button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonIcon } from "@ionic/vue";
import { arrowUndoOutline } from "ionicons/icons";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import { fetchBoards, fetchTopics, type BoardInfo, type TopicItem } from "@/lib/services/townhall/townHallFeed";
import type { TownHallBoardSlug } from "@/lib/services/townhall/townHallSite";
import type { TownHallPost } from "@/lib/services/townhall/townHallTypes";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import TownHallWaiting from "./TownHallWaiting.vue";
import { formatTownDate, plainText, type CommentTarget } from "./townHallShared";
import { useTownHallLoad } from "./useTownHallLoad";

/**
 * One board's topics, a page at a time, under the hero's own posts the site does not have yet. The component reads the
 * boards itself (it needs the board's id) and tells the page which of them the site has, so the page can put the picker
 * in its footer. A reply, and clearing or fixing a waiting post, are the page's to do.
 */
interface BoardProps {
  boardSlug: TownHallBoardSlug;
  waiting: TownHallPost[];
}
interface BoardEmits {
  (event: "trouble"): void;
  (event: "boards", boards: BoardInfo[]): void;
  (event: "comment", target: CommentTarget): void;
  (event: "dismiss", id: string): void;
  (event: "edit", post: TownHallPost): void;
}

const props = defineProps<BoardProps>();
const emit = defineEmits<BoardEmits>();

const boards = ref<BoardInfo[]>([]);
const topics = ref<TopicItem[]>([]);
const page = ref(1);
const hasMore = ref(false);
const board = computed(() => boards.value.find((candidate) => candidate.slug === props.boardSlug));
const { isLoading, failed, run } = useTownHallLoad(() => emit("trouble"));

/** Only the newest request may fill the list: a hero flipping between boards must not see the slow one land last. */
let ticket = 0;

const loadTopics = async (next: number) => {
  const current = board.value;
  if (!current) {
    topics.value = [];
    hasMore.value = false;
    return;
  }
  const mine = ++ticket;
  const result = await fetchTopics(current.id, next);
  if (mine !== ticket) return;
  topics.value = next === 1 ? result.items : [...topics.value, ...result.items];
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

// Another board: its topics only (the boards are known)
watch(
  () => props.boardSlug,
  () => {
    topics.value = [];
    if (boards.value.length) run(() => loadTopics(1));
  }
);

onMounted(reload);
defineExpose({ reload });
</script>
