import { computed, defineComponent, onUnmounted, ref, shallowRef, watch } from "vue";
import { IonPage, onIonViewDidEnter, onIonViewWillLeave, useBackButton } from "@ionic/vue";
import { useRoute, useRouter } from "vue-router";
import { createBattleService, createBestiaryService } from "@/lib/services/battle";
import type { BattleService, CombatTask, Enemy } from "@/lib/services/battle/BattleService";
import { battleBagRole, describeBattleItem, useBattleItem, type BattleItemLike } from "@/lib/services/battle/BattleItems";
import type { BattleEffectId } from "@/lib/services/battle/BattleEffects";
import { drinkPotion, potionShelf } from "@/lib/services/battle/BattlePotions";
import { battlePowers, castBattlePower } from "@/lib/services/battle/BattlePowers";
import { getAbilityService } from "@/lib/services/abilities/AbilityService";
import { heroAbilitySnapshot } from "@/lib/services/abilities/heroAbilityStatus";
import type { Ability } from "@/hooks/abilities/abilityConstants";
import { useHeroEquipment } from "@/hooks/useHeroEquipment";
import { useUserStore } from "@/lib/store/stores/user";
import { heroPassive } from "@/lib/services/stats/StatEffects";
import debug from "@/lib/utils/debug";
import XpEquipmentModal from "@/app/Console/MyPortal/UserHud/components/XpEquipmentModal.vue";
import { resolveBattleContext, type BattleContext } from "./battle/battleContext";
import { loadEncounter, type Encounter } from "./battle/encounterLoader";
import { tackleIcon, type BattleMenuAction } from "./battle/battleMenu";
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
import BattlePotionSheet from "./components/BattlePotionSheet.vue";
import BattlePowersSheet from "./components/BattlePowersSheet.vue";
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

/** What covers the menu: the chore checklist, the Goods bag, the potion sheet or the Powers sheet. One at a time. */
type BattleSheetName = "task" | "bag" | "potions" | "powers";

/** The Powers command, and a Power's Recall on the chore pick, wear the spell book. */
const POWERS_ICON = "book-spells";

/**
 * The arena. A chore is a beast; its checklist items are the hero's attacks.
 * Everything here is wiring: the engine lives in BattleService, loading in
 * encounterLoader, the ending in useBattleOutcome and the body feedback in useBattleFeedback.
 */
export default defineComponent({
  name: "battle-field",
  components: {
    IonPage,
    BattleDialogBox,
    BattleEnemyStage,
    BattleHeroCard,
    BattleVictoryCard,
    BattlePotionSheet,
    BattlePowersSheet,
    XpBattleTaskMenu,
    XpEquipmentModal,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    const ctx = resolveBattleContext(route, userStore.currentUser.id);
    /**
     * What the chores ticked off today are kept under: the quest when the fight carries one, so its board fight and its
     * temple room share them (the dishes already scraped stay scraped), else the fight itself. Set once it has loaded.
     */
    let progressCtx: BattleContext = ctx;

    const bestiary = createBestiaryService();
    // shallowRef: the engine keeps its own reactive state; proxying the class would also break its private fields' types
    const service = shallowRef<BattleService | null>(null);
    const encounter = ref<Encounter | null>(null);
    const currentEnemy = ref<Enemy | null>(null);
    const combatTasks = ref<CombatTask[]>([]);
    const battleStarted = ref(false);
    const showEnemy = ref(false);
    const sheet = ref<BattleSheetName | null>(null);
    /** The task sheet confirms a finished chore, or (Recall) picks one to send back to the board. */
    const taskMenuMode = ref<"attack" | "postpone">("attack");
    /** The Silver Arrow in hand while the hero picks the chore it will carry away. */
    let arrowInFlight: BattleItemLike | null = null;
    /** A Recall Power (Rewind) cast while the hero picks the chore it will carry away. */
    let powerInFlight: Ability | null = null;
    /** Who the chore pick names: a Power by its name, or null for the Silver Arrow (the sheet's default). */
    const recallBy = ref<{ name: string; faIcon: string } | null>(null);
    /** Once-per-fight effects already used (items and Powers share them); a new fight starts with an empty set. */
    let usedThisFight = new Set<BattleEffectId>();
    /** The Game Master's Powers, read once per fight; the Powers sheet keeps the hero's unlocked battle ones. */
    let abilities: Ability[] = [];
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
    const { equipment } = useHeroEquipment(ctx.userId);
    const hero = computed(() => userStore.getUserById(ctx.userId));

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
        const isBattleNotRunning = !engine || !battleStarted.value;
        if (isBattleNotRunning) return;
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
        !sheet.value &&
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

    /** Closes whatever covers the menu and drops a Recall still waiting for its chore (nothing was charged yet). */
    const closeSheet = () => {
      sheet.value = null;
      taskMenuMode.value = "attack";
      arrowInFlight = null;
      powerInFlight = null;
      recallBy.value = null;
    };

    /** What the hero may use right now: the engine, the hero and this fight's spent effects. */
    const itemContext = (taskId?: string) => ({
      userId: ctx.userId,
      service: service.value as BattleService,
      usedThisFight,
      taskId,
    });

    /** The sheet's answer typed as one line that moves on by itself; the menu comes back after it. */
    const sayItemResult = (result: { ok: boolean; line: string; sound: string }) => {
      audio.playSound(result.sound);
      if (result.ok) feedback.tap();
      if (result.line) dialog.enqueue([{ text: result.line, auto: true }]);
    };

    /** Recall (the Silver Arrow or a Power) borrows the checklist to pick the chore it carries back. */
    const pickChoreToRecall = (by: { name: string; faIcon: string } | null = null) => {
      audio.playSound("cursor");
      recallBy.value = by;
      taskMenuMode.value = "postpone";
      sheet.value = "task";
    };

    // The bag asks the page about each tile, so it holds no battle rules
    const bagCard = (item: BattleItemLike) => (service.value ? describeBattleItem(item, itemContext()) : null);
    const opensDirectly = (item: BattleItemLike) => ["potions", "powers"].includes(battleBagRole(item));

    /** The bag's own close (its X or a swipe): it only ever clears the bag, never a sheet the bag handed over to. */
    const closeBag = () => {
      if (sheet.value === "bag") closeSheet();
    };

    /** Goods: a tile used from the bag. The bag closes first; Bottles and the Book open their sheet, a fight item acts now. */
    const useBagItem = (item: BattleItemLike) => {
      // Containers emit with no latch: only the first tap while the bag is open counts
      const isBagUnusable = sheet.value !== "bag" || !service.value || !battleStarted.value;
      if (isBagUnusable) return;
      const role = battleBagRole(item);
      const opensItsOwnSheet = role === "potions" || role === "powers";
      if (opensItsOwnSheet) {
        audio.playSound("cursor");
        sheet.value = role;
        return;
      }
      closeSheet();
      const result = useBattleItem(item, itemContext());
      if (result.needsTaskPick) {
        arrowInFlight = item;
        pickChoreToRecall();
        return;
      }
      sayItemResult(result);
    };

    // The potion and Powers sheets re-read the pack, the MP and the spent effects every time they open
    const potionCards = computed(() => (sheet.value === "potions" ? potionShelf(ctx.userId) : []));
    const powerEntries = computed(() =>
      sheet.value === "powers" && service.value ? battlePowers(abilities, itemContext()) : []
    );
    const heroSnapshot = computed(() => heroAbilitySnapshot(hero.value ?? {}));

    /** A bottle from the potion sheet. The sheet latches after one tap, so it closes on every answer, refusals too. */
    const drink = (entryId: string) => {
      const live = sheet.value === "potions" && battleStarted.value;
      closeSheet();
      if (live) sayItemResult(drinkPotion(ctx.userId, entryId));
    };

    /** A Power cast from its sheet: Recall goes on to pick a chore, everything else acts now. The sheet always closes. */
    const castPower = (abilityId: string) => {
      const live = sheet.value === "powers" && battleStarted.value && !!service.value;
      const ability = abilities.find((entry) => entry.id === abilityId);
      closeSheet();
      const cannotCastPower = !live || !ability;
      if (cannotCastPower) return;
      const result = castBattlePower(ability, itemContext());
      if (result.needsTaskPick) {
        powerInFlight = ability;
        pickChoreToRecall({ name: ability.name, faIcon: POWERS_ICON });
        return;
      }
      sayItemResult(result);
    };

    /** The hero chose the chore Recall carries back to the board. It is postponed, never completed. */
    const postponeTask = (taskId: string) => {
      const arrow = arrowInFlight;
      const power = powerInFlight;
      closeSheet();
      const isBattleNotRunning = !service.value || !battleStarted.value;
      if (isBattleNotRunning) return;
      if (arrow) sayItemResult(useBattleItem(arrow, itemContext(taskId)));
      else if (power) sayItemResult(castBattlePower(power, itemContext(taskId)));
    };

    /** The beast wound up: the hit is waiting for a tap; remind a hero who walked away. */
    const startNag = () => {
      stopNag();
      nagTimer = window.setInterval(() => {
        const engine = service.value;
        const shouldStopNagging = !engine?.hasPendingDamage() || nagCount >= STRIKE_NAG_LIMIT;
        if (shouldStopNagging) {
          stopNag();
          return;
        }
        nagCount += 1;
        audio.playSound("alert");
      }, STRIKE_NAG_MS);
    };

    const createEngine = () => {
      const engine = createBattleService({
        freeFight: ctx.kind === "free",
        passive: heroPassive(userStore.users[ctx.userId]),
      });
      engine.registerCallbacks({
        onDialogMessage: (messages) => dialog.enqueue(messages),
        onCombatTasksChange: (tasks) => {
          combatTasks.value = tasks;
          choresDone.value = tasks.filter((task) => task.isCompleted).length;
          saveBattleProgress(
            progressCtx,
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
          clearBattleProgress(progressCtx);
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
          if (encounter.value?.boss) audio.startBossBgm();
          else audio.startBattleBgm();
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

    /** The Powers for this fight; without them (no abilities database yet, a read error) the fight still runs. */
    const loadAbilities = async (): Promise<Ability[]> => {
      try {
        return await getAbilityService().getAllAbilities();
      } catch (error) {
        debug.warn("BattleField: no Powers for this fight", error);
        return [];
      }
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
        if (loaded.quest) progressCtx = { ...ctx, kind: "quest", questId: String(loaded.quest.id) };
        // Read before the engine arms the chores: arming reports an empty checklist, which clears the save
        const remembered = loadBattleProgress(progressCtx);
        abilities = await loadAbilities();
        background.lockLayers({ bg1: toLayer(route.query.bg1), bg2: toLayer(route.query.bg2) });
        background.lockLayers(loaded.background);

        const engine = createEngine();
        service.value = engine;
        usedThisFight = new Set<BattleEffectId>();
        engine.initMultiBattle(loaded.enemies, [ctx.userId]);
        currentEnemy.value = loaded.enemies[0];
        await background.applyEnemy(loaded.enemies[0]);

        // Chores finished earlier today count: the beast is still hurt
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
      const isBattleNotRunning = !engine || !battleStarted.value;
      if (isBattleNotRunning) return;
      const result = engine.handleBattleAction(action);
      const hasEscaped = action === "run" && result.success;
      if (hasEscaped) {
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
          label: "Tackle",
          faIcon: tackleIcon(hero.value?.jobClass),
          click: () => {
            audio.playSound("cursor");
            feedback.tap();
            sheet.value = "task";
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
        {
          id: "powers",
          label: "Powers",
          faIcon: POWERS_ICON,
          click: () => {
            audio.playSound("cursor");
            feedback.tap();
            sheet.value = "powers";
          },
        },
        {
          id: "item",
          label: "Goods",
          faIcon: "backpack",
          click: () => {
            audio.playSound("cursor");
            feedback.tap();
            sheet.value = "bag";
          },
        },
        { id: "run-away", label: "Run Away", faIcon: "running", fullWidth: true, click: openRunConfirm },
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

    // The clock is felt, not just seen: it ticks for the last ten seconds
    watch(atb.timerLabel, (label, previous) => {
      const isSilentTick = !atb.timerCritical.value || !label || label === previous;
      if (isSilentTick) return;
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
      const isOutsideActiveFight = !battleStarted.value || victoryCard.value;
      if (isOutsideActiveFight) {
        next();
        return;
      }
      if (sheet.value) {
        closeSheet();
        return;
      }
      openRunConfirm();
    });

    const stopEngine = () => {
      service.value?.stopAttackTimer();
      stopNag();
      closeSheet();
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
      // sheets: one at a time
      sheet,
      closeSheet,
      // attacks
      taskMenuMode,
      recallBy,
      combatTasks,
      finishCombatTask,
      postponeTask,
      // goods
      hero,
      equipment,
      bagCard,
      opensDirectly,
      closeBag,
      useBagItem,
      potionCards,
      drink,
      // powers
      powerEntries,
      heroSnapshot,
      castPower,
      // victory
      victoryCard,
      continueAfterVictory,
    };
  },
});
