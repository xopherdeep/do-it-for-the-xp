import { computed, type Ref } from "vue";
import type { BattleService, CombatTask, Enemy } from "@/lib/services/battle/BattleService";

/** Read-only view models for the enemy bars: chore progress and the attack timer. */
export const useAtbDisplay = (
  service: Ref<BattleService | null>,
  combatTasks: Ref<CombatTask[]>,
  currentEnemy: Ref<Enemy | null>
) => {
  const enemyProgressPercent = computed(() => {
    const total = combatTasks.value.length;
    if (!total) return 100;
    const completed = combatTasks.value.filter((task) => task.isCompleted).length;
    return Math.max(0, Math.min(100, ((total - completed) / total) * 100));
  });

  const attackTimerPercent = computed(() => service.value?.getEnemyAttackTimer() ?? 100);

  const atbTimeRemaining = computed(() => {
    const ms = service.value?.getTimeRemaining() ?? 0;
    if (ms <= 0) return "";
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  });

  /** Green with time to spare, amber at the halfway mark, red when the hit is imminent. */
  const timerColor = computed(() => {
    const percent = attackTimerPercent.value;
    const aboveHalf = percent > 50;
    const ratio = aboveHalf ? (percent - 50) / 50 : percent / 50;
    const r = aboveHalf ? Math.round(255 * (1 - ratio)) : 255;
    const g = aboveHalf ? 200 : Math.round(200 * ratio);
    return { r, g };
  });

  const atbBarStyle = computed(() => {
    const { r, g } = timerColor.value;
    const color = `rgb(${r}, ${g}, 0)`;
    const lighter = `rgb(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, 0)`;
    return {
      width: `${attackTimerPercent.value}%`,
      background: `linear-gradient(90deg, ${color} 0%, ${lighter} 100%)`,
      boxShadow: `0 0 10px rgba(${r}, ${g}, 0, 0.7)`,
    };
  });

  const atbIconColor = computed(() => `rgb(${timerColor.value.r}, ${timerColor.value.g}, 0)`);

  const enemySizeClass = computed(() => {
    if (currentEnemy.value?.isBoss) return "boss";
    if (currentEnemy.value?.type === "miniboss") return "miniboss";
    return "monster";
  });

  return { enemyProgressPercent, attackTimerPercent, atbTimeRemaining, atbBarStyle, atbIconColor, enemySizeClass };
};
