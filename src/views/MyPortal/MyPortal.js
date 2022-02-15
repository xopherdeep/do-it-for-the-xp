import { computed, defineComponent } from "vue";
import requireImg from "@/assets/js/requireImg";
import {
  IonIcon,
  IonLabel,
  IonPage,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonRouterOutlet,
} from "@ionic/vue";

import {
  calendar,
  peopleCircle,
  home,
  chatbox,
  wallet,
  personCircle,
  fitnessOutline,
  storefrontOutline,
  medkitOutline,
  medalOutline,
  accessibilityOutline,
} from "ionicons/icons";

import { mapGetters, useStore } from "vuex";

export default defineComponent({
  components: {
    IonIcon,
    IonLabel,
    IonPage,
    IonTabBar,
    IonTabButton,
    IonTabs,
    IonRouterOutlet,
  },
  setup(props) {
    const store = useStore();

    const user = computed(() => store.getters.getUserById(props.userId)) 

    return {
      user,
      accessibilityOutline,
      storefrontOutline,
      fitnessOutline,
      peopleCircle,
      personCircle,
      medkitOutline,
      medalOutline,
      requireImg,
      calendar,
      chatbox,
      wallet,
      home,
    };
  },
});
