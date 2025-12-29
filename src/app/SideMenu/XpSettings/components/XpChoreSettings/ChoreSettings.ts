import { defineComponent, ref, computed } from "vue";
import { useUserStore } from "@/lib/store/stores/user";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonCard,
  IonButtons,
  IonButton,
  IonIcon,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonAvatar,
  toastController,
} from "@ionic/vue";
import ionic from "@/lib/mixins/ionic";
import { arrowBack } from "ionicons/icons";

import appConfig from "@/app.config";
import { useRouter } from "vue-router";

export default defineComponent({
  name: "chore-settings",
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonCard,
    IonButtons,
    IonButton,
    IonIcon,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonAvatar,
  },
  mixins: [ionic],
  setup() {
    const userStore = useUserStore();
    const router = useRouter()

    // Initialize settings with defaults or load from storage
    const savedSettings = localStorage.getItem("choreSettings");
    const defaultSettings = {
      requireApproval: true,
      assignToParents: false,
      assignedParents: {},
      completeOverdue: true,
      showOnTodayProgress: true,
      showOnQuickUpdate: true,
      // Premium features (disabled by default)
      photoProof: false,
      lockChores: false,
      latePenalty: false,
      autoAllocate: false,
    };

    const choreSettings = ref(
      savedSettings ? JSON.parse(savedSettings) : defaultSettings
    );

    // Get all users from Pinia store
    const users = computed(() => userStore.usersAz || []);

    // Filter for parent users
    const parentUsers = computed(() => users.value.filter((u) => u.isAdult));

    // Initialize assigned parents
    parentUsers.value.forEach((parent) => {
      if (!choreSettings.value.assignedParents) {
        choreSettings.value.assignedParents = {};
      }

      if (
        typeof choreSettings.value.assignedParents[parent.id] === "undefined"
      ) {
        choreSettings.value.assignedParents[parent.id] = true;
      }
    });

    // Toggle parent assignment
    const toggleParentAssignment = (parentId: string) => {
      if (!choreSettings.value.assignedParents) {
        choreSettings.value.assignedParents = {};
      }
      choreSettings.value.assignedParents[parentId] =
        !choreSettings.value.assignedParents[parentId];
      saveChoreSettings();
    };

    // Save settings
    const saveChoreSettings = () => {
      localStorage.setItem(
        "choreSettings",
        JSON.stringify(choreSettings.value)
      );
      showToast("Chore settings saved");
    };

    // Show toast message
    const showToast = async (message: string) => {
      const toast = await toastController.create({
        message,
        duration: 2000,
        position: "bottom",
      });
      await toast.present();
    };

    return {
      choreSettings,
      parentUsers,
      toggleParentAssignment,
      saveChoreSettings,
      arrowBack,
      appConfig,
      clickSettings() {
        router.push({
          name: "xp-settings-notifications",
        });
      }
    };
  },
});
