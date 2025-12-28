import { defineComponent, provide, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import { 
  IonPage, IonButtons, 
  IonButton, IonLabel, IonList, IonItem, 
  IonItemSliding, IonItemOptions, IonItemOption,
  IonSelect, IonSelectOption,
  IonCard, IonBadge, IonModal, IonDatetime, 
  IonDatetimeButton, IonTabBar, IonTabButton,
  IonTabs, IonRouterOutlet,
  onIonViewWillEnter
} from '@ionic/vue';

import XpAddCategoryModal from "./components/XpAddCategoryModal.vue";
import XpAchievementItem from "./components/XpAchievementItem.vue";
import XpTypeSelectorModal from "./components/XpTypeSelectorModal.vue";

import XpInfoToggleModal from "./components/XpInfoToggleModal.vue";
import XpWizardCoach from "./components/XpWizardCoach.vue";
import { useAchievementForm, AchievementFormInjectionKey } from './hooks/useAchievementForm';

export default defineComponent({
  name: 'xp-add-achievement',
  components: {
    IonPage, IonButtons, IonButton, IonLabel, IonList, IonItem, 
    IonItemSliding, IonItemOptions, IonItemOption,
    IonSelect, IonSelectOption,
    IonCard, IonBadge, IonModal, IonDatetime, 
    IonDatetimeButton, IonTabBar, IonTabButton,
    IonTabs, IonRouterOutlet,
    XpAddCategoryModal,
    XpAchievementItem,
    XpTypeSelectorModal,

    XpInfoToggleModal,
    XpWizardCoach
  },
  props: ['id'],
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
      dismissModal
    } = form;

    // Lifecycle
    onIonViewWillEnter(() => {
      const idToLoad = props.id;
      
      if (!idToLoad || idToLoad === 'new') {
        const newId = uuidv4();
        // Load data immediately with the new ID to ensure state is ready
        loadData(newId);
        router.replace(`/game-master/compendium/setup/achievements/config/${newId}/splash`);
        return;
      }
      
      // Safety redirect if landing on parent route without child
      if (route.name === 'xp-achievement-config') {
        router.replace({ name: 'xp-achievement-config-splash', params: { id: id.value || idToLoad || 'new' } });
        return;
      }

      loadData(idToLoad);
    });

    // Helper for UI (template uses this)
    const setNever = () => {
      achievement.value.endsOn = '';
      endsModalOpen.value = false;
    };

    const activeTab = computed(() => {
      const pathParts = route.path.split('/');
      return pathParts[pathParts.length - 1];
    });

    return {
      // Form State
      achievement,
      // id, // Removed to avoid vue/no-dupe-keys with props.id
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
      activeTab
    };
  }
});
