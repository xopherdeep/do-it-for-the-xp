<script setup lang="ts">
import { computed } from "vue";
import type { Ability, AbilityStatus, TimePeriod } from "@/types/abilities";
import type { HeroAbilitySnapshot, HeroApWindows } from "@/lib/services/abilities/heroAbilityStatus";
import type { BattlePowerCard } from "@/lib/services/battle/BattlePowers";

/**
 * One Power on the hero's My Powers page: what it is, how much AP it asks for and how far the hero has come,
 * what it costs to cast, and a Cast button that only works when the Power is available.
 * Presentational: the page owns the hero, the statuses and the casting; this card only says "cast" when tapped.
 * In a fight the page passes `battle`: the AP meter gives way to the MP and effect, the battle reason is the state
 * line, and Cast works whenever there is no reason.
 */
const props = withDefaults(
  defineProps<{
    ability: Ability;
    status: AbilityStatus;
    unlocked: boolean;
    snapshot: HeroAbilitySnapshot;
    casting?: boolean;
    battle?: BattlePowerCard;
  }>(),
  { casting: false }
);

const emit = defineEmits<{ (e: "cast", abilityId: string): void }>();

/** "this week" and friends, for the line that names the AP the Power asks for */
const PERIOD_LABEL: Partial<Record<TimePeriod, string>> = {
  daily: "today",
  weekly: "this week",
  monthly: "this month",
  quarterly: "this quarter",
  yearly: "this year",
};

/** Which AP window the meter reads; periods without a window of their own read the lifetime total */
const AP_WINDOW: Partial<Record<TimePeriod, keyof HeroApWindows>> = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  quarterly: "quarterly",
  yearly: "yearly",
};

const FREQUENCY_LABEL: Record<TimePeriod, string> = {
  hourly: "once an hour",
  daily: "once a day",
  weekly: "once a week",
  monthly: "once a month",
  quarterly: "once a quarter",
  biannual: "twice a year",
  yearly: "once a year",
  flat: "anytime",
};

/** When a cooling Power is back, by how often it can be cast */
const BACK_LABEL: Record<TimePeriod, string> = {
  hourly: "in an hour",
  daily: "tomorrow",
  weekly: "next week",
  monthly: "next month",
  quarterly: "next quarter",
  biannual: "in six months",
  yearly: "next year",
  flat: "soon",
};

/** Whole numbers stay whole; a fraction of AP shows one decimal */
const fmt = (n: number): string => String(Math.round(n * 10) / 10);

const iconClass = computed(() => {
  const icon = props.ability.icon ?? "";
  return icon.startsWith("fa-") ? `fad ${icon}` : "fad fa-sparkles";
});

const typeLabel = computed(() => (props.ability.type === "in-game" ? "Spell" : "Privilege"));

const needed = computed(() => Number(props.ability.apRequirement?.amount) || 0);
const period = computed<TimePeriod>(() => props.ability.apRequirement?.period ?? "flat");
const periodLabel = computed(() => PERIOD_LABEL[period.value] ?? "in all");
const earned = computed(() => props.snapshot.ap[AP_WINDOW[period.value] ?? "total"] ?? 0);

const meterWidth = computed(() => `${Math.round((needed.value > 0 ? Math.min(earned.value / needed.value, 1) : 1) * 100)}%`);

const costLine = computed(() =>
  props.battle
    ? `${props.battle.mp} MP · ${props.battle.effect}`
    : `${props.ability.mpCost} MP · ${FREQUENCY_LABEL[props.ability.frequency] ?? FREQUENCY_LABEL.flat}`
);

/** The one line that says why the Power cannot be cast right now (none when it can) */
const stateLine = computed(() => {
  if (props.battle) return props.battle.reason ?? "";
  switch (props.status) {
    case "locked":
      return earned.value < needed.value ? `${fmt(needed.value - earned.value)} AP to go` : "Locked";
    case "unlocked":
      return `Need ${props.ability.mpCost} MP`;
    case "cooling":
      return `Cooling · back ${BACK_LABEL[props.ability.frequency] ?? BACK_LABEL.flat}`;
    case "used":
      return "Used";
    case "active":
      return "Active";
    default:
      return "";
  }
});

const canCast = computed(() => (props.battle ? !props.battle.reason : props.status === "available") && !props.casting);

const onCast = () => {
  if (canCast.value) emit("cast", props.ability.id);
};
</script>

<template>
  <article
    class="power-card"
    :class="[`type-${ability.type}`, `status-${status}`, { unlocked }]"
    :data-ability-id="ability.id"
  >
    <header class="power-head">
      <i :class="iconClass" class="power-icon" aria-hidden="true" />
      <div class="power-title">
        <h2 class="power-name">{{ ability.name }}</h2>
        <span class="power-chip">{{ typeLabel }}</span>
      </div>
    </header>

    <p v-if="ability.description" class="power-desc">{{ ability.description }}</p>

    <div v-if="!battle" class="power-ap">
      <div class="power-ap-line">
        <span class="power-need">{{ needed }} AP {{ periodLabel }}</span>
        <span class="power-ap-text">{{ fmt(earned) }}/{{ fmt(needed) }} AP</span>
      </div>
      <div class="power-meter" aria-hidden="true">
        <div class="power-meter-fill" :style="{ width: meterWidth }" />
      </div>
    </div>

    <p class="power-cost">{{ costLine }}</p>

    <footer class="power-foot">
      <p v-if="stateLine" class="power-state">{{ stateLine }}</p>
      <button
        type="button"
        class="cast-btn"
        :disabled="!canCast"
        :aria-label="`Cast ${ability.name}`"
        @click="onCast"
      >
        Cast
      </button>
    </footer>
  </article>
</template>
