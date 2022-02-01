import { defineComponent } from "vue";
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
  accessibilityOutline

} from "ionicons/icons";

export default defineComponent({
  props: ["id"],
  components: {
    IonIcon,
    IonLabel,
    IonPage,
    IonTabBar,
    IonTabButton,
    IonTabs,
    IonRouterOutlet,
  },
  computed: {
    user_id() {
      return this.id;
    },
    user() {
      return this.users.find((user) => user.id == this.user_id);
    },
  },
  setup() {
    const beforeTabChange = () => {
      // do something before tab change
    };
    const afterTabChange = () => {
      // do something after tab change
    };
    return {
      home,
      calendar,
      peopleCircle,
      beforeTabChange,
      afterTabChange,
      chatbox,
      wallet,
      personCircle,
      requireImg,
      storefrontOutline,
  fitnessOutline,
  medkitOutline,
  medalOutline,
      accessibilityOutline
    };
  },
});
