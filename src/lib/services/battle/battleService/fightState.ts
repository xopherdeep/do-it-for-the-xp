import type { useUserStore } from "@/lib/store/stores/user";
import type { BattleState, Enemy, User } from "./types";

/** The state of a service before any fight: nothing started, a full clock, nobody on the field. */
export function initialBattleState(): BattleState {
  return {
    battleStarted: false,
    isPlayerTurn: false,
    turnCounter: 0,
    isDefending: false,
    currentEnemy: null,
    participants: {
      enemies: [],
      users: [],
      activeEnemyIndex: 0,
      activeUserIndex: 0
    },
    enemyAttackTimer: 100,
    timeRemaining: 0,
    attackDuration: 0,
    combatTasks: [],
    pendingPlayerDamage: 0,
    pendingStrikeBraced: false
  };
}

/** A fresh fight inherits nothing from the last one: the turn flags, the strike in flight and the clock. */
export function beginFightState(state: BattleState): void {
  state.battleStarted = true;
  state.isPlayerTurn = true; // Task-ATB: the player is always ready to act
  state.turnCounter = 1;
  state.isDefending = false;
  state.pendingPlayerDamage = 0;
  state.pendingStrikeBraced = false;
  state.timeRemaining = 0;
  state.attackDuration = 0;
  state.enemyAttackTimer = 100;
}

/** The next living beast that is not `enemy`, who steps forward when `enemy` falls. */
export function nextLivingBeast(enemies: Enemy[], enemy: Enemy): Enemy | undefined {
  return enemies.find((candidate) => candidate !== enemy && candidate.health > 0);
}

/** The hero whose turn it is, or null when nobody is on the field. */
export function activeUserOf(participants: BattleState['participants']): User | null {
  const { users, activeUserIndex } = participants;
  const hasNoActiveUser = users.length === 0 || activeUserIndex >= users.length;
  if (hasNoActiveUser) {
    return null;
  }
  return users[activeUserIndex];
}

/** A hero from the Pinia store as the battle sees them. */
export function toBattleUser(
  userId: string,
  storeUser: NonNullable<ReturnType<ReturnType<typeof useUserStore>['getUserById']>>
): User {
  const stats = storeUser.stats || {};
  const special = stats.special || {};

  // Extract HP/MP from either primitive or object structure { now, max }
  const hp = typeof stats.hp === 'object' ? stats.hp?.now : stats.hp;
  const maxHp = typeof stats.hp === 'object' ? stats.hp?.max : (stats.maxHp || 100);
  const mp = typeof stats.mp === 'object' ? stats.mp?.now : stats.mp;
  const maxMp = typeof stats.mp === 'object' ? stats.mp?.max : (stats.maxMp || 100);

  // The first real number wins; heroes saved before `special` existed keep their top-level stats
  const statOr = (fallback: number, ...candidates: unknown[]): number => {
    const found = candidates.find((value) => typeof value === 'number' && Number.isFinite(value));
    return typeof found === 'number' ? found : fallback;
  };

  // Convert store user to battle user interface
  return {
    id: userId,
    name: storeUser.name?.nick || storeUser.name?.first || 'Player',
    avatar: storeUser.avatar,
    stats: {
      level: stats.level || 1,
      hp: typeof hp === 'number' ? hp : 100,
      maxHp: typeof maxHp === 'number' ? maxHp : 100,
      mp: typeof mp === 'number' ? mp : 100,
      maxMp: typeof maxMp === 'number' ? maxMp : 100,
      strength: statOr(10, special.strength, stats.strength),
      defense: statOr(10, special.defense, stats.defense),
      speed: statOr(10, special.speed, special.agility, stats.speed),
    }
  };
}
