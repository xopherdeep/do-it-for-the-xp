<script setup lang="ts">
import { computed, toRef } from "vue";
import { usePowerTimers } from "@/hooks/abilities/usePowerTimers";
import { toFaClass } from "@/lib/utils/faIcon";

/**
 * The hero's running timed privileges as countdown chips ("Game On 24:13"), each with a bar that drains and an X to
 * hand the time back. Floating, it sits above the portal's bottom nav on every screen; inline, it heads a page.
 * Nothing draws while no timer runs. "Time's up" is said by usePowerTimers.
 */
const props = withDefaults(defineProps<{ heroId: string; floating?: boolean }>(), { floating: false });

const { timers, stopEarly } = usePowerTimers(toRef(props, "heroId"));
const hasTimers = computed(() => timers.value.length > 0);
</script>

<template>
  <div
    v-if="hasTimers"
    class="xp-power-timers"
    :class="{ 'is-floating': floating }"
    role="timer"
    aria-live="off"
    data-cy="power-timers"
  >
    <div v-for="timer in timers" :key="timer.abilityId" class="timer-chip" :data-ability-id="timer.abilityId">
      <i :class="['fad', toFaClass(timer.icon, 'fa-hourglass-half'), 'timer-icon']" aria-hidden="true"></i>
      <span class="timer-name">{{ timer.name }}</span>
      <span class="timer-left" :aria-label="`${timer.left} left`">{{ timer.left }}</span>
      <button
        type="button"
        class="timer-end"
        :aria-label="`End ${timer.name} now`"
        @click.stop="stopEarly(timer.abilityId)"
      >
        <i class="fad fa-times" aria-hidden="true"></i>
      </button>
      <span class="timer-meter" aria-hidden="true">
        <span class="timer-meter-fill" :style="{ width: `${Math.round(timer.fraction * 100)}%` }"></span>
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.xp-power-timers {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  padding: 6px 8px;

  &.is-floating {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(var(--xp-dock-height, 56px) + 8px);
    z-index: 1400;
    pointer-events: none;

    .timer-chip {
      pointer-events: auto;
    }
  }
}

.timer-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 5px 6px 8px 10px;
  border: 2px solid #fff;
  border-radius: 8px;
  background: #1b1640;
  box-shadow: 0 0 0 2px #000, 0 3px 0 2px rgba(0, 0, 0, 0.45);
  color: #fff;
  font-family: "StatusPlz", monospace;
  font-size: 14px;
  line-height: 1;
  overflow: hidden;
}

.timer-icon {
  font-size: 15px;
}

.timer-name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timer-left {
  min-width: 42px;
  color: #ffe066;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.timer-end {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.timer-meter {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.15);
}

.timer-meter-fill {
  display: block;
  height: 100%;
  background: #ffe066;
  transition: width 1s linear;
}
</style>
