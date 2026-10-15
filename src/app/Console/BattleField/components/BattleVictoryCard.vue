<template>
  <div
    v-show="visible"
    ref="root"
    class="battle-victory-card"
    :class="{ 'is-held': card.held, 'is-counting': counting }"
    data-cy="victory-card"
    role="button"
    tabindex="0"
    @click="onTap"
    @keyup.enter="onTap"
    @keyup.space="onTap"
    @keydown.space.prevent
  >
    <!-- Falling sparkles: decoration only, clipped to the card and never in the way of a tap -->
    <div class="victory-stars" aria-hidden="true">
      <span v-for="n in STAR_COUNT" :key="n" class="victory-star">✦</span>
    </div>

    <div class="victory-body">
      <div
        class="victory-title"
        :class="{ 'has-sprite': isYouWon }"
        :data-text="card.title"
      >
        <template v-if="isYouWon">
          <img
            src="@/assets/images/battle/you_won.png"
            alt=""
            class="you-won-sprite"
            draggable="false"
          />
          <span class="sr-only">{{ card.title }}</span>
        </template>
        <template v-else>
          {{ card.title }}
        </template>
      </div>
      <div v-if="card.levelUp" class="victory-levelup">LEVEL UP! Lv {{ card.levelUp.from }} → {{ card.levelUp.to }}</div>
      <div class="victory-subtitle">{{ card.subtitle }}</div>
      <div v-if="card.questName" class="victory-quest">Quest tamed: {{ card.questName }}</div>
      <div v-if="workLine" class="victory-work">{{ workLine }}</div>

      <div class="reward-tiles">
        <div
          v-for="tile in tiles"
          :key="tile.stat"
          class="reward-tile"
          :class="{ 'is-held': card.held, 'is-zero': tile.target === 0 }"
          :data-stat="tile.stat"
        >
          <span class="reward-label">{{ tile.label }}</span>
          <i :class="[tile.icon, 'reward-icon']" aria-hidden="true"></i>
          <span
            class="reward-value"
            :class="{ 'is-long': tile.long, 'is-landed': tile.landed }"
            :data-stat="tile.stat"
          >{{ tile.shown }}</span>
          <i v-if="card.held" class="fad fa-lock reward-lock" aria-hidden="true"></i>
        </div>
      </div>

      <div v-if="bonusLine" class="victory-bonus" data-test="hunt-bonus">{{ bonusLine }}</div>
      <div v-if="card.held" class="victory-held">Waiting for the Game Master</div>
      <div class="victory-footer">Tap to continue ▼</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import type { VictoryCardState } from "../battle/battleView";

/**
 * The victory card: the loot counts up in three tiles (XP, GP, AP), one after another, under a rain of sparkles.
 * Purely presentational. The page decides when it shows (`visible`), what it says (`card`) and what a tap means once
 * the numbers have landed (`continue`); a tap while they still roll finishes them first. It plays no sound itself: the
 * page does, from `rolling` (the count started or ended) and `land` (a number reached its exact value).
 */
const props = defineProps<{
  visible: boolean;
  card: VictoryCardState;
}>();

const isYouWon = computed(() => {
  const title = props.card?.title?.trim().toUpperCase();
  return title === "YOU WON!" || title === "YOU WON !" || title === "YOU WON" || title === "VICTORY!";
});

type Stat = "xp" | "gp" | "ap";

const emit = defineEmits<{
  (e: "continue"): void;
  /** True once when the numbers start counting, false once when they are done (landed, or finished by a tap). */
  (e: "rolling", on: boolean): void;
  /** A number reached its exact value. A tap that finishes the count early sends one `land`, not one per tile. */
  (e: "land", stat: Stat): void;
}>();

interface VictoryTile {
  stat: Stat;
  label: string;
  icon: string;
  delay: number;
}

/** A tile starts rolling `delay` ms after the card appears, so the three numbers land one after another. */
const TILES: readonly VictoryTile[] = [
  { stat: "xp", label: "XP", icon: "fad fa-star", delay: 0 },
  { stat: "gp", label: "GP", icon: "fad fa-coins", delay: 250 },
  { stat: "ap", label: "AP", icon: "fad fa-bolt", delay: 500 },
];
/** Each tile rolls through a fixed chain of 30 timeouts, 30 ms apart; the last one writes the exact target. */
const COUNT_STEPS = 30;
const COUNT_STEP_MS = 30;
/** Matches the nth-child rules in the stylesheet. */
const STAR_COUNT = 12;

const root = ref<HTMLElement | null>(null);
const shown = reactive<Record<Stat, number>>({ xp: 0, gp: 0, ap: 0 });
const landed = reactive<Record<Stat, boolean>>({ xp: false, gp: false, ap: false });
const timers = new Map<Stat, ReturnType<typeof setTimeout>>();

/** What a tile counts up to. Read at every step, so a card that changes mid-count still ends on the right number. */
const targetOf = (stat: Stat): number => {
  const value = Number(props.card.rewards?.[stat]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
};

/** Fast first, slow last: the number races up and settles. */
const easeOut = (progress: number): number => 1 - Math.pow(1 - progress, 3);

/** "Hunt bonus +30 XP": what winning the fight added to the XP tile; a held quest is paid it once approved. */
const bonusLine = computed(() => {
  const bonus = Math.round(Number(props.card.huntBonusXp));
  const hasBonus = bonus > 0;
  if (!hasBonus) return "";
  return props.card.held ? `Hunt bonus +${bonus} XP once approved` : `Hunt bonus +${bonus} XP`;
});

const tiles = computed(() =>
  TILES.map(({ stat, label, icon }) => {
    const target = targetOf(stat);
    return {
      stat,
      label,
      icon,
      target,
      shown: shown[stat],
      landed: landed[stat] && target > 0,
      long: String(target).length >= 5,
    };
  }),
);

/** True while any tile still shows less than it is going to. A tile that has reached its number never blocks a tap. */
const counting = computed(() => TILES.some(({ stat }) => shown[stat] !== targetOf(stat)));

/** "2 chores in 2:05", "1 chore in 0:07"; nothing for a card that was not a fight. */
const workLine = computed(() => {
  const isFightCard = props.card.choresDone !== undefined;
  if (!isFightCard) return "";
  const chores = Math.max(0, Math.floor(Number(props.card.choresDone) || 0));
  const seconds = Math.max(0, Math.floor((Number(props.card.elapsedMs) || 0) / 1000));
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return `${chores} ${chores === 1 ? "chore" : "chores"} in ${clock}`;
});

const clearTimers = () => {
  timers.forEach((timer) => clearTimeout(timer));
  timers.clear();
};

/** Only a tile with loot to count makes the page's roll sound; an empty tile (no AP, say) rolls in silence. */
const hasLoot = (stat: Stat): boolean => targetOf(stat) > 0;

let isRolling = false;
/** Tells the page when the counting starts and stops, however it stops: landed, tapped, hidden or unmounted. */
const syncRolling = () => {
  const shouldRoll = TILES.some(({ stat }) => timers.has(stat) && hasLoot(stat));
  const isUnchanged = shouldRoll === isRolling;
  if (isUnchanged) return;
  isRolling = shouldRoll;
  emit("rolling", shouldRoll);
};

const land = (stat: Stat) => {
  shown[stat] = targetOf(stat);
  landed[stat] = true;
};

const rollTile = (stat: Stat, step: number) => {
  timers.set(
    stat,
    setTimeout(() => {
      const isLastStep = step >= COUNT_STEPS;
      if (isLastStep) {
        timers.delete(stat);
        land(stat);
        if (hasLoot(stat)) emit("land", stat);
        syncRolling();
        return;
      }
      shown[stat] = Math.round(targetOf(stat) * easeOut(step / COUNT_STEPS));
      rollTile(stat, step + 1);
    }, COUNT_STEP_MS),
  );
};

const isCardShowing = (): boolean => props.visible;

/** Every number lands right now: written, the chains cancelled, the page told the roll is over. */
const landAll = () => {
  clearTimers();
  TILES.forEach(({ stat }) => land(stat));
  syncRolling();
};

/** The first tap while the tiles are still rolling: everything lands, with one chime for the tiles it finished. */
const completeAll = () => {
  const unlanded = TILES.find(({ stat }) => !landed[stat] && hasLoot(stat));
  landAll();
  if (unlanded) emit("land", unlanded.stat);
};

/** Back to zero, then (when the card is showing) roll the three tiles one after another. */
const start = () => {
  clearTimers();
  syncRolling();
  TILES.forEach(({ stat }) => {
    shown[stat] = 0;
    landed[stat] = false;
  });
  if (!isCardShowing()) return;
  TILES.forEach(({ stat, delay }) => {
    timers.set(
      stat,
      setTimeout(() => {
        rollTile(stat, 1);
        syncRolling();
      }, delay),
    );
  });
};

/** Keyboard players can press Enter straight away. */
const focusCard = () => {
  nextTick(() => root.value?.focus({ preventScroll: true }));
};

const onTap = () => {
  if (!isCardShowing()) return;
  if (counting.value) {
    completeAll();
    return;
  }
  // The digits can all show a beat before the last tile lands: the tap ends that tail quietly, so the roll stops too.
  landAll();
  emit("continue");
};

watch(
  () => props.visible,
  () => {
    start();
    if (isCardShowing()) focusCard();
  },
  { immediate: true },
);

// New loot while the card is up (a late-arriving card): roll it again instead of showing stale numbers.
watch(
  () => TILES.map(({ stat }) => targetOf(stat)).join("/"),
  () => {
    if (isCardShowing()) start();
  },
);

onBeforeUnmount(() => {
  clearTimers();
  syncRolling();
});
</script>

<style lang="scss" scoped src="./_BattleVictoryCard.scss" />
