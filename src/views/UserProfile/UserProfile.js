import { defineComponent } from "vue";
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
  IonList
} from "@ionic/vue";

import { 
  chevronBack,
  fitnessOutline,
  colorWand,
  sparklesOutline,
  infinite,
  happyOutline,
  serverOutline,
  arrowBack
 } from "ionicons/icons";

const icons = {
  chevronBack,
  colorWand,
  arrowBack,
  fitnessOutline
} 

export default defineComponent({
  props: ["userId"],
  name: "user-profile",
  data(){
    return {
      areas: {
        physical: {
          open: true,
          color:'danger',
          icon: fitnessOutline,
          stats: {
            strength : 'Use less HP when completing a task',
            defense  : 'Influences max HP',
            endurance: 'Influences HP restore rate',
          }
        },
        mental : {
          open: false,
          color:'tertiary',
          icon: colorWand,
          stats: {
            intelligence: 'Use less MP when casting abilities',
            perception  : 'Influences max MP',
            wisdom      : 'Influences MP restore rate',
          }
        },
        social: {
          color:'warning',
          icon: serverOutline,
          stats: {
            charisma: 'Gain more GP when completing tasks',
            charm   : 'Influences GP discounts on items',
            presence: 'Influences GP to $ conversion rate',
          }
        },
        misc: {
          color:'success',
          icon: sparklesOutline,
          stats: {
            agility: 'Gain more AP when completing tasks',
            guts   : 'Gain more XP when completing tasks',
            luck   : 'Influence chances of receiving bonus points'
          }
        }
      }
    }
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
    user() {
      return this.getUserById(this.userId);
    },
  },

  setup() {
    // code
    return {
      ...icons
    };
  },
});
