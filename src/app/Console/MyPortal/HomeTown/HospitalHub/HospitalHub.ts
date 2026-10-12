import { defineComponent } from "vue";
import ionic from "@/lib/mixins/ionic";
import { actionSheetController, alertController, toastController } from "@ionic/vue";
import XpIcon from "@/components/atoms/Icon/XpIcon.vue";
import XpNpcDialog from "@/components/molecules/Dialog/XpNpcDialog.vue";
import { useUserStore } from "@/lib/store/stores/user";
import { bed, close, heart, infinite, logOut, people, statsChart } from "ionicons/icons";
import { HEAL_COST, quoteBenchRest, quoteCare, REVIVE_COST } from "@/lib/services/hometown/Lodging";
import type { BenchQuote, CareKind, CareQuote } from "@/lib/services/hometown/Lodging";

export default defineComponent({
  props: ["userId"],
  name: "hospital-hub",
  mixins: [ionic],
  components: {
    XpIcon,
    XpNpcDialog
  },
  data() {
    return {
      isLoading: false,
      isModalOpen: false,
      isTalking: false
    };
  },
  computed: {
    users() {
      return this.userStore.usersAz;
    },
    actionButtons() {
      return [
        {
          text: "Heal Ailments",
          role: "heal",
          icon: heart,
          handler: this.handleHeal,
          cssClass: "action-heal",
        },
        {
          text: "Revive Heroes",
          role: "revive",
          icon: infinite,
          handler: this.handleRevive,
          cssClass: "action-revive",
        },
        {
          text: "Rest on a Bench (free)",
          role: "bench",
          icon: bed,
          handler: this.handleBenchRest,
          cssClass: "action-bench",
        },
        {
          text: "Check Vital Stats",
          role: "stats",
          icon: statsChart,
          handler: this.handleStats,
          cssClass: "action-stats",
        },
        {
          text: "View Patients",
          role: "patients",
          icon: people,
          handler: this.openPatientsModal,
          cssClass: "action-patients",
        },
        {
          text: "Leave Hospital",
          role: "leave",
          icon: logOut,
          handler: () => {
            this.$router.go(-1);
          },
          cssClass: "action-leave",
        },
        {
          text: "Cancel",
          role: "cancel",
          icon: close,
          cssClass: "action-cancel",
        },
      ];
    },
    dialogBlocks() {
      return [
        "Welcome to the Hospital Hub! *adjusts stethoscope* I'm Nurse Joy. How are you feeling today?",
        "You look like you've had quite an adventure out there! We're here to help you recover and get back on your feet.",
        "Our hospital offers several services to help adventurers like yourself. What can I assist you with today?"
      ];
    }
  },
  methods: {
    showNurseDialog() {
      // Play a sound effect for immersion
      this.play$fx("select");
      this.isTalking = true;
    },

    openPatientsModal() {
      this.isModalOpen = true;
    },

    closePatientsModal() {
      this.isModalOpen = false;
    },

    dismissPatientsModal() {
      this.play$fx("no");
      const modal = this.$refs.patientsModal as any;
      if (modal?.$el) {
        modal.$el.dismiss();
      } else {
        this.closePatientsModal();
      }
    },

    async showActionSheet() {
      const action = await actionSheetController.create({
        header: "How can we assist you today?",
        buttons: this.actionButtons,
        cssClass: 'hospital-action-sheet',
        mode: "ios",
        backdropDismiss: true,
      });

      await action.present();
    },

    async handleHeal() {
      const alert = await alertController.create({
        header: 'Healing Cost',
        message: `The cost to heal is ${HEAL_COST}GP. Would you like to proceed?`,
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
              this.payCoPay("heal");
            }
          }
        ],
        cssClass: 'hospital-alert'
      });

      await alert.present();
    },

    async showToast(message: string) {
      const toast = await toastController.create({
        message,
        duration: 3000,
        position: "top",
        cssClass: "rpg-toast",
      });
      await toast.present();
    },

    /** Nurse Joy turning a hero away: the quote said why. */
    refusalMessage(quote: CareQuote): string {
      if (quote.reason === "healthy") {
        return "*checks your chart* You're already in perfect health! Come back if that changes.";
      }
      return `*frowns at the ledger* I'm sorry, dear, this costs \u20B2${quote.cost} and your wallet is short. Come back when you can.`;
    },

    /**
     * Charge the co-pay and restore. quoteCare() decides the price and the gains; if the
     * hero cannot pay (short wallet, or nothing to heal) nothing is charged and Nurse Joy says so.
     */
    async payCoPay(kind: CareKind) {
      const user = this.userStore.getUserById(this.userId);
      const quote = quoteCare(kind, user?.stats);
      if (!quote.canPay) {
        this.play$fx("no");
        await this.showToast(this.refusalMessage(quote));
        return;
      }

      this.isLoading = true;
      try {
        await this.userStore.updateUserGP({ userId: this.userId, wallet: -quote.cost });
        this.userStore.updateUserHP({ userId: this.userId, amount: quote.hpGain });
        if (quote.mpGain > 0) {
          this.userStore.updateUserMP({ userId: this.userId, amount: quote.mpGain });
        }
        this.play$fx(quote.mpGain > 0 ? "restoreAll" : "restoreHP");
        // a short beat so the spinner reads as treatment, not a glitch
        await new Promise(resolve => setTimeout(resolve, 900));
      } finally {
        this.isLoading = false;
      }

      const stats = this.userStore.getUserById(this.userId)?.stats;
      const hp = stats?.hp ? `HP ${stats.hp.now}/${stats.hp.max}` : "";
      const mp = quote.mpGain > 0 && stats?.mp ? ` MP ${stats.mp.now}/${stats.mp.max}` : "";
      const verb = kind === "revive" ? "Revived" : "Healed";
      await this.showToast(`${verb}! \u20B2${quote.cost} paid. ${hp}${mp}`.trim());
    },

    /** Nurse Joy turning a hero off the bench: the quote said why. */
    benchRefusalMessage(quote: BenchQuote): string {
      if (quote.reason === "healthy") {
        return "*checks your chart* You're in perfect health! The bench is for the wounded, dear.";
      }
      return "*taps the clock* You've had your nap for today. Come back tomorrow, or see me for a proper heal.";
    },

    /**
     * Rest on a Bench: free, a quarter of max HP, once a day. The hero who limped home from a lost
     * fight with 1 HP and an empty wallet is never stuck: quoteBenchRest() decides, the store remembers.
     */
    async handleBenchRest() {
      const user = this.userStore.getUserById(this.userId);
      const quote = quoteBenchRest(user?.stats, user?.benchRestAt);
      if (!quote.canRest) {
        this.play$fx("no");
        await this.showToast(this.benchRefusalMessage(quote));
        return;
      }

      this.isLoading = true;
      try {
        this.userStore.setBenchRestAt(this.userId, new Date().toISOString());
        this.userStore.updateUserHP({ userId: this.userId, amount: quote.hpGain });
        this.play$fx("restoreHP");
        // a short beat so the spinner reads as a nap, not a glitch
        await new Promise(resolve => setTimeout(resolve, 900));
      } finally {
        this.isLoading = false;
      }

      const stats = this.userStore.getUserById(this.userId)?.stats;
      const hp = stats?.hp ? ` HP ${stats.hp.now}/${stats.hp.max}` : "";
      await this.showToast(`You doze off on the waiting-room bench... +${quote.hpGain} HP.${hp} Same time tomorrow?`);
    },

    async handleRevive() {
      const alert = await alertController.create({
        header: 'Revive Cost',
        message: `The cost to revive is ${REVIVE_COST}GP. Would you like to proceed?`,
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
              this.payCoPay("revive");
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
  },
  setup() {
    const userStore = useUserStore();
    return { userStore };
  }
});
