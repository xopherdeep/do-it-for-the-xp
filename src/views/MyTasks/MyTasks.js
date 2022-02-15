import { computed, defineComponent, onMounted, reactive, ref } from "vue";
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
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonItem,
  IonModal,
  IonLabel,
  IonFooter,
  IonSearchbar,
  alertController,
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

export default defineComponent({
  props: ["userId"],
  name: "my-tasks",
  components: {
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCol,
    IonContent,
    IonFooter,
    IonGrid,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonModal,
    IonPage,
    IonRouterOutlet,
    IonRow,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonTabBar,
    IonTabButton,
    IonTabs,
    IonTitle,
    IonToolbar,
    MyTask,
  },
  data() {
    return {
      activeModal: 0,
      currentSlide: 0,
      request: {
        type: "xp_achievement",
        params: {
          page: 1,
          search: "",
          per_page: 4,
        },
      },
    };
  },
  mixins: [fetchItems],
  activated() {
    this.$fx.ui[this.$fx.theme.ui].openPage.play()
    // const mp3 = this.$requireAudio('./take_item.mp3')
    // this.nativeAudio.preloadSimple('openTask', mp3).then(onSuccess, onError)
    // this.nativeAudio.preloadSimple('openTask', '../src/assets/audio/click.mp3').then(onSuccess, onError)
  },
  computed: {
    ...mapState(["xp_achievement"]),
    isPrevDisabled(){
      return this.$refs.slides 
        ? this.$refs.slides.getActiveIndex() == 0
        : true 
    },
  },
  methods: {
    ...mapActions(["fetchWPItems"]),
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
    slideWillChange(){
      this.$refs.slides.getActiveIndex().then((index)=>{
        this.currentSlide = index;
        const page = index + 1
        // this.request.params.page = page
        this.getItems(page)
      })
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
    searchChanged(){
      this.$refs.slides.slideTo(0)
      this.currentSlide = 0;
      this.request.params.page = 1
    },
    resetTextSound(){
      this.$fx.rpg[this.$fx.theme.rpg].text.pause()
      this.$fx.rpg[this.$fx.theme.rpg].text.currentTime = 0
      this.$fx.rpg[this.$fx.theme.rpg].text.play()
    },
    playTextSound(){
      this.$fx.rpg[this.$fx.theme.rpg].text.play()
    }
  },
  watch: {
    request: {
      handler() {
        this.$fx.rpg[this.$fx.theme.rpg].text.play()
      },
      deep: true,
    },
  },
  setup() {
    // const store = useStore();
    // const tasks    = computed(() => store.getters.requestedItems(request) )
    // const getTasks = async () => await store.dispatch("fetchWPItems", request);

    return {
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
