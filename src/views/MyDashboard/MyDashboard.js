import users from "@/assets/js/users.js";
import CardUserStats from "@/views/CardUserStats/CardUserStats.vue";
import requireImg from "@/assets/js/requireImg.js";
const requireAvatar = require.context("@/assets/images/avatars/");

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
} from "ionicons/icons";

import {
  IonProgressBar,
  IonImg,
  IonCol,
  IonGrid,
  IonRow,
  IonButtons,
  IonContent,
IonModal, IonButton,
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
} from "@ionic/vue";

export default {
  props: {
    id: {
      default: 1,
    },
  },
  components: {
    IonSlides,
    IonSlide,
    IonImg,
    CardUserStats,
    IonProgressBar,
IonModal, IonButton,
    IonCol,
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
  setup() {
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
    return {
      slideOpts,
      calendar,
      personCircle,
      beforeTabChange,
      afterTabChange,
      requireImg,
    };
  },
  computed: {
    user_id() {
      return parseInt(this.id);
    },
    user() {
      return this.users.find((user) => user.id == this.user_id);
    },
  },
  methods: {
    getUserAvatar(user) {
      const avatar = `./${user.avatar}.svg`;
      return requireAvatar(avatar);
    },
  },
};
