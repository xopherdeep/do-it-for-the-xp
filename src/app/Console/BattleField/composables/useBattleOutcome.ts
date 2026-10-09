import type { Ref } from "vue";
import type { Router } from "vue-router";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import type { QuestRewards } from "@/lib/databases/QuestLogDb";
import type { Enemy } from "@/lib/services/battle/BattleService";
import { recordBattleCompletion } from "@/lib/services/quests/QuestCompletionService";
import { useUserStore, type ClassLevelUpInfo, type LevelUpInfo } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { battleReturnRoute, type BattleContext } from "../battle/battleContext";
import { resolveRewards } from "../battle/battleRewards";
import type { Encounter } from "../battle/encounterLoader";
import type { BattleAudio } from "./useBattleAudio";
import type { BattleBackground } from "./useBattleBackground";
import type { BattleDialog, DialogItem } from "./useBattleDialog";

export interface BattleOutcomeDeps {
  ctx: BattleContext;
  encounter: Ref<Encounter | null>;
  dialog: BattleDialog;
  audio: BattleAudio;
  background: BattleBackground;
  enemyAnimationClass: Ref<string>;
  router: Router;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * How a battle ends. Rewards are credited and outcomes recorded the moment the
 * last beast falls, so leaving early, reloading or a crash can never lose them;
 * the victory dialog that follows is purely celebration.
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
    return { levelUp, classLevelUp };
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

  const levelUpLines = (levelUp: LevelUpInfo | null, classLevelUp: ClassLevelUpInfo | null): DialogItem[] => {
    const lines: DialogItem[] = [];
    const user = userStore.users[ctx.userId];
    const heroName = user?.name?.nick || user?.name?.first || "You";

    if (levelUp?.didLevelUp) {
      lines.push(() => {
        dialog.enableAppendMode();
        audio.playSound("levelUp");
      });
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

  const celebrateVictory = async (defeated: Enemy[]) => {
    const encounter = deps.encounter.value;
    const rewards = resolveRewards(encounter, defeated);
    const anyBoss = defeated.some((enemy) => enemy.isBoss);

    deps.enemyAnimationClass.value = "victory-strobe";
    audio.playSound("win");
    audio.playVictoryBgm(anyBoss);

    const { levelUp, classLevelUp } = commitRewards(rewards);
    await recordOutcome(rewards);

    await wait(1000);
    await deps.background.collapse(750);
    deps.enemyAnimationClass.value = "victory-fadeout";
    dialog.isVictoryMessage.value = true;

    const lines: DialogItem[] = ["You Won!", `${encounter?.label || defeated[0]?.name || "The enemy"} was defeated!`];
    if (encounter?.quest) lines.push(`Quest complete: ${encounter.quest.achievementName} tamed!`);
    if (rewards.gp > 0) lines.push(`${rewards.gp} GP added to your wallet!`);
    if (rewards.xp > 0) lines.push(`You gained ${rewards.xp} XP!`);
    if (rewards.ap > 0) lines.push(`You earned ${rewards.ap} AP!`);
    lines.push(...levelUpLines(levelUp, classLevelUp));
    lines.push(() => leaveBattle());
    dialog.enqueue(lines);
  };

  /** The service has already queued "has fallen / blacked out"; we add the exit. */
  const handlePlayerDefeated = () => {
    audio.playSound("die");
    dialog.enqueue([() => deps.router.replace({ name: "game-over" })]);
  };

  /** The service has already queued "Got away safely!"; we add the exit. */
  const handleEscape = () => {
    dialog.enqueue([
      () => {
        deps.enemyAnimationClass.value = "fadeout";
      },
      () => leaveBattle(),
    ]);
  };

  return { celebrateVictory, handlePlayerDefeated, handleEscape, leaveBattle };
};
