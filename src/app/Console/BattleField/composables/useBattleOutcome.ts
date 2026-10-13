import type { Ref } from "vue";
import type { Router } from "vue-router";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import type { QuestRewards } from "@/lib/databases/QuestLogDb";
import { isTrustedHour, type HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import type { Enemy } from "@/lib/services/battle/BattleService";
import { completeQuest, isQuestStillOpen, recordBattleCompletion } from "@/lib/services/quests/QuestCompletionService";
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
const NOTHING: QuestRewards = { xp: 0, gp: 0, ap: 0 };

type Quest = NonNullable<Encounter["quest"]>;

/** What a win came to: the pay the card shows, whether the Game Master holds it, and the level ups it brought. */
interface Settlement {
  rewards: QuestRewards;
  held: boolean;
  levelUp: LevelUpInfo | null;
  classLevelUp: ClassLevelUpInfo | null;
}

/**
 * How a battle ends. Rewards are credited (or held for the Game Master) and outcomes recorded
 * the moment the last beast falls, so leaving early, reloading or a crash can never lose them;
 * the strobe, the fanfare and the victory card that follow are purely celebration.
 * The hero's class has its say on the pay (docs/Items-And-Classes-Contract.md, C): a Thief's or
 * Ninja's +25% GP, a Monk's +1 AP, a Mage's or Sage's 10% MP back and a Paladin's 10% HP back.
 * Fights leave their damage behind: a win keeps whatever HP the beast left (plus the Paladin's
 * heal), and a defeat sends the hero limping home with LIMP_HOME_HP so the Hospital, the Hotel
 * and the free bench matter. Nothing here fills HP.
 * A win over a quest's beast completes the quest (docs/Quest-Rooms-Spec.md 7.5), from the board or a
 * temple room alike: held for the Game Master when the quest asks for approval, else paid and logged.
 * A temple room's win opens the room, and a quest room's run re-reads the board once the log has it.
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

  /**
   * A temple room was won: it is remembered and its doors open. A quest room's run then re-reads the hero's board, so
   * call this after the log write: a board read before it still has the quest open and would put the beast back.
   */
  const clearTempleRoom = (hasQuest: boolean) => {
    const { templeId, level, x: col, y: row } = ctx;
    const isTempleRoomWon = ctx.kind === "temple" && templeId && level && col !== undefined && row !== undefined;
    if (!isTempleRoomWon) return;
    const temples = TempleSystem.getInstance();
    temples.markRoomCleared(templeId, level, [row, col], ctx.userId);
    if (hasQuest) void temples.refreshQuestRooms(templeId);
  };

  const questEffects = () => userStore.users[ctx.userId]?.questEffects as HeroQuestEffects | undefined;

  /**
   * The quest log, not the screen the fight began on, says whether the window is still open: a shared quest a sibling
   * already cleared, or a window the hero used up elsewhere, is not paid twice. A log that cannot be read does not cost
   * the hero the win: the fight pays as it always did.
   */
  const isWindowOpen = async (quest: Quest): Promise<boolean> => {
    try {
      return await isQuestStillOpen(quest, ctx.userId, new Date(), questEffects());
    } catch (error) {
      debug.warn("The quest log could not be read before the win; it pays as before", error);
      return true;
    }
  };

  /** A fight with no quest behind it: the room's or the formula's pay, and a temple room is opened. */
  const settleFight = (encounter: Encounter | null, defeated: Enemy[]): Settlement => {
    const rewards = rewardsForHero(resolveRewards(encounter, defeated, ctx.kind));
    const ups = commitRewards(rewards);
    clearTempleRoom(false);
    return { rewards, held: false, ...ups };
  };

  /**
   * Win = complete (docs/Quest-Rooms-Spec.md 7.5), for a board fight and a quest room alike. The window is read first.
   * A quest that asks for approval (outside Tesla's trusted hour) is logged as a pending claim and pays nothing now; the
   * Game Master pays it at the quest's own rate. Any other is paid at once with the class's say and logged as a battle.
   * Either way a temple room opens after the log write. The room's own xp/gp/ap never count: the quest's rewards do.
   */
  const settleQuestWin = async (quest: Quest, base: QuestRewards): Promise<Settlement> => {
    const isAlreadyDone = !(await isWindowOpen(quest));
    if (isAlreadyDone) {
      clearTempleRoom(true);
      return { rewards: NOTHING, held: false, levelUp: null, classLevelUp: null };
    }

    const needsApproval = Boolean(quest.requiresApproval) && !isTrustedHour(questEffects(), new Date());
    if (needsApproval) {
      const claim = await completeQuest(quest, ctx.userId, "battle").catch((error) => {
        debug.error("Failed to log the battle for approval", error);
        return null;
      });
      clearTempleRoom(true);
      // completeQuest pays at once only if a trusted hour began in between; the card then shows what it paid
      const held = claim?.awaitingApproval ?? true;
      const rewards = held ? base : claim?.paid ?? base;
      return { rewards, held, levelUp: claim?.levelUp ?? null, classLevelUp: null };
    }

    const rewards = rewardsForHero(base);
    const ups = commitRewards(rewards);
    await recordBattleCompletion(quest, ctx.userId, rewards).catch((error) =>
      debug.error("Failed to record quest battle completion", error)
    );
    clearTempleRoom(true);
    return { rewards, held: false, ...ups };
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

    // 1. Pay (or hold) first, celebrate after: nothing below can lose the loot. A held quest is paid later by the
    // Game Master at the quest's own rate, so the class bonus only applies to pay the fight hands over now.
    const { rewards, held, levelUp, classLevelUp } = quest
      ? await settleQuestWin(quest, resolveRewards(encounter, defeated, ctx.kind))
      : settleFight(encounter, defeated);

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
