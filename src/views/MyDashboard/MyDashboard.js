import users from "@/assets/js/users.js";
import CardUserStats from "@/views/CardUserStats/CardUserStats.vue";
import requireImg from "@/assets/js/requireImg.js";
const requireAvatar = require.context("@/assets/images/avatars/");

import { computed, ref, onMounted } from "vue";
import { mapGetters, mapState, useStore } from "vuex";

import {
  today,
  calendarNumber,
  calendar,
  hourglass,
  calendarClear,
  time,
  heart,
  colorWand,
  card,
  server,
  sparkles,
  medal,
  personCircle,
  camera,
  bookmark,
  diceOutline,
  colorWandOutline,
  medalOutline,
  bagOutline,
  accessibilityOutline
} from "ionicons/icons";

import {
  IonProgressBar,
  IonImg,
  IonCol,
  IonGrid,
  IonRow,
  IonButtons,
  IonContent,
  IonModal,
  IonButton,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  IonChip,
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonItem,
  IonSlides,
  IonSlide,
  IonSegment,
  IonAvatar,
  IonSegmentButton,
  IonFooter,
} from "@ionic/vue";
import { useRouter } from "vue-router";

export default {
  name: "my-dashboard",
  props: {
    userId: {
      default: 1,
    },
  },
  components: {
    IonAvatar,
    IonFooter,
    IonSlides,
    IonSlide,
    IonImg,
    CardUserStats,
    IonProgressBar,
    IonModal,
    IonButton,
    IonCol,
    IonSegment,
    IonSegmentButton,
    IonGrid,
    IonRow,
    IonChip,
    IonButtons,
    IonContent,
    IonHeader,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
    IonIcon,
    IonLabel,
    IonTabBar,
    IonTabButton,
    IonTabs,
    IonItem,
  },
  data() {
    return {
      users,
      isUserModalOpen: false,
      initialBreakpoint: 0.1,
      icons: {
        medal,
        server,
        sparkles,
        card,
        today,
        calendar,
        calendarNumber,
        hourglass,
        calendarClear,
        time,
        heart,
        colorWand,
      },
      dashboardItems: {
        achievements: {},
        abilities: {},
        accessories: {},
        badges: {},
        gold: {},
        alerts: {},
      },
    };
  },
  setup(props) {
    const store = useStore();
    const router = useRouter();

    const beforeTabChange = () => {
      // do something before tab change
    };
    const afterTabChange = () => {
      // do something after tab change
    };
    const slideOpts = {
      initialSlide: 1,
      speed: 400,
    };
    console.log(props.userId);
    const user =  computed(() => store.getters.getUserById(props.userId));
    console.log(store.state.users);

    return {
      user,
      accessibilityOutline,
      router,
      slideOpts,
      calendar,
      personCircle,
      beforeTabChange,
      afterTabChange,
      requireImg,
      camera,
      bookmark,
      colorWandOutline,
      medalOutline,
      bagOutline,
      diceOutline,
    };
  },
  computed: {
    // ...mapGetters(['getUserById']),
  },
  mounted() {
    this.$fx.ui[this.$fx.theme.ui].chooseUser.play()
    setTimeout(()=>{
      this.$fx.ui[this.$fx.theme.ui].chooseUser.pause()
      this.isUserModalOpen=this.user.id
    },1250)
  },
  methods: {
    clickUserChip(user){
      this.isUserModalOpen = user.id
      this.initialBreakpoint = 0.55
    },
    didDismissUserModal(){
      this.isUserModalOpen = false;
    },
    willPresent(){
      this.$fx.ui[this.$fx.theme.ui].chooseUser.currentTime = 1.250
      this.$fx.ui[this.$fx.theme.ui].chooseUser.play()
    },
    // clickAction(action){
    //   const user = this.user;
    //   this.$fx.ui[this.$fx.theme.ui].openPage.play()
    //   this.router.push(`/${action}/${user.id}/`);
    // },
    getUserAvatar(user) {
      const avatar = `./${user.avatar}.svg`;
      return requireAvatar(avatar);
    },
    segmentChanged(ev) {
      console.log("Segment changed", ev);
    },
  },
};
