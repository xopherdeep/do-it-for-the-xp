import { defineComponent, provide, computed, ref } from "vue";
import {
  IonPage,
  IonContent,
  IonButton,
  IonModal,
  IonDatetime,
  IonRange,
  onIonViewWillEnter,
  toastController,
} from "@ionic/vue";

import { play$fx } from "@/assets/fx";
import { useBack } from "@/hooks/useBack";
import debug from "@/lib/utils/debug";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import XpHeroFanfare from "@/components/organisms/HeroFanfare/XpHeroFanfare.vue";
import XpWizardShell from "@/components/organisms/WizardShell/XpWizardShell.vue";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";

import XpAddCategoryModal from "./components/XpAddCategoryModal.vue";
import XpInfoToggleModal from "./components/XpInfoToggleModal.vue";
import QuestTypeTab from "./components/tabs/QuestTypeTab.vue";
import QuestHerosTab from "./components/tabs/QuestHerosTab.vue";
import QuestScheduleTab from "./components/tabs/QuestScheduleTab.vue";
import QuestRewardsTab from "./components/tabs/QuestRewardsTab.vue";
import QuestDashboardTab from "./components/tabs/QuestDashboardTab.vue";
import {
  useAchievementForm,
  AchievementFormInjectionKey,
} from "./hooks/useAchievementForm";
import { useNewQuestOpening } from "./hooks/useNewQuestOpening";
import {
  ASSIGNMENT_CHOICES,
  QUEST_KINDS,
  openingIndex,
  questConfigSteps,
  questMissing,
  readySubtitle,
  stepIndexOf,
} from "../questConfigWizard";
import type { QuestKind, QuestStepId } from "../questConfigWizard";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";

/**
 * The Game Master's quest config as a wizard (docs: compendium-wizards-design, W4): What's the chore? -> Who does it?
 * -> When? -> How hard? -> Ready? The header, dots, guide line, Back / Next and the verb are XpWizardShell; the rules
 * and the words of each step live in ../questConfigWizard.ts; the tabs of the old form are the step bodies.
 *
 * The 2 second autosave (useAchievementForm) is still how the quest is kept: a new quest is saved as a draft that
 * heroes never see until the last step's verb marks it Ready (questDrafts.ts). A new quest opens on step one; a saved
 * one on the summary (or, for a draft, on the first step that still wants an answer), with the dots leading back.
 * New Quest with a draft still waiting asks first, in the game's own prompt: Resume it, Discard it, or Not now.
 */
export default defineComponent({
  name: "xp-add-achievement",
  components: {
    IonPage,
    IonContent,
    IonButton,
    IonModal,
    IonDatetime,
    IonRange,
    XpLoading,
    XpHeroFanfare,
    XpWizardShell,
    XpRevealPrompt,
    XpAddCategoryModal,
    XpInfoToggleModal,
    QuestTypeTab,
    QuestHerosTab,
    QuestScheduleTab,
    QuestRewardsTab,
    QuestDashboardTab,
  },
  props: ["id"],
  setup(props) {
    const form = useAchievementForm();

    // Provide the entire form hook to the step bodies
    provide(AchievementFormInjectionKey, form);

    // The quest app's purple, cream text on it (the Beast wizard wears it too); the shop item wizard wears Goods red
    const { rootClass, rootStyle } = useAppSkin("quests");
    const { stepBack: goBack } = useBack();

    // Destructure form to make them available to template
    const {
      // State
      achievement,
      categories,
      saveState,
      saveNow,
      categoryQuestCounts,
      users,
      beastAvatarUrl,

      // UI
      adventureType,
      addCategoryModalOpen,
      endsModalOpen,
      startsModalOpen,
      dueModalOpen,
      fibonacciIndex,
      fibonacciArray,
      formatFibonacciValue: displayFibonacciValue,
      handleDifficultyChange,

      // Selectors
      showApprovalModal,
      showBonusModal,

      // Actions
      loadData,
      loadNewQuestOpening,
      confirmReady: markReady,
      savePending: flushSave,
      selectCategory: pickCategory,
      addCategory,
      editCategories,
      deleteCategory,
      toggleApproval,
      toggleBonus,
    } = form;

    // The Who guide follows the way the quest is shared, so the steps are made again when that changes
    const steps = computed(() => questConfigSteps(achievement.value.type));
    const position = ref(0);
    const isOpen = ref(false);
    // The quest the wizard has opened for: coming back from the beast pages must not send it to another step
    const openedFor = ref("");
    // A new quest, or one that was still a draft when opened: making it Ready is its debut, so it gets the fanfare
    const isDebut = ref(true);
    const isFinishing = ref(false);
    const showFanfare = ref(false);

    // ---- Toasts: no Ionic alerts (an rpg toast, in the middle, with a close button) ----------------------------------
    const say = async (header: string, message?: string) => {
      try {
        const toast = await toastController.create({
          header,
          message,
          duration: 2600,
          position: "middle",
          buttons: [{ text: "Close", role: "cancel" }],
          cssClass: "rpg-toast",
        });
        await toast.present();
      } catch (error) {
        debug.warn("[QuestWizard] the toast could not be shown", error);
      }
    };

    // ---- Opening -----------------------------------------------------------------------------------------------------
    const open = async (questId: string) => {
      try {
        const loaded = await loadData(questId);
        const isNewlyOpened = openedFor.value !== questId;
        if (isNewlyOpened) {
          openedFor.value = questId;
          isDebut.value = !loaded.isSaved || loaded.wasDraft;
          position.value = openingIndex(steps.value, achievement.value, loaded.isSaved);
        }
      } catch (error) {
        // Open on a blank quest rather than on a blank page
        debug.warn("[QuestWizard] the quest could not be opened", error);
      }
      isOpen.value = true;
    };

    // ---- New Quest: a draft still waiting is resumed or discarded first; only with none is a new id minted ----------
    const {
      newQuestPrompt: draftPrompt,
      submitAnswer: respondDraft,
      startNewQuest,
    } = useNewQuestOpening({ loadOpening: loadNewQuestOpening, openQuest: open, say, goBack });

    // Lifecycle
    onIonViewWillEnter(() => {
      const idToLoad = props.id;

      const isNewQuest = !idToLoad || idToLoad === "new";
      if (isNewQuest) {
        void startNewQuest();
        return;
      }

      void open(idToLoad);
    });

    // ---- The steps' own fields, at the bottom in thumb reach -----------------------------------------------------------
    const pickKind = (kind: QuestKind) => {
      play$fx("cursor");
      adventureType.value = kind;
    };

    const pickAssignment = (type: string) => {
      play$fx("cursor");
      achievement.value.type = type;
    };

    const closeKeyboard = (event: Event) => (event.target as HTMLElement | null)?.blur?.();

    const goToStep = (id: QuestStepId) => {
      const target = stepIndexOf(steps.value, id);
      const isKnownStep = target >= 0;
      if (isKnownStep) position.value = target;
    };

    // ---- The Save chip: autosave's state in words; a draft is saved but hidden from heroes until Ready ----------------
    const SAVE_CHIPS: Record<string, { icon: string; label: string }> = {
      saving: { icon: "fa-spinner-third fa-spin", label: "Saving" },
      saved: { icon: "fa-check-circle", label: "Saved" },
      draft: { icon: "fa-pencil-ruler", label: "Draft" },
      error: { icon: "fa-exclamation-triangle", label: "Not saved" },
    };
    const saveChip = computed(() => SAVE_CHIPS[saveState.value] || null);

    const clickSaveChip = async () => {
      const isError = saveState.value === "error";
      if (isError) return saveNow();
      const isDraft = saveState.value === "draft";
      if (isDraft) {
        const missing = questMissing(achievement.value);
        await say(
          "Draft quest",
          missing.length
            ? `Heroes can't see this quest yet. It still needs: ${missing.join(", ")}. Then tap Ready on the last step.`
            : "Heroes can't see this quest yet. Tap Ready on the last step and they will."
        );
        return;
      }
      await say("Quest saved", "Changes save by themselves. Heroes see this quest.");
    };

    // ---- Leaving, and the verb -------------------------------------------------------------------------------------------
    const leave = async () => {
      // An edit still waiting for the 2 second timer is saved now, not lost
      await flushSave();
      goBack();
    };

    const heroName = (heroId: string): string => {
      const hero = users.value.find((user) => user.id === heroId);
      return hero?.name?.nick || hero?.name?.first || "";
    };
    const fanfareSubtitle = computed(() => readySubtitle(achievement.value, heroName));

    const makeReady = async () => {
      const isBusy = isFinishing.value || showFanfare.value;
      if (isBusy) return;
      isFinishing.value = true;
      try {
        const isMarkedReady = await markReady();
        if (!isMarkedReady) {
          play$fx("no");
          void say("It could not be saved", "Try Ready once more.");
          return;
        }
        if (isDebut.value) {
          // The quest is saved: the fanfare, then the quest list
          showFanfare.value = true;
          return;
        }
        play$fx("yes");
        void say("Quest updated", "Your changes are saved. Heroes see this quest.");
        goBack();
      } finally {
        isFinishing.value = false;
      }
    };

    const finishFanfare = () => {
      showFanfare.value = false;
      goBack();
    };

    // ---- Date pickers ----------------------------------------------------------------------------------------------------
    const setNever = () => {
      achievement.value.endsOn = "";
    };

    const minEndDate = computed(() => {
      // Use startsOn if available, otherwise today
      const startsOn = achievement.value.startsOn;
      if (startsOn) {
        return startsOn;
      }
      return new Date().toISOString();
    });

    return {
      // The date pickers start on the family's first day of the week (the rules are loaded at start-up, App's lights out)
      weekStart: computed(() => useGameRulesStore().weekStartsOn),
      // Form State
      achievement,
      categories,
      categoryQuestCounts,
      saveChip,
      saveState,
      beastAvatarUrl,
      minEndDate,

      // New Quest's question about a draft still waiting
      draftPrompt,
      respondDraft,

      // The wizard
      steps,
      position,
      isOpen,
      isFinishing,
      showFanfare,
      fanfareSubtitle,
      rootClass,
      rootStyle,
      QUEST_KINDS,
      ASSIGNMENT_CHOICES,
      adventureType,
      pickKind,
      pickAssignment,
      closeKeyboard,
      goToStep,
      clickSaveChip,
      leave,
      makeReady,
      finishFanfare,

      // The difficulty slider
      fibonacciIndex,
      fibonacciArray,
      displayFibonacciValue,
      handleDifficultyChange,

      // Form UI
      addCategoryModalOpen,
      endsModalOpen,
      startsModalOpen,
      dueModalOpen,
      showApprovalModal,
      showBonusModal,

      // Form Actions
      pickCategory,
      addCategory,
      editCategories,
      deleteCategory,
      toggleApproval,
      toggleBonus,

      // Local Actions
      setNever,
    };
  },
});
