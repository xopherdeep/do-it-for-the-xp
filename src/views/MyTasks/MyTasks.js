import { computed, defineComponent, onMounted, reactive, ref } from "vue";

import ionic from "@/assets/js/mixins/ionic";
import {
  IonBackButton,
  alertController,
  IonSlides,
  IonSlide,
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
import { mapActions, mapGetters, mapState, useStore } from "vuex";

import fetchItems from "@/assets/js/mixins/fetchItems.js";

import MyTask from "@/views/MyTask/MyTask.vue";
import { useRouter } from "vue-router";
import { useSwiper } from "swiper/vue";
import { Controller, Navigation } from "swiper";

export default defineComponent({
  props: ["userId"],
  name: "my-tasks",
  components: {
    IonBackButton,
    MyTask,
    IonSlides,
    IonSlide,
  },
  data() {
    return {
      activeModal: 0,
      swiperNavigation: {
        nextEl: "#swiper-forward",
        prevEl: "#swiper-back",
      },
      request: {
        type: "xp_achievement",
        params: {
          page: 1,
          search: "",
          per_page: 8,
        },
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
      return this.currentSlide == 0
    },
    currentSlide(){
      return this.controlledSwiper?.activeIndex
    }
  },
  methods: {
    ...mapActions(["fetchWPItems"]),
    clickBack() {
      const hasHistory = this.$historyCount - window.history.length;
      console.log("hashistory", hasHistory);
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
    slideWillChange(index) {
      let page = Number(this.currentSlide) + 2;
      this.getItems(page);
      this.getItems(page++);
      // this.request.params.page = page
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
    showLoading() {
      this.isLoading = true;
    },
    hideLoading() {
      this.isLoading = false;
    },
    fetchTasks() {
      return this.fetchWPItems(this.request).then(this.fetchImages);
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
      this.$refs.slides.slideTo(0);
      this.currentSlide = 0;
      this.request.params.page = 1;
    },
    resetTextSound() {
      this.$fx.rpg[this.$fx.theme.rpg].text.pause();
      this.$fx.rpg[this.$fx.theme.rpg].text.currentTime = 0;
      this.$fx.rpg[this.$fx.theme.rpg].text.play();
    },
    playTextSound() {
      this.$fx.rpg[this.$fx.theme.rpg].text.play();
    },
  },
  watch: {
    request: {
      handler() {
        this.$fx.rpg[this.$fx.theme.rpg].text.play();
      },
      deep: true,
    },
  },
  setup() {
    // const store = useStore();
    // const tasks    = computed(() => store.getters.requestedItems(request) )
    // const getTasks = async () => await store.dispatch("fetchWPItems", request);
    const router = useRouter();
    const controlledSwiper = ref(null);
    const setControlledSwiper = (swiper) => {
      controlledSwiper.value = swiper;
    };

    return {
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
  },
});
