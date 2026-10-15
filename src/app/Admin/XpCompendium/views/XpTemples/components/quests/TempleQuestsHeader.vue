<template>
  <header class="quests-head">
    <h2 class="quests-title">
      <i class="fad fa-scroll" aria-hidden="true"></i>
      Quests
    </h2>
    <p class="theme-line" v-if="themeLabel">
      <i class="fad fa-wand-sparkles" aria-hidden="true"></i>
      {{ themeLabel }}
    </p>

    <div class="size-meter" :class="{ 'is-full': view.size.isFull }" role="img" :aria-label="view.sizeLine"
      v-if="view.rows.length > 0">
      <div class="meter-text">
        <span class="size-now">Size {{ view.size.total }}</span>
        <span class="size-of"> of {{ full }}</span>
        <span class="size-woken" v-if="view.size.dormant > 0"> · {{ view.size.dormant }} if woken</span>
      </div>
      <div class="meter-bar">
        <span class="meter-awake" :style="{ width: percent(view.size.awake) }"></span>
        <span class="meter-dormant" :style="{ width: percent(view.size.dormant) }"></span>
        <span class="meter-full" :style="{ left: percent(full) }"></span>
      </div>
    </div>

    <ul class="legend" v-if="hasDots" aria-label="What the dots mean">
      <li v-for="item in LEGEND" :key="item.status" :class="`dot-${item.status}`">
        <span class="dot-mark" aria-hidden="true"></span>{{ item.text }}
      </li>
    </ul>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { TEMPLE_FULL_SIZE } from "@/lib/services/temples/questRooms";
import type { TempleQuestsView } from "@/lib/services/temples/templeQuestRows";

/**
 * The top of the Quests tab: the temple's theme ("Kitchen · Shadow"), the size meter (awake quests solid, sleeping
 * templates greyed as "if woken", a mark where a temple is full) and what the status dots mean.
 */
const props = defineProps<{ view: TempleQuestsView; themeLabel: string }>();

/** What each status dot means, in the order a day goes: the beast is here, tied up, tamed, resting, not theirs */
const LEGEND = [
  { status: "lurking", text: "beast here" },
  { status: "pending", text: "tied up" },
  { status: "cleared", text: "tamed" },
  { status: "away", text: "not due" },
  { status: "notYours", text: "not theirs" },
];

const full = TEMPLE_FULL_SIZE;
const hasDots = computed(() => props.view.rows.some((row) => row.dots.length > 0));

/** The meter scales to the bigger of a full temple and this one, so a too-big temple still fits */
const scale = computed(() => Math.max(props.view.size.total, TEMPLE_FULL_SIZE));
const percent = (amount: number): string => `${(amount / scale.value) * 100}%`;
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;
@use "./questCard" as *;

.quests-head {
  margin-bottom: 16px;
  @include status-dots;
}

.quests-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0 2px;
  font-family: $eb-font-status;
  font-size: 1.3rem;
  font-weight: normal;
  color: $eb-color-pale-yellow;

  i {
    --fa-primary-color: #{$eb-color-pale-yellow};
    --fa-secondary-color: #{$eb-color-minty-blue};
  }
}

.theme-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-family: $eb-font-status;
  font-size: 1rem;
  color: $eb-color-cream;

  i {
    --fa-primary-color: #{$eb-color-minty-blue};
    --fa-secondary-color: #{$eb-color-pale-yellow};
  }
}

.size-meter {
  padding: 10px 12px 12px;
  background: rgba(20, 6, 28, 0.55);
  border: 2px solid rgba(231, 230, 179, 0.18);
  border-radius: 8px;

  &.is-full {
    border-color: rgba(128, 216, 144, 0.55);
  }
}

.meter-text {
  margin-bottom: 8px;
  font-family: $eb-font-status;
  font-size: 1.1rem;
  line-height: 1.2;
  color: $eb-color-cream;

  .size-now {
    color: #fff;
  }

  .size-woken {
    color: $dot-quiet;
  }
}

.meter-bar {
  position: relative;
  display: flex;
  height: 14px;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(231, 230, 179, 0.3);
  border-radius: 3px;
}

.meter-awake {
  background: $eb-color-minty-blue;
}

.meter-dormant {
  background: repeating-linear-gradient(-45deg, rgba(154, 150, 176, 0.55) 0 4px, rgba(154, 150, 176, 0.2) 4px 8px);
}

.meter-full {
  position: absolute;
  top: -5px;
  bottom: -5px;
  width: 2px;
  margin-left: -1px;
  background: $eb-color-pale-yellow;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  font-family: $eb-font-status;
  font-size: 0.8rem;
  color: rgba(231, 230, 179, 0.8);

  li {
    display: flex;
    align-items: center;
    gap: 5px;
  }
}
</style>
