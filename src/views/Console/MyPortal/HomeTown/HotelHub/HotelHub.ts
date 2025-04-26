import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";

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
  heartHalfOutline,
  calendarOutline,
  starSharp,
  storefrontOutline,
  banOutline,
  bedOutline,
  bagOutline,
  logOut,
} from "ionicons/icons";
import fetchItems from "@/mixins/fetchItems"
import { actionSheetController } from "@ionic/vue";
import XpTypingText from "@/components/XpTypingText/XpTypingText.vue";
import debug from "@/utils/debug";
import { useStore } from "vuex";
import { computed } from "vue";
// Import the ATM Modal component
import ATMModal from "@/views/Console/MyPortal/HomeTown/GoldBank/components/ATMModal.vue";
// Import our new GPSystem
import { getGPSystem } from "@/engine/core/GPSystem";

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
  mixins: [ionic, fetchItems],
  components: {
    XpTypingText,
    ATMModal
  },
  data() {
    return {
      isLoading: false,
      shelves: ['affordable'],
      request: {
        type: "xp_accessory",
        params: {
          page: 1,
          search: "",
          per_page: 4,
        },
      },
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
      const store = useStore();
      return computed(() => store.getters.getUserById(this.userId)).value;
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
          text: 'Rest & Recover',
          icon: heartHalfOutline,
          data: 'Data value',
          handler: () => {
            debug.log('Rest & Recover clicked')
          },
        },
        {
          text: 'Community Events',
          icon: calendarOutline,
          data: 10,
          handler: () => {
            debug.log('Community Events clicked')
          },
        },
        {
          text: 'Rent a Room',
          icon: bedOutline,
          handler: () => {
            debug.log('Rent a Room clicked')
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
        getGPSystem()
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
        getGPSystem()
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
        getGPSystem()
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
  setup() {
    const customAlertOptions = {
      header: 'Pizza Toppings',
      subHeader: 'Select your toppings',
      message: '$1.00 per topping',
      translucent: true
    };
    
    return {
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
    };
  },
});
