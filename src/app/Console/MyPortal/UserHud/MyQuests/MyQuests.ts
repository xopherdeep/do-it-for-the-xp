import { defineComponent, onMounted, reactive, ref, watch } from "vue";
import ionic from "@/lib/mixins/ionic";
import {
  IonBackButton,
  alertController,
  IonicSlides,
} from "@ionic/vue";
import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
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
  hourglassOutline,
} from "ionicons/icons";
import { useGameStore } from "@/lib/store/stores/game";

import MyTask from "../MyTask/MyTask.vue";
import { useRouter } from "vue-router";
// import { useSwiper } from "swiper/vue";
import { Controller, Navigation, Swiper as SwiperClass } from "swiper";
import { formatQuestName } from "@/lib/utils/format";

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
  mixins: [ionic],
  activated() {
    this.$fx.ui[this.$fx.theme.ui].openPage.play();
    // const mp3 = this.$requireAudio('./take_item.mp3')
    // this.nativeAudio.preloadSimple('openTask', mp3).then(onSuccess, onError)
    // this.nativeAudio.preloadSimple('openTask', '../src/assets/audio/click.mp3').then(onSuccess, onError)
  },
  computed: {
    xp_achievement() {
      return (this as any).gameStore.xp_achievement;
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
    // Open quests first, then the ones already tamed; quests that are not due stay hidden
    filteredTasks(): QuestBoardItem[] {
      const shown = this.board.filter(({ status }) => status !== "notDue");
      return [
        ...shown.filter(({ status }) => status === "open"),
        ...shown.filter(({ status }) => status === "done"),
      ];
    },
    // Paginated tasks for the swiper
    tasks() {
      const start = (this.params.page - 1) * this.params.per_page;
      const end = start + this.params.per_page;
      return this.filteredTasks.slice(start, end);
    },
    nTotalTasks() {
      return this.filteredTasks.length;
    },
    nTotalPages() {
      return Math.ceil(this.nTotalTasks / this.params.per_page) || 1;
    },
    hasNextPage() {
      return this.params.page < this.nTotalPages;
    },
    pageNumbers() {
      const min = (this.params.page - 1) * this.params.per_page + 1;
      const max = Math.min(this.params.page * this.params.per_page, this.nTotalTasks);
      return { min: this.nTotalTasks === 0 ? 0 : min, max };
    },
    // Alias for page to use in template
    page() {
      return this.params.page;
    }
  },
  methods: {
    clickBack() {
      const hasHistory = (this as any).$historyCount - window.history.length;
      // console.log("hashistory", hasHistory);
      if (hasHistory) (this as any).router.go(-1);
      else (this as any).router.push(`/my-portal/${this.userId}`);
    },
    clickItem(item: any) {
      this.activeModal = item.id;
    },
    // A claim made in the modal changes today's board, so reload it once the modal closes
    onTaskDismissed() {
      this.activeModal = 0;
      void this.loadBoard();
    },
    isModalOpen(id: any) {
      return this.activeModal == id;
    },
    clickComplete() {
      this.activeModal = 0;
      this.presentAlertMultipleButtons();
    },
    slidePrev() {
      if (this.params.page > 1) this.params.page--;
    },
    slideNext() {
      if (this.params.page < this.nTotalPages) this.params.page++;
    },
    // Get tasks for a specific page number (for swiper slides)
    getTasksForPage(pageNum: number) {
      const start = (pageNum - 1) * this.params.per_page;
      const end = start + this.params.per_page;
      return this.filteredTasks.slice(start, end);
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
    getFeaturedImg(item: any) {
      if (item.localImage || item.imageUrl) {
        return {
          src: item.localImage || item.imageUrl,
          alt: item.achievementName,
        };
      }
      return {
        src: "",
        alt: item.achievementName,
      };
    },
    searchChanged() {
      if (this.controlledSwiper) {
        this.controlledSwiper.slideTo(0);
      }
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

    segmentChanged() {
      // debug.log("Segment changed");
    },
  },
  setup(props) {
    const gameStore = useGameStore();
    const router = useRouter();
    const controlledSwiper = ref<SwiperClass | null>(null);
    const setControlledSwiper = (swiper: SwiperClass) => {
      controlledSwiper.value = swiper;
    };

    const board = ref<QuestBoardItem[]>([]);
    const isLoading = ref(true);

    const params = reactive({
      page: 1,
      search: "",
      per_page: 4,
    });

    // Only the newest request may update the board, so a slow reload can't overwrite a fresher one
    let latestRequest = 0;
    const loadBoard = async () => {
      const request = ++latestRequest;
      try {
        const items = await getQuestEngine().getQuestBoardForUser(props.userId, new Date(), {
          search: params.search,
        });
        if (request === latestRequest) board.value = items;
      } finally {
        if (request === latestRequest) isLoading.value = false;
      }
    };

    onMounted(loadBoard);
    watch(() => params.search, loadBoard);

    return {
      gameStore,
      params,
      board,
      loadBoard,
      isLoading,
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
      hourglassOutline,
      formatQuestName,
    };
  },
});
