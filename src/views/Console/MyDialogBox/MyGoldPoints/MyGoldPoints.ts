import { computed, defineComponent, ref } from "vue";

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
  sunnyOutline,
  partlySunnyOutline,
  moonOutline,
  cloudyNightOutline,
  fitnessOutline,
  sparklesOutline,
  keyOutline,
  serverOutline,
  bagOutline,
  cartOutline
} from "ionicons/icons";
import { mapActions, mapGetters, useStore } from "vuex";
import ionic from "@/mixins/ionic"

import XpGp from "@/components/XpGp/XpGp.vue";
import { alertController, modalController } from "@ionic/vue";
import XpSendRequest from "./SendRequest.vue"
import { ProfileDb } from "@/databases";

import { profileStorage } from "@/views/App/SideMenu/SwitchProfile/SwitchProfile.vue"
import Stats from "@/utils/User/stats";

export default defineComponent({
  mixins: [ionic],
  props: ["userId"],
  name: "my-gold-points",
  data() {
    return {
      date: 'Today'
    }
  },
  components: {
    XpGp
  },
  computed: {
    ...mapGetters(["getUserById"]),
  },
  methods: {
    ...mapActions(["loadUsers"]),
    segmentChanged() {
      // console.warn("Segment changed", ev);
    },
    changeDate(event) {
      const date = event.detail.value;
      // console.log("date" + date);
      this.date = date;
      // localStorage.setItem("date", date);
    },
    async openSendRequest() {
      const modal = await modalController.create({
        component: XpSendRequest
      })
      modal.present()
    },

    async clickPayDebt() {
      const alert = await alertController.create({
        header: "Pay Down Debt",
        buttons: [{
          text: "Cancel",
          role: "cancel",
          cssClass: "secondary",
          handler: () => {
            // console.log("Confirm Cancel:", blah);
          },
        }, {
          text: "Okay",
          handler: this.payDebt,
        }],
        inputs: [{
          placeholder: 'GP',
          type: 'number',
          name: "gp",
          max: this.user.stats.gp.wallet < this.user.stats.gp.debt
            ? this.user.stats.gp.wallet : this.user.stats.gp.debt,
          min: 1
        }],
      })
      alert.present()
    },

    async clickAddSavings() {
      const alert = await alertController.create({
        header: "Savings",
        buttons: [{
          text: "Withdraw",
          handler: this.withdrawSaving,
        }, {
          text: "Deposit",
          handler: this.saveGp,
        }],
        inputs: [{
          placeholder: 'GP',
          type: 'number',
          name: 'gp',
          max: this.user.stats.gp.wallet >= this.user.stats.gp.savings
            ? this.user.stats.gp.wallet : this.user.stats.gp.savings,
          min: 1
        }],
      })
      alert.present()
    },

    saveGp({ gp }: any) {
      const wallet = Math.round(Number(this.user.stats.gp.wallet) - Number(gp))
      const savings = Math.round(Number(this.user.stats.gp.savings) + Number(gp))
      const debt = wallet < 0
        ? Math.round(Number(this.user.stats.gp.debt) - Number(wallet))
        : this.user.stats.gp.debt

      this.profileDb.updateStats(this.user.id, {
        ...this.user.stats,
        gp: {
          ...this.user.stats.gp,
          wallet: wallet > 0 ? wallet : 0,
          savings,
          debt
        }
      }).then(this.loadUsers)
    },

    withdrawSaving({ gp }: Stats) {
      const savings = Math.round(Number(this.user.stats.gp.savings) - Number(gp))
      const wallet = Math.round(Number(this.user.stats.gp.wallet) + Number(gp))

      const debt = savings < 0
        ? Math.round(Number(this.user.stats.gp.debt) - Number(savings))
        : this.user.stats.gp.debt

      this.profileDb.updateStats(this.user.id, {
        ...this.user.stats,
        gp: {
          ...this.user.stats.gp,
          wallet,
          savings: savings > 0 ? savings : 0,
          debt
        }
      }).then(this.loadUsers)
    },

    payDebt({ gp }: Stats) {
      const wallet = Math.round(Number(this.user.stats.gp.wallet) - Number(gp))
      this.profileDb.updateStats(this.user.id, {
        ...this.user.stats,
        gp: {
          ...this.user.stats.gp,
          wallet,
          debt: Math.round(Number(this.user.stats.gp.debt) - Number(gp))
        }
      }).then(this.loadUsers)

    }
  },
  setup(props) {
    const store = useStore()
    const profileDb = new ProfileDb(profileStorage)
    const customAlertOptions = {
      header: 'Choose Date Range',
      subHeader: 'Calculate GP',
      message: 'Options unlock with time',
      translucent: true
    };

    const customPopoverOptions = {
      header: 'Hair Color',
      subHeader: 'Select your hair color',
      message: 'Only select your dominant hair color'
    };

    const customActionSheetOptions = {
      header: 'Colors',
      subHeader: 'Select your favorite color'
    };

    const walletSegment = ref("wallet");

    const user = computed(() => store.getters.getUserById(props.userId));
    return {
      user,
      // date: computed(() => localStorage.getItem("date")),
      profileDb,
      walletSegment,
      customAlertOptions,
      customPopoverOptions,
      customActionSheetOptions,
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
      fitnessOutline,
      sparklesOutline,
      keyOutline,
      serverOutline,
      cartOutline
    };
  },
});
