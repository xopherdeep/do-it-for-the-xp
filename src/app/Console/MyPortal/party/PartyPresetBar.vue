<template>
  <div class="party-words" data-cy="party-words">
    <button
      v-for="word in words"
      :key="word.id"
      type="button"
      class="party-words__word"
      :data-cy="`party-word-${word.id}`"
      @click="send(word.id)"
    >
      {{ word.text }}
    </button>
    <p v-if="error" class="party-words__error" data-cy="party-word-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { usePartyControls } from "@/hooks/usePartyControls";
import { problemText } from "@/lib/services/party/partyProblemText";
import { PRESETS } from "@/lib/services/party/presets";

const props = defineProps<{ partyId: string; heroId: string }>();
const { sendWord } = usePartyControls();

/** Cheer and poke are aimed at someone from the roster, so the bar offers only the words for everyone */
const words = PRESETS.filter((word) => word.id !== "cheer" && word.id !== "poke");
const error = ref("");

/** Sends one fixed word for the hero; no typing, so nothing a kid writes leaves the family */
async function send(id: string): Promise<void> {
  error.value = "";
  const result = await sendWord(props.partyId, props.heroId, id);
  if (!result.ok) error.value = problemText(result.problem);
}
</script>

<style scoped lang="scss">
@use "./partyUi" as *;

// The words sit at the foot of the screen, in thumb reach
.party-words {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  background: var(--gs-bar);
}

.party-words__word {
  @include party-button();
}

.party-words__error {
  width: 100%;
  margin: 0;
  color: var(--gs-danger);
}
</style>
