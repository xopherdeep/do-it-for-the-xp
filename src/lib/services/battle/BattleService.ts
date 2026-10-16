import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { reactive } from "vue";
import {
  CLOCK_TICK_MS,
  STRIKE_DELAY_MS,
  clockDuration,
  clockEndsAt,
  clockReading,
  minutesPerChore,
} from "./battleService/attackClock";
import { armCombatTasks, choreDamage, openChores } from "./battleService/combatTasks";
import {
  attacksLines,
  autoLine,
  bracesLines,
  bribeLines,
  choreUsedLines,
  damageTakenLines,
  fallenLines,
  frozenStrikeLine,
  partingDodgeLine,
  partingStrikeLines,
  runAwayLines,
  shadowStrikeLine,
  stepsForwardLines,
  stunnedStrikeLine,
} from "./battleService/dialogLines";
import { activeUserOf, beginFightState, initialBattleState, nextLivingBeast, toBattleUser } from "./battleService/fightState";
import { partingStrike, resolvePassive, strikeDamage } from "./battleService/strikeMath";
import { calculateBribeQuotes, type BribeQuotes, type BribeTier } from "./battleService/bribeMath";
import { MAX_GRUDGE_FACTOR, marksOfFactor } from "@/lib/services/battle/questGrudge";
import type {
  BattleCallbacks,
  BattlePassive,
  BattleResult,
  BattleServiceOptions,
  BattleState,
  CombatTask,
  EscapeReport,
  Enemy,
  PartingDodge,
  User,
} from "./battleService/types";
import type { EngineMessage } from "@/app/Console/BattleField/battle/battleView";

// The engine's types and the strike formula live beside this file; they are re-exported so every
// importer keeps using "@/lib/services/battle/BattleService".
export type {
  BattleCallbacks,
  BattlePassive,
  BattleResult,
  BattleServiceOptions,
  BattleState,
  CombatTask,
  Enemy,
  EscapeReport,
  PartingDodge,
  PartingSoftener,
  User,
} from "./battleService/types";
export { strikeDamage } from "./battleService/strikeMath";

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
  /** The fight carries a quest; passed on in the escape report, for the grudge. */
  private readonly carriesQuest: boolean;
  private attackTimerInterval: ReturnType<typeof setInterval> | null = null;
  /** The beat between a Defend and the strike it provokes. */
  private strikeTimeout: ReturnType<typeof setTimeout> | null = null;
  /** Date.now() at which the clock runs dry. */
  private attackDeadline = 0;
  /** Date.now() until which the clock is frozen (Chronos' Clock); 0 when it is not. */
  private frozenUntil = 0;
  /** Strikes the beast will miss (Thor's Hammer); each one skipped restarts the clock full. */
  private strikeSkips = 0;
  /** Multiplies the minutes every chore earns on the clock (Fire Wand); 1 by default. */
  private cooldownScale = 1;
  /** The hero's class passive, filled in with the default rules. */
  private readonly passive: BattlePassive;
  /** The beast's grudge against the hero: every strike of the fight is this many times as hard (1 to 1.75). */
  private grudge = 1;
  /** The beast's first strike of this fight still has to miss (Ninja). */
  private firstStrikeOwed = false;
  /** The next getaway slips past the parting strike (X's Invisibility). */
  private vanishOwed = false;

  constructor(options: BattleServiceOptions = {}) {
    this.userStore = useUserStore();
    this.alwaysEscapes = Boolean(options.freeFight);
    this.carriesQuest = Boolean(options.carriesQuest);
    this.passive = resolvePassive(options.passive);
    this.setGrudge(options.grudge);
    this.state = reactive(initialBattleState());
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
   * The beast's grudge against the hero (docs/Quest-Rooms-Spec.md 5.7): every strike of the fight, the clock's and the
   * parting strike, is this many times as hard. Kept between 1 (none) and 1.75 (three marks); anything else is no grudge.
   */
  public setGrudge(factor?: number): void {
    const isReadable = typeof factor === 'number' && Number.isFinite(factor);
    this.grudge = isReadable ? Math.min(MAX_GRUDGE_FACTOR, Math.max(1, factor)) : 1;
  }

  /** The factor the fight's strikes are multiplied by: 1 for none. */
  public getGrudge(): number {
    return this.grudge;
  }

  /**
   * Stop everything the service has scheduled: the attack clock and the beat before a strike.
   * The page calls this when the hero leaves the fight, so a beast never strikes an empty room.
   */
  public dispose(): void {
    this.stopAttackTimer();
    this.clearStrikeTimeout();
    // A vanish the hero did not run on is gone with the fight
    this.vanishOwed = false;
  }

  /**
   * Handles the defeat of an enemy.
   * @param enemy The enemy that was defeated.
   */
  private defeatEnemy(enemy: Enemy): void {
    this.stopAttackTimer();
    debug.log(`Challenge '${enemy.name}' completed!`);

    // In a multi-beast fight the next living beast steps forward with its own chores.
    const next = nextLivingBeast(this.state.participants.enemies, enemy);
    if (next) {
      this.state.participants.activeEnemyIndex = this.state.participants.enemies.indexOf(next);
      this.state.currentEnemy = next;
      this.loadCombatTasks(next);
      this.notifyEnemyHealthChange();
      this.queueDialogMessages(stepsForwardLines(enemy, next));
      this.battleCallbacks.onEnemyChange?.(next);
      // A strike that is already waiting restarts the clock itself when it lands
      const hasNoStrikeWaiting = this.state.pendingPlayerDamage === 0;
      if (hasNoStrikeWaiting) {
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
    this.state.combatTasks = armCombatTasks(enemy);

    this.battleCallbacks.onCombatTasksChange?.(this.state.combatTasks);
  }

  /**
   * Initialize a battle with one or more enemies and the hero(es) who fight them
   * @param enemies Array of enemies to battle
   * @param userIds Array of user IDs to participate in battle
   */
  public initMultiBattle(enemies: Enemy[], userIds?: string[]): void {
    const hasNoEnemies = enemies.length === 0;
    if (hasNoEnemies) {
      debug.error('Cannot initialize battle with no enemies');
      return;
    }

    // A fresh fight inherits nothing from the last one
    this.dispose();
    beginFightState(this.state);
    this.frozenUntil = 0;
    this.strikeSkips = 0;
    this.cooldownScale = 1;
    this.vanishOwed = false;
    this.firstStrikeOwed = Boolean(this.passive.skipFirstStrike);

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
    const isBattleStarted = this.state.battleStarted;
    if (!isBattleStarted) {
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
      case 'bribe-full':
        return this.handleBribe('full');
      case 'bribe-low':
        return this.handleBribe('low');
      default:
        return { success: false, message: "Unhandled action" };
    }
  }

  /**
   * What the current beast demands for full and discounted bribe escapes.
   */
  public getBribeQuotes(heroGp?: { wallet?: number; savings?: number } | null): BribeQuotes | null {
    const hero = this.getActiveUser();
    const enemy = this.state.currentEnemy;
    const isMissingCombatant = !hero || !enemy;
    if (isMissingCombatant) return null;
    const user = this.userStore.getUserById(hero.id) || this.userStore.users[hero.id];
    const storedGp = heroGp ?? user?.stats?.gp ?? user?.gp;
    const marks = enemy.grudgeMarks ?? marksOfFactor(this.grudge);
    return calculateBribeQuotes(enemy, storedGp, marks);
  }

  /**
   * Escape via GP bribery:
   * - full: pays formula cost, avoids parting strike, avoids grudge mark.
   * - low: pays discounted cost, avoids parting strike, incurs grudge mark.
   */
  private handleBribe(tier: BribeTier): BattleResult {
    if (this.hasPendingDamage()) {
      return { success: false, message: "A strike is already on its way" };
    }

    const hero = this.getActiveUser();
    const enemy = this.state.currentEnemy;
    const isMissingCombatant = !hero || !enemy;
    if (isMissingCombatant) {
      return { success: false, message: "Cannot bribe without active combatants" };
    }

    const user = this.userStore.users[hero.id];
    const storedGp = user?.stats?.gp || user?.gp;
    const marks = enemy.grudgeMarks ?? marksOfFactor(this.grudge);
    const quotes = calculateBribeQuotes(enemy, storedGp, marks);
    const cost = tier === "full" ? quotes.fullCost : quotes.lowCost;
    const canAfford = tier === "full" ? quotes.canAffordFull : quotes.canAffordLow;

    if (!canAfford) {
      return { success: false, message: "Not enough GP for bribe" };
    }

    this.userStore.updateUserGP({ userId: hero.id, wallet: -cost, kind: "spend", note: "Bribe to escape" });
    this.stopAttackTimer();

    const escape: EscapeReport = {
      free: false,
      damage: 0,
      dodgedBy: null,
      softener: null,
      emptied: false,
      carriesQuest: this.carriesQuest,
      bribed: true,
      bribeTier: tier,
      bribeCost: cost,
    };

    this.queueDialogMessages(bribeLines(enemy, hero.name, tier, cost));
    return { success: true, message: "Escaped via bribe", escape };
  }

  /**
   * Defend: take a glancing hit now instead of waiting out the clock. The brace lasts until the
   * hit lands, and the hero gets a fresh full clock afterwards.
   */
  private handleDefend(): BattleResult {
    if (this.hasPendingDamage()) {
      return { success: false, message: "A strike is already on its way" };
    }

    this.setDefendingState(true);
    this.stopAttackTimer();
    this.queueDialogMessages(bracesLines(this.heroName()));

    // The beast strikes a beat later, at half damage
    this.endPlayerTurn();
    return { success: true, message: "Defense activated" };
  }

  /**
   * Run away. It always works (a run that could fail would trap a kid in a chore they cannot do right now),
   * and it costs one parting strike unless the fight is free (docs/Quest-Rooms-Spec.md 5.6). The strike is a full
   * beast strike, softened when the hero was bracing or the class slips away (Thief, Ninja) and missed when a
   * vanish, the Ninja's first strike or a hammer skip is owed, the clock is frozen, or trained agility rolls under its dodge.
   */
  private handleRun(): BattleResult {
    if (this.hasPendingDamage()) {
      return { success: false, message: "A strike is already on its way" };
    }

    this.stopAttackTimer();
    const escape = this.takePartingStrike();
    return { success: true, message: "Escaped successfully", escape };
  }

  /**
   * The cost of leaving: rolls the parting strike, spends what it used up, hurts the hero and queues the lines
   * (the run, the strike or why it missed, the getaway).
   */
  private takePartingStrike(): EscapeReport {
    const free = this.alwaysEscapes;
    const report: EscapeReport = {
      free,
      damage: 0,
      dodgedBy: null,
      softener: null,
      emptied: false,
      carriesQuest: this.carriesQuest,
    };
    const enemy = this.state.currentEnemy;
    const hero = this.getActiveUser();
    const owesNoStrike = free || !enemy || !hero;
    if (owesNoStrike) {
      this.queueDialogMessages(runAwayLines());
      return report;
    }

    const wasBracing = this.state.isDefending;
    // The store is the truth about HP: a potion or a Power may have changed it since the fight began
    const hp = this.heroHp(hero);
    const strike = partingStrike({
      maxHp: hero.stats.maxHp,
      hp,
      attack: enemy.attack,
      passive: this.passive,
      wasBracing,
      owed: {
        shadow: this.firstStrikeOwed,
        frozen: this.isClockFrozen(),
        hammer: this.strikeSkips > 0,
        vanish: this.vanishOwed,
      },
      dodgeRoll: Math.random(),
      strikeRoll: Math.random(),
      grudge: this.grudge,
    });
    // The brace was the hero's to spend, and the fight is over
    if (wasBracing) this.setDefendingState(false);

    const { dodgedBy } = strike;
    if (dodgedBy) {
      this.spendDodge(dodgedBy);
      report.dodgedBy = dodgedBy;
      this.queueDialogMessages(runAwayLines([partingDodgeLine(dodgedBy, enemy, hero.name)]));
      return report;
    }

    // A strike that empties HP takes it to 0 (never below). The page admits the hero to the Hospital on the way out
    // (docs/Quest-Rooms-Spec.md 5.8) when the report says `emptied`; that is not a lost fight, so no defeat callback fires.
    const damage = Math.min(strike.damage, hp);
    const hasDamage = damage > 0;
    if (hasDamage) this.hurtHero(hero, damage);

    report.damage = damage;
    report.softener = strike.softener;
    report.emptied = strike.emptied;
    // A hero who woke up in the Hospital did not "get away safely": the getaway line is left out
    this.queueDialogMessages(
      runAwayLines(partingStrikeLines(enemy, hero.name, damage, strike.softener, strike.emptied), !strike.emptied)
    );
    return report;
  }

  /** The hero's HP right now: the store's, else the fight's own copy. */
  private heroHp(hero: User): number {
    const stored = this.userStore.users[hero.id]?.stats?.hp;
    const now = typeof stored === 'object' ? stored?.now : stored;
    return typeof now === 'number' && Number.isFinite(now) ? now : hero.stats.hp;
  }

  /** Take `damage` off the hero in the store and the fight's copy, and tell the page (the hit sound and shake). */
  private hurtHero(hero: User, damage: number): void {
    this.userStore.updateUserHP({ userId: hero.id, amount: -damage });
    hero.stats.hp = Math.max(0, hero.stats.hp - damage);
    this.battleCallbacks.onDamage?.('player', damage);
  }

  /** A dodge that spends something (a vanish, the Ninja's owed miss, a hammer skip) spends it; ice and agility keep nothing. */
  private spendDodge(dodge: PartingDodge): void {
    const isVanish = dodge === 'vanish';
    if (isVanish) this.vanishOwed = false;
    const isShadow = dodge === 'shadow';
    if (isShadow) this.firstStrikeOwed = false;
    const isHammer = dodge === 'hammer';
    if (isHammer) this.strikeSkips--;
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
      const hasEnemy = Boolean(this.state.currentEnemy);
      if (hasEnemy) {
        this.performEnemyTurn();
      } else {
        // If no enemy, just go back to player turn
        this.state.turnCounter++;
        this.startPlayerTurn();
      }
    }, STRIKE_DELAY_MS);
  }

  /** What one chore takes off the beast (see choreDamage in battleService/combatTasks). */
  private choreDamage(enemy: Enemy, isLastChore: boolean): number {
    return choreDamage(enemy, isLastChore, this.state.combatTasks.length);
  }

  /**
   * Completes a task and damages the enemy
   * @param taskId The ID of the task completed
   */
  public finishCombatTask(taskId: string): void {
    const enemy = this.state.currentEnemy;
    const task = this.state.combatTasks.find(t => t.id === taskId);
    const isChoreUnavailable = !enemy || !task || task.isCompleted;
    if (isChoreUnavailable) return;

    task.isCompleted = true;

    // Completing all tasks defeats the enemy
    const isFinalBlow = this.state.combatTasks.every(t => t.isCompleted);
    const damage = this.choreDamage(enemy, isFinalBlow);
    enemy.health = Math.max(0, enemy.health - damage);

    this.battleCallbacks.onCombatTasksChange?.(this.state.combatTasks);
    this.notifyEnemyHealthChange();
    this.battleCallbacks.onDamage?.('enemy', damage, isFinalBlow);
    this.queueDialogMessages(choreUsedLines(this.heroName(), task.name, enemy, damage));

    const hasNoStrikeWaiting = this.state.pendingPlayerDamage === 0;
    if (isFinalBlow) {
      this.defeatEnemy(enemy);
    } else if (hasNoStrikeWaiting) {
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
    const isNothingToRestore = !enemy || taskIds.length === 0;
    if (isNothingToRestore) return 0;

    const wanted = new Set(taskIds);
    let restored = 0;
    for (const task of this.state.combatTasks) {
      const shouldSkipTask = !wanted.has(task.id) || task.isCompleted;
      if (shouldSkipTask) continue;
      const isLastOpenChore = openChores(this.state.combatTasks) <= 1;
      if (isLastOpenChore) break;

      task.isCompleted = true;
      enemy.health -= this.choreDamage(enemy, false);
      restored++;
    }

    const hasRestored = restored > 0;
    if (hasRestored) {
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

    const remainingChores = openChores(this.state.combatTasks);
    const duration = clockDuration(remainingChores, this.minutesPerChore());

    // A clock started under the ice only begins to run down when the ice melts
    this.attackDeadline = clockEndsAt(Date.now(), this.frozenUntil, duration);
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
    const isClockStopped = this.attackTimerInterval === null;
    if (isClockStopped) return;

    // Frozen: the bar stands where the ice caught it and the beast cannot strike
    const { remaining, percent } = clockReading(Date.now(), this.frozenUntil, this.attackDeadline, this.state.attackDuration);
    this.state.timeRemaining = remaining;
    this.state.enemyAttackTimer = percent;

    const isTimeUp = remaining <= 0;
    if (isTimeUp) {
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

  /** Minutes per remaining chore (see minutesPerChore in battleService/attackClock). */
  private minutesPerChore(): number {
    return minutesPerChore(this.state.currentEnemy, this.passive, this.cooldownScale);
  }

  /** The brace and strike factors, run odds and clock bonus the fight runs with (for the page and the tests). */
  public getPassive(): BattlePassive {
    return { ...this.passive };
  }

  // --- battle items (see docs/Items-And-Classes-Contract.md, section A) ---------------------------

  /** A clock can only be moved while it runs, and only by a positive amount of time. */
  private isClockUnmovable(ms: number): boolean {
    return this.attackTimerInterval === null || !(ms > 0);
  }

  /**
   * Add `ms` to the running clock (Ice Wand). The deadline and the clock's full length both grow, so
   * the bar fills back up instead of jumping past 100%. Returns false, and changes nothing, when no
   * clock is running (before the intro is read, or while a strike is waiting to land).
   */
  public extendClock(ms: number): boolean {
    if (this.isClockUnmovable(ms)) return false;
    this.attackDeadline += ms;
    this.state.attackDuration += ms;
    this.tick();
    return true;
  }

  /**
   * Restart the running countdown at its full length (Gale's Wind): the bar is full again and the beast strikes
   * one whole clock from now. Returns false, and changes nothing, when no clock is running or it stands under
   * Chronos' ice (the ice already holds it).
   */
  public refillClock(): boolean {
    const isClockStill = this.attackTimerInterval === null || this.isClockFrozen();
    if (isClockStill) return false;
    this.attackDeadline = Date.now() + this.state.attackDuration;
    this.tick();
    return true;
  }

  /**
   * Hold the clock where it is for `ms` (Chronos' Clock): the deadline moves out by the same amount,
   * the bar does not move, and the beast cannot strike until the ice melts. A Defend during the
   * freeze is answered with "frozen solid" and a fresh clock instead of a hit. A second freeze adds
   * to the first. Returns false, and changes nothing, when no clock is running.
   */
  public freezeClock(ms: number): boolean {
    if (this.isClockUnmovable(ms)) return false;
    this.frozenUntil = clockEndsAt(Date.now(), this.frozenUntil, ms);
    this.attackDeadline += ms;
    this.tick();
    return true;
  }

  /** Whether the clock is standing still under Chronos' ice right now. */
  public isClockFrozen(): boolean {
    return Date.now() < this.frozenUntil;
  }

  /**
   * The beast misses its next strike (Thor's Hammer): when it would land, the hero keeps the move
   * and the clock restarts full. Several hammers stack, one strike each.
   */
  public skipNextStrike(): void {
    this.strikeSkips++;
  }

  /** Strikes the beast still owes the hammer. */
  public getStrikeSkips(): number {
    return this.strikeSkips;
  }

  /**
   * The next Run Away slips past the parting strike (X's Invisibility); the page runs it right after. The getaway is
   * otherwise a run like any other: a fight that carries a quest still earns the beast its grudge mark.
   */
  public vanishNextRun(): void {
    this.vanishOwed = true;
  }

  /**
   * Multiply the current beast's attack for the rest of the fight (Sol's Flare at 0.5 halves every
   * strike). A beast with no attack counts as the baseline 10 first. Returns the new attack, or 0
   * with no beast. A strike already waiting to land keeps its damage.
   */
  public weakenEnemy(factor: number): number {
    const enemy = this.state.currentEnemy;
    if (!enemy) return 0;
    const isUsableFactor = factor > 0;
    if (!isUsableFactor) return enemy.attack;
    enemy.attack = Math.max(1, (enemy.attack || 10) * factor);
    return enemy.attack;
  }

  /**
   * Scale the minutes every chore earns on the clock for the rest of the fight (Fire Wand at 1.5).
   * Applies to every clock started from now on; the one running is left as it is. Returns the scale
   * now in force (several wands multiply).
   */
  public scaleCooldown(factor: number): number {
    const isUsableFactor = factor > 0;
    if (isUsableFactor) this.cooldownScale *= factor;
    return this.cooldownScale;
  }

  /**
   * A strike that does not land (frozen or stunned beast): the brace comes down, the hero keeps the
   * move and gets a fresh full clock. One auto line says why.
   */
  private skipStrike(line: string): void {
    if (this.state.isDefending) this.setDefendingState(false);
    this.queueDialogMessages([autoLine(line)]);
    this.setPlayerTurnState(true);
    this.state.turnCounter++;
    this.startAttackTimer();
  }

  /**
   * Perform enemy's turn: wind up a strike. The damage waits in pendingPlayerDamage until the
   * hero taps through "{Beast} attacks!" (the page then calls applyPendingDamage()).
   */
  private performEnemyTurn(): void {
    this.stopAttackTimer();

    // A strike is already waiting for the hero: one at a time
    if (this.hasPendingDamage()) return;

    const enemy = this.state.currentEnemy;
    const isBeastGone = !enemy || enemy.health <= 0;
    if (isBeastGone) return;

    // A Ninja is never where the first strike lands
    const isFirstStrikeOwed = this.firstStrikeOwed;
    if (isFirstStrikeOwed) {
      this.firstStrikeOwed = false;
      this.skipStrike(shadowStrikeLine(enemy, this.heroName()));
      return;
    }

    // Chronos' ice or Thor's hammer: the strike does not land
    if (this.isClockFrozen()) {
      this.skipStrike(frozenStrikeLine(enemy));
      return;
    }
    const isStrikeSkipOwed = this.strikeSkips > 0;
    if (isStrikeSkipOwed) {
      this.strikeSkips--;
      this.skipStrike(stunnedStrikeLine(enemy));
      return;
    }

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
    this.state.pendingPlayerDamage = strikeDamage(
      hero.stats.maxHp,
      enemy.attack,
      braced,
      Math.random(),
      this.passive.braceFactor,
      this.passive.strikeFactor,
      this.grudge
    );

    // Trigger enemy pre-attack sound (ambush/charge)
    this.battleCallbacks.onAttack?.('enemy');
    this.queueDialogMessages(attacksLines(enemy));
  }

  /**
   * Apply pending damage to the player (called when the attack dialog is dismissed)
   * This creates the Earthbound-style "rolling HP" effect. The hero always regains the move when
   * the hit lands, and this is the only place the clock restarts while a strike is waiting.
   */
  public applyPendingDamage(): void {
    const damage = this.state.pendingPlayerDamage;
    const isNothingWaiting = damage <= 0;
    if (isNothingWaiting) {
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

    this.queueDialogMessages(damageTakenLines(hero.name, damage, braced));

    if (!isAlive) {
      // Player defeated
      this.queueDialogMessages(fallenLines(hero.name));
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
    return activeUserOf(this.state.participants);
  }

  /**
   * Get user by ID from Pinia store
   */
  private getUserById(userId: string): User | null {
    const storeUser = this.userStore.getUserById(userId);
    if (!storeUser) return null;

    return toBattleUser(userId, storeUser);
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
