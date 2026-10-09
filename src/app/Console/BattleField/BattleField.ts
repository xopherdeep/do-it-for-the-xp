import { computed, defineComponent, onUnmounted, ref, shallowRef } from "vue";
import { IonPage, onIonViewDidEnter, onIonViewWillLeave } from "@ionic/vue";
import { useRoute, useRouter } from "vue-router";
import { createBattleService, createBestiaryService } from "@/lib/services/battle";
import type { BattleService, CombatTask, Enemy } from "@/lib/services/battle/BattleService";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { resolveBattleContext } from "./battle/battleContext";
import { loadEncounter, type Encounter } from "./battle/encounterLoader";
import { useAtbDisplay } from "./composables/useAtbDisplay";
import { useBattleAudio } from "./composables/useBattleAudio";
import { useBattleBackground } from "./composables/useBattleBackground";
import { useBattleDialog } from "./composables/useBattleDialog";
import { useBattleOutcome } from "./composables/useBattleOutcome";
import type { BattleMenuAction } from "./battle/battleMenu";
import BattleDialogBox from "./components/BattleDialogBox.vue";
import BattleEnemyStage from "./components/BattleEnemyStage.vue";
import XpBattleTaskMenu from "./components/XpBattleTaskMenu.vue";
import XpHpMpHud from "./hud/XpHpMpHud/XpHpMpHud.vue";

const toLayer = (value: unknown): number | undefined => {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * The arena. A chore is a beast; its checklist items are the hero's attacks.
 * Everything here is wiring: the engine lives in BattleService, loading in
 * encounterLoader, and the ending in useBattleOutcome.
 */
export default defineComponent({
  name: "battle-field",
  components: { IonPage, BattleDialogBox, BattleEnemyStage, XpBattleTaskMenu, XpHpMpHud },
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
    const showEnemyHp = ref(false);
    const showTaskMenu = ref(false);
    const enemyAnimationClass = ref("");
    let started = false;
    let hpFlashTimer: number | undefined;
    let hitTimer: number | undefined;

    const audio = useBattleAudio();
    const background = useBattleBackground();
    const dialog = useBattleDialog({
      playSound: audio.playSound,
      onIdle: () => {
        if (service.value && !service.value.isPlayerTurn()) service.value.startPlayerTurn();
      },
      onDismiss: () => {
        const engine = service.value;
        if (!engine || !battleStarted.value) return;
        if (engine.hasPendingDamage()) {
          engine.applyPendingDamage();
          return;
        }
        if (!engine.isPlayerTurn()) {
          engine.startPlayerTurn();
          engine.startAttackTimer();
        }
      },
    });
    const outcome = useBattleOutcome({ ctx, encounter, dialog, audio, background, enemyAnimationClass, router });
    const atb = useAtbDisplay(service, combatTasks, currentEnemy);

    const isPlayerTurn = computed(() => service.value?.isPlayerTurn() ?? false);
    const showMenu = computed(() => battleStarted.value && isPlayerTurn.value && !dialog.isShowing.value);
    const choresLeft = computed(() => combatTasks.value.filter((task) => !task.isCompleted).length);
    const avatarSrc = computed(() =>
      currentEnemy.value?.avatar ? bestiary.getAvatar(currentEnemy.value.avatar) : ""
    );

    const flashEnemyHp = (ms: number) => {
      showEnemyHp.value = true;
      window.clearTimeout(hpFlashTimer);
      hpFlashTimer = window.setTimeout(() => (showEnemyHp.value = false), ms);
    };

    const hitEnemy = () => {
      enemyAnimationClass.value = "damaged";
      window.clearTimeout(hitTimer);
      hitTimer = window.setTimeout(() => {
        if (enemyAnimationClass.value === "damaged") enemyAnimationClass.value = "";
      }, 500);
    };

    const createEngine = () => {
      const engine = createBattleService();
      engine.registerCallbacks({
        onDialogMessage: (messages) => dialog.enqueue(messages),
        onBattleMessageChange: (message) => {
          if (message) dialog.enqueue([message]);
        },
        onCombatTasksChange: (tasks) => {
          combatTasks.value = tasks;
        },
        onEnemyHealthChange: () => flashEnemyHp(3000),
        onEnemyChange: (enemy) => {
          currentEnemy.value = enemy;
          void background.applyEnemy(enemy);
        },
        onEnemyDefeated: () => {
          audio.playSound("enemyDie");
          battleStarted.value = false;
          void outcome.celebrateVictory(engine.getAllEnemies());
        },
        onPlayerDefeated: () => {
          engine.stopAttackTimer();
          battleStarted.value = false;
          outcome.handlePlayerDefeated();
        },
        onAttack: (attacker) => audio.playSound(attacker === "player" ? "attack" : "preAttack"),
        onDamage: (target) => {
          if (target === "enemy") hitEnemy();
        },
      });
      return engine;
    };

    const startIntro = (label: string) => {
      showEnemy.value = false;
      dialog.isVictoryMessage.value = false;
      dialog.enqueue([
        () => {
          showEnemy.value = true;
          audio.playSound("startBattle");
          audio.startBattleBgm();
        },
        `From the dark forces of chaos comes ${label}!!!`,
        // The clock only starts once the hero has read who they are up against
        () => service.value?.startAttackTimer(),
      ]);
    };

    const beginBattle = async () => {
      if (started) return;
      started = true;
      try {
        if (!userStore.users[ctx.userId]) await userStore.loadUsers();

        const loaded = await loadEncounter(ctx, bestiary);
        encounter.value = loaded;
        background.lockLayers({ bg1: toLayer(route.query.bg1), bg2: toLayer(route.query.bg2) });
        background.lockLayers(loaded.background);

        const engine = createEngine();
        service.value = engine;
        engine.initMultiBattle(loaded.enemies, [ctx.userId]);
        currentEnemy.value = loaded.enemies[0];
        await background.applyEnemy(loaded.enemies[0]);

        battleStarted.value = true;
        startIntro(loaded.label);
      } catch (error) {
        debug.error("BattleField: the battle could not begin", error);
        dialog.enqueue(["The beast slipped away before the fight could start...", () => outcome.leaveBattle()]);
      }
    };

    const act = (action: "defend" | "run") => {
      const engine = service.value;
      if (!engine || !battleStarted.value) return;
      audio.playSound(action === "run" ? "cancel" : "confirm");
      const result = engine.handleBattleAction(action);
      if (action === "run" && result.success) {
        battleStarted.value = false;
        outcome.handleEscape();
      }
    };

    const menuActions = computed<BattleMenuAction[]>(() => [
      {
        id: "attack",
        label: "Attack",
        faIcon: "fist-raised",
        click: () => {
          showTaskMenu.value = true;
          audio.playSound("confirm");
        },
      },
      { id: "defend", label: "Defend", faIcon: "shield-alt", click: () => act("defend") },
      { id: "run", label: "Run Away", faIcon: "running", click: () => act("run") },
    ]);

    const finishCombatTask = (taskId: string) => service.value?.finishCombatTask(taskId);

    const onTaskAttackEnd = (result: { success: boolean }) => {
      showTaskMenu.value = false;
      // The final blow ends the battle inside task-complete; don't let the hit flash
      // overwrite the victory strobe that is already playing.
      if (result.success && battleStarted.value) {
        hitEnemy();
        flashEnemyHp(2000);
      }
    };

    const closeTaskMenu = () => {
      showTaskMenu.value = false;
      audio.playSound("cancel");
    };

    const stopEngine = () => service.value?.stopAttackTimer();

    onIonViewDidEnter(() => void beginBattle());
    onIonViewWillLeave(stopEngine);
    onUnmounted(() => {
      stopEngine();
      window.clearTimeout(hpFlashTimer);
      window.clearTimeout(hitTimer);
    });

    return {
      // stage
      canvasRef: background.canvasRef,
      currentEnemy,
      avatarSrc,
      showEnemy,
      showEnemyHp,
      enemyAnimationClass,
      enemySizeClass: atb.enemySizeClass,
      enemyProgressPercent: atb.enemyProgressPercent,
      choresLeft,
      atbBarStyle: atb.atbBarStyle,
      atbIconColor: atb.atbIconColor,
      atbTimeRemaining: atb.atbTimeRemaining,
      battleStarted,
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
      // attacks
      showTaskMenu,
      combatTasks,
      finishCombatTask,
      onTaskAttackEnd,
      closeTaskMenu,
    };
  },
});
