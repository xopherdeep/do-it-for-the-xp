import { defineComponent } from "vue";
import { useUserStore } from "@/lib/store/stores/user";
import ionic from "@/mixins/ionic";

import {
  walletOutline,
  removeCircleOutline,
  addCircleOutline,
  close,
  handLeftOutline,
  calculatorOutline
} from "ionicons/icons";
import { actionSheetController, alertController, toastController } from "@ionic/vue";
import { useItemFetcher } from "@/hooks/useItemFetcher";
import Stats from "@/lib/utils/User/stats";
import { ProfileDb } from "@/lib/databases";
import { profileStorage } from "@/app/SideMenu/SwitchProfile/SwitchProfile.vue";
import XpTypingText from "@/components/atoms/TypingText/XpTypingText.vue";
import ATMModal from "./components/ATMModal.vue";
import debug from "@/lib/utils/debug";

// Define the interface for XpTypingText instance methods
interface XpTypingTextInstance {
  isTyping: boolean;
  startTyping: () => void;
  completeTyping: () => void;
  resetTyping: () => void;
  pauseTyping: () => void;
  resumeTyping: () => void;
}

export default defineComponent({
  props: ["userId"],
  name: "gold-bank",
  mixins: [ionic],
  components: {
    XpTypingText,
    ATMModal
  },
  data() {
    return {
      isLoading: false,
      shelves: ['affordable'],
      // Dialog state properties
      isDialogVisible: false,
      currentDialogIndex: 0,
      currentDialogText: "",
      hasMoreDialog: true,
      isTyping: false,
      showAtm: false
    };
  },
  computed: {
    getUserById() {
      return (id: string) => (this as any).userStore.getUserById(id);
    },
    user() {
      return this.getUserById(this.userId)
    },
    dialogBlocks() {
      return [
        "Welcome to the Gold Bank! I'm the bank manager. How can I assist you with your finances today?",
        "We offer several banking services including deposits, withdrawals, and debt management.",
        "Our secure ATM is also available if you need to access your accounts or perform transactions."
      ];
    },
    actionButtons() {
      return [
        {
          text: 'Use ATM',
          icon: calculatorOutline,
          handler: () => {
            this.openATM();
          },
        },
        {
          text: 'Withdraw from Savings',
          icon: walletOutline,
          handler: this.clickWithdraw,
        },
        {
          text: 'Deposit to Savings',
          icon: addCircleOutline,
          handler: this.clickDeposit,
        },
        {
          text: 'Pay down Debt',
          icon: removeCircleOutline,
          handler: this.clickPayDebt,
        },
        {
          text: "Leave Bank",
          icon: handLeftOutline,
          handler: () => {
            this.$router.go(-1)
          }
        },
        {
          text: 'Cancel',
          icon: close,
          role: 'cancel',
          handler: () => {
            // Cancel action
          },
        }
      ];
    }
  },
  mounted() {
    // Set initial dialog text
    this.currentDialogText = this.dialogBlocks[0];
  },
  methods: {
    loadUsers() { return (this as any).userStore.loadUsers() },

    // Open ATM Modal
    openATM() {
      // Play ATM sound effect
      this.play$fx("select");
      // Set flag to show ATM modal
      this.showAtm = true;
    },

    // Dialog methods
    showBankerDialog() {
      // Play a sound effect for immersion
      this.play$fx("select");

      // Reset and show the dialog
      this.currentDialogIndex = 0;
      this.currentDialogText = this.dialogBlocks[0];
      this.hasMoreDialog = this.dialogBlocks.length > 1;
      this.isDialogVisible = true;
      this.isTyping = true;
    },

    advanceDialog() {
      // If typing is in progress, complete the current text immediately
      if (this.isTyping) {
        this.isTyping = false;
        // Skip typing animation by immediately showing the full text
        const typingComponent = this.$refs.bankerDialogText as XpTypingTextInstance;
        if (typingComponent) {
          typingComponent.completeTyping();
        }
        return;
      }

      // If not typing, advance to next dialog block
      if (this.currentDialogIndex < this.dialogBlocks.length - 1) {
        this.currentDialogIndex++;
        this.currentDialogText = this.dialogBlocks[this.currentDialogIndex];
        this.hasMoreDialog = this.currentDialogIndex < this.dialogBlocks.length - 1;
        this.isTyping = true;
      } else {
        // End of dialog, close and show options
        this.isDialogVisible = false;
        this.presentActionSheet();
      }
    },

    onTypingComplete() {
      // The current text block has finished typing
      debug.log(`Dialog block ${this.currentDialogIndex} completed`);
      this.isTyping = false;

      // Play subtle sound effect between blocks if there are more blocks
      if (this.currentDialogIndex < this.dialogBlocks.length - 1) {
        this.play$fx("text");
      }
    },

    async presentActionSheet() {
      const actionSheet = await actionSheetController
        .create({
          header: 'How can we assist you with your banking today?',
          cssClass: 'bank-action-sheet',
          buttons: [
            {
              text: 'Use ATM',
              icon: calculatorOutline,
              handler: () => {
                this.openATM();
              },
            },
            {
              text: 'Withdraw from Savings',
              icon: walletOutline,
              handler: () => {
                document.getElementById('withdraw-trigger')?.click();
              },
            },
            {
              text: 'Deposit to Savings',
              icon: addCircleOutline,
              handler: () => {
                document.getElementById('deposit-trigger')?.click();
              },
            },
            {
              text: 'Pay down Debt',
              icon: removeCircleOutline,
              handler: () => {
                document.getElementById('pay-debt-trigger')?.click();
              },
            },
            {
              text: "Leave Bank",
              icon: handLeftOutline,
              handler: () => {
                this.$router.go(-1)
              }
            },
            {
              text: 'Cancel',
              icon: close,
              role: 'cancel',
            }
          ],
          mode: 'ios',
        });
      await actionSheet.present();

      await actionSheet.onDidDismiss();
    },

    async clickPayDebt() {
      const { wallet, debt } = this.user.stats.gp
      const isWalletEmpty = wallet <= 0
      if (isWalletEmpty) {
        const alert = await alertController.create({
          header: "Your wallet is empty!",
          buttons: ["Ok"]
        })
        alert.present()
      } else {
        const alert = await alertController.create({
          header: `Pay Down Debt (₲${debt}.00)`,
          buttons: [{
            text: "Cancel",
            role: "cancel",
            cssClass: "secondary",
            handler: () => {
              // debug.log("Confirm Cancel:", blah);
            },
          }, {
            text: "Pay",
            handler: this.payDebt,
          }],
          inputs: [{
            placeholder: 'GP',
            type: 'number',
            name: "gp",
            max: wallet < debt ? wallet : debt,
            min: 0
          }],
        })
        alert.present()
      }
    },

    payDebt({ gp }: Stats) {
      const wallet = Math.round(Number(this.user.stats.gp.wallet) - Number(gp))
      const debt = Math.round(Number(this.user.stats.gp.debt) - Number(gp))
      const updatedUser = {
        ...this.user.stats,
        gp: {
          ...this.user.stats.gp,
          wallet,
          debt
        }
      }

      const showToast = () => this.showToast(`Thank you for your payment of ${gp}. Your new balance is: ${debt}`)

      this.profileDb
        .updateStats(this.userId, updatedUser)
        .then(this.loadUsers)
        .then(showToast)

    },

    async clickWithdraw() {
      const { limit, wallet, savings } = this.user.stats.gp
      const isWalletFull = wallet >= limit
      if (isWalletFull) {
        const alert = await alertController.create({
          header: "Your wallet is full!",
          buttons: ["Ok"]
        })
        alert.present()
      } else {
        const holdLimit = limit - wallet
        const alert = await alertController.create({
          header: `Withdraw from Savings: (₲${this.user.stats.gp.savings}.00)`,
          buttons: [{
            text: "Withdraw",
            handler: this.withdrawSavings,
          }],
          inputs: [{
            placeholder: 'GP',
            type: 'number',
            name: 'gp',
            max: holdLimit >= savings ? savings : holdLimit,
            min: 0
          }],
        })
        alert.present()
      }

    },

    async clickDeposit() {
      const { wallet, savings } = this.user.stats.gp
      const isWalletEmpty = wallet <= 0
      if (isWalletEmpty) {
        const alert = await alertController.create({
          header: "Your wallet is empty!",
          buttons: ["Ok"]
        })
        alert.present()
      } else {
        const alert = await alertController.create({
          header: `Deposit to Savings: (₲${savings}.00)`,
          buttons: [{
            text: "Deposit",
            handler: this.depositGp,
          }],
          inputs: [{
            placeholder: 'GP',
            type: 'number',
            name: 'gp',
            max: wallet,
            min: 1
          }],
        })
        alert.present()
      }
    },

    withdrawSavings({ gp }: Stats) {
      // If amount not provided (like from ATM), show dialog
      if (!gp) {
        this.clickWithdraw();
        return;
      }

      const savings = Math.round(Number(this.user.stats.gp.savings) - Number(gp))
      const wallet = Math.round(Number(this.user.stats.gp.wallet) + Number(gp))

      const debt = savings < 0
        ? Math.round(Number(this.user.stats.gp.debt) - Number(savings))
        : this.user.stats.gp.debt


      const updatedUser = {
        ...this.user.stats,
        gp: {
          ...this.user.stats.gp,
          wallet,
          savings: savings > 0 ? savings : 0,
          debt
        }
      }

      const showToast = () => this.showToast(`₲${gp} GP Withdrawn. New Balance: ₲${savings}.`)

      this.profileDb.updateStats(this.user.id, updatedUser)
        .then(this.loadUsers)
        .then(showToast)
    },

    depositGp({ gp }: any) {
      // If amount not provided (like from ATM), show dialog
      if (!gp) {
        this.clickDeposit();
        return;
      }

      const wallet = Math.round(Number(this.user.stats.gp.wallet) - Number(gp))
      const savings = Math.round(Number(this.user.stats.gp.savings) + Number(gp))
      const debt = wallet < 0
        ? Math.round(Number(this.user.stats.gp.debt) - Number(wallet))
        : this.user.stats.gp.debt

      const updatedUser = {
        ...this.user.stats,
        gp: {
          ...this.user.stats.gp,
          wallet: wallet > 0 ? wallet : 0,
          savings,
          debt
        }
      }

      const showToast = () => this.showToast(`Thank you for your deposit of ₲${gp}. Your new balance is: ₲${savings}`)

      this.profileDb.updateStats(this.user.id, updatedUser)
        .then(this.loadUsers)
        .then(showToast)
    },

    async showToast(message: string) {
      const toast = await toastController.create({
        message,
        duration: 3000,
        position: 'bottom'
      })
      toast.present()
    },

    // Alert handlers for declarative alerts
    handleDeposit(data: any) {
      const amount = data[0].value;
      if (amount && amount > 0) {
        this.depositGp({ gp: amount });
      }
    },

    handleWithdraw(data: any) {
      const amount = data[0].value;
      if (amount && amount > 0) {
        // Create a minimal Stats object with just the gp property needed
        const statsObj = {
          level: 1,
          xp: { now: 0, next_level: 100, ledger: [] },
          gp: amount,
          hp: { now: 0, max: 0, min: 0 },
          mp: { now: 0, max: 0, min: 0 },
          ap: { hour: [], day: [], week: [], month: [], year: [], total: 0, ledger: [] },
          special: {
            ledger: [],
            strength: 0, defense: 0, endurance: 0, intelligence: 0, perception: 0,
            wisdom: 0, charisma: 0, awareness: 0, presence: 0, agility: 0, guts: 0, luck: 0
          },
          ailments: []
        };
        this.withdrawSavings(statsObj);
      }
    },

    handlePayDebt(data: any) {
      const amount = data[0].value;
      if (amount && amount > 0) {
        // Create a minimal Stats object with just the gp property needed
        const statsObj = {
          level: 1,
          xp: { now: 0, next_level: 100, ledger: [] },
          gp: amount,
          hp: { now: 0, max: 0, min: 0 },
          mp: { now: 0, max: 0, min: 0 },
          ap: { hour: [], day: [], week: [], month: [], year: [], total: 0, ledger: [] },
          special: {
            ledger: [],
            strength: 0, defense: 0, endurance: 0, intelligence: 0, perception: 0,
            wisdom: 0, charisma: 0, awareness: 0, presence: 0, agility: 0, guts: 0, luck: 0
          },
          ailments: []
        };
        this.payDebt(statsObj);
      }
    },
  },
  setup(props) {
    const { 
      request, 
      items, 
      getItems, 
      getImgObj,
      nTotalPages
    } = useItemFetcher("xp_accessory", { per_page: 4 }, props.userId);

    const userStore = useUserStore();
    const profileDb = new ProfileDb(profileStorage)

    return {
      profileDb,
      userStore,
      // Icons for use in template
      walletOutline,
      removeCircleOutline,
      addCircleOutline,
      close,
      handLeftOutline,
      calculatorOutline,
      request,
      items,
      getItems,
      getImgObj,
      nTotalPages
    }
  },
});
