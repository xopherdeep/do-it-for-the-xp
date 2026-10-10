import { computed, defineComponent, onUnmounted, ref, shallowRef, watch } from "vue";
import { IonPage, onIonViewDidEnter, onIonViewWillLeave, useBackButton } from "@ionic/vue";
import { useRoute, useRouter } from "vue-router";
import { createBattleService, createBestiaryService } from "@/lib/services/battle";
import type { BattleService, CombatTask, Enemy } from "@/lib/services/battle/BattleService";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { resolveBattleContext } from "./battle/battleContext";
import { loadEncounter, type Encounter } from "./battle/encounterLoader";
import type { BattleMenuAction } from "./battle/battleMenu";
import { clearBattleProgress, loadBattleProgress, pruneBattleProgress, saveBattleProgress } from "./battle/battleProgress";
import type { EnemyAnimation, HitPopup, VictoryCardState } from "./battle/battleView";
import { useAtbDisplay } from "./composables/useAtbDisplay";
import { useBattleAudio } from "./composables/useBattleAudio";
import { useBattleBackground } from "./composables/useBattleBackground";
import { useBattleDialog } from "./composables/useBattleDialog";
import { useBattleFeedback } from "./composables/useBattleFeedback";
import { useBattleOutcome } from "./composables/useBattleOutcome";
import BattleDialogBox from "./components/BattleDialogBox.vue";
import BattleEnemyStage from "./components/BattleEnemyStage.vue";
import BattleHeroCard from "./components/BattleHeroCard.vue";
import BattleVictoryCard from "./components/BattleVictoryCard.vue";
import XpBattleTaskMenu from "./components/XpBattleTaskMenu.vue";

const toLayer = (value: unknown): number | undefined => {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** How long the beast's hit shake plays before the sprite settles back into its idle float. */
const HIT_SHAKE_MS = 500;
/** The checklist slides away before the blow lands, so the kid sees it. */
const SHEET_LEAVE_MS = 260;
/** A strike nobody has tapped through reminds the hero every so often, a few times. */
const STRIKE_NAG_MS = 15_000;
const STRIKE_NAG_LIMIT = 3;
/** The Ionic hardware-back priority for the arena (above the default route pop). */
const BACK_BUTTON_PRIORITY = 100;

const PROMPT_FIRST_CHORE = "Do its chores to win!";
const PROMPT_RUN = "Run away? Your finished chores won't count.";

/**
 * The arena. A chore is a beast; its checklist items are the hero's attacks.
 * Everything here is wiring: the engine lives in BattleService, loading in
 * encounterLoader, the ending in useBattleOutcome and the body feedback in useBattleFeedback.
 */
export default defineComponent({
  name: "battle-field",
  components: { IonPage, BattleDialogBox, BattleEnemyStage, BattleHeroCard, BattleVictoryCard, XpBattleTaskMenu },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    const ctx = resolveBattleContext(route, userStore.currentUser.id);

    const bestiary = createBestiaryService();
    // shallowRef: the engine keeps its own reactive state; proxying the class would also break its private fields' types
    const service = shallowRef<BattleService | null>(null);
    const encounter = ref<Encounter | null>(null);
    const currentEnemy = ref<Enemy | null>(null);
    const combatTasks = ref<CombatTask[]>([]);
    const battleStarted = ref(false);
    const showEnemy = ref(false);
    const showTaskMenu = ref(false);
    const enemyAnimationClass = ref<EnemyAnimation>("");
    const heroDowned = ref(false);
    const lastHit = ref<HitPopup | null>(null);
    const victoryCard = ref<VictoryCardState | null>(null);
    const runConfirm = ref(false);
    const choresDone = ref(0);
    let started = false;
    let startedAt = 0;
    let hitCount = 0;
    let hitTimer: number | undefined;
    let swingTimer: number | undefined;
    let nagTimer: number | undefined;
    let nagCount = 0;
    let resolveVictory: (() => void) | null = null;

    const audio = useBattleAudio();
    const background = useBattleBackground();
    const feedback = useBattleFeedback();

    const stopNag = () => {
      window.clearInterval(nagTimer);
      nagTimer = undefined;
      nagCount = 0;
    };

    const dialog = useBattleDialog({
      onIdle: () => {
        if (service.value && !service.value.isPlayerTurn()) service.value.startPlayerTurn();
      },
      onDismiss: () => {
        const engine = service.value;
        if (!engine || !battleStarted.value) return;
        if (engine.hasPendingDamage()) {
          // The hit lands now: HP rolls while the damage line types (the engine queues it)
          stopNag();
          engine.applyPendingDamage();
        }
        if (!engine.isPlayerTurn()) engine.startPlayerTurn();
      },
    });

    /** The victory card is modal: the celebration waits here until the hero taps it away. */
    const presentVictory = (card: VictoryCardState) =>
      new Promise<void>((resolve) => {
        victoryCard.value = card;
        resolveVictory = resolve;
      });
    const continueAfterVictory = () => {
      if (!victoryCard.value) return;
      audio.playSound("cursor");
      victoryCard.value = null;
      resolveVictory?.();
      resolveVictory = null;
    };

    const outcome = useBattleOutcome({
      ctx,
      encounter,
      dialog,
      audio,
      background,
      feedback,
      enemyAnimationClass,
      router,
      presentVictory,
    });
    const atb = useAtbDisplay(service, combatTasks, currentEnemy);

    const isPlayerTurn = computed(() => service.value?.isPlayerTurn() ?? false);
    const showMenu = computed(
      () =>
        battleStarted.value &&
        isPlayerTurn.value &&
        !dialog.isShowing.value &&
        !showTaskMenu.value &&
        !victoryCard.value
    );
    const avatarSrc = computed(() =>
      currentEnemy.value?.avatar ? bestiary.getAvatar(currentEnemy.value.avatar) : ""
    );
    const menuPrompt = computed(() => {
      if (runConfirm.value) return PROMPT_RUN;
      return choresDone.value === 0 ? PROMPT_FIRST_CHORE : "";
    });

    const shakeEnemy = () => {
      enemyAnimationClass.value = "damaged";
      window.clearTimeout(hitTimer);
      hitTimer = window.setTimeout(() => {
        // Never overwrite the victory strobe that may already be playing
        if (enemyAnimationClass.value === "damaged") enemyAnimationClass.value = "";
      }, HIT_SHAKE_MS);
    };

    const closeSheet = () => {
      showTaskMenu.value = false;
    };

    /** The beast wound up: the hit is waiting for a tap; remind a hero who walked away. */
    const startNag = () => {
      stopNag();
      nagTimer = window.setInterval(() => {
        const engine = service.value;
        if (!engine?.hasPendingDamage() || nagCount >= STRIKE_NAG_LIMIT) {
          stopNag();
          return;
        }
        nagCount += 1;
        audio.playSound("alert");
      }, STRIKE_NAG_MS);
    };

    const createEngine = () => {
      const engine = createBattleService({ freeFight: ctx.kind === "free" });
      engine.registerCallbacks({
        onDialogMessage: (messages) => dialog.enqueue(messages),
        onCombatTasksChange: (tasks) => {
          combatTasks.value = tasks;
          choresDone.value = tasks.filter((task) => task.isCompleted).length;
          saveBattleProgress(
            ctx,
            tasks.filter((task) => task.isCompleted).map((task) => task.id)
          );
        },
        onEnemyChange: (enemy) => {
          currentEnemy.value = enemy;
          void background.applyEnemy(enemy);
        },
        onEnemyDefeated: () => {
          audio.playSound("enemyDie");
          battleStarted.value = false;
          closeSheet();
          stopNag();
          clearBattleProgress(ctx);
          void outcome.celebrateVictory(engine.getAllEnemies(), {
            choresDone: choresDone.value,
            elapsedMs: startedAt ? Date.now() - startedAt : 0,
          });
        },
        onPlayerDefeated: () => {
          engine.stopAttackTimer();
          battleStarted.value = false;
          heroDowned.value = true;
          closeSheet();
          stopNag();
          outcome.handlePlayerDefeated();
        },
        // The beast winds up before it strikes; the hero's own swing sounds when a chore is confirmed
        onAttack: (attacker) => {
          if (attacker !== "enemy") return;
          audio.playSound("preAttack");
          feedback.windUp();
          closeSheet();
          runConfirm.value = false;
          startNag();
        },
        onDamage: (target, amount, isFinalBlow) => {
          if (target === "enemy") {
            shakeEnemy();
            lastHit.value = { id: ++hitCount, amount, smash: Boolean(isFinalBlow) };
            audio.playSound("enemyDamage");
            return;
          }
          audio.playSound("damage");
          feedback.heroHit();
        },
      });
      return engine;
    };

    const startIntro = (label: string, stillHurt: boolean) => {
      showEnemy.value = false;
      dialog.isVictoryMessage.value = false;
      dialog.enqueue([
        () => {
          showEnemy.value = true;
          audio.playSound("startBattle");
        },
        `From the dark forces of chaos comes ${label}!!!`,
        ...(stillHurt ? [`${label} is still hurt from earlier!`] : []),
        // The clock only starts once the hero has read who they are up against
        () => {
          startedAt = Date.now();
          service.value?.startAttackTimer();
        },
      ]);
    };

    const beginBattle = async () => {
      if (started) return;
      started = true;
      try {
        pruneBattleProgress();
        if (!userStore.users[ctx.userId]) await userStore.loadUsers();
        if (!userStore.users[ctx.userId]) {
          debug.warn("BattleField: no hero for this fight", ctx.userId);
          dialog.enqueue(["No hero showed up for this fight...", () => outcome.leaveBattle()]);
          return;
        }

        const loaded = await loadEncounter(ctx, bestiary);
        encounter.value = loaded;
        background.lockLayers({ bg1: toLayer(route.query.bg1), bg2: toLayer(route.query.bg2) });
        background.lockLayers(loaded.background);

        const engine = createEngine();
        service.value = engine;
        engine.initMultiBattle(loaded.enemies, [ctx.userId]);
        currentEnemy.value = loaded.enemies[0];
        await background.applyEnemy(loaded.enemies[0]);

        // Chores finished earlier today count: the beast is still hurt
        const remembered = loadBattleProgress(ctx);
        const taskIds = new Set(engine.getCombatTasks().map((task) => task.id));
        const toRestore = remembered.filter((id) => taskIds.has(id));
        const restored = toRestore.length && toRestore.length < taskIds.size ? engine.restoreCompletedTasks(toRestore) : 0;

        battleStarted.value = true;
        startIntro(loaded.label, restored > 0);
      } catch (error) {
        debug.error("BattleField: the battle could not begin", error);
        dialog.enqueue(["The beast slipped away before the fight could start...", () => outcome.leaveBattle()]);
      }
    };

    const act = (action: "defend" | "run") => {
      const engine = service.value;
      if (!engine || !battleStarted.value) return;
      const result = engine.handleBattleAction(action);
      if (action === "run" && result.success) {
        battleStarted.value = false;
        stopNag();
        outcome.handleEscape();
      }
    };

    const openRunConfirm = () => {
      audio.playSound("cursor");
      runConfirm.value = true;
    };

    const menuActions = computed<BattleMenuAction[]>(() => {
      if (runConfirm.value) {
        return [
          {
            id: "keep-fighting",
            label: "Keep fighting",
            faIcon: "fist-raised",
            click: () => {
              audio.playSound("no");
              runConfirm.value = false;
            },
          },
          {
            id: "run",
            label: "Run",
            faIcon: "running",
            click: () => {
              audio.playSound("cursor");
              runConfirm.value = false;
              act("run");
            },
          },
        ];
      }
      return [
        {
          id: "attack",
          label: "Attack",
          faIcon: "fist-raised",
          fullWidth: true,
          click: () => {
            audio.playSound("cursor");
            feedback.tap();
            showTaskMenu.value = true;
          },
        },
        {
          id: "defend",
          label: "Defend",
          faIcon: "shield-alt",
          click: () => {
            audio.playSound("cursor");
            act("defend");
          },
        },
        { id: "run-away", label: "Run Away", faIcon: "running", click: openRunConfirm },
      ];
    });

    /** A confirmed chore is the hero's swing: the sheet slides away, then the blow lands. */
    const finishCombatTask = (taskId: string) => {
      if (!battleStarted.value) return;
      closeSheet();
      window.clearTimeout(swingTimer);
      swingTimer = window.setTimeout(() => {
        if (!battleStarted.value) return;
        audio.playSound("attack");
        feedback.beastHit();
        service.value?.finishCombatTask(taskId);
      }, SHEET_LEAVE_MS);
    };

    const closeTaskMenu = () => {
      closeSheet();
    };

    // The clock is felt, not just seen: it ticks for the last ten seconds
    watch(atb.timerLabel, (label, previous) => {
      if (!atb.timerCritical.value || !label || label === previous) return;
      audio.playSound("cursor");
      feedback.tick();
    });

    // Coming back to the phone: the deadline clock catches up at once instead of on the next throttled tick
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") service.value?.tick();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Hardware back mid-fight asks before running away; otherwise it behaves as usual
    useBackButton(BACK_BUTTON_PRIORITY, (next) => {
      if (!battleStarted.value || victoryCard.value) {
        next();
        return;
      }
      if (showTaskMenu.value) {
        closeSheet();
        return;
      }
      openRunConfirm();
    });

    const stopEngine = () => {
      service.value?.stopAttackTimer();
      stopNag();
    };

    onIonViewDidEnter(() => void beginBattle());
    onIonViewWillLeave(stopEngine);
    onUnmounted(() => {
      service.value?.dispose();
      stopNag();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearTimeout(hitTimer);
      window.clearTimeout(swingTimer);
    });

    return {
      // stage
      canvasRef: background.canvasRef,
      heroId: ctx.userId,
      currentEnemy,
      avatarSrc,
      showEnemy,
      enemyAnimationClass,
      enemySizeClass: atb.enemySizeClass,
      choresTotal: atb.choresTotal,
      choresLeft: atb.choresLeft,
      timerPercent: atb.timerPercent,
      timerLabel: atb.timerLabel,
      timerCritical: atb.timerCritical,
      damagePerTask: atb.damagePerTask,
      lastHit,
      battleStarted,
      // hero
      heroDowned,
      hitSignal: feedback.hitSignal,
      shaking: feedback.shaking,
      flashing: feedback.flashing,
      // dialog + menu
      typingRef: dialog.typingRef,
      dialogText: dialog.text,
      dialogLines: dialog.accumulatedLines,
      dialogIsAppendMode: dialog.isAppendMode,
      dialogIsVictory: dialog.isVictoryMessage,
      dialogHasMore: dialog.hasMore,
      advanceDialog: dialog.advance,
      onDialogTypingComplete: dialog.onTypingComplete,
      showMenu,
      menuActions,
      menuPrompt,
      // attacks
      showTaskMenu,
      combatTasks,
      finishCombatTask,
      closeTaskMenu,
      // victory
      victoryCard,
      continueAfterVictory,
    };
  },
});
