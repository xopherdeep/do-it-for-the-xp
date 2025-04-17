import { computed, defineComponent, reactive, ref } from "vue";
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
import useAbilities from "@/hooks/useAbilities";
import { useQueryClient } from "vue-query";
import { useRouter } from "vue-router";

import XpSwiperGallery from "@/components/XpSwiperGallery/XpSwiperGallery.vue";

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
    XpSwiperGallery
  },
  mixins: [fetchItems, ionic],
  data() {
    return {
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
    pageNumbers() {
      const { params: { page, per_page }, nTotal } = this
      const max = Number(page) * Number(per_page)

      return {
        min: max - (per_page - 1),
        max: max < nTotal
          ? max
          : nTotal
      }
    },
  },

  methods: {
    segmentChanged($ev) {
      // console.log($ev);
    },
    slidePrev() {
      this.page--;
    },
    slideNext() {
      this.page++;
    },
    changePage(page) {
      this.page = page
    }
  },
  setup(props) {
    const store = useStore();
    const user = computed(() => store.getters.getUserById(props.userId));
    const queryClient = useQueryClient();
    const nTotal = ref(0);
    const nTotalPages = ref(0);
    const router = useRouter();
    const controlledSwiper = ref(null);
    const setControlledSwiper = (swiper) => {
      controlledSwiper.value = swiper;
    };

    const params = reactive({
      page: 1,
      search: "",
      per_page: 4,
      _embed: true
    });

    const page = computed({
      get: () => params.page,
      set: page => params.page = page
    })

    const updateTotals = ({ data, headers }) => {
      nTotal.value = Number(headers.get("x-wp-total"));
      nTotalPages.value = Number(headers.get("x-wp-totalpages"));
      return data;
    }

    const {
      isLoading,
      isError,
      data: items,
      error,
      isFetching,
    } = useAbilities(page.value, params, updateTotals);

    return {
      page,
      params,
      nTotal,
      nTotalPages,
      items,
      isLoading,
      isError,
      error,
      isFetching,
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
