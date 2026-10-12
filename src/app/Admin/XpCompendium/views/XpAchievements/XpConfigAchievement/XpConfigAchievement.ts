import { defineComponent, provide, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";
import {
  IonPage,
  IonButtons,
  IonButton,
  IonLabel,
  IonList,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonBadge,
  IonModal,
  IonDatetime,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonRouterOutlet,
  onIonViewWillEnter,
  alertController,
} from "@ionic/vue";

import XpAddCategoryModal from "./components/XpAddCategoryModal.vue";
import XpAchievementItem from "./components/XpAchievementItem.vue";
import XpTypeSelectorModal from "./components/XpTypeSelectorModal.vue";

import XpInfoToggleModal from "./components/XpInfoToggleModal.vue";
import XpWizardCoach from "./components/XpWizardCoach.vue";
import {
  useAchievementForm,
  AchievementFormInjectionKey,
} from "./hooks/useAchievementForm";

export default defineComponent({
  name: "xp-add-achievement",
  components: {
    IonPage,
    IonButtons,
    IonButton,
    IonLabel,
    IonList,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonSelect,
    IonSelectOption,
    IonCard,
    IonBadge,
    IonModal,
    IonDatetime,

    IonTabBar,
    IonTabButton,
    IonTabs,
    IonRouterOutlet,
    XpAddCategoryModal,
    XpAchievementItem,
    XpTypeSelectorModal,

    XpInfoToggleModal,
    XpWizardCoach,
  },
  props: ["id"],
  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const form = useAchievementForm();

    // Provide the entire form hook to child components
    provide(AchievementFormInjectionKey, form);

    // Destructure form to make them available to template
    const {
      // State
      achievement,
      id,
      achievements,
      beasts,
      categories,
      users,
      saveState,
      saveNow,
      categoryQuestCounts,
      getValidationMessage,

      // UI
      adventureType,
      addCategoryModalOpen,
      endsModalOpen,
      startsModalOpen,
      dueModalOpen,

      segments,
      achievementTypes,

      // Constants
      activePartyType,
      activeLoreCombo,
      activeScheduleIcon,

      assignmentTypes,

      // Selectors
      showQuestTypeSelector,
      showPartyTypeSelector,
      showTypeConfigModal,
      showApprovalModal,
      showBonusModal,

      // Actions
      loadData,
      addCategory,
      editCategories,
      deleteCategory,
      toggleApproval,
      toggleBonus,

      // Modal handlers
      dismissModal,
    } = form;

    // Lifecycle
    onIonViewWillEnter(() => {
      const idToLoad = props.id;

      const isNewQuest = !idToLoad || idToLoad === "new";
      if (isNewQuest) {
        const newId = uuidv4();
        // Load data immediately with the new ID to ensure state is ready
        loadData(newId);
        router.replace(
          `/game-master/compendium/achievements/config/${newId}/dashboard`
        );
        return;
      }

      // Safety redirect if landing on parent route without child
      if (route.name === "xp-achievement-config") {
        router.replace({
          name: "xp-achievement-config-dashboard",
          params: { id: id.value || idToLoad || "new" },
        });
        return;
      }

      loadData(idToLoad);
    });

    // Helper for UI (template uses this)
    const setNever = () => {
      achievement.value.endsOn = "";
    };

    const minEndDate = computed(() => {
      // Use startsOn if available, otherwise today
      if (achievement.value.startsOn) {
        return achievement.value.startsOn;
      }
      return new Date().toISOString();
    });

    const activeTab = computed(() => {
      const pathParts = route.path.split("/");
      return pathParts[pathParts.length - 1];
    });

    // The save chip: autosave's state in words; a draft is saved but hidden from heroes
    const SAVE_CHIPS: Record<string, { icon: string; label: string }> = {
      saving: { icon: "fa-spinner-third fa-spin", label: "Saving" },
      saved: { icon: "fa-check-circle", label: "Saved" },
      draft: { icon: "fa-pencil-ruler", label: "Draft" },
      error: { icon: "fa-exclamation-triangle", label: "Not saved" },
    };
    const saveChip = computed(() => SAVE_CHIPS[saveState.value] || null);

    const clickSaveChip = async () => {
      if (saveState.value === "error") return saveNow();
      const missing = getValidationMessage();
      const alert = await alertController.create({
        header: saveState.value === "draft" ? "Draft quest" : "Quest saved",
        message:
          saveState.value === "draft"
            ? `Heroes can't see this quest yet. It goes live by itself once it has:<br>${missing.replace(/\n/g, "<br>")}`
            : "Changes save by themselves. Heroes see this quest.",
        buttons: ["OK"],
      });
      await alert.present();
    };

    return {
      // Form State
      achievement,
      saveChip,
      saveState,
      clickSaveChip,
      categoryQuestCounts,
      // id, // Removed to avoid vue/no-dupe-keys with props.id
      minEndDate,
      achievements,
      beasts,
      categories,
      users,

      // Form UI
      adventureType,
      addCategoryModalOpen,
      endsModalOpen,
      startsModalOpen,
      dueModalOpen,

      segments,
      achievementTypes,

      // Form Constants
      activePartyType,
      activeLoreCombo,
      activeScheduleIcon,
      assignmentTypes,

      // Form Selectors
      showQuestTypeSelector,
      showPartyTypeSelector,
      showTypeConfigModal,
      showApprovalModal,
      showBonusModal,

      // Form Actions
      addCategory,
      editCategories,
      deleteCategory,
      toggleApproval,
      toggleBonus,
      dismissModal,

      // Local Actions/State
      setNever,
      activeTab,
    };
  },
});
