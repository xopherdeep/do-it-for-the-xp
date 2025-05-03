import { computed, defineComponent, reactive, ref } from "vue";
import XpApi from "@/lib/api/doit.forthexp.com.api";
import ionic from "@/mixins/ionic";
import {
  IonBackButton,
  alertController, 
  IonicSlides,
} from "@ionic/vue";
import {
  ribbonOutline,
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
  medalOutline,
  bagOutline,
  checkmarkDone,
} from "ionicons/icons";
import { mapActions, mapState } from "vuex";

import fetchItems from "@/mixins/fetchItems";

import MyTask from "../MyTask/MyTask.vue";
import { useRouter } from "vue-router";
// import { useSwiper } from "swiper/vue";
import { Controller, Navigation, Swiper as SwiperClass } from "swiper";
import { useQuery, useQueryClient } from "vue-query";
import useQuests from "@/hooks/useQuests";
import debug from "@/lib/utils/debug";

export default defineComponent({
  props: ["userId"],
  name: "my-quests",
  components: {
    IonBackButton,
    MyTask, 
  },
  data() {
    return {
      activeModal: 0,
      swiperNavigation: {
        nextEl: "#swiper-forward",
        prevEl: "#swiper-back",
      },
    };
  },
  mixins: [fetchItems, ionic],
  activated() {
    this.$fx.ui[this.$fx.theme.ui].openPage.play();
    // const mp3 = this.$requireAudio('./take_item.mp3')
    // this.nativeAudio.preloadSimple('openTask', mp3).then(onSuccess, onError)
    // this.nativeAudio.preloadSimple('openTask', '../src/assets/audio/click.mp3').then(onSuccess, onError)
  },
  computed: {
    ...mapState(["xp_achievement"]),
    isPrevDisabled() {
      return this.currentSlide == 0;
    },
    currentSlide() {
      return this.controlledSwiper?.activeIndex;
    },
    hasNextPage() {
      return this.page < this.nTotalPages;
    },
    searchText: {
      get() {
        return this.params.search;
      },
      set(text) {
        this.params.search = text;
        this.params.page = 1;
      },
    },
    pageNumbers() {
      const {
        params: { page, per_page },
        nTotalTasks,
      } = this;
      const max = Number(page) * Number(per_page);

      return {
        min: max - (per_page - 1),
        max: max < nTotalTasks ? max : nTotalTasks,
      };
    },
  },
  methods: {
    ...mapActions(["fetchWPItems"]),
    clickBack() {
      const hasHistory = this.$historyCount - window.history.length;
      // console.log("hashistory", hasHistory);
      if (hasHistory) this.router.go(-1);
      else this.router.push(`/my-portal/${this.userId}`);
    },
    clickItem(item) {
      this.activeModal = item.id;
    },
    isModalOpen(id) {
      return this.activeModal == id;
    },
    clickComplete() {
      this.activeModal = 0;
      this.presentAlertMultipleButtons();
    },
    slidePrev() {
      this.page--;
    },
    slideNext() {
      this.page++;
    },
    async presentAlertMultipleButtons() {
      const alert = await alertController.create({
        cssClass: "my-custom-class",
        header: "Points Rewarded",
        subHeader: "Subtitle",
        message: "This is an alert message.",
        buttons: ["Collect Loot"],
      });
      return alert.present();
    },
    // showLoading() {
    //   this.isLoading = true;
    // },
    // hideLoading() {
    //   this.isLoading = false;
    // },
    fetchTasks() {
      // return this.fetchWPItems(this.params).then(this.fetchImages);
    },
    getFeaturedImg(embedded) {
      const [img] = embedded["wp:featuredmedia"] || [{}];
      return {
        src: img?.source_url,
        alt: img?.alt_text,
      };
    },
    getImgObj(id) {
      const img = this.getSingleMediaById(id);
      if (img)
        return {
          src: img.source_url,
          alt: img.alt_text,
          title: img.title.rendered,
        };
    },
    getSingleMediaById(id) {
      return this.singleById({ type: "media", id });
    },
    searchChanged() {
      // Using type assertion to fix the TypeScript error
      (this.$refs.slides as { slideTo: (index: number) => void }).slideTo(0);
      this.currentSlide = 0;
      this.params.page = 1;
    },
    resetTextSound() {
      this.$fx.rpg[this.$fx.theme.rpg].text.pause();
      this.$fx.rpg[this.$fx.theme.rpg].text.currentTime = 0;
      this.$fx.rpg[this.$fx.theme.rpg].text.play();
    },
    playTextSound() {
      this.$fx.rpg[this.$fx.theme.rpg].text.play();
    },

    segmentChanged($ev) {
      debug.log("Segment changed", $ev);
    },
  },
  watch: {
    params: {
      deep: true,
      handler() {
        this.play$fx("text");
        // const { $fx: { rpg, theme } } = this
        // const { text } = rpg[theme.rpg]

        // // if(text) text.play();

        // console.log("WAATCH", rpg, theme);
        // console.log("text", text);
        // this.$fx.rpg[this.$fx.theme.rpg].text.play();
      },
    },
  },
  setup() {
    const queryClient = useQueryClient();
    const nTotalTasks = ref(0);
    const nTotalPages = ref(0);
    const router = useRouter();
    const controlledSwiper = ref<SwiperClass | null>(null);
    const setControlledSwiper = (swiper: SwiperClass) => {
      controlledSwiper.value = swiper;
    };

    const params = reactive({
      page: 1,
      search: "",
      per_page: 4,
      _embed: true,
    });

    const page = computed({
      get: () => params.page,
      set: (page) => (params.page = page),
    });

    const updateTotals = ({ data, headers }) => {
      nTotalTasks.value = Number(headers.get("x-wp-total"));
      nTotalPages.value = Number(headers.get("x-wp-totalpages"));
      return data;
    };

    const {
      isLoading,
      isError,
      data: tasks,
      error,
      isFetching,
    } = useQuests(page.value, params, updateTotals);

    const getSlideItems = (p) =>
      queryClient.getQueryData(["tasks", p, params]) || [];

    const slideItems = computed(() => {
      return queryClient.getQueryData(["tasks", page.value, params]) || [];
    });

    // const featuredMedia = computed({
    //   get() {
    //     return slideItems.value.map((t) => t.featured_media).join(",");
    //   },
    // });

    // const { data: images } = useImages({
    //   type: "media",
    //   include: featuredMedia.value,
    // });

    return {
      useTasks,
      params,
      tasks,
      // images,
      // featuredMedia,
      page,
      getSlideItems,
      slideItems,
      nTotalTasks,
      nTotalPages,
      isLoading,
      isError,
      error,
      isFetching,
      controlledSwiper,
      setControlledSwiper,
      modules: [IonicSlides, Navigation, Controller],
      router,
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
      medalOutline,
      ribbonOutline,
      checkmarkDone,
    };

    function useTasks(page, params) {
      return useQuery(["tasks", page, params], fetchAchievements, {
        refetchOnWindowFocus: false,
        keepPreviousData: true,
      });

      async function fetchAchievements() {
        await XpApi.get("xp_achievement", params).then(updateTotals);
      }

      function updateTotals({ data, headers }) {
        nTotalTasks.value = Number(headers.get("x-wp-total"));
        nTotalPages.value = Number(headers.get("x-wp-totalpages"));
        return data;
      }
    }

    // function useImages({ type, include }) {
    //   const params = { include };
    //   const options = {
    //     keepPreviousData: true,
    //     refetchOnWindowFocus: false,
    //     enabled: !!include.length,
    //   };

    //   const fetchImages = async () => await XpApi
    //     .get(type, params).then(({ data }) => data);

    //   return useQuery(["images", page.value, include], fetchImages, options);
    // }
  },
});
