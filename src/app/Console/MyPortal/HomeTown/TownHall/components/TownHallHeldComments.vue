<template>
  <section v-if="comments.length" class="th-held" data-cy="th-held">
    <div v-for="comment in comments" :key="comment.id" class="th-held__comment" data-cy="th-held-comment">
      <div class="th-held__head">
        <strong>{{ comment.author }}</strong>
        <ion-note>{{ formatTownDate(comment.date) }}</ion-note>
      </div>
      <ion-chip class="th-chip is-held" data-cy="th-held-chip">
        <ion-label>Held</ion-label>
      </ion-chip>
      <div v-html="sanitizeHtml(comment.content)"></div>
      <div class="th-held__actions">
        <ion-button size="small" color="rpg" data-cy="th-approve" :disabled="desk.isBusy('comment', comment.id)" @click="desk.approve(comment.id)">
          Approve
        </ion-button>
        <ion-button
          size="small"
          fill="outline"
          color="rpg"
          data-cy="th-bin-comment"
          :disabled="desk.isBusy('comment', comment.id)"
          @click="desk.bin('comment', comment.id, false)"
        >
          Bin
        </ion-button>
      </div>
      <p v-if="desk.troubleOf('comment', comment.id)" class="th-trouble" data-cy="th-trouble">{{ desk.troubleOf("comment", comment.id) }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { IonButton, IonChip, IonLabel, IonNote } from "@ionic/vue";
import type { HeldComment } from "@/lib/services/townhall/townHallFeed";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import { formatTownDate } from "./townHallShared";
import type { DeskActions } from "./useTownHallDesk";

/**
 * The comments the site holds for approval on one post, shown to a Game Master under that post's card: approve one, or
 * bin it. The desk asks the clerk and does the work; this only calls it and waits while it is busy with a comment.
 */
defineProps<{ comments: HeldComment[]; desk: DeskActions }>();
</script>
