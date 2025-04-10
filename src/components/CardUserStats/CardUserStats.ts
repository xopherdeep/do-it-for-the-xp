import { actionSheetController } from "@ionic/vue";
import { defineComponent } from "vue";
import { close, heart } from "ionicons/icons";

// Define the interface for the component instance
interface ComponentInstance {
  $fx: {
    ui: {
      [key: string]: {
        openPage: {
          play: () => void;
        };
      };
    };
    theme: {
      ui: string;
      rpg: string;
    };
  };
}

import users from "@/api/users.api";
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


import ionic from "@/mixins/ionic";

import { mapGetters } from "vuex";
import Vue3Autocounter from 'vue3-autocounter';


export default defineComponent({
  props: ["id", "startCounting", "hideMenu"],
  mixins: [ionic],
  data() {
    return {
      users,
      icons: {
        bandageOutline,
        bonfireOutline,
        calendar,
        calendarClear,
        calendarNumber,
        card,
        colorWand,
        fitnessOutline,
        flameOutline,
        heart,
        hourglass,
        medal,
        server,
        sparkles,
        time,
        today,
        waterOutline,
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
    ...mapGetters(["getUserById"]),

    user_id() {
      return this.id;
    },

    user() {
      return this.getUserById(this.id);
    },

    xpBar() {
      return this.getCounterXPCurrentAmount() / 200;
    },
  },

  mounted() {
    if (!this.startCounting) {
      this.beginCounter();
    }
  },
  watch: {
    startCounting() {
      this.beginCounter();
    },
  },
  methods: {
    clickAction(action) {
      const user = this.user;
      this.$fx.ui[this.$fx.theme.ui].openPage.play();
      this.$router.push(`/${action}/${user.id}/`);
    },
    getCounterXPCurrentAmount() {
      const XpTotal = this.$refs.countXPTotal as typeof Vue3Autocounter
      if (XpTotal)
        return XpTotal.currentAmount / 200;
      else
        return 0
    },
    beginCounter() {
      const XpTotal = this.$refs.countXPTotal as typeof Vue3Autocounter
      const ApTotal = this.$refs.countAPTotal as typeof Vue3Autocounter
      ApTotal.start();
      XpTotal.start();
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
              // console.log("Delete clicked");
            },
          },
          {
            text: "Hi-Potion (50 HP)",
            icon: waterOutline,
            data: 10,
            handler: () => {
              // console.log("Share clicked");
            },
          },
          {
            text: "X-Potion (100 HP)",
            icon: flameOutline,
            data: "Data value",
            handler: () => {
              // console.log("Play clicked");
            },
          },
          {
            text: "Mega Potion (200 HP to ALL) ",
            icon: bonfireOutline,
            handler: () => {
              // console.log("Favorite clicked");
            },
          },
          {
            text: "Nevermind",
            icon: close,
            role: "cancel",
            handler: () => {
              // console.log("Cancel clicked");
            },
          },
        ],
      });
      await actionSheet.present();
      // const { role, data } = await actionSheet.onDidDismiss();
      // console.log("onDidDismiss resolved with role and data", role, data);
    },
  },
});
