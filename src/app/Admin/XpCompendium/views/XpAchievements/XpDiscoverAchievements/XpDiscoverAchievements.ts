import { useInfiniteQuests } from "@/hooks/useQuests";
import { useTimers } from "@/hooks/useTimers";
import { computed, defineComponent, reactive, ref } from "vue";
import { useQueryClient } from "vue-query";
import XpApi from "@/lib/api/doit.forthexp.com.api";
// import ionic from "@/lib/mixins/ionic";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import {
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonGrid,
  IonModal,
  IonRow,
  IonSearchbar,
  IonToolbar,
  alertController,
  IonicSlides,
  InfiniteScrollCustomEvent,
  modalController,
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

import { useGameStore } from "@/lib/store/stores/game";
import { useUserStore } from "@/lib/store/stores/user";
import { mapStores } from "pinia";

import MyTask from "@/app/Console/MyPortal/UserHud/MyTask/MyTask.vue";
// import { useSwiper } from "swiper/vue";
import type Swiper from "swiper";
import { Controller, Navigation } from "swiper/modules";
import { useQuery } from "vue-query";

import XpAchievementDetails from "./XpAchievementDetails.vue"
import { AchievementDb } from "@/lib/databases";
import { Storage, Drivers } from "@ionic/storage";


const achievementStorage = new Storage({
  name: "__achievements",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export const XpDiscoverAchievements = defineComponent({
  name: 'xp-discover-achievements',
  mixins: [],
  props: ["userId"], // Added missing prop
  components: {
    IonButton,
    IonButtons,
    IonCol,
    IonContent,
    IonGrid,
    IonModal,
    IonRow,
    IonSearchbar,
    IonToolbar,
    XpLoading,
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
  activated() {
    this.$fx.ui[this.$fx.theme.ui].openPage.play();
  },
  computed: {
    ...mapStores(useUserStore),
    user() {
      return this.userStore.getUserById(this.userId);
    },
    xp_achievement() { return (this as any).gameStore.xp_achievement },
    isPrevDisabled() {
      return this.currentSlide == 0;
    },
    currentSlide() {
      return this.controlledSwiper?.activeIndex;
    },
    searchText: {
      get() {
        return this.params.search
      },
      set(text) {
        this.params.search = text
        this.params.page = 1
      }
    },
    pages() {
      return this.tasks?.pages
    },
    pageNumbers() {
      const { params: { page, per_page }, nTotalTasks } = this
      const max = Number(page) * Number(per_page)
      return {
        min: max - (per_page - 1),
        max: max < nTotalTasks
          ? max
          : nTotalTasks
      }
    },
  },
  methods: {
    fetchWPItems(request: any) { return (this as any).gameStore.fetchWPItems(request.type, request.params) },
    // Add the missing play$fx method
    play$fx(soundType) {
      const hasRpgSoundTheme = this.$fx?.rpg && this.$fx?.theme?.rpg;
      if (hasRpgSoundTheme) {
        const sound = this.$fx.rpg[this.$fx.theme.rpg][soundType];
        if (sound) sound.play();
      }
    },
    async selectTask(task) {
      const modal = await modalController.create({
        component: XpAchievementDetails,
        componentProps: {
          achievement: task
        }
      })
      modal.onDidDismiss().then(this.shouldSaveAchievement)
      modal.present()

    },
    async shouldSaveAchievement(achievement) {
      const showToast = () => this.achievementDb.showSuccessToast("Achievement Saved")
      if (achievement.data) {
        await this.achievementDb
          .setTask(achievement.data)
          .then(showToast)
      }
    },

    ionInfinite(ev: InfiniteScrollCustomEvent) {
      this.page++
      this.fetchNextPage()

      this.timers.startTimeout(1000, () => {
        if (!this.isLoading) {
          ev.target.complete();
        }
      })

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
    getFeaturedImg(embedded) {
      const [img] = embedded["wp:featuredmedia"] || [{}]
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
    getSingleMediaById(id: string) {
      return (this as any).gameStore.getSingleById("media", id);
    },
    searchChanged() {
      // this.$refs?.slides.slideTo(0);
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

    async segmentChanged() {
      // console.log("Segment changed", $ev);
    },
  },
  watch: {
    params: {
      deep: true,
      handler() {
        this.play$fx("text")
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
    const gameStore = useGameStore();
    const timers = useTimers();
    const params = reactive({
      page: 1,
      search: "",
      per_page: 20,
      _embed: true,
      orderby: "title",
      order: "asc",
    });

    const page = computed({
      get: () => params.page,
      set: page => params.page = page
    })

    const queryClient = useQueryClient();
    const nTotalTasks = ref(0);
    const nTotalPages = ref(0);
    const controlledSwiper = ref({} as Swiper);
    const setControlledSwiper = swiper => controlledSwiper.value = swiper;


    const hasNextPage = computed(() => page.value <= nTotalPages.value)
    const updateTotals = ({ data, headers }) => {
      nTotalTasks.value = Number(headers.get("x-wp-total"));
      nTotalPages.value = Number(headers.get("x-wp-totalpages"));
      return data;
    }

    const getNextPageParams = () => hasNextPage.value
      ? page.value
      : undefined

    const {
      isLoading,
      isError,
      data: tasks,
      error,
      isFetching,
      fetchNextPage
    } = useInfiniteQuests(page.value, params, updateTotals, getNextPageParams);


    const slideItems = computed(() => queryClient.getQueryData(["tasks", page.value, params]) || []);

    const achievementDb = new AchievementDb(achievementStorage)
    return {
      gameStore,
      timers,
      achievementDb,
      fetchNextPage,
      useTasks,
      params,
      tasks,
      page,
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
      sanitizeHtml,
    };

    function useTasks(page, params) {
      return useQuery(["tasks", page, params], fetchAchievements, {
        refetchOnWindowFocus: false,
        keepPreviousData: true,
      });
    }

    async function fetchAchievements() {
      await XpApi
        .get("xp_achievement", params)
        .then(updateTotals)
    }
  }
})

export default XpDiscoverAchievements