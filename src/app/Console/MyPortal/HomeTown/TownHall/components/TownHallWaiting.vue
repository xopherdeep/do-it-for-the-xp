<template>
  <section v-if="posts.length" class="th-waiting" data-cy="th-waiting">
    <ion-card v-for="post in posts" :key="post.id" class="th-waiting__post" :class="`is-${post.status}`" data-cy="th-waiting-post">
      <ion-card-header>
        <ion-card-subtitle>{{ KIND_NAMES[post.kind] }}</ion-card-subtitle>
        <ion-card-title data-cy="th-waiting-title">{{ titleOf(post) }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p class="th-waiting__body">{{ post.body }}</p>
        <ion-chip class="th-waiting__status" :class="`is-${post.status}`" data-cy="th-waiting-status">
          <ion-label>{{ waitingLabel(post) }}</ion-label>
        </ion-chip>
        <div v-if="post.status === 'failed' || canDismiss(post)" class="th-waiting__actions">
          <ion-button v-if="post.status === 'failed'" size="small" color="rpg" data-cy="th-edit" @click="emit('edit', post)">
            Edit
          </ion-button>
          <ion-button v-if="canDismiss(post)" size="small" fill="outline" color="rpg" data-cy="th-dismiss" @click="emit('dismiss', post.id)">
            Dismiss
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  </section>
</template>

<script setup lang="ts">
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonChip, IonLabel } from "@ionic/vue";
import { canDismiss, waitingLabel } from "@/lib/services/townhall/townHallOutbox";
import type { TownHallPost, TownHallPostKind } from "@/lib/services/townhall/townHallTypes";

/**
 * The hero's own posts the site does not have yet, above the Board: what each waits for, and for a post turned down or
 * refused, a way to clear it (and to fix the words of one the site refused). Everything shown is text.
 */
defineProps<{ posts: TownHallPost[] }>();
const emit = defineEmits<{ (event: "dismiss", id: string): void; (event: "edit", post: TownHallPost): void }>();

const KIND_NAMES: Record<TownHallPostKind, string> = { topic: "Topic", comment: "Comment", bug: "Bug report" };
const UNTITLED: Record<TownHallPostKind, string> = { topic: "Your topic", comment: "Your comment", bug: "Your bug report" };

/** A comment has no title of its own; a bug report may have been written without one */
const titleOf = (post: TownHallPost): string => post.title?.trim() || UNTITLED[post.kind];
</script>
