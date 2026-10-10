import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { reactive } from "vue";
import type { DialogLine, EngineMessage } from "@/app/Console/BattleField/battle/battleView";

// Define interfaces for the battle system
export interface Enemy {
  id: string;
  name: string;
  type: string;
  isBoss: boolean;
  health: number;
  maxHealth: number;
  avatar?: number;
  imageUrl?: string;
  emoji?: string;
  attack: number;
  defense: number;
  speed: number;
  bg1?: number;
  bg2?: number;
  aspectRatio?: number;
  /** Minutes the hero gets per remaining chore before this beast strikes. Defaults to 3. */
  attackCooldown?: number;
  tasks?: CombatTask[];
}

export interface CombatTask {
  id: string;
  name: string;
  isCompleted: boolean;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  stats: {
    level: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    strength: number;
    defense: number;
    speed: number;
  }
}

export interface BattleState {
  battleStarted: boolean;
  isPlayerTurn: boolean;
  turnCounter: number;
  isDefending: boolean;
  currentEnemy: Enemy | null;
  participants: {
    enemies: Enemy[];
    users: User[];
    activeEnemyIndex: number;
    activeUserIndex: number;
  };
  enemyAttackTimer: number; // 100 (full clock) down to 0 (the beast strikes)
  timeRemaining: number; // ms left on the clock
  attackDuration: number; // ms the current clock started with
  combatTasks: CombatTask[];
  pendingPlayerDamage: number; // Damage waiting for the hero to tap through "{Beast} attacks!"
  pendingStrikeBraced: boolean; // The waiting strike was met with a brace
}

export interface BattleResult {
  success: boolean;
  message: string;
}

/**
 * Everything the page can listen for. Lines for the message box are EngineMessages: plain strings
 * wait for a tap, `{ text, auto: true }` lines move on by themselves once typed.
 */
export interface BattleCallbacks {
  onDialogMessage?: (messages: EngineMessage[]) => void;
  onEnemyHealthChange?: () => void;
  onDefendStateChange?: (isDefending: boolean) => void;
  onPlayerTurnChange?: (isPlayerTurn: boolean) => void;
  onEnemyDefeated?: (enemy: Enemy) => void;
  onEnemyChange?: (enemy: Enemy) => void;
  onCombatTasksChange?: (tasks: CombatTask[]) => void;
  onPlayerDefeated?: () => void;
  onAttack?: (attacker: 'player' | 'enemy') => void;
  /** `isFinalBlow` is set on the chore that finishes the beast on screen ("SMAAAASH!!"). */
  onDamage?: (target: 'player' | 'enemy', amount: number, isFinalBlow?: boolean) => void;
}

export interface BattleServiceOptions {
  /**
   * A free fight (random encounter, Test Fight): there is nothing to lose by leaving, so
   * Run Away always works.
   */
  freeFight?: boolean;
}

/** Minutes of clock a hero earns per remaining chore when the beast does not say otherwise. */
const DEFAULT_MINUTES_PER_CHORE = 3;
/** How often the clock re-reads Date.now(); the deadline, not the interval, decides when the beast strikes. */
const CLOCK_TICK_MS = 100;
/** The beat between "braces!" / "Couldn't escape!" and the strike. */
const STRIKE_DELAY_MS = 1000;
/** A strike costs about this share of the hero's max HP. */
const STRIKE_SHARE_OF_MAX_HP = 0.12;

/**
 * What one beast strike costs the hero: about 12% of their max HP, scaled by the beast's attack
 * (10 is the baseline, so a boss with 15 bites 1.5x as hard) and a +-10% roll. It never scales
 * with time or chores left. A brace halves it (rounded down, never below 1).
 */
export function strikeDamage(maxHp: number, attack: number, braced: boolean, roll: number = Math.random()): number {
  const raw = Math.round(maxHp * STRIKE_SHARE_OF_MAX_HP * ((attack || 10) / 10) * (0.9 + roll * 0.2));
  const full = Number.isFinite(raw) ? Math.max(1, raw) : 1;
  return braced ? Math.max(1, Math.floor(full / 2)) : full;
}

/** A line that types out and moves on by itself, for results the hero does not need to tap through. */
const autoLine = (text: string): DialogLine => ({ text, auto: true });

/**
 * BattleService - Core service for managing battle mechanics
 *
 * A beast is a chore and its checklist items are the hero's attacks. Each chore the hero finishes
 * hurts the beast and refills the attack clock; when the clock runs dry the beast strikes. The
 * service keeps the rules; the page (BattleField) keeps the staging. It talks to the page through
 * the callbacks and the message box through EngineMessages.
 *
 * Updated to use Pinia stores instead of Vuex.
 */
export class BattleService {
  private userStore: ReturnType<typeof useUserStore>;
  private state: BattleState;
  private battleCallbacks: BattleCallbacks = {};
  private alwaysEscapes: boolean;
  private attackTimerInterval: ReturnType<typeof setInterval> | null = null;
  /** The beat between a Defend / failed Run and the strike it provokes. */
  private strikeTimeout: ReturnType<typeof setTimeout> | null = null;
  /** Date.now() at which the clock runs dry. */
  private attackDeadline = 0;

  constructor(options: BattleServiceOptions = {}) {
    this.userStore = useUserStore();
    this.alwaysEscapes = Boolean(options.freeFight);
    this.state = reactive({
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
    });
  }

  /**
   * Register callbacks for battle events
   * @param callbacks Object containing callback functions for different battle events
   */
  public registerCallbacks(callbacks: BattleCallbacks): void {
    this.battleCallbacks = { ...this.battleCallbacks, ...callbacks };
  }

  /** Free fights let the hero run away every time. */
  public setFreeFight(freeFight: boolean): void {
    this.alwaysEscapes = freeFight;
  }

  /**
   * Stop everything the service has scheduled: the attack clock and the beat before a strike.
   * The page calls this when the hero leaves the fight, so a beast never strikes an empty room.
   */
  public dispose(): void {
    this.stopAttackTimer();
    this.clearStrikeTimeout();
  }

  /**
   * Handles the defeat of an enemy.
   * @param enemy The enemy that was defeated.
   */
  private defeatEnemy(enemy: Enemy): void {
    this.stopAttackTimer();
    debug.log(`Challenge '${enemy.name}' completed!`);

    // In a multi-beast fight the next living beast steps forward with its own chores.
    const next = this.state.participants.enemies.find((candidate) => candidate !== enemy && candidate.health > 0);
    if (next) {
      this.state.participants.activeEnemyIndex = this.state.participants.enemies.indexOf(next);
      this.state.currentEnemy = next;
      this.loadCombatTasks(next);
      this.notifyEnemyHealthChange();
      this.queueDialogMessages([`${enemy.name} was defeated!`, `${next.name} steps forward!`]);
      this.battleCallbacks.onEnemyChange?.(next);
      // A strike that is already waiting restarts the clock itself when it lands
      if (this.state.pendingPlayerDamage === 0) {
        this.startAttackTimer();
      }
      return;
    }

    // The last beast is down: nothing may strike the hero after the win
    this.clearStrikeTimeout();
    this.state.pendingPlayerDamage = 0;
    this.state.pendingStrikeBraced = false;
    if (this.state.isDefending) {
      this.setDefendingState(false);
    }
    this.battleCallbacks.onEnemyDefeated?.(enemy);
  }

  /** The beast's checklist becomes the player's attacks. */
  private loadCombatTasks(enemy: Enemy): void {
    if (enemy.tasks && enemy.tasks.length > 0) {
      this.state.combatTasks = enemy.tasks.map((task) => ({ ...task }));
    } else {
      debug.warn('BattleService: No tasks found on enemy, the beast itself is the chore', enemy);
      this.state.combatTasks = [{ id: `${enemy.id}-task`, name: `Defeat ${enemy.name}`, isCompleted: false }];
    }

    this.battleCallbacks.onCombatTasksChange?.(this.state.combatTasks);
  }

  /**
   * Initialize a battle with one or more enemies and the hero(es) who fight them
   * @param enemies Array of enemies to battle
   * @param userIds Array of user IDs to participate in battle
   */
  public initMultiBattle(enemies: Enemy[], userIds?: string[]): void {
    if (enemies.length === 0) {
      debug.error('Cannot initialize battle with no enemies');
      return;
    }

    // A fresh fight inherits nothing from the last one
    this.dispose();
    this.state.battleStarted = true;
    this.state.isPlayerTurn = true; // Task-ATB: the player is always ready to act
    this.state.turnCounter = 1;
    this.state.isDefending = false;
    this.state.pendingPlayerDamage = 0;
    this.state.pendingStrikeBraced = false;
    this.state.timeRemaining = 0;
    this.state.attackDuration = 0;
    this.state.enemyAttackTimer = 100;

    // Store enemies in participants array
    this.state.participants.enemies = enemies;
    this.state.participants.activeEnemyIndex = 0;

    // Set current enemy to first enemy and arm its chores as attacks
    this.state.currentEnemy = enemies[0];
    this.loadCombatTasks(enemies[0]);

    // Add the heroes from the store to participants
    this.state.participants.users = [];
    this.state.participants.activeUserIndex = 0;
    (userIds ?? []).forEach((id) => {
      const user = this.getUserById(id);
      if (user) {
        this.state.participants.users.push(user);
      }
    });
  }

  /**
   * Handle a battle action from the player
   * @param action The action type ('defend' or 'run'; attacking is finishing a chore)
   * @returns Result of the action
   */
  public handleBattleAction(action: string): BattleResult {
    if (!this.state.battleStarted) {
      return { success: false, message: "Battle not started" };
    }

    // Not the hero's move (a strike is on its way): the page hides the menu, so stay quiet
    if (!this.state.isPlayerTurn) {
      return { success: false, message: "Not player's turn" };
    }

    switch (action) {
      case 'defend':
        return this.handleDefend();
      case 'run':
        return this.handleRun();
      default:
        return { success: false, message: "Unhandled action" };
    }
  }

  /**
   * Defend: take a glancing hit now instead of waiting out the clock. The brace lasts until the
   * hit lands, and the hero gets a fresh full clock afterwards.
   */
  private handleDefend(): BattleResult {
    if (this.state.pendingPlayerDamage > 0) {
      return { success: false, message: "A strike is already on its way" };
    }

    this.setDefendingState(true);
    this.stopAttackTimer();
    this.queueDialogMessages([`${this.heroName()} braces!`]);

    // The beast strikes a beat later, at half damage
    this.endPlayerTurn();
    return { success: true, message: "Defense activated" };
  }

  /**
   * Run away. Monsters let you go 75% of the time, minibosses 50%, bosses 25%; in a free fight
   * the hero always gets away. A failed run costs exactly one free strike.
   */
  private handleRun(): BattleResult {
    if (this.state.pendingPlayerDamage > 0) {
      return { success: false, message: "A strike is already on its way" };
    }

    const enemy = this.state.currentEnemy;
    let escapeChance = 0.75;
    if (enemy?.isBoss) {
      escapeChance = 0.25;
    } else if (enemy?.type === 'miniboss') {
      escapeChance = 0.5;
    }

    if (this.alwaysEscapes || Math.random() < escapeChance) {
      this.stopAttackTimer();
      this.queueDialogMessages([autoLine("Running away..."), "Got away safely!"]);
      return { success: true, message: "Escaped successfully" };
    }

    this.queueDialogMessages(["Couldn't escape!", `${enemy?.name ?? 'The enemy'} blocks your path!`]);
    this.stopAttackTimer();
    this.endPlayerTurn();
    return { success: false, message: "Failed to escape" };
  }

  /**
   * Hand the move back to the hero. No lines: the menu coming back is the announcement.
   */
  public startPlayerTurn(): void {
    this.setPlayerTurnState(true);
  }

  /**
   * End the hero's move and let the beast answer a beat later.
   */
  public endPlayerTurn(): void {
    this.setPlayerTurnState(false);

    // At most one strike is ever on its way
    this.clearStrikeTimeout();
    this.strikeTimeout = setTimeout(() => {
      this.strikeTimeout = null;
      if (this.state.currentEnemy) {
        this.performEnemyTurn();
      } else {
        // If no enemy, just go back to player turn
        this.state.turnCounter++;
        this.startPlayerTurn();
      }
    }, STRIKE_DELAY_MS);
  }

  /**
   * What one chore takes off the beast: an equal slice of its health, except that the beast always
   * survives until its last chore (so rounding can never end a fight with chores still open), and
   * the last chore takes whatever is left.
   */
  private choreDamage(enemy: Enemy, isLastChore: boolean): number {
    if (isLastChore) {
      return Math.max(0, enemy.health);
    }
    const slice = Math.ceil(enemy.maxHealth / this.state.combatTasks.length);
    return Math.max(0, Math.min(slice, enemy.health - 1));
  }

  /**
   * Completes a task and damages the enemy
   * @param taskId The ID of the task completed
   */
  public finishCombatTask(taskId: string): void {
    const enemy = this.state.currentEnemy;
    const task = this.state.combatTasks.find(t => t.id === taskId);
    if (!enemy || !task || task.isCompleted) return;

    task.isCompleted = true;

    // Completing all tasks defeats the enemy
    const isFinalBlow = this.state.combatTasks.every(t => t.isCompleted);
    const damage = this.choreDamage(enemy, isFinalBlow);
    enemy.health = Math.max(0, enemy.health - damage);

    this.battleCallbacks.onCombatTasksChange?.(this.state.combatTasks);
    this.notifyEnemyHealthChange();
    this.battleCallbacks.onDamage?.('enemy', damage, isFinalBlow);
    this.queueDialogMessages([autoLine(`${this.heroName()} used ${task.name}! ${enemy.name} took ${damage} damage!`)]);

    if (isFinalBlow) {
      this.defeatEnemy(enemy);
    } else if (this.state.pendingPlayerDamage === 0) {
      // A chore earns a fresh clock (a strike that is already waiting restarts it when it lands)
      this.stopAttackTimer();
      this.startAttackTimer();
    }
  }

  /**
   * Put back the chores the hero already finished earlier today: they are marked done and the
   * beast is hurt by one slice each. Queues nothing; the page decides what to say about it.
   * The beast never dies here, and one chore always stays open so the fight can still be won.
   * @param taskIds Ids of the finished chores
   * @returns How many chores were restored (0 when none matched)
   */
  public restoreCompletedTasks(taskIds: string[]): number {
    const enemy = this.state.currentEnemy;
    if (!enemy || taskIds.length === 0) return 0;

    const wanted = new Set(taskIds);
    let restored = 0;
    for (const task of this.state.combatTasks) {
      if (!wanted.has(task.id) || task.isCompleted) continue;
      if (this.state.combatTasks.filter(t => !t.isCompleted).length <= 1) break;

      task.isCompleted = true;
      enemy.health -= this.choreDamage(enemy, false);
      restored++;
    }

    if (restored > 0) {
      this.battleCallbacks.onCombatTasksChange?.(this.state.combatTasks);
      this.notifyEnemyHealthChange();
    }
    return restored;
  }

  /**
   * Get the current combat tasks
   */
  public getCombatTasks(): CombatTask[] {
    return this.state.combatTasks;
  }

  /**
   * Start the enemy's attack clock: N minutes per remaining chore (N is the beast's
   * attackCooldown, 3 by default), at least one chore's worth. The clock counts down to a
   * deadline on Date.now(), so a throttled timer in a background tab cannot slow it down.
   */
  public startAttackTimer(): void {
    this.stopAttackTimer();

    const remainingChores = this.state.combatTasks.filter(t => !t.isCompleted).length;
    const duration = Math.max(1, remainingChores) * this.minutesPerChore() * 60_000;

    this.attackDeadline = Date.now() + duration;
    this.state.attackDuration = duration;
    // The bar is full the moment the clock starts, not one tick later
    this.state.timeRemaining = duration;
    this.state.enemyAttackTimer = 100;

    this.attackTimerInterval = setInterval(() => this.tick(), CLOCK_TICK_MS);
  }

  /**
   * Re-read the clock. The interval calls this every 100 ms; when the deadline has passed the
   * beast strikes. Does nothing while the clock is stopped.
   */
  public tick(): void {
    if (this.attackTimerInterval === null) return;

    const remaining = Math.max(0, this.attackDeadline - Date.now());
    this.state.timeRemaining = remaining;
    this.state.enemyAttackTimer = this.state.attackDuration > 0 ? (remaining / this.state.attackDuration) * 100 : 0;

    if (remaining <= 0) {
      this.stopAttackTimer();
      this.performEnemyTurn();
    }
  }

  /**
   * Stop the enemy's attack clock. A strike that is already on its way (see endPlayerTurn) is not
   * cancelled; dispose() does that.
   */
  public stopAttackTimer(): void {
    if (this.attackTimerInterval !== null) {
      clearInterval(this.attackTimerInterval);
      this.attackTimerInterval = null;
    }
  }

  /**
   * Get the current value of the enemy attack timer (0 to 100)
   */
  public getEnemyAttackTimer(): number {
    return this.state.enemyAttackTimer;
  }

  /**
   * Get the current time remaining in ms
   */
  public getTimeRemaining(): number {
    return this.state.timeRemaining;
  }

  /**
   * Get the length in ms of the clock that is (or was last) running
   */
  public getAttackDuration(): number {
    return this.state.attackDuration;
  }

  /** Minutes per remaining chore: the beast's own attackCooldown, or 3. */
  private minutesPerChore(): number {
    const minutes = this.state.currentEnemy?.attackCooldown;
    return typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_MINUTES_PER_CHORE;
  }

  /**
   * Perform enemy's turn: wind up a strike. The damage waits in pendingPlayerDamage until the
   * hero taps through "{Beast} attacks!" (the page then calls applyPendingDamage()).
   */
  private performEnemyTurn(): void {
    this.stopAttackTimer();

    // A strike is already waiting for the hero: one at a time
    if (this.state.pendingPlayerDamage > 0) return;

    const enemy = this.state.currentEnemy;
    if (!enemy || enemy.health <= 0) return;

    const hero = this.getActiveUser();
    if (!hero) {
      debug.error('No active user for enemy to target');
      // Just go back to player turn
      this.state.turnCounter++;
      this.startPlayerTurn();
      return;
    }

    // The brace stays up until the hit lands (applyPendingDamage lowers it)
    const braced = this.state.isDefending;
    this.state.pendingStrikeBraced = braced;
    this.state.pendingPlayerDamage = strikeDamage(hero.stats.maxHp, enemy.attack, braced);

    // Trigger enemy pre-attack sound (ambush/charge)
    this.battleCallbacks.onAttack?.('enemy');
    this.queueDialogMessages([`${enemy.name} attacks!`]);
  }

  /**
   * Apply pending damage to the player (called when the attack dialog is dismissed)
   * This creates the Earthbound-style "rolling HP" effect. The hero always regains the move when
   * the hit lands, and this is the only place the clock restarts while a strike is waiting.
   */
  public applyPendingDamage(): void {
    const damage = this.state.pendingPlayerDamage;
    if (damage <= 0) {
      // Nothing was waiting: give the move back and start the clock
      this.setPlayerTurnState(true);
      this.startAttackTimer();
      return;
    }

    const braced = this.state.pendingStrikeBraced;
    this.state.pendingPlayerDamage = 0;
    this.state.pendingStrikeBraced = false;

    const hero = this.getActiveUser();
    if (!hero) {
      debug.error('No active user to apply damage to');
      this.setDefendingState(false);
      this.setPlayerTurnState(true);
      this.state.turnCounter++;
      this.startAttackTimer();
      return;
    }

    // Apply damage to player HP via the store
    const isAlive = this.userStore.updateUserHP({
      userId: hero.id,
      amount: -damage
    });

    // Trigger player damage sound and animations now that damage is applied
    this.battleCallbacks.onDamage?.('player', damage);

    // Update the local participant's HP as well
    hero.stats.hp = Math.max(0, hero.stats.hp - damage);

    // The brace is spent
    this.setDefendingState(false);

    this.queueDialogMessages([
      braced ? `${hero.name} braced: only ${damage} damage!` : `${hero.name} takes ${damage} damage!`
    ]);

    if (!isAlive) {
      // Player defeated
      this.queueDialogMessages([`${hero.name} has fallen!`, 'You blacked out...']);
      this.battleCallbacks.onPlayerDefeated?.();
      return;
    }

    // Back to the hero, with a full clock
    this.setPlayerTurnState(true);
    this.state.turnCounter++;
    this.startAttackTimer();
  }

  /**
   * Check if there is pending damage awaiting application
   */
  public hasPendingDamage(): boolean {
    return this.state.pendingPlayerDamage > 0;
  }

  /**
   * Get the pending damage amount
   */
  public getPendingDamage(): number {
    return this.state.pendingPlayerDamage;
  }

  /**
   * Tell the page the beast's health changed
   */
  private notifyEnemyHealthChange(): void {
    this.battleCallbacks.onEnemyHealthChange?.();
  }

  /**
   * Queue dialog messages to be shown to the player
   * @param messages Lines to queue: strings wait for a tap, `{ text, auto: true }` lines advance on their own
   */
  private queueDialogMessages(messages: EngineMessage[]): void {
    this.battleCallbacks.onDialogMessage?.(messages);
  }

  /**
   * Set the defending state
   * @param isDefending Whether the player is defending
   */
  private setDefendingState(isDefending: boolean): void {
    this.state.isDefending = isDefending;
    this.battleCallbacks.onDefendStateChange?.(isDefending);
  }

  /**
   * Set the player turn state
   * @param isPlayerTurn Whether it's the player's turn
   */
  private setPlayerTurnState(isPlayerTurn: boolean): void {
    this.state.isPlayerTurn = isPlayerTurn;
    this.battleCallbacks.onPlayerTurnChange?.(isPlayerTurn);
  }

  /** Cancel the beat before a strike, if one is on its way. */
  private clearStrikeTimeout(): void {
    if (this.strikeTimeout !== null) {
      clearTimeout(this.strikeTimeout);
      this.strikeTimeout = null;
    }
  }

  /**
   * The name every hero line uses: the hero in this fight, or "You" when there is none
   */
  private heroName(): string {
    return this.getActiveUser()?.name ?? 'You';
  }

  /**
   * Get active user from participants
   */
  private getActiveUser(): User | null {
    const { users, activeUserIndex } = this.state.participants;
    if (users.length === 0 || activeUserIndex >= users.length) {
      return null;
    }
    return users[activeUserIndex];
  }

  /**
   * Get user by ID from Pinia store
   */
  private getUserById(userId: string): User | null {
    const storeUser = this.userStore.getUserById(userId);
    if (!storeUser) return null;

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

  /**
   * Get current enemy
   */
  public getCurrentEnemy(): Enemy | null {
    return this.state.currentEnemy;
  }

  /**
   * Get all enemies in battle
   */
  public getAllEnemies(): Enemy[] {
    return [...this.state.participants.enemies];
  }

  /**
   * Get all users in battle
   */
  public getAllUsers(): User[] {
    return [...this.state.participants.users];
  }

  /**
   * Check if player is defending
   */
  public isDefending(): boolean {
    return this.state.isDefending;
  }

  /**
   * Check if it's player's turn
   */
  public isPlayerTurn(): boolean {
    return this.state.isPlayerTurn;
  }

  /**
   * Get battle started status
   */
  public isBattleStarted(): boolean {
    return this.state.battleStarted;
  }

  /**
   * Get turn counter
   */
  public getTurnCounter(): number {
    return this.state.turnCounter;
  }
}
