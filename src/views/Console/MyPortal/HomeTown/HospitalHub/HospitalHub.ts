import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { actionSheetController, alertController } from "@ionic/vue";
import XpIcon from "@/components/XpIcon";
import { mapGetters } from "vuex";

export default defineComponent({
  props: ["userId"],
  name: "hospital-hub",
  mixins: [ionic],
  components: {
    XpIcon
  },
  data() {
    return {
      isLoading: false,
    };
  },
  computed: {
    ...mapGetters({
      users: "usersAz"
    }),
    actionButtons() {
      return [
        {
          text: "Heal Ailments",
          role: "heal",
          icon: `
            <xp-icon 
              icon="heart-circle" 
              primary="green" 
              secondary="lightgreen"
              size="lg"
            />
          `,
          handler: this.handleHeal,
          cssClass: 'action-heal'
        },
        {
          text: "Revive Heroes",
          role: "revive",
          icon: `
            <xp-icon 
              icon="skull" 
              primary="yellow" 
              secondary="gold"
              size="lg"
            />
          `,
          handler: this.handleRevive,
          cssClass: 'action-revive'
        },
        {
          text: "Check Vital Stats",
          role: "stats",
          icon: `
            <xp-icon 
              icon="chart-line" 
              primary="purple" 
              secondary="blue"
              size="lg"
            />
          `,
          handler: this.handleStats,
          cssClass: 'action-stats'
        },
        {
          text: "Leave Hospital",
          role: "leave",
          icon: `
            <xp-icon 
              icon="door-open" 
              primary="gray" 
              secondary="darkgray"
              size="lg"
            />
          `,
          handler: () => {
            this.$router.go(-1);
          },
          cssClass: 'action-leave'
        },
        {
          text: "Cancel",
          role: "cancel",
          icon: `
            <xp-icon 
              icon="times-circle" 
              primary="red" 
              secondary="darkred"
              size="lg"
            />
          `,
          cssClass: 'action-cancel'
        }
      ];
    }
  },
  methods: {
    async clickButton() {
      const action = await actionSheetController.create({
        header: "How can we assist you today?",
        buttons: this.actionButtons
      });
      
      await action.present();
    },

    async handleHeal() {
      const alert = await alertController.create({
        header: 'Healing Cost',
        message: 'The cost to heal is 50GP. Would you like to proceed?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'alert-cancel'
          },
          {
            text: 'Pay & Heal',
            role: 'confirm',
            cssClass: 'alert-confirm',
            handler: () => {
              this.payCoPay();
            }
          }
        ],
        cssClass: 'hospital-alert'
      });

      await alert.present();
    },

    async payCoPay() {
      // Add healing logic here
      this.isLoading = true;
      setTimeout(() => {
        this.isLoading = false;
      }, 2000);
    },

    async handleRevive() {
      const alert = await alertController.create({
        header: 'Revive Cost',
        message: 'The cost to revive is 100GP. Would you like to proceed?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'alert-cancel'
          },
          {
            text: 'Pay & Revive',
            role: 'confirm',
            cssClass: 'alert-confirm',
            handler: () => {
              this.payCoPay();
            }
          }
        ],
        cssClass: 'hospital-alert'
      });

      await alert.present();
    },

    async handleStats() {
      const alert = await alertController.create({
        header: 'Vital Stats Check',
        message: 'Would you like to check your vital stats?',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'alert-cancel'
          },
          {
            text: 'Check Stats',
            role: 'confirm',
            cssClass: 'alert-confirm',
            handler: () => {
              this.$router.push(`/my-portal/${this.userId}/hospital/stats`);
            }
          }
        ],
        cssClass: 'hospital-alert'
      });

      await alert.present();
    }
  }
});
