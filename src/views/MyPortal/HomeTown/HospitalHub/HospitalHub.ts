import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { actionSheetController, alertController } from "@ionic/vue";

import {
  heartHalfOutline,
  heartOutline,
  cashOutline,
  close,
  pieChartOutline,
  colorWand,
  calendarOutline,
  handLeftOutline,
  serverOutline, addCircleOutline, removeCircleOutline
} from "ionicons/icons";
import { mapGetters } from "vuex";

export default defineComponent({
  props: ["userId"],
  name: "hospital-hub",
  mixins: [ionic],
  data() {
    return {
      isLoading: false,
    };
  },
  computed: {
    ...mapGetters({
      users: "usersAz"
    }),
  },
  methods: {
    async clickButton() {
      const { handleHeal, handleRevive, handleStats } = this
      const action = await actionSheetController.create({
        header: "How can we assist you today?",
        buttons: [
          {
            text: "Heal Ailments",
            icon: heartHalfOutline,
            handler: handleHeal
          },
          {
            text: "Revive Heroes",
            icon: heartOutline,
            handler: handleRevive
          },
          {
            text: "Check Vital Stats",
            icon: pieChartOutline, // Assuming you have imported this icon
            handler: handleStats
          },
          {
            text: "Leave Hosptial",
            icon: handLeftOutline,
            handler: () => {
              this.$router.go(-1)
            }
          },
          {
            text: "Cancel",
            role: "cancel",
            icon: close,
          }
        ]


      })
      await action.present();

    },
    async handleHeal() {
      const alert = await alertController.create({
        header: "Pay Co-Pay",
        subHeader: "We need to collect a co-pay of ₲20.00. By clicking Pay, you agree to pay this amount.",

        buttons: [{
          text: "Cancel",
          role: "cancel",
          cssClass: "secondary",
          handler: () => {
            // console.log("Confirm Cancel:", blah);
          },
        }, {
          text: "Pay",
          handler: this.payCoPay
        }]
      })

      await alert.present();
    },

    async payCoPay() {
      //
    },
    async handleRevive() {
      const reviveAlert = await alertController.create({
        header: "Pay Co-Pay",
        subHeader: "We need to collect a co-pay of ₲100.00. By clicking Pay, you agree to pay this amount.",

        buttons: [{
          text: "Cancel",
          role: "cancel",
          cssClass: "secondary",
          handler: () => {
            // console.log("Confirm Cancel:", blah);
          },
        }, {
          text: "Pay",
          handler: this.payCoPay
        }]
      })

      await reviveAlert.present();

    },
    async handleStats() {
      this.$router.push({
        name: "view-stats",
        params: {
          userId: this.userId
        }
      })

      //
    }
  },
  mounted() {
    // this.$fx.ui[this.$fx.theme.ui].openShop.play()
  },
  setup() {
    return {
      stop,
    };
  },
});
