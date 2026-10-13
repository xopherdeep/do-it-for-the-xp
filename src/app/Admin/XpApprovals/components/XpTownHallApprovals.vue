<template>
  <ion-list class="th-approvals" data-cy="th-approvals">
    <ion-item v-for="post in awaiting" :key="post.id" class="th-approval" data-cy="th-approval">
      <ion-avatar slot="start" class="th-approval__avatar">
        <i class="fad" :class="KIND_ICONS[post.kind]"></i>
      </ion-avatar>
      <ion-label class="ion-text-wrap">
        <h2 data-cy="th-approval-title">{{ headlineOf(post) }}</h2>
        <p>
          <span data-cy="th-approval-hero">{{ post.heroName }}</span>
          ·
          <span data-cy="th-approval-kind">{{ KIND_NAMES[post.kind] }}</span>
          <template v-if="post.kind === 'topic' && post.board">
            ·
            <span data-cy="th-approval-where">{{ boardName(post.board) }}</span>
          </template>
          <ion-note>{{ formatDate(post.createdAt) }}</ion-note>
        </p>
        <p class="th-approval__body" data-cy="th-approval-body">{{ post.body }}</p>
        <div class="th-approval__actions">
          <ion-button size="small" color="success" data-cy="th-approve" @click="approve(post.id)">
            <i class="fad fa-check mr-2"></i>
            Approve
          </ion-button>
          <ion-button size="small" color="danger" fill="outline" data-cy="th-reject" @click="reject(post.id)">
            <i class="fad fa-times mr-2"></i>
            Reject
          </ion-button>
        </div>
      </ion-label>
    </ion-item>
    <ion-item v-if="loaded && awaiting.length === 0" data-cy="th-approvals-empty">
      <ion-label class="ion-text-center">
        <i class="fad fa-check-circle fa-3x th-approvals__clear"></i>
        <p>No Town Hall posts are waiting</p>
      </ion-label>
    </ion-item>
  </ion-list>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { IonAvatar, IonButton, IonItem, IonLabel, IonList, IonNote } from "@ionic/vue";
import { format } from "date-fns";
import type { TownHallPost, TownHallPostKind } from "@/lib/services/townhall/townHallTypes";
import { useTownHallStore } from "@/lib/store/stores/townHall";
import debug from "@/lib/utils/debug";

/**
 * The Town Hall posts the heroes wrote that wait for the Game Master: Approve sends the post on its way (the store
 * queues it and the courier is called at once), Reject keeps it off the site. Everything a hero wrote is shown as text.
 */
const store = useTownHallStore();

const KIND_NAMES: Record<TownHallPostKind, string> = { topic: "Topic", comment: "Comment", bug: "Bug report" };
const KIND_ICONS: Record<TownHallPostKind, string> = { topic: "fa-comments", comment: "fa-comment", bug: "fa-bug" };
const UNTITLED: Record<TownHallPostKind, string> = { topic: "Untitled topic", comment: "Comment on a post", bug: "Untitled bug report" };

const awaiting = computed(() => store.posts.filter((post) => post.status === "awaiting-gm"));

/** The empty message waits for the stored posts to be read, so it never claims an empty list too early. */
const loaded = ref(false);
onMounted(async () => {
  try {
    await store.init();
  } catch (e) {
    debug.error("The Town Hall posts could not be read:", e);
  }
  loaded.value = true;
});

/** "feature-requests" as a name */
const boardName = (slug: string): string => slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

/** A comment has no title of its own: all we know of what it answers is the site's id for it */
const headlineOf = (post: TownHallPost): string => {
  const title = post.title?.trim();
  if (title) return title;
  return post.kind === "comment" && post.postId !== undefined ? `Comment on post #${post.postId}` : UNTITLED[post.kind];
};

const formatDate = (at: number): string => format(at, "MMM d, h:mma");

async function approve(id: string): Promise<void> {
  try {
    // The approval is saved first, so the send that follows finds the post in the queue
    await store.approve(id);
    await store.flush();
  } catch (e) {
    debug.error("The Town Hall post could not be approved:", e);
  }
}

async function reject(id: string): Promise<void> {
  try {
    await store.reject(id);
  } catch (e) {
    debug.error("The Town Hall post could not be rejected:", e);
  }
}
</script>

<style lang="scss" scoped>
.th-approvals {
  ion-item {
    --padding-start: 8px;
    --inner-padding-end: 8px;
    margin-bottom: 4px;
  }

  ion-note {
    font-size: 12px;
    margin-left: 8px;
    color: var(--ion-color-medium);
  }

  .th-approval__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ion-color-light);
    color: var(--ion-color-medium);
    font-size: 22px;
  }

  .th-approval__body {
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  .th-approval__actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .th-approvals__clear {
    color: var(--ion-color-success);
  }
}
</style>
