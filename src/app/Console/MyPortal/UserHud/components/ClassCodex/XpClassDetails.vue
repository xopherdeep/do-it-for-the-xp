<template>
  <div
    class="cs-details"
    :class="`is-${skin}`"
  >
    <!-- Sealed: what it takes, with a bar per parent class -->
    <section
      v-if="entry.sealed"
      class="cs-panel cs-unlock"

      data-cy="class-unlock"
    >
      <h3 class="cs-heading"><i class="fad fa-lock"></i> To unlock</h3>
      <div
        v-for="part in entry.requirementProgress"
        :key="part.name"
        class="cs-need"
        :class="{ 'is-met': part.met }"
      >
        <span class="cs-need-name">{{ part.name }} Lv {{ part.needed }}</span>
        <span class="cs-meter">
          <span
            class="cs-meter-fill"
            :style="{ transform: `scaleX(${Math.min(1, part.level / part.needed)})` }"
          ></span>
        </span>
        <span class="cs-need-count">{{ Math.min(part.level, part.needed) }}/{{ part.needed }}</span>
      </div>
    </section>

    <!-- The five pillars as bars on one shared scale -->
    <section
      class="cs-panel"

    >
      <h3 class="cs-heading"><i class="fad fa-chart-bar"></i> Starting power</h3>
      <ul class="cs-bars">
        <li
          v-for="pillar in entry.power"
          :key="pillar.key"
          class="cs-bar"
          :class="{ 'is-trained': pillar.rank }"
          :style="{ '--pillar': `var(--ion-color-${pillar.color})` }"
        >
          <i :class="['fad', pillar.icon, 'cs-bar-icon']"></i>
          <span class="cs-bar-name">{{ pillar.name }}</span>
          <span class="cs-meter">
            <span
              class="cs-meter-fill"
              :style="{ transform: `scaleX(${pillar.share})` }"
            ></span>
          </span>
          <span class="cs-bar-value">{{ pillar.value }}</span>
          <span
            class="cs-bar-rank"
            :title="pillar.rank || ''"
          >{{ rankMark(pillar.rank) }}</span>
        </li>
      </ul>
      <p class="cs-start">
        <span class="is-hp">{{ entry.startingHp }} HP</span>
        <span class="is-mp">{{ entry.startingMp }} MP</span>
        <span class="cs-legend">&#9733; trains every level</span>
      </p>
    </section>

    <section
      class="cs-panel"

    >
      <p class="cs-passive">
        <i class="fad fa-sparkles"></i>
        <span>{{ entry.passive }}</span>
      </p>
      <p class="cs-description">{{ entry.description }}</p>

      <button
        type="button"
        class="cs-more"
        :aria-expanded="showMore"
        @click="toggleMore"
      >
        <i :class="['fas', showMore ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
        {{ showMore ? "Less" : "More about the " + entry.name }}
      </button>

      <div
        v-if="showMore"
        class="cs-more-body"
      >
        <h4 class="cs-subheading">In real life</h4>
        <ul class="cs-lines">
          <li
            v-for="line in entry.realLife"
            :key="line"
          >{{ line }}</li>
        </ul>
        <template v-if="entry.growsInto.length">
          <h4 class="cs-subheading">Grows into</h4>
          <ul class="cs-evolutions">
            <li
              v-for="evolution in entry.growsInto"
              :key="evolution.name"
              class="cs-evolution"
              :style="crestStyle(evolution.name)"
            >
              <i :class="['fad', evolution.icon, 'cs-evolution-crest']"></i>
              <span class="cs-evolution-name">{{ evolution.name }}</span>
              <span class="cs-evolution-need">{{ evolution.requirement }}</span>
              <i
                v-if="evolution.met"
                class="fad fa-check-circle cs-evolution-met"
                title="Ready"
              ></i>
            </li>
          </ul>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch } from "vue";
  import { play$fx } from "@/assets/fx";
  import type { ClassCodexEntry, PillarRank } from "@/lib/services/stats/ClassCodex";
  import { crestStyle } from "./classCrest";

  /**
   * The reading half of Choose Your Class: what unlocks a sealed class, the five pillars as bars on one scale,
   * the passive and description, and a "More about" fold with the Codex lines (real life, grows into).
   */
  const props = defineProps<{
    entry: ClassCodexEntry;
    skin: "retro" | "modern";
  }>();

  const RANK_MARKS: Record<PillarRank, string> = { Primary: "\u2605\u2605\u2605", Secondary: "\u2605\u2605", Tertiary: "\u2605" };
  const rankMark = (rank: PillarRank | null) => (rank ? RANK_MARKS[rank] : "");

  const showMore = ref(false);
  watch(
    () => props.entry.name,
    () => (showMore.value = false)
  );
  const toggleMore = () => {
    play$fx(showMore.value ? "closeMenu" : "openMenu");
    showMore.value = !showMore.value;
  };
</script>

<style lang="scss" scoped src="./_XpClassDetails.scss" />
