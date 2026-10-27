<template>
  <section class="bl-step" data-test="step-look">
    <!-- The beast on its battlefield, once it has a face -->
    <xp-beast-stage v-if="hasLook" class="bl-stage" :portrait="portrait" :bg1="draft.bg1" :bg2="draft.bg2" data-test="stage" />

    <div class="bl-grid bl-grid--2">
      <button
        type="button"
        class="bl-tile bl-tile--big"
        :class="{ 'is-picked': hasDrawing }"
        :aria-pressed="hasDrawing"
        data-test="look-photo"
        @click="emit('photo')"
      >
        <i class="fad fa-camera bl-tile__icon" aria-hidden="true"></i>
        <span class="bl-tile__label">{{ t("beastMaker.look.photo") }}</span>
      </button>
      <button
        type="button"
        class="bl-tile bl-tile--big"
        :class="{ 'is-picked': browsing }"
        :aria-pressed="browsing"
        data-test="look-library"
        @click="emit('browse')"
      >
        <i class="fad fa-dragon bl-tile__icon" aria-hidden="true"></i>
        <span class="bl-tile__label">{{ t("beastMaker.look.library") }}</span>
      </button>
    </div>

    <!-- The library: a picture for every chore, the hero's own age first; the search field is the holder's, in the bar -->
    <div v-if="browsing" class="bl-grid bl-library" data-test="library">
      <button
        v-for="entry in tiles"
        :key="String(entry.id)"
        type="button"
        class="bl-tile"
        :class="{ 'is-picked': isPicked(entry) }"
        :aria-pressed="isPicked(entry)"
        :aria-label="entry.name"
        data-test="tile-beast"
        :data-beast="String(entry.id)"
        @click="emit('pick', entry)"
      >
        <span class="bl-tile__art">
          <img v-if="portraitOf(entry)" :src="portraitOf(entry) ?? ''" alt="" loading="lazy" />
          <i v-else class="fad fa-dragon" aria-hidden="true"></i>
        </span>
        <span class="bl-tile__label">{{ entry.name }}</span>
        <i v-if="isPicked(entry)" class="fad fa-check-circle bl-tile__check" aria-hidden="true"></i>
      </button>
      <button v-if="canShowMore" type="button" class="bl-tile bl-tile--more" data-test="tile-more" @click="showAll = true">
        <span class="bl-tile__art"><i class="fad fa-ellipsis-h" aria-hidden="true"></i></span>
        <span class="bl-tile__label">More</span>
      </button>
    </div>
    <p v-if="browsing && isSearching && !tiles.length" class="bl-note" data-test="no-match">
      {{ t("beastMaker.look.noMatch") }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { beastPortraitUrl } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait";
import type { BeastDraft } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import { useCopy } from "@/hooks/useVoice";
import type { LibraryEntry } from "@/lib/services/bestiary/librarySuggest";
import { bandOf, choreTiles, searchChores } from "@/lib/services/quests/questWizard";
import { useUserStore } from "@/lib/store/stores/user";
import XpBeastStage from "./XpBeastStage.vue";

/**
 * The Beast Maker's first screen: the beast on its battlefield once it has a face, two big tiles to give it one (a
 * picture of a drawing, or the library) and, under them, the library as picture tiles (the Quest Wizard's, by the
 * hero's age band, narrowed by the search the holder types in the bar). The draft is the holder's: the step only says
 * what was tapped.
 */
interface BeastLookStepProps {
  draft: BeastDraft;
  /** The hero whose age band orders the library */
  heroId: string;
  /** The library is open under the tiles */
  browsing: boolean;
  /** What the holder typed in the bar; it narrows the library */
  search: string;
}

const props = defineProps<BeastLookStepProps>();

const emit = defineEmits<{
  photo: [];
  browse: [];
  pick: [entry: LibraryEntry];
}>();

const PAGE_SIZE = 23;

const t = useCopy();
const userStore = useUserStore();

// A drawing is the portrait when there is one, even over a library beast picked before it
const portrait = computed(() => props.draft.localImage || (beastPortraitUrl(props.draft.avatar) ?? ""));
const hasDrawing = computed(() => Boolean(props.draft.localImage));
const hasLook = computed(() => hasDrawing.value || props.draft.avatar > 0);

const showAll = ref(false);
// The library closes with More forgotten, so it opens on its first page next time
watch(
  () => props.browsing,
  (isBrowsing) => {
    if (!isBrowsing) showAll.value = false;
  }
);

const band = computed(() => bandOf(userStore.users[props.heroId] ?? {}));
const allTiles = computed(() => choreTiles(band.value));
const isSearching = computed(() => props.search.trim().length > 0);
const tiles = computed<LibraryEntry[]>(() => {
  if (isSearching.value) return searchChores(props.search);
  return showAll.value ? allTiles.value : allTiles.value.slice(0, PAGE_SIZE);
});
const canShowMore = computed(() => !isSearching.value && !showAll.value && allTiles.value.length > PAGE_SIZE);

const portraitOf = (entry: LibraryEntry): string | null => beastPortraitUrl(entry.avatar);
const isPicked = (entry: LibraryEntry): boolean => !hasDrawing.value && Number(entry.avatar) === props.draft.avatar;
</script>

<style lang="scss" scoped src="./_XpBeastLookStep.scss" />
