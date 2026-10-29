<script setup lang="ts">
import { computed } from "vue";
import type { Ability, AbilityStatus, TimePeriod } from "@/types/abilities";
import type { HeroAbilitySnapshot, HeroApWindows } from "@/lib/services/abilities/heroAbilityStatus";
import type { BattlePowerCard } from "@/lib/services/battle/BattlePowers";
import { toFaClass } from "@/lib/utils/faIcon";
import { durationLabel, timerMinutesOf } from "@/lib/services/abilities/PowerTimers";
import { stateLineOf } from "../powerRow";

/**
 * One Power on the hero's My Powers page: what it is, how much AP it asks for and how far the hero has come,
 * what it costs to cast, and a Cast button that only works when the Power is available.
 * Presentational: the page owns the hero, the statuses and the casting; this card only says "cast" when tapped.
 * In a fight the page passes `battle`: the AP meter gives way to the MP and effect, the battle reason is the state
 * line, and Cast works whenever there is no reason. A grounded hero's Powers (outside a fight) keep their meters but
 * never cast: `groundedReason` is the state line.
 */
interface XpPowerCardProps {
  ability: Ability;
  status: AbilityStatus;
  unlocked: boolean;
  snapshot: HeroAbilitySnapshot;
  casting?: boolean;
  battle?: BattlePowerCard;
  /** Set while the hero owes the Hospital (docs/Quest-Rooms-Spec.md 5.8): Cast stays disabled and says why. Not used in a fight. */
  groundedReason?: string | null;
  /** Countdown string if running (e.g. "24:13") */
  timerLeft?: string | null;
}

const props = withDefaults(defineProps<XpPowerCardProps>(), {
  casting: false,
  groundedReason: null,
  timerLeft: null,
});

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

/** Whole numbers stay whole; a fraction of AP shows one decimal */
const fmt = (n: number): string => String(Math.round(n * 10) / 10);

const iconClass = computed(() => `fad ${toFaClass(props.ability.icon, "fa-sparkles")}`);

const typeLabel = computed(() => (props.ability.type === "in-game" ? "Spell" : "Privilege"));

const needed = computed(() => Number(props.ability.apRequirement?.amount) || 0);
const period = computed<TimePeriod>(() => props.ability.apRequirement?.period ?? "flat");
const periodLabel = computed(() => PERIOD_LABEL[period.value] ?? "in all");
const earned = computed(() => props.snapshot.ap[AP_WINDOW[period.value] ?? "total"] ?? 0);

const meterRatio = computed(() => (needed.value > 0 ? Math.min(earned.value / needed.value, 1) : 1));
const meterWidth = computed(() => `${Math.round(meterRatio.value * 100)}%`);
const meterPercent = computed(() => Math.round(meterRatio.value * 100));

const running = computed(() => Boolean(props.timerLeft));
const timerMinutes = computed(() => timerMinutesOf(props.ability));
const timerLabel = computed(() => (timerMinutes.value > 0 ? durationLabel(timerMinutes.value) : ""));

const costLine = computed(() =>
  props.battle
    ? `${props.battle.mp} MP · ${props.battle.effect}`
    : `${props.ability.mpCost} MP · ${FREQUENCY_LABEL[props.ability.frequency] ?? FREQUENCY_LABEL.flat}`
);

/** The one line that says why the Power cannot be cast right now (none when it can) */
const stateLine = computed(() => {
  const battle = props.battle;
  if (battle) return battle.reason ?? "";
  if (running.value && props.timerLeft) return `Running · ${props.timerLeft} left`;
  // A Power that is still locked, cooling or short of MP keeps saying so; grounded speaks for the ones that were ready
  const groundedLine = props.status === "available" ? props.groundedReason : "";
  if (groundedLine) return groundedLine;
  return stateLineOf(props.ability, props.status, earned.value, needed.value);
});

const canCast = computed(() => {
  const battle = props.battle;
  if (battle) return !battle.reason && !props.casting;

  return props.status === "available" && !props.groundedReason && !props.casting && !running.value;
});

const onCast = () => {
  if (canCast.value) emit("cast", props.ability.id);
};
</script>

<template>
  <article
    class="power-card"
    :class="[
      `type-${ability.type}`,
      `status-${status}`,
      { unlocked, 'is-running': running, 'is-casting': casting, 'is-ready': canCast }
    ]"
    :data-ability-id="ability.id"
  >
    <header class="power-head">
      <div class="power-emblem" :class="{ 'has-glow': canCast }">
        <i :class="iconClass" class="power-icon" aria-hidden="true" />
        <span v-if="!unlocked" class="power-status-badge locked-badge" title="Locked">
          <i class="fad fa-lock" aria-hidden="true" />
        </span>
        <span v-else-if="running" class="power-status-badge running-badge" title="Running">
          <i class="fad fa-stopwatch" aria-hidden="true" />
        </span>
        <span v-else-if="status === 'cooling'" class="power-status-badge cooling-badge" title="Cooling">
          <i class="fad fa-hourglass-half" aria-hidden="true" />
        </span>
      </div>

      <div class="power-title">
        <div class="power-title-row">
          <h2 class="power-name">{{ ability.name }}</h2>
          <span class="power-chip">{{ typeLabel }}</span>
        </div>
        <div class="power-tags">
          <span v-if="ability.mpCost > 0" class="badge-tag mp-tag">
            <i class="fad fa-gem" aria-hidden="true" /> {{ ability.mpCost }} MP
          </span>
          <span class="badge-tag freq-tag">
            <i class="fad fa-redo" aria-hidden="true" /> {{ FREQUENCY_LABEL[ability.frequency] ?? FREQUENCY_LABEL.flat }}
          </span>
          <span v-if="timerLabel" class="badge-tag timer-tag">
            <i class="fad fa-clock" aria-hidden="true" /> {{ timerLabel }}
          </span>
        </div>
      </div>
    </header>

    <p v-if="ability.description" class="power-desc">{{ ability.description }}</p>

    <div v-if="!battle" class="power-ap">
      <div class="power-ap-line">
        <span class="power-need">{{ needed }} AP {{ periodLabel }}</span>
        <span class="power-ap-text">
          {{ fmt(earned) }}/{{ fmt(needed) }} AP
          <small v-if="needed > 0" class="power-ap-pct">({{ meterPercent }}%)</small>
        </span>
      </div>
      <div
        class="power-meter"
        role="progressbar"
        aria-label="AP toward this Power"
        aria-valuemin="0"
        :aria-valuemax="needed"
        :aria-valuenow="Math.min(earned, needed)"
      >
        <div class="power-meter-fill" :style="{ width: meterWidth }" />
      </div>
    </div>

    <p class="power-cost">{{ costLine }}</p>

    <footer class="power-foot">
      <div class="power-state-box">
        <p v-if="stateLine" class="power-state">{{ stateLine }}</p>
      </div>
      <button
        type="button"
        class="cast-btn"
        :class="{ 'is-active': canCast, 'is-busy': casting }"
        :disabled="!canCast"
        :aria-label="`Cast ${ability.name}`"
        @click="onCast"
      >
        <span v-if="casting" class="cast-btn-text">
          <i class="fad fa-spinner-third fa-spin" aria-hidden="true" /> Casting
        </span>
        <span v-else class="cast-btn-text">
          <i class="fad fa-wand-magic-sparkles mr-1" aria-hidden="true" /> Cast
        </span>
      </button>
    </footer>
  </article>
</template>

<style lang="scss" scoped>
.power-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  background: var(--xp-app-surface, #1e1a2b);
  border: var(--xp-app-section-border, 1px solid rgba(255, 255, 255, 0.08));
  border-radius: var(--xp-app-radius-section, 12px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  overflow: hidden;

  &.type-real-life {
    --card-accent: #f0a330;
  }

  &.type-in-game {
    --card-accent: #3a8fe6;
  }

  &.is-ready {
    border-color: color-mix(in srgb, var(--card-accent, var(--xp-app-accent)) 45%, transparent);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.28), 0 0 12px color-mix(in srgb, var(--card-accent, var(--xp-app-accent)) 16%, transparent);
  }

  &.status-locked {
    opacity: 0.82;
  }

  &.is-running {
    border-color: color-mix(in srgb, #3fbf5f 60%, transparent);
  }
}

.power-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.power-emblem {
  position: relative;
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--xp-app-surface-2, #2a2539);
  border-radius: var(--xp-app-radius-tile, 10px);
  border: var(--xp-app-tile-border, 1px solid rgba(255, 255, 255, 0.08));

  .power-icon {
    font-size: 1.55rem;
    color: var(--card-accent, var(--xp-app-tile-fg, #f7e8a8));
    transition: transform 0.2s ease;
  }

  &.has-glow .power-icon {
    filter: drop-shadow(0 0 6px color-mix(in srgb, var(--card-accent, #3a8fe6) 60%, transparent));
  }
}

.power-status-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: #fff;
  border: 1.5px solid var(--xp-app-surface, #1e1a2b);

  &.locked-badge {
    background: #64748b;
  }

  &.running-badge {
    background: #3fbf5f;
    animation: pulse 1.8s infinite;
  }

  &.cooling-badge {
    background: #e08a2e;
  }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

.power-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.power-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.power-name {
  margin: 0;
  font-family: var(--xp-app-font-title);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--xp-app-text, #f2eefb);
  letter-spacing: 0.3px;
  text-transform: var(--xp-app-title-transform, none);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.power-chip {
  flex: 0 0 auto;
  padding: 2px 8px;
  font-size: 0.65rem;
  font-weight: 600;
  border-radius: var(--xp-app-radius-chip, 999px);
  background: color-mix(in srgb, var(--card-accent, #3a8fe6) 18%, transparent);
  color: var(--card-accent, #7fd0f0);
  border: 1px solid color-mix(in srgb, var(--card-accent, #3a8fe6) 35%, transparent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.power-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.badge-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: var(--xp-app-text-dim, rgba(242, 238, 251, 0.68));
  background: var(--xp-app-surface-2, rgba(255, 255, 255, 0.05));
  padding: 2px 7px;
  border-radius: var(--xp-app-radius-chip, 4px);

  i {
    font-size: 0.65rem;
  }

  &.mp-tag {
    color: var(--xp-color-mp, #3880ff);
  }

  &.freq-tag {
    color: var(--xp-app-text-dim, rgba(242, 238, 251, 0.68));
  }

  &.timer-tag {
    color: #3fbf5f;
  }
}

.power-desc {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--xp-app-text-dim, rgba(242, 238, 251, 0.78));
}

.power-ap {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 10px;
  background: var(--xp-app-surface-2, rgba(0, 0, 0, 0.16));
  border-radius: var(--xp-app-radius-control, 8px);
  border: 1px solid var(--xp-app-line, rgba(255, 255, 255, 0.05));
}

.power-ap-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.72rem;
  line-height: 1.2;
}

.power-need {
  color: var(--xp-app-text-dim, rgba(242, 238, 251, 0.65));
  font-weight: 500;
}

.power-ap-text {
  color: var(--xp-color-ap, #7fd0f0);
  font-weight: 700;
  font-family: var(--xp-app-font-title);
  letter-spacing: 0.3px;
}

.power-ap-pct {
  font-weight: normal;
  opacity: 0.85;
  margin-left: 2px;
}

.power-meter {
  height: 6px;
  overflow: hidden;
  background: var(--xp-app-line, rgba(255, 255, 255, 0.1));
  border-radius: var(--xp-app-radius-chip, 999px);
}

.power-meter-fill {
  height: 100%;
  background: var(--xp-color-ap, #7fd0f0);
  border-radius: inherit;
  transition: width 0.35s steps(8);
  box-shadow: 0 0 8px color-mix(in srgb, var(--xp-color-ap, #7fd0f0) 50%, transparent);
}

.power-cost {
  margin: 0;
  font-size: 0.76rem;
  color: var(--xp-app-text-dim, rgba(242, 238, 251, 0.62));
}

.power-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px solid var(--xp-app-line, rgba(255, 255, 255, 0.06));
}

.power-state-box {
  flex: 1;
  min-width: 0;
}

.power-state {
  margin: 0;
  font-size: 0.78rem;
  color: var(--xp-app-text-dim, rgba(242, 238, 251, 0.65));
  line-height: 1.3;
}

.cast-btn {
  flex: 0 0 auto;
  min-width: 84px;
  height: 36px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: var(--xp-app-btn-border, 1px solid rgba(255, 255, 255, 0.12));
  border-radius: var(--xp-app-radius-control, 8px);
  background: var(--xp-app-surface-2, #2a2539);
  color: var(--xp-app-text-dim, rgba(242, 238, 251, 0.5));
  font-family: var(--xp-app-font-title);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: not-allowed;
  transition: all 0.18s ease;

  &.is-active {
    cursor: pointer;
    background: var(--card-accent, var(--xp-app-accent, #3a8fe6));
    color: var(--xp-app-on-accent, #f7e8a8);
    text-shadow: var(--xp-app-on-accent-shadow, none);
    border-color: color-mix(in srgb, var(--card-accent, #3a8fe6) 80%, #fff);
    box-shadow: 0 2px 10px color-mix(in srgb, var(--card-accent, #3a8fe6) 40%, transparent);

    &:hover {
      filter: brightness(1.12);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(1px);
      filter: brightness(0.95);
    }
  }

  &.is-busy {
    opacity: 0.75;
    cursor: wait;
  }
}

.cast-btn-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
