import { defineComponent, PropType } from "vue";
import { mapGetters } from "vuex";
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
  [stat: string]: number;
}

interface UserData {
  name?: {
    first?: string;
    middle?: string;
    last?: string;
  };
  stats: UserStats;
  [key: string]: any;
}

const icons = {
  chevronBack,
  colorWand,
  arrowBack,
  fitnessOutline
};

export default defineComponent({
  props: {
    userId: {
      type: String as PropType<string>,
      required: true
    }
  },
  name: "user-profile",
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
  },

  computed: {
    ...mapGetters(["getUserById"]),
    user(): UserData {
      const userData = this.getUserById(this.userId) || {} as UserData;
      // Ensure stats exists to prevent "Cannot read properties of undefined (reading 'stats')" error
      if (!userData.stats) {
        userData.stats = {};
      }
      return userData;
    },
  },
  updated() {
    // this.$refs.userStats.present()
  },
  mounted() {
    // modalController.present()
  },

  setup() {
    return {
      modalController,
      ...icons
    };
  },
});
