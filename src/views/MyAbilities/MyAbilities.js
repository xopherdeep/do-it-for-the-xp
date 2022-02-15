import { computed, defineComponent } from "vue";
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
import { mapActions, mapGetters, mapState, useStore } from "vuex";

import fetchItems from "@/assets/js/mixins/fetchItems.js"

export default defineComponent({
  props: ["userId"],
  name: "my-abilities",
  components: {
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
  mixins: [fetchItems],
  data() {
    return {
      isLoading: false,
      request: {
        type: "xp_ability",
        params: {
          page: 1,
          search: "",
          per_page: 4,
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
