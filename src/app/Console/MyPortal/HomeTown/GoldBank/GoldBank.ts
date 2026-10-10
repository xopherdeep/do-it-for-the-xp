import { defineComponent } from "vue";
import { useUserStore } from "@/lib/store/stores/user";
import ionic from "@/lib/mixins/ionic";

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
import { ProfileDb } from "@/lib/databases";
import { profileStorage } from "@/lib/databases/profileStorage";
import {
  type BankMove,
  type Purse,
  depositToSavings,
  payDownDebt,
  withdrawFromSavings
} from "@/lib/services/gp/wallet";
import { type BankAction, bankReceipt, bankRefusal, gold } from "@/lib/services/gp/bankTeller";
import XpTypingText from "@/components/atoms/TypingText/XpTypingText.vue";
import ATMModal from "./components/ATMModal.vue";
import debug from "@/lib/utils/debug";
import { walletLimitOf } from "@/lib/services/gp/wallet";
import { shopHintFor } from "@/lib/services/gp/walletShops";

// Define the interface for XpTypingText instance methods
interface XpTypingTextInstance {
  isTyping: boolean;
  startTyping: () => void;
  completeTyping: () => void;
  resetTyping: () => void;
  pauseTyping: () => void;
  resumeTyping: () => void;
}

/** What an alert prompt or the ATM hands back: the amount typed under the input named `gp` */
interface GpAmount {
  gp?: number | string;
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
        // The bank does not sell wallets: it tells the hero how big theirs is and where a bigger one is sold
        `Your wallet holds ₲${walletLimitOf(this.user?.stats?.gp)}. ${shopHintFor(this.user?.stats?.gp)}`,
        "Our secure ATM is also available if you need to access your accounts or perform transactions."
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
              handler: () => { this.clickWithdraw(); },
            },
            {
              text: 'Deposit to Savings',
              icon: addCircleOutline,
              handler: () => { this.clickDeposit(); },
            },
            {
              text: 'Pay down Debt',
              icon: removeCircleOutline,
              handler: () => { this.clickPayDebt(); },
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

    /** One prompt for an amount; the handler gets `{ gp }` from the input of that name. */
    async promptAmount(header: string, confirm: string, max: number, handler: (data: GpAmount) => void) {
      const alert = await alertController.create({
        header,
        buttons: [
          { text: "Cancel", role: "cancel", cssClass: "secondary" },
          { text: confirm, handler },
        ],
        inputs: [{
          placeholder: 'GP',
          type: 'number',
          name: 'gp',
          max,
          min: 1
        }],
      })
      await alert.present()
    },

    async clickWithdraw() {
      const { limit, wallet, savings } = this.user.stats.gp
      const probe = withdrawFromSavings(this.user.stats.gp, savings)
      const refusal = bankRefusal("withdraw", this.user.stats.gp, probe)
      if (refusal) {
        this.play$fx("no");
        this.showToast(refusal)
        return
      }
      await this.promptAmount(
        `Withdraw from Savings: (${gold(savings)})`,
        "Withdraw",
        Math.min(savings, Math.max(0, limit - wallet)),
        this.withdrawSavings
      )
    },

    async clickDeposit() {
      const { wallet, savings } = this.user.stats.gp
      const probe = depositToSavings(this.user.stats.gp, wallet)
      const refusal = bankRefusal("deposit", this.user.stats.gp, probe)
      if (refusal) {
        this.play$fx("no");
        this.showToast(refusal)
        return
      }
      await this.promptAmount(`Deposit to Savings: (${gold(savings)})`, "Deposit", wallet, this.depositGp)
    },

    async clickPayDebt() {
      const { wallet, debt } = this.user.stats.gp
      const probe = payDownDebt(this.user.stats.gp, wallet)
      const refusal = bankRefusal("payDebt", this.user.stats.gp, probe)
      if (refusal) {
        this.play$fx("no");
        this.showToast(refusal)
        return
      }
      await this.promptAmount(`Pay Down Debt (${gold(debt)})`, "Pay", Math.min(wallet, debt), this.payDebt)
    },

    withdrawSavings({ gp }: GpAmount) {
      this.applyMove("withdraw", withdrawFromSavings(this.user.stats.gp, Number(gp)))
    },

    depositGp({ gp }: GpAmount) {
      this.applyMove("deposit", depositToSavings(this.user.stats.gp, Number(gp)))
    },

    payDebt({ gp }: GpAmount) {
      this.applyMove("payDebt", payDownDebt(this.user.stats.gp, Number(gp)))
    },

    /** Every money move ends here: refuse with a reason, or save the purse the rules computed and read the receipt. */
    applyMove(action: BankAction, move: BankMove) {
      const before = this.user.stats.gp
      const refusal = bankRefusal(action, before, move)
      if (refusal) {
        this.play$fx("no");
        this.showToast(refusal)
        return
      }
      this.play$fx("select");
      this.savePurse(move.gp, bankReceipt(action, before, move))
    },

    savePurse(purse: Purse, message: string) {
      const updatedStats = {
        ...this.user.stats,
        // keep the GP ledger and anything else the purse carries; the rules only speak for the four numbers
        gp: { ...this.user.stats.gp, ...purse }
      }
      return this.profileDb.updateStats(this.user.id, updatedStats)
        .then(this.loadUsers)
        .then(() => this.showToast(message))
    },

    async showToast(message: string) {
      const toast = await toastController.create({
        message,
        duration: 3000,
        position: 'top',
        cssClass: 'rpg-toast'
      })
      toast.present()
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
