import { IonButton, actionSheetController } from "@ionic/vue";
import { defineComponent } from "vue";
import { caretForwardCircle, close, heart, trash, share } from "ionicons/icons";

import users from "@/assets/js/users.js";
const requireAvatar = require.context("@/assets/images/avatars/");
import { useRouter } from "vue-router";

import {
  today,
  calendarNumber,
  calendar,
  hourglass,
  calendarClear,
  time,
  colorWand,
  card,
  server,
  sparkles,
  medal,
  personCircle,
  bonfireOutline,
  flameOutline,
  waterOutline,
  bandageOutline,
  fitnessOutline,
} from "ionicons/icons";

import {
  IonProgressBar,
  IonCol,
  IonGrid,
  IonRow,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  IonChip,
  IonItem,
  IonImg,
  IonIcon,
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonFab,
  IonFabButton
} from "@ionic/vue";
import { mapGetters } from "vuex";

export default {
  props: ["id", "startCounting"],
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
        bonfireOutline,

        flameOutline,
        waterOutline,
        bandageOutline,
        fitnessOutline,
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
  components: {
  IonFab,
  IonFabButton,
    IonButton,
    IonProgressBar,
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
    IonItem,
    IonImg,

    IonIcon,
    IonLabel,
    IonTabBar,
    IonTabButton,
    IonTabs,
  },
  setup() {
    const router = useRouter();
    const beforeTabChange = () => {
      // do something before tab change
    };
    const afterTabChange = () => {
      // do something after tab change
    };
    return {
      router,
      calendar,
      personCircle,
      beforeTabChange,
      afterTabChange,
    };
  },
  computed: {
    ...mapGetters(['getUserById']),
    user_id() {
      return parseInt(this.id);
    },
    user() {
      return this.getUserById(this.user_id)
    },
    xpBar(){
      return  this.getCounterXPCurrentAmount()  / 200
    },
  },
  mounted() {
    if(!this.startCounting){
       this.beginCounter()
    }
  },
  watch:{
    startCounting(count){
      this.beginCounter()
    }
  },
  methods: {
    clickAction(action){
      const user = this.user;
      this.$fx.ui[this.$fx.theme.ui].openPage.play()
      this.router.push(`/${action}/${user.id}/`);
    },
    getCounterXPCurrentAmount(){
      if(this.$refs.countXPTotal)
        return this.$refs.countXPTotal.currentAmount / 200
    },
    beginCounter(){
      this.$refs.countAPTotal.start()
      this.$refs.countXPTotal.start()
    },
    getUserAvatar(user) {
      if(user.avatar){
        const avatar = `./${user.avatar}.svg`;
        return requireAvatar(avatar);
      }
    },

    async clickHP() {
      const actionSheet = await actionSheetController.create({
        header: "Use a potion?",
        cssClass: "my-custom-class",
        buttons: [
          {
            text: "Potion (10HP)",
            role: "destructive",
            icon: bandageOutline,
            id: "delete-button",
            data: {
              type: "delete",
            },
            handler: () => {
              console.log("Delete clicked");
            },
          },
          {
            text: "Hi-Potion (50 HP)",
            icon: waterOutline,
            data: 10,
            handler: () => {
              console.log("Share clicked");
            },
          },
          {
            text: "X-Potion (100 HP)",
            icon: flameOutline,
            data: "Data value",
            handler: () => {
              console.log("Play clicked");
            },
          },
          {
            text: "Mega Potion (200 HP to ALL) ",
            icon: bonfireOutline,
            handler: () => {
              console.log("Favorite clicked");
            },
          },
          {
            text: "Nevermind",
            icon: close,
            role: "cancel",
            handler: () => {
              console.log("Cancel clicked");
            },
          },
        ],
      });
      await actionSheet.present();
      const { role, data } = await actionSheet.onDidDismiss();
      console.log("onDidDismiss resolved with role and data", role, data);
    },
  },
};
