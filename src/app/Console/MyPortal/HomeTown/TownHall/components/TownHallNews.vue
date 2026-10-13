<template>
  <div class="th-news">
    <xp-loading v-if="loading && !items.length" />

    <!-- The courier is late and nothing has arrived yet: the clerk said so; this is the gap that stays -->
    <ion-card v-else-if="failed && !items.length" class="th-late" data-cy="th-late">
      <ion-card-content class="ion-text-center">
        <p>The news hasn't arrived.</p>
        <ion-button size="small" color="rpg" @click="reload">Try again</ion-button>
      </ion-card-content>
    </ion-card>

    <ion-card v-else-if="!items.length">
      <ion-card-content class="ion-text-center">No news yet</ion-card-content>
    </ion-card>

    <ion-card v-for="news in items" :key="news.id" class="th-post" data-cy="th-post">
      <div v-if="news.imageUrl" class="th-post__image">
        <ion-img :src="news.imageUrl" alt="" />
      </div>
      <ion-card-header>
        <ion-card-subtitle>{{ formatTownDate(news.date) }}</ion-card-subtitle>
        <ion-card-title v-html="sanitizeHtml(news.title)"></ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <div class="th-post__excerpt" v-html="sanitizeHtml(news.excerpt)"></div>
        <div v-if="news.categories.length" class="th-post__tags">
          <ion-chip v-for="category in news.categories" :key="category">
            <ion-label>{{ category }}</ion-label>
          </ion-chip>
        </div>
        <div class="th-post__actions">
          <ion-button
            size="small"
            fill="clear"
            color="rpg"
            data-cy="th-comments-toggle"
            :aria-expanded="isOpen(news.id)"
            @click="toggleComments(news.id)"
          >
            Comments
            <ion-icon slot="end" :icon="isOpen(news.id) ? chevronUpOutline : chatbubblesOutline"></ion-icon>
          </ion-button>
          <ion-button
            size="small"
            fill="clear"
            color="rpg"
            data-cy="th-comment"
            @click="emit('comment', { postId: news.id, title: plainText(news.title) })"
          >
            Add comment
            <ion-icon slot="end" :icon="createOutline"></ion-icon>
          </ion-button>
          <ion-button size="small" fill="clear" color="rpg" @click="openPost(news.link)">
            Read more
            <ion-icon slot="end" :icon="arrowForwardOutline"></ion-icon>
          </ion-button>
        </div>

        <div v-if="isOpen(news.id)" class="th-comments" data-cy="th-comments">
          <p v-if="commentsOf[news.id]?.status === 'loading'" class="th-comments__note">Reading the comments...</p>
          <p v-else-if="commentsOf[news.id]?.status === 'failed'" class="th-comments__note">
            The comments are out of reach. Close them and open them again to try once more.
          </p>
          <p v-else-if="!commentsOf[news.id]?.items.length" class="th-comments__note">No comments yet.</p>
          <div v-for="comment in commentsOf[news.id]?.items" :key="comment.id" class="th-comment" data-cy="th-comment">
            <div class="th-comment__head">
              <strong>{{ comment.author }}</strong>
              <ion-note>{{ formatTownDate(comment.date) }}</ion-note>
            </div>
            <div v-html="sanitizeHtml(comment.content)"></div>
          </div>
        </div>
      </ion-card-content>
    </ion-card>

    <ion-button v-if="hasMore && !loading" class="th-more" expand="block" fill="outline" color="rpg" data-cy="th-more" @click="loadMore">
      Older news
    </ion-button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonChip, IonIcon, IonImg, IonLabel, IonNote } from "@ionic/vue";
import { arrowForwardOutline, chatbubblesOutline, chevronUpOutline, createOutline } from "ionicons/icons";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import { fetchComments, fetchNews, type CommentItem, type NewsItem } from "@/lib/services/townhall/townHallFeed";
import debug from "@/lib/utils/debug";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import { formatTownDate, plainText, type CommentTarget } from "./townHallShared";
import { useTownHallLoad } from "./useTownHallLoad";

/** The news, a page at a time, each post with its comments a tap away (and a way to add one). The Patch Notes have their own tab. */
const emit = defineEmits<{ (event: "trouble"): void; (event: "comment", target: CommentTarget): void }>();

const items = ref<NewsItem[]>([]);
const page = ref(1);
const hasMore = ref(false);
const { loading, failed, run } = useTownHallLoad(() => emit("trouble"));

const loadPage = async (next: number) => {
  const result = await fetchNews(next);
  items.value = next === 1 ? result.items : [...items.value, ...result.items];
  page.value = next;
  hasMore.value = next < result.totalPages;
};

const reload = () => run(() => loadPage(1));
const loadMore = () => run(() => loadPage(page.value + 1));

interface CommentState {
  status: "loading" | "ready" | "failed";
  items: CommentItem[];
}

const commentsOf = reactive<Record<number, CommentState>>({});
const openIds = ref<number[]>([]);
const isOpen = (postId: number) => openIds.value.includes(postId);

const toggleComments = async (postId: number) => {
  if (isOpen(postId)) {
    openIds.value = openIds.value.filter((id) => id !== postId);
    return;
  }
  openIds.value = [...openIds.value, postId];
  if (commentsOf[postId]?.status === "ready") return;
  commentsOf[postId] = { status: "loading", items: [] };
  try {
    commentsOf[postId] = { status: "ready", items: await fetchComments(postId) };
  } catch (error) {
    debug.error("Town Hall could not read the comments:", error);
    commentsOf[postId] = { status: "failed", items: [] };
  }
};

const openPost = (url: string) => {
  window.open(url, "_blank");
};

onMounted(reload);
defineExpose({ reload });
</script>
