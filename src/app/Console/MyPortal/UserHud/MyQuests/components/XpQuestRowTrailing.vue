<template>
  <span v-if="stamp" class="quest-stamp" :class="{ 'quest-stamp--pending': stamp.pending }" aria-hidden="true">
    <i :class="['fad', stamp.pending ? 'fa-hourglass-half' : 'fa-check-double']"></i>
    {{ stamp.pending ? "Sent" : "Tamed" }}
  </span>
  <button v-else-if="showDone" type="button" class="xp-app-btn quest-done-btn" :disabled="finishing"
    :aria-label="`Done: ${row.title}`" @click="emit('done')">
    <i class="fad fa-check-double" aria-hidden="true"></i>
    Done
  </button>
  <span v-else class="quest-state" :class="{
    'tamed-ribbon': row.status === 'done',
    'pending-ribbon': row.status === 'pending',
  }">{{ row.stateLabel }}</span>
</template>

<script setup lang="ts">
import type { QuestLogRow } from "../questLogRows";

/**
 * The end of a Quest Log row: the Tamed / Sent stamp while the row celebrates, else the List's Done button, else the
 * word for a row that cannot be finished from here. One element at a time, so it wears the Quest Log's scoped styles.
 */
interface QuestRowTrailingProps {
  row: QuestLogRow;
  /** The row's celebration (it just paid out, or went to the Game Master), or null */
  stamp: { pending: boolean } | null;
  showDone: boolean;
  finishing: boolean;
}

defineProps<QuestRowTrailingProps>();

const emit = defineEmits<{
  (e: "done"): void;
}>();
</script>
