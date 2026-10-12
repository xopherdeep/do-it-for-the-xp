import { armCombatTasks, choreDamage, openChores } from "@/lib/services/battle/battleService/combatTasks";
import type { CombatTask, Enemy } from "@/lib/services/battle/battleService/types";

const beast = (extra: Partial<Enemy> = {}): Enemy => ({
  id: "b1",
  name: "Dust Bunny",
  type: "monster",
  isBoss: false,
  health: 10,
  maxHealth: 10,
  attack: 10,
  defense: 1,
  speed: 1,
  ...extra,
});

describe("combatTasks (characterization)", () => {
  describe("armCombatTasks", () => {
    it("copies each chore of the checklist", () => {
      const tasks: CombatTask[] = [
        { id: "t1", name: "Sweep", isCompleted: false },
        { id: "t2", name: "Mop", isCompleted: true },
      ];
      const armed = armCombatTasks(beast({ tasks }));
      expect(armed).toEqual(tasks);
      expect(armed[0]).not.toBe(tasks[0]);
    });

    it("makes the beast itself the one chore when it has no checklist", () => {
      const expected = [{ id: "b1-task", name: "Defeat Dust Bunny", isCompleted: false }];
      expect(armCombatTasks(beast())).toEqual(expected);
      expect(armCombatTasks(beast({ tasks: [] }))).toEqual(expected);
    });
  });

  describe("openChores", () => {
    it("counts the chores not yet done", () => {
      expect(openChores([])).toBe(0);
      expect(
        openChores([
          { id: "a", name: "A", isCompleted: true },
          { id: "b", name: "B", isCompleted: false },
          { id: "c", name: "C", isCompleted: false },
        ])
      ).toBe(2);
    });
  });

  describe("choreDamage", () => {
    it("takes an equal slice of max health, rounded up", () => {
      expect(choreDamage(beast({ health: 10, maxHealth: 10 }), false, 4)).toBe(3);
      expect(choreDamage(beast({ health: 10, maxHealth: 10 }), false, 2)).toBe(5);
    });

    it("always leaves the beast one health before its last chore", () => {
      expect(choreDamage(beast({ health: 2, maxHealth: 10 }), false, 2)).toBe(1);
      expect(choreDamage(beast({ health: 1, maxHealth: 10 }), false, 2)).toBe(0);
    });

    it("takes whatever is left on the last chore, never below 0", () => {
      expect(choreDamage(beast({ health: 7, maxHealth: 10 }), true, 4)).toBe(7);
      expect(choreDamage(beast({ health: -3, maxHealth: 10 }), true, 4)).toBe(0);
    });
  });
});
