import { defineComponent, PropType, computed } from "vue";
import { useUserStore } from "@/lib/store/stores/user";
import { JOB_CLASS_OPTIONS, FOOD_OPTIONS } from "@/constants";
import {
  IonBackButton,
  IonButton,
  IonIcon,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonItemGroup,
  IonItemDivider,
  IonLabel,
  IonNote,
  IonAccordion,
  IonAccordionGroup,
  IonList,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonCardTitle,
  IonCardSubtitle,
  IonAvatar,
  IonImg,
  IonBadge,
  IonProgressBar,
  IonChip,
  modalController
} from "@ionic/vue";

import {
  chevronBack,
  fitnessOutline,
  colorWand,
  sparklesOutline,
  serverOutline,
  arrowBack
} from "ionicons/icons";
import Ionic from "@/lib/mixins/ionic";

// Define interfaces for type safety
interface StatInfo {
  [key: string]: string;
}

interface Area {
  open?: boolean;
  color: string;
  icon: string;
  stats: StatInfo;
}

interface Areas {
  [category: string]: Area;
}

interface UserStats {
  [stat: string]: any;
}

interface UserData {
  id?: string;
  name?: {
    first?: string;
    middle?: string;
    last?: string;
    nick?: string;
    full?: string;
  };
  stats: UserStats;
  avatar?: string;
  jobClass?: string;
  favoriteFood?: string;
  race?: string;
  currentActivity?: string;
  [key: string]: any;
}

const icons = {
  chevronBack,
  colorWand,
  arrowBack,
  fitnessOutline,
  sparklesOutline,
  serverOutline
};

export default defineComponent({
  props: {
    userId: {
      type: String as PropType<string>,
      required: true
    }
  },
  name: "user-profile",
  mixins: [Ionic],
  data(): { areas: Areas } {
    return {
      areas: {
        physical: {
          open: true,
          color: 'danger',
          icon: fitnessOutline,
          stats: {
            strength: 'Use less HP when completing a task',
            defense: 'Influences max HP',
            endurance: 'Influences HP restore rate',
          }
        },
        mental: {
          open: false,
          color: 'tertiary',
          icon: colorWand,
          stats: {
            intelligence: 'Use less MP when casting abilities',
            perception: 'Influences max MP',
            wisdom: 'Influences MP restore rate',
          }
        },
        social: {
          color: 'warning',
          icon: serverOutline,
          stats: {
            charisma: 'Influences GP discounts on items',
            awareness: 'Gain more GP when completing tasks',
            presence: 'Influences GP to $ conversion rate',
          }
        },
        misc: {
          color: 'success',
          icon: sparklesOutline,
          stats: {
            agility: 'Gain more AP when completing tasks',
            guts: 'Gain more XP when completing tasks',
            luck: 'Influence chances of receiving bonus points'
          }
        }
      }
    };
  },
  components: {
    IonList,
    IonAccordion,
    IonAccordionGroup,
    IonItem,
    IonItemGroup,
    IonItemDivider,
    IonLabel,
    IonNote,
    IonBackButton,
    IonButtons,
    IonButton,
    IonContent,
    IonHeader,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonIcon,
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonCardTitle,
    IonCardSubtitle,
    IonAvatar,
    IonImg,
    IonBadge,
    IonProgressBar,
    IonChip
  },

  setup(props) {
    const userStore = useUserStore();
    const requireAvatar = require.context("@/assets/images/avatars/", false, /\.svg$/);

    // User computed from Pinia store
    const user = computed((): UserData => {
      const userData = userStore.getUserById(props.userId) || {} as UserData;
      // Ensure stats exists to prevent "Cannot read properties of undefined (reading 'stats')" error
      if (!userData.stats) {
        userData.stats = {};
      }
      return userData;
    });

    // Helper to get class icon
    const getClassIcon = (className: string | undefined): string => {
      if (!className) return 'fa-shield-alt';
      const jobClass = JOB_CLASS_OPTIONS.find(j => j.name === className);
      return jobClass?.icon || 'fa-shield-alt';
    };

    // Helper to get food icon
    const getFoodIcon = (foodName: string | undefined): string => {
      if (!foodName) return 'fa-utensils';
      const food = FOOD_OPTIONS.find(f => f.value === foodName);
      return food?.icon || 'fa-utensils';
    };

    // Helper to get area icon (Font Awesome class)
    const getAreaFaIcon = (category: string): string => {
      const iconMap: Record<string, string> = {
        physical: 'fa-heartbeat',
        mental: 'fa-brain',
        social: 'fa-users',
        misc: 'fa-stars'
      };
      return iconMap[category] || 'fa-chart-bar';
    };

    // Helper to calculate area total
    const getAreaTotal = (area: Area, stats: UserStats): number => {
      return Object.keys(area.stats).reduce((total, stat) => {
        return total + (stats[stat] || 0);
      }, 0);
    };

    // Experience Progress calculation
    const xpProgress = computed(() => {
      const stats = user.value?.stats;
      if (!stats || !stats.xp) return 0;

      const now = stats.xp.now || stats.xp.current || 0;
      const next = stats.xp.next_level || stats.xp.max || 100;

      return Math.min(Math.max(now / next, 0), 1);
    });

    return {
      user,
      requireAvatar,
      $requireAvatar: requireAvatar,
      modalController,
      getClassIcon,
      getFoodIcon,
      getAreaFaIcon,
      getAreaTotal,
      xpProgress,
      ...icons
    };
  },
});
