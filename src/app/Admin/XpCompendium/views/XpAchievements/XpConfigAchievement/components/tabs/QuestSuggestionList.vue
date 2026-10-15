<template>
  <div class="suggestion-list">
    <button
      v-for="entry in entries"
      :key="String(entry.id)"
      type="button"
      class="suggestion-option"
      @click="emit('choose', entry)"
    >
      <img v-if="portraitUrl(entry)" :src="portraitUrl(entry)" alt="" class="suggestion-option-portrait" />
      <span class="suggestion-option-text">
        <strong>{{ entry.name }}</strong>
        <span v-if="'chore' in entry">{{ entry.chore }}</span>
      </span>
    </button>
    <button type="button" class="suggestion-option suggestion-browse" @click="emit('browse')">
      <i class="fad fa-paw-claws"></i>
      <span class="suggestion-option-text"><strong>Choose from my bestiary</strong></span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { LibraryEntry } from "@/lib/services/bestiary/librarySuggest";

/**
 * "Change" on the suggested beast: the other library beasts that fit the quest's name, each with its portrait and
 * chore, and a last row that opens the family's own bestiary.
 */
defineProps<{
  entries: LibraryEntry[];
  /** The portrait of a library beast, or null when it has none (the page's webpack require) */
  portraitUrl: (entry: LibraryEntry) => string | null;
}>();

const emit = defineEmits<{
  (e: "choose", entry: LibraryEntry): void;
  (e: "browse"): void;
}>();
</script>

<style lang="scss" scoped>
.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.suggestion-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 6px 10px;
  text-align: left;
  color: inherit;
  font: inherit;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--xp-app-accent);
  }

  i {
    width: 40px;
    text-align: center;
    font-size: 1.4rem;
  }
}

.suggestion-option-portrait {
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.suggestion-option-text {
  display: flex;
  flex-direction: column;
  min-width: 0;

  span {
    font-size: 0.75rem;
    color: var(--xp-app-text-dim);
  }
}
</style>
