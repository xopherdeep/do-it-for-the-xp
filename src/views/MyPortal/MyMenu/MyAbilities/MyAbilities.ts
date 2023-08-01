import { computed, defineComponent } from "vue";
import ionic from "@/mixins/ionic";
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
  IonSearchbar,
  IonFooter,
  IonBackButton
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
  accessibilityOutline,
} from "ionicons/icons";
import { mapState, useStore } from "vuex";

import fetchItems from "@/mixins/fetchItems"

export default defineComponent({
  props: ["userId"],
  name: "my-abilities",
  components: {
    IonBackButton,
    IonSearchbar,
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
  },
  mixins: [fetchItems, ionic],
  data() {
    return {
      isLoading: false,
      request: {
        type: "xp_ability",
        params: {
          page: 1,
          search: "",
          per_page: 8,
        },
      },
    };
  },
  computed: {
    ...mapState(["xp_ability"]),
  },
  setup(props) {
    const store = useStore();
    const user = computed(() => store.getters.getUserById(props.userId));
    return {
      accessibilityOutline,
      arrowBack,
      chevronBack,
      chevronForward,
      colorWand,
      colorWandOutline,
      lockClosedOutline,
      lockOpenOutline,
      pause,
      play,
      stop,
      user,
    };
  },
});
