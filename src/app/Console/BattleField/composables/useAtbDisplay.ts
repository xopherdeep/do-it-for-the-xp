import { computed, type Ref } from "vue";
import type { BattleService, CombatTask, Enemy } from "@/lib/services/battle/BattleService";

/** Under this much time left the clock pulses and the beast is about to strike. */
const CRITICAL_MS = 10_000;

/** Read-only view models for the enemy stage: chore progress, the attack clock and the sprite size. */
export const useAtbDisplay = (
  service: Ref<BattleService | null>,
  combatTasks: Ref<CombatTask[]>,
  currentEnemy: Ref<Enemy | null>
) => {
  const choresTotal = computed(() => combatTasks.value.length);
  const choresLeft = computed(() => combatTasks.value.filter((task) => !task.isCompleted).length);

  /** 0-100, the share of the clock still on the table. */
  const timerPercent = computed(() => service.value?.getEnemyAttackTimer() ?? 100);

  const timeRemainingMs = computed(() => service.value?.getTimeRemaining() ?? 0);

  /** "m:ss", or "" once the clock has run out. */
  const timerLabel = computed(() => {
    const ms = timeRemainingMs.value;
    if (ms <= 0) return "";
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  });

  const timerCritical = computed(() => timeRemainingMs.value > 0 && timeRemainingMs.value <= CRITICAL_MS);

  /** Each chore is worth an equal slice of the beast's health. */
  const damagePerTask = computed(() => {
    const enemy = currentEnemy.value;
    const hasNothingToSplit = !enemy || !combatTasks.value.length;
    if (hasNothingToSplit) return 0;
    return Math.ceil(enemy.maxHealth / combatTasks.value.length);
  });

  const enemySizeClass = computed(() => {
    if (currentEnemy.value?.isBoss) return "boss";
    if (currentEnemy.value?.type === "miniboss") return "miniboss";
    return "monster";
  });

  return { choresTotal, choresLeft, timerPercent, timerLabel, timerCritical, damagePerTask, enemySizeClass };
};
