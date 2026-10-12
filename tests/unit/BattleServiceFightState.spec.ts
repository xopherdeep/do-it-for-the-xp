import {
  activeUserOf,
  beginFightState,
  initialBattleState,
  nextLivingBeast,
  toBattleUser,
} from "@/lib/services/battle/battleService/fightState";
import type { BattleState, Enemy, User } from "@/lib/services/battle/battleService/types";

const beast = (id: string, health = 10): Enemy => ({
  id,
  name: id,
  type: "monster",
  isBoss: false,
  health,
  maxHealth: 10,
  attack: 10,
  defense: 1,
  speed: 1,
});

const hero = (id: string): User => ({
  id,
  name: id,
  stats: { level: 1, hp: 10, maxHp: 10, mp: 5, maxMp: 5, strength: 1, defense: 1, speed: 1 },
});

describe("fightState (characterization)", () => {
  describe("initialBattleState", () => {
    it("starts nothing, with a full clock and nobody on the field", () => {
      expect(initialBattleState()).toEqual({
        battleStarted: false,
        isPlayerTurn: false,
        turnCounter: 0,
        isDefending: false,
        currentEnemy: null,
        participants: { enemies: [], users: [], activeEnemyIndex: 0, activeUserIndex: 0 },
        enemyAttackTimer: 100,
        timeRemaining: 0,
        attackDuration: 0,
        combatTasks: [],
        pendingPlayerDamage: 0,
        pendingStrikeBraced: false,
      });
    });

    it("hands out a fresh object each time", () => {
      expect(initialBattleState()).not.toBe(initialBattleState());
    });
  });

  describe("beginFightState", () => {
    it("opens the fight on the hero's move and clears the strike and the clock", () => {
      const state: BattleState = initialBattleState();
      state.isDefending = true;
      state.pendingPlayerDamage = 9;
      state.pendingStrikeBraced = true;
      state.timeRemaining = 123;
      state.attackDuration = 456;
      state.enemyAttackTimer = 7;
      state.turnCounter = 5;
      state.participants.activeUserIndex = 2;

      beginFightState(state);

      expect(state).toMatchObject({
        battleStarted: true,
        isPlayerTurn: true,
        turnCounter: 1,
        isDefending: false,
        pendingPlayerDamage: 0,
        pendingStrikeBraced: false,
        timeRemaining: 0,
        attackDuration: 0,
        enemyAttackTimer: 100,
      });
      expect(state.participants.activeUserIndex).toBe(2);
    });
  });

  describe("nextLivingBeast", () => {
    it("is the first other beast with health left", () => {
      const a = beast("a");
      const b = beast("b", 0);
      const c = beast("c");
      expect(nextLivingBeast([a, b, c], a)).toBe(c);
    });

    it("is undefined when nobody else is standing", () => {
      const a = beast("a");
      expect(nextLivingBeast([a, beast("b", 0)], a)).toBeUndefined();
      expect(nextLivingBeast([a], a)).toBeUndefined();
    });
  });

  describe("activeUserOf", () => {
    it("is the hero at the active index", () => {
      const participants = { enemies: [], users: [hero("a"), hero("b")], activeEnemyIndex: 0, activeUserIndex: 1 };
      expect(activeUserOf(participants)?.id).toBe("b");
    });

    it("is null with no heroes or an index past the end", () => {
      expect(activeUserOf({ enemies: [], users: [], activeEnemyIndex: 0, activeUserIndex: 0 })).toBeNull();
      expect(activeUserOf({ enemies: [], users: [hero("a")], activeEnemyIndex: 0, activeUserIndex: 1 })).toBeNull();
    });
  });

  describe("toBattleUser", () => {
    it("reads { now, max } hit points and the special stats", () => {
      const user = toBattleUser("u1", {
        name: { nick: "Ada", first: "Adaline" },
        avatar: "a.png",
        stats: {
          level: 4,
          hp: { now: 30, max: 40 },
          mp: { now: 5, max: 9 },
          special: { strength: 7, defense: 8, agility: 9 },
        },
      });
      expect(user).toEqual({
        id: "u1",
        name: "Ada",
        avatar: "a.png",
        stats: { level: 4, hp: 30, maxHp: 40, mp: 5, maxMp: 9, strength: 7, defense: 8, speed: 9 },
      });
    });

    it("reads primitive hit points and falls back to the top-level stats", () => {
      const user = toBattleUser("u2", {
        name: { first: "Bo" },
        stats: { hp: 12, maxHp: 20, mp: 3, strength: 5, defense: 6, speed: 4 },
      });
      expect(user).toEqual({
        id: "u2",
        name: "Bo",
        avatar: undefined,
        stats: { level: 1, hp: 12, maxHp: 20, mp: 3, maxMp: 100, strength: 5, defense: 6, speed: 4 },
      });
    });

    it("fills a bare hero with the defaults", () => {
      expect(toBattleUser("u3", {})).toEqual({
        id: "u3",
        name: "Player",
        avatar: undefined,
        stats: { level: 1, hp: 100, maxHp: 100, mp: 100, maxMp: 100, strength: 10, defense: 10, speed: 10 },
      });
    });
  });
});
