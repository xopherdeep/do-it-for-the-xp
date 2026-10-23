<template>
  <ion-card class="th-bugnet" data-cy="th-bugnet">
    <ion-card-header>
      <ion-card-title>Bug Net</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <p v-if="hasNoBugs" class="th-bugnet__empty">No bug reports waiting.</p>

      <div v-for="bug in bugs" :key="bug.id" class="th-bug" data-cy="th-bug">
        <div class="th-bug__head">
          <strong v-html="sanitizeHtml(bug.title)"></strong>
          <ion-note>{{ formatTownDate(bug.date) }}</ion-note>
        </div>
        <ion-chip class="th-chip" :class="{ 'is-new': isNew(bug) }" data-cy="th-chip">
          <ion-label>{{ statusOf(bug) }}</ion-label>
        </ion-chip>
        <p v-if="bug.route" class="th-bug__route">{{ bug.route }}</p>
        <p v-if="firstLineOf(bug.environment)" class="th-bug__environment">{{ firstLineOf(bug.environment) }}</p>
        <div class="th-bug__actions">
          <ion-button size="small" color="rpg" data-cy="th-resolve" :disabled="desk.isBusy('bug', bug.id)" @click="desk.resolve(bug.id)">
            Resolve
          </ion-button>
          <ion-button
            size="small"
            fill="outline"
            color="rpg"
            data-cy="th-bin"
            :disabled="desk.isBusy('bug', bug.id)"
            @click="desk.bin('bug', bug.id, false)"
          >
            Bin
          </ion-button>
        </div>
        <p v-if="desk.troubleOf('bug', bug.id)" class="th-trouble" data-cy="th-trouble">{{ desk.troubleOf("bug", bug.id) }}</p>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonChip, IonLabel, IonNote } from "@ionic/vue";
import type { BugItem } from "@/lib/services/townhall/townHallFeed";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import { formatTownDate } from "./townHallShared";
import type { DeskActions } from "./useTownHallDesk";

/**
 * The bug reports the heroes sent in that the site still holds open, shown to a Game Master: resolve one, or bin it. The desk
 * asks the clerk and does the work, and takes the bug off its own list when the site took it; this only calls the desk and
 * waits while it is busy with a bug.
 */
const props = defineProps<{ bugs: BugItem[]; desk: DeskActions }>();

const hasNoBugs = computed(() => props.bugs.length === 0);

/** A report nobody has looked at yet says so; any other status shows as the site gave it */
const isNew = (bug: BugItem): boolean => bug.status === "new";
const statusOf = (bug: BugItem): string => (isNew(bug) ? "New" : bug.status);

/** The environment is a long note about the device; the card shows its first line */
const firstLineOf = (environment: string): string => {
  const lines = environment.split(/\r?\n/).map((line) => line.trim());
  return lines.find((line) => line !== "") ?? "";
};
</script>
