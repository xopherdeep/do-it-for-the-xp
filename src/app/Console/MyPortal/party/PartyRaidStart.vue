<template>
  <section class="raid-start" data-cy="raid-start">
    <h2 class="raid-start__title">Choose a great beast</h2>

    <p v-if="hasNoBeasts" class="raid-start__empty">
      Your bestiary is empty. Add beasts in the Compendium to raid them.
    </p>
    <ul v-else class="raid-start__rail">
      <li v-for="beast in beasts" :key="String(beast.id)">
        <button
          type="button"
          class="raid-start__beast"
          :class="{ 'is-chosen': isChosen(beast) }"
          :aria-pressed="isChosen(beast)"
          :data-cy="`raid-beast-${beast.id}`"
          @click="choose(beast)"
        >
          <img v-if="hasImage(beast)" :src="imageOf(beast)" :alt="beast.name" />
          <span>{{ beast.name }}</span>
        </button>
      </li>
    </ul>

    <raid-window-picker v-model="chosenWindow" class="raid-start__windows" cy-prefix="raid-window" />

    <div class="raid-start__actions">
      <button type="button" class="raid-start__button" data-cy="raid-cancel" @click="emit('cancel')">Back</button>
      <button
        type="button"
        class="raid-start__button is-primary"
        data-cy="raid-begin"
        :disabled="cannotBegin"
        @click="begin"
      >
        Begin the raid
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { RaidWindow } from "@/lib/services/party/raidRules";
import { raidBeastImage } from "./beastFace";
import RaidWindowPicker from "./RaidWindowPicker.vue";

const props = defineProps<{ beasts: Beast[]; defaultWindow: RaidWindow; initialBeastId?: string }>();
const emit = defineEmits<{
  (event: "begin", choice: { beastId: string; window: RaidWindow }): void;
  (event: "cancel"): void;
}>();

const chosenId = ref(props.initialBeastId ?? "");
const chosenWindow = ref<RaidWindow>(props.defaultWindow);

const hasNoBeasts = computed(() => props.beasts.length === 0);
const cannotBegin = computed(() => chosenId.value === "");

const isChosen = (beast: Beast): boolean => String(beast.id) === chosenId.value;
const imageOf = (beast: Beast): string => raidBeastImage(beast);
const hasImage = (beast: Beast): boolean => imageOf(beast) !== "";
const choose = (beast: Beast): void => {
  chosenId.value = String(beast.id);
};
const begin = (): void => emit("begin", { beastId: chosenId.value, window: chosenWindow.value });
</script>

<style scoped lang="scss">
@use "./partyUi" as *;

.raid-start {
  @include party-window();
}

.raid-start__title {
  margin: 0 0 10px;
  color: var(--gs-accent);
}

.raid-start__empty {
  color: var(--gs-text-dim);
}

.raid-start__rail {
  display: flex;
  gap: 10px;
  margin: 0 0 14px;
  padding: 0 0 8px;
  overflow-x: auto;
  list-style: none;
}

.raid-start__beast {
  @include party-button();
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 104px;

  img {
    width: 72px;
    height: 72px;
    object-fit: contain;
  }
}

.raid-start__windows {
  margin-bottom: 14px;
}

// The actions stay at the foot of the window, in thumb reach
.raid-start__actions {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.raid-start__button {
  @include party-button();
}
</style>
