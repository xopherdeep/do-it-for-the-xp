<template>
  <div class="quest-row" :class="[`kind-${row.kind}`, row.tier ? `tier-${row.tier}` : 'tier-none']" role="button"
    tabindex="0" :aria-label="`${row.title}. Open the room in the editor`" @click="emit('open')"
    @keydown.enter.self="emit('open')" @keydown.space.self.prevent="emit('open')">
    <span class="portrait">
      <img v-if="portrait" :src="portrait" alt="" />
      <i v-else class="fad fa-paw-claws" aria-hidden="true"></i>
    </span>

    <span class="body">
      <span class="title">{{ row.title }}</span>
      <span class="facts" v-if="row.tierName || row.facts">
        <span class="chip chip-tier" v-if="row.tierName">{{ row.tierName }}</span>
        <span class="facts-text">{{ row.facts }}</span>
      </span>
      <span class="when" v-if="row.when || row.approval">
        <span class="when-text">{{ row.when }}</span>
        <span class="chip chip-approval" v-if="row.approval">
          <i class="fad fa-clipboard-list-check" aria-hidden="true"></i> Approval
        </span>
      </span>
      <span class="more" v-if="row.moreQuests > 0">
        and {{ row.moreQuests }} more quest{{ row.moreQuests !== 1 ? "s" : "" }} for other heroes
      </span>
      <span class="flag" v-if="row.mismatch">
        <i class="fad fa-exclamation-triangle" aria-hidden="true"></i> {{ row.mismatch }}
      </span>
      <span class="foot">
        <span class="dots" v-if="row.dots.length > 0">
          <span v-for="dot in row.dots" :key="dot.heroId" class="dot" :class="`dot-${dot.status}`" :title="dot.label">
            <span class="dot-mark" aria-hidden="true"></span>
            <span class="dot-name">{{ dot.name }}</span>
            <span class="sr-only">{{ dot.label }}</span>
          </span>
        </span>
        <span class="room-pin">
          <span class="token-badge">{{ row.symbol }}</span>
          <XpCoordBadge size="small" :x="row.col" :y="row.row" />
        </span>
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import XpCoordBadge from "@/components/atoms/Coord/XpCoordBadge.vue";
import type { TempleQuestRow } from "@/lib/services/temples/templeQuestRows";
import { beastPortraitUrl } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait";

/**
 * One quest room of a temple, as the Quests tab lists it: the beast's portrait, the quest (or "Dormant: Dust Dervish, no
 * quest yet"), its tier, difficulty, schedule and heroes, a status dot for each hero, and the flag when the quest's tier
 * is not the room's. Tapping it opens the room in the editor. What it says comes ready-made from templeQuestRows.
 */
const props = defineProps<{ row: TempleQuestRow }>();
const emit = defineEmits<{ (e: "open"): void }>();

const portrait = computed(() => beastPortraitUrl(props.row.avatar));
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;
@use "./questCard" as *;

.quest-row {
  @include quest-card;
  @include status-dots;
}

// A room nobody has woken: the portrait and the words are dimmed, like the greyed part of the size meter
.kind-dormant {
  border-style: dashed;

  .portrait {
    opacity: 0.6;
    filter: grayscale(0.7);
  }

  .title {
    font-style: italic;
    color: rgba(231, 230, 179, 0.8);
  }

  .facts,
  .when {
    color: $dot-quiet;
  }
}

.kind-emptyLair {
  border-color: rgba(255, 82, 82, 0.4);

  .title {
    color: #ffb4b4;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.more {
  font-size: 0.8rem;
  font-style: italic;
  color: $eb-color-sky-blue;
}

.flag {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 2px;
  font-size: 0.85rem;
  line-height: 1.25;
  color: $tier-miniboss;

  i {
    --fa-primary-color: #{$tier-miniboss};
    --fa-secondary-color: #{$tier-miniboss};
    margin-top: 2px;
  }
}

.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 10px;
  margin-top: 2px;
}

.dots {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.dot {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
  color: $eb-color-cream;
}

.room-pin {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.token-badge {
  padding: 1px 4px;
  font-family: "Press Start 2P";
  font-size: 0.4rem;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
</style>
