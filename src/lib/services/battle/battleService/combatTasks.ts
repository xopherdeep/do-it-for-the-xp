import debug from "@/lib/utils/debug";
import type { CombatTask, Enemy } from "./types";

/** The beast's checklist as the hero's attacks: a copy of each chore, or the beast itself as the one chore. */
export function armCombatTasks(enemy: Enemy): CombatTask[] {
  const { tasks } = enemy;
  const hasChecklist = tasks && tasks.length > 0;
  if (hasChecklist) {
    return tasks.map((task) => ({ ...task }));
  }
  debug.warn('BattleService: No tasks found on enemy, the beast itself is the chore', enemy);
  return [{ id: `${enemy.id}-task`, name: `Defeat ${enemy.name}`, isCompleted: false }];
}

/** How many chores are still open. */
export function openChores(tasks: CombatTask[]): number {
  return tasks.filter(t => !t.isCompleted).length;
}

/**
 * What one chore takes off the beast: an equal slice of its health, except that the beast always
 * survives until its last chore (so rounding can never end a fight with chores still open), and
 * the last chore takes whatever is left.
 */
export function choreDamage(enemy: Enemy, isLastChore: boolean, taskCount: number): number {
  if (isLastChore) {
    return Math.max(0, enemy.health);
  }
  const slice = Math.ceil(enemy.maxHealth / taskCount);
  return Math.max(0, Math.min(slice, enemy.health - 1));
}
