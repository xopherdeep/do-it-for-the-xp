import { defineComponent } from "vue";
import ionic from "@/lib/mixins/ionic";

import {
  arrowBack,
  chevronBack,
  chevronForward,
  stop,
  close,
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
  cartOutline,
  calendarOutline,
  starSharp,
  storefrontOutline,
  banOutline,
  bedOutline,
  bagOutline,
  logOut,
} from "ionicons/icons";
import { actionSheetController, alertController, toastController } from "@ionic/vue";
import { useItemFetcher } from "@/hooks/useItemFetcher";
import XpTypingText from "@/components/atoms/TypingText/XpTypingText.vue";
import debug from "@/lib/utils/debug";
import { useUserStore } from "@/lib/store/stores/user";
// Import the ATM Modal component
import ATMModal from "@/app/Console/MyPortal/HomeTown/GoldBank/components/ATMModal.vue";
// Import our new GPSystem
import { getGPService } from '@/lib/services/gp';
import { quoteCare, ROOM_COST } from "@/lib/services/hometown/Lodging";
import type { CareQuote } from "@/lib/services/hometown/Lodging";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";

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
  name: "hotel-hub",
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
      // ATM modal state
      showAtm: false
    };
  },
  computed: {
    user() {
      return this.userStore.getUserById(this.userId);
    },
    dialogBlocks() {
      return [
        "Welcome to the Grand Hotel! I'm your concierge, at your service.",
        "Our hotel offers comfortable rooms and several amenities for weary travelers like yourself.",
        "Would you like to rest for the night or perhaps check out our community events?"
      ];
    },
    actionButtons() {
      return [
        {
          text: 'Rent a Room',
          icon: bedOutline,
          handler: () => {
            this.handleRentRoom();
          },
        },
        {
          text: 'Community Events',
          icon: calendarOutline,
          handler: () => {
            this.handleCommunityEvents();
          },
        },
        {
          text: 'Leave Hotel',
          icon: logOut,
          handler: () => {
            this.$router.go(-1);
          },
          cssClass: "action-leave",
        },
        {
          text: 'Cancel',
          icon: close,
          role: 'cancel',
          handler: () => {
            debug.log('Cancel clicked')
          },
        },
      ];
    }
  },
  mounted() {
    // Set initial dialog text
    this.currentDialogText = this.dialogBlocks[0];
  },
  methods: {
    // ATM methods
    openATM() {
      this.play$fx("select");
      this.showAtm = true;
    },

    clickDeposit(data) {
      // Use new GPSystem to handle deposits
      const amount = Number(data.gp);
      if (amount && amount > 0) {
        getGPService()
          .depositToSavings(this.userId, amount)
          .then(() => {
            this.play$fx("coins");
          })
          .catch(error => {
            debug.log('Deposit error:', error.message);
            // Potential UI feedback for error
          });
      }
    },

    clickWithdraw(data) {
      // Use new GPSystem to handle withdrawals
      const amount = Number(data.gp);
      if (amount && amount > 0) {
        getGPService()
          .withdrawFromSavings(this.userId, amount)
          .then(() => {
            this.play$fx("coins");
          })
          .catch(error => {
            debug.log('Withdraw error:', error.message);
            // Potential UI feedback for error
          });
      }
    },

    clickPayDebt(data) {
      // Use new GPSystem to handle debt payments
      const amount = Number(data.gp);
      if (amount && amount > 0) {
        getGPService()
          .payDebtFromWallet(this.userId, amount)
          .then(() => {
            this.play$fx("success");
          })
          .catch(error => {
            debug.log('Pay debt error:', error.message);
            // Potential UI feedback for error
          });
      }
    },

    selectShelf($ev) {
      this.shelves = $ev.detail.value
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

    /** The concierge turning a guest away: the quote said why. */
    refusalMessage(quote: CareQuote): string {
      if (quote.reason === "healthy") {
        return "*smiles* You look perfectly rested already! The room will be here when you need it.";
      }
      return `*checks the register* A room is \u20B2${quote.cost} a night, and your wallet is short. Do come back.`;
    },

    /** Rent a Room: confirm the price, then charge the wallet and sleep off the night (full HP and MP). */
    async handleRentRoom() {
      const quote = quoteCare("room", this.user?.stats);
      if (!quote.canPay) {
        this.play$fx("no");
        await this.showToast(this.refusalMessage(quote));
        return;
      }

      const alert = await alertController.create({
        header: 'Rent a Room',
        message: `A night's rest is ${ROOM_COST}GP and restores you fully. Check in?`,
        buttons: [
          {
            text: 'Not tonight',
            role: 'cancel',
            cssClass: 'alert-cancel'
          },
          {
            text: 'Pay & Rest',
            role: 'confirm',
            cssClass: 'alert-confirm',
            handler: () => {
              this.rentRoom(quote);
            }
          }
        ],
        cssClass: 'hotel-alert'
      });

      await alert.present();
    },

    async rentRoom(quote: CareQuote) {
      this.isLoading = true;
      try {
        await this.userStore.updateUserGP({ userId: this.userId, wallet: -quote.cost });
        this.userStore.updateUserHP({ userId: this.userId, amount: quote.hpGain });
        if (quote.mpGain > 0) {
          this.userStore.updateUserMP({ userId: this.userId, amount: quote.mpGain });
        }
        this.play$fx("restoreAll");
        // a short beat so the spinner reads as a night's sleep, not a glitch
        await new Promise(resolve => setTimeout(resolve, 900));
      } finally {
        this.isLoading = false;
      }

      const stats = this.user?.stats;
      const hp = stats?.hp ? `HP ${stats.hp.now}/${stats.hp.max}` : "";
      const mp = stats?.mp ? ` MP ${stats.mp.now}/${stats.mp.max}` : "";
      await this.showToast(`Good morning! \u20B2${quote.cost} paid. ${hp}${mp}`.trim());
    },

    /** Community Events: the notice board lives in the Town Hall. */
    async handleCommunityEvents() {
      const hasTownHall = this.$router.getRoutes().some(route => route.name === "town-hall");
      if (hasTownHall) {
        this.play$fx("select");
        this.$router.push({ name: "town-hall", params: { userId: this.userId } });
        return;
      }
      await this.showToast("Nothing on the board tonight.");
    },

    showHotelDialog() {
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
        const typingComponent = this.$refs.conciergeDialogText as XpTypingTextInstance;
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
          header: 'Welcome, Traveler! How may we assist you today?',
          cssClass: 'hotel-action-sheet',
          buttons: this.actionButtons,
          mode: 'ios',
        });
      await actionSheet.present();

      await actionSheet.onDidDismiss();
    },
  },
  setup(props) {
    const userStore = useUserStore();
    const {
      request,
      items,
      getItems,
      getImgObj,
      nTotalPages
    } = useItemFetcher("xp_accessory", { per_page: 4 }, props.userId);

    const customAlertOptions = {
      header: 'Pizza Toppings',
      subHeader: 'Select your toppings',
      message: '$1.00 per topping',
      translucent: true
    };

    return {
      userStore,
      customAlertOptions,
      storefrontOutline,
      banOutline,
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
      cartOutline,
      starSharp,
      bedOutline,
      request,
      items,
      getItems,
      getImgObj,
      nTotalPages,
      sanitizeHtml,
    };
  },
});
