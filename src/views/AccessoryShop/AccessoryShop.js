import { defineComponent } from "vue";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonRouterOutlet,
  IonSegment,
  IonSegmentButton,
  IonFooter,
  IonBackButton,
} from "@ionic/vue";

import {
  arrowBack,
  chevronBack,
  chevronForward,
  stop,
  play,
  pause,
  colorWand,
  colorWandOutline,
  lockClosedOutline,
  lockOpenOutline,
  sunnyOutline,
  partlySunnyOutline,
  moonOutline,
  cloudyNightOutline,
  fitnessOutline,
  sparklesOutline,
  keyOutline,
  cartOutline,
  starSharp,
  storefrontOutline,
  banOutline,
  bagOutline,
} from "ionicons/icons";
import { mapGetters } from "vuex";
import fetchItems from "@/assets/js/mixins/fetchItems.js"

export default defineComponent({
  props: ["userId"],
  name: "accessory-shop",
  components: {
    IonGrid,
    IonRow,
    IonCol,
    IonTabBar,
    IonTabButton,
    IonTabs,
    IonRouterOutlet,
    IonSegment,
    IonSegmentButton,
    IonHeader,
    IonFooter,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonPage,
    IonBackButton,
  },
  mixins: [fetchItems],
  data() {
    return {
      isLoading: false,
      request: {
        type: "xp_accessory",
        params: {
          page: 1,
          search: "",
          per_page: 4,
        },
      },
    };
  },
  mounted() {
    this.$fx.ui[this.$fx.theme.ui].openShop.play()
  },
  setup() {
    return {
      storefrontOutline,
      banOutline,
      chevronBack,
      chevronForward,
      stop,
      play,
      pause,
      arrowBack,
      colorWand,
      colorWandOutline,
      lockClosedOutline,
      lockOpenOutline,
      bagOutline,
      sunnyOutline,
      partlySunnyOutline,
      moonOutline,
      cloudyNightOutline,
      fitnessOutline,
      sparklesOutline,
      keyOutline,
      cartOutline,
      starSharp,
    };
  },
});
