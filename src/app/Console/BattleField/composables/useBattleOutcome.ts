import type { Ref } from "vue";
import type { Router } from "vue-router";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import type { QuestRewards } from "@/lib/databases/QuestLogDb";
import type { Enemy } from "@/lib/services/battle/BattleService";
import { completeQuest, recordBattleCompletion } from "@/lib/services/quests/QuestCompletionService";
import { classPassive, rewardsWithPassive, winRegen } from "@/lib/services/stats/ClassPassives";
import { useUserStore, type ClassLevelUpInfo, type LevelUpInfo } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { battleReturnRoute, type BattleContext } from "../battle/battleContext";
import { resolveRewards } from "../battle/battleRewards";
import type { EnemyAnimation, VictoryCardState } from "../battle/battleView";
import type { Encounter } from "../battle/encounterLoader";
import type { BattleAudio } from "./useBattleAudio";
import type { BattleBackground } from "./useBattleBackground";
import type { BattleDialog, DialogItem } from "./useBattleDialog";
import type { BattleFeedback } from "./useBattleFeedback";

export interface BattleOutcomeDeps {
  ctx: BattleContext;
  encounter: Ref<Encounter | null>;
  dialog: BattleDialog;
  audio: BattleAudio;
  background: BattleBackground;
  feedback: BattleFeedback;
  enemyAnimationClass: Ref<EnemyAnimation>;
  router: Router;
  /** Shows the victory card and resolves once the hero taps it away. */
  presentVictory: (card: VictoryCardState) => Promise<void>;
}

/** What the fight is remembered by on the victory card. */
export interface FightStats {
  choresDone: number;
  elapsedMs: number;
}

/** The celebration beats, in ms: the beast strobes, the arena folds away, the beast fades. */
export const VICTORY_TIMINGS = { strobe: 1000, collapse: 750, fade: 1000 } as const;
/** The beast fades before the hero walks away from an escape. */
export const ESCAPE_FADE_MS = 700;
/** A fallen hero wakes with this much HP: alive enough to walk to the Hospital, never stuck at 0. */
export const LIMP_HOME_HP = 1;
/** What the arena says once the hero has blacked out. */
export const LIMP_HOME_LINE = `You limp back to town with ${LIMP_HOME_HP} HP. The Hospital can patch you up.`;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * How a battle ends. Rewards are credited (or held for the Game Master) and outcomes recorded
 * the moment the last beast falls, so leaving early, reloading or a crash can never lose them;
 * the strobe, the fanfare and the victory card that follow are purely celebration.
 * The hero's class has its say on the pay (docs/Items-And-Classes-Contract.md, C): a Thief's or
 * Ninja's +25% GP, a Monk's +1 AP, a Mage's or Sage's 10% MP back and a Paladin's 10% HP back.
 * Fights leave their damage behind: a win keeps whatever HP the beast left (plus the Paladin's
 * heal), and a defeat sends the hero limping home with LIMP_HOME_HP so the Hospital, the Hotel
 * and the free bench matter. Nothing here fills HP.
 */
export const useBattleOutcome = (deps: BattleOutcomeDeps) => {
  const userStore = useUserStore();
  const { ctx, dialog, audio } = deps;

  const leaveBattle = () => deps.router.replace(battleReturnRoute(ctx));

  const commitRewards = (rewards: QuestRewards) => {
    const user = userStore.users[ctx.userId];
    if (!user) {
      debug.warn("Battle rewards skipped: hero not loaded", ctx.userId);
      return { levelUp: null as LevelUpInfo | null, classLevelUp: null as ClassLevelUpInfo | null };
    }
    const levelUp = rewards.xp > 0 ? userStore.updateUserXP({ userId: ctx.userId, amount: rewards.xp, commit: true }) : null;
    const classLevelUp =
      rewards.xp > 0 ? userStore.updateClassXp(ctx.userId, user.jobClass || "default", rewards.xp) : null;
    if (rewards.gp > 0) void userStore.updateUserGP({ userId: ctx.userId, wallet: rewards.gp });
    if (rewards.ap > 0) userStore.recordAPGain({ userId: ctx.userId, amount: rewards.ap, source: `battle:${ctx.kind}` });
    regenerateOnWin();
    return { levelUp, classLevelUp };
  };

  /** The rewards this hero's class turns the fight's pay into (nothing changes for a Warrior). */
  const rewardsForHero = (rewards: QuestRewards): QuestRewards =>
    rewardsWithPassive(rewards, classPassive(userStore.users[ctx.userId]?.jobClass));

  /** A Mage or Sage gets 10% MP back on a win, a Paladin 10% HP; nobody else heals in the arena. */
  const regenerateOnWin = () => {
    const user = userStore.users[ctx.userId];
    const stats = user?.stats;
    if (!stats) return;
    const points = (value: { now?: number; max?: number } | undefined) => ({ now: value?.now ?? 0, max: value?.max ?? 0 });
    const regen = winRegen(classPassive(user.jobClass), points(stats.hp), points(stats.mp));
    if (regen.hp > 0) userStore.updateUserHP({ userId: ctx.userId, amount: regen.hp });
    if (regen.mp > 0) userStore.updateUserMP({ userId: ctx.userId, amount: regen.mp });
  };

  const recordOutcome = async (rewards: QuestRewards) => {
    const quest = deps.encounter.value?.quest;
    if (ctx.kind === "quest" && quest) {
      await recordBattleCompletion(quest, ctx.userId, rewards).catch((error) =>
        debug.error("Failed to record quest battle completion", error)
      );
    }
    if (ctx.kind === "temple" && ctx.templeId && ctx.level && ctx.x !== undefined && ctx.y !== undefined) {
      TempleSystem.getInstance().markRoomCleared(ctx.templeId, ctx.level, [ctx.y, ctx.x], ctx.userId);
    }
  };

  /** The Game Master approves this quest first: log it as pending, pay nothing yet. */
  const holdOutcome = async (quest: NonNullable<Encounter["quest"]>) => {
    await completeQuest(quest, ctx.userId, "battle").catch((error) =>
      debug.error("Failed to log the battle for approval", error)
    );
  };

  /** A fallen hero is left at LIMP_HOME_HP, not 0: the Hospital (or a bench) does the rest. */
  const limpHome = () => {
    const stats = userStore.users[ctx.userId]?.stats;
    if (!stats) return;
    const now = stats.hp?.now ?? 0;
    if (now < LIMP_HOME_HP) userStore.updateUserHP({ userId: ctx.userId, amount: LIMP_HOME_HP - now });
  };

  const levelUpLines = (levelUp: LevelUpInfo | null, classLevelUp: ClassLevelUpInfo | null): DialogItem[] => {
    const lines: DialogItem[] = [];
    const user = userStore.users[ctx.userId];
    const heroName = user?.name?.nick || user?.name?.first || "You";

    if (levelUp?.didLevelUp) {
      lines.push(() => dialog.enableAppendMode());
      lines.push(`${heroName} grew to Level ${levelUp.newLevel}!`);
      if (levelUp.hpGained > 0) lines.push(`Max HP increased by ${levelUp.hpGained}!`);
      if (levelUp.mpGained > 0) lines.push(`Max MP increased by ${levelUp.mpGained}!`);
      Object.entries(levelUp.statsGained || {}).forEach(([stat, gained]) => {
        if (gained > 0) lines.push(`${capitalize(stat)} went up by ${gained}!`);
      });
      lines.push(() => dialog.disableAppendMode());
    }

    if (classLevelUp?.didLevelUp) {
      lines.push(() => {
        dialog.enableAppendMode();
        audio.playSound("levelUp");
      });
      lines.push(`${(user?.jobClass || "class").toUpperCase()} skill increased to Level ${classLevelUp.newLevel}!`);
      lines.push(() => dialog.disableAppendMode());
    }
    return lines;
  };

  const celebrateVictory = async (defeated: Enemy[], stats: FightStats) => {
    const encounter = deps.encounter.value;
    const quest = encounter?.quest;
    const held = ctx.kind === "quest" && Boolean(quest?.requiresApproval);
    // A held quest is paid later by the Game Master at the quest's own rate, so the class bonus only
    // applies to pay the fight hands over now.
    const base = resolveRewards(encounter, defeated, ctx.kind);
    const rewards = held ? base : rewardsForHero(base);

    // 1. Pay (or hold) first, celebrate after: nothing below can lose the loot.
    let levelUp: LevelUpInfo | null = null;
    let classLevelUp: ClassLevelUpInfo | null = null;
    if (held && quest) {
      await holdOutcome(quest);
    } else {
      ({ levelUp, classLevelUp } = commitRewards(rewards));
      await recordOutcome(rewards);
    }

    // 2. The beast strobes, the arena folds away, the beast is gone.
    dialog.clear();
    deps.enemyAnimationClass.value = "victory-strobe";
    await wait(VICTORY_TIMINGS.strobe);
    await deps.background.collapse(VICTORY_TIMINGS.collapse);
    deps.enemyAnimationClass.value = "victory-fadeout";
    await wait(VICTORY_TIMINGS.fade);

    // 3. Fanfare, then the card counts the loot up and waits for a tap.
    const leveled = Boolean(levelUp?.didLevelUp);
    audio.playVictory(Boolean(encounter?.boss), leveled);
    deps.feedback.victory();
    const label = encounter?.label || defeated[0]?.name || "The enemy";
    await deps.presentVictory({
      title: "YOU WON!",
      subtitle: `${label} was defeated!`,
      rewards,
      questName: quest?.achievementName,
      choresDone: stats.choresDone,
      elapsedMs: stats.elapsedMs,
      held,
      levelUp: leveled && levelUp ? { from: levelUp.oldLevel, to: levelUp.newLevel } : undefined,
    });

    // 4. Level ups read like Earthbound, then the walk home.
    const lines = held ? [] : levelUpLines(levelUp, classLevelUp);
    if (!lines.length) {
      leaveBattle();
      return;
    }
    dialog.isVictoryMessage.value = true;
    dialog.enqueue([...lines, () => leaveBattle()]);
  };

  /**
   * The service has already queued "has fallen / blacked out"; the hero is set on their feet with
   * LIMP_HOME_HP at once (a reload mid-dialog must not leave them at 0), the arena says where to go,
   * and the game-over splash walks them to the Hospital.
   */
  const handlePlayerDefeated = () => {
    audio.stopBgm();
    audio.playSound("die");
    limpHome();
    dialog.enqueue([
      LIMP_HOME_LINE,
      () => {
        limpHome();
        void deps.router.replace({ name: "game-over" });
      },
    ]);
  };

  /** The service has already queued "Got away safely!"; the beast fades, then the hero leaves. */
  const handleEscape = () => {
    dialog.enqueue([
      () => {
        deps.enemyAnimationClass.value = "fadeout";
        window.setTimeout(() => void leaveBattle(), ESCAPE_FADE_MS);
      },
    ]);
  };

  return { celebrateVictory, handlePlayerDefeated, handleEscape, leaveBattle, limpHome };
};
