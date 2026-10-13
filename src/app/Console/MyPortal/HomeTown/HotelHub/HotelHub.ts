import { defineComponent } from "vue";
import ionic from "@/lib/mixins/ionic";

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
  cartOutline,
  starSharp,
  storefrontOutline,
  banOutline,
  bedOutline,
  bagOutline,
} from "ionicons/icons";
import { useBack } from "@/hooks/useBack";
import { useItemFetcher } from "@/hooks/useItemFetcher";
import { useCopy, useVoice } from "@/hooks/useVoice";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import debug from "@/lib/utils/debug";
import { useUserStore } from "@/lib/store/stores/user";
// Import the ATM Modal component
import ATMModal from "@/app/Console/MyPortal/HomeTown/GoldBank/components/ATMModal.vue";
// Import our new GPSystem
import { getGPService } from '@/lib/services/gp';
import { quoteCare } from "@/lib/services/hometown/Lodging";
import type { CareQuote } from "@/lib/services/hometown/Lodging";
import {
  nothingOnTheBoard,
  conciergeMenuPrompt,
  conciergeNotice,
  roomConfirmPrompt,
  roomReceiptLine,
  roomRefusalLine,
  type ConciergeMenuId,
} from "@/lib/services/hometown/hometownPrompts";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";

export default defineComponent({
  props: ["userId"],
  name: "hotel-hub",
  mixins: [ionic],
  components: {
    XpRevealPrompt,
    ATMModal
  },
  data() {
    return {
      isLoading: false,
      shelves: ['affordable'],
      /** The concierge is talking: the FAB waits until the conversation ends */
      isTalking: false,
      // ATM modal state
      showAtm: false
    };
  },
  computed: {
    user() {
      return this.userStore.getUserById(this.userId);
    },
    dialogBlocks() {
      return [this.t("hotel.greet.welcome"), this.t("hotel.greet.amenities"), this.t("hotel.greet.ask")];
    }
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
      if (amount > 0) {
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
      if (amount > 0) {
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
      if (amount > 0) {
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

    /**
     * The concierge's conversation, in the game's own dialog: his lines type out, then the menu. After each errand he
     * asks if there is anything else, until the hero leaves (back out of the hotel), steps away (Escape) or goes to the
     * Town Hall's notice board.
     */
    async showHotelDialog() {
      if (this.isTalking) return;
      this.isTalking = true;
      try {
        this.play$fx("select");
        let lines = this.dialogBlocks;
        for (;;) {
          const pick = (await this.reveal.ask(conciergeMenuPrompt(lines))) as ConciergeMenuId | "stay";
          if (pick === "stay") return;
          if (pick === "leave") {
            this.goBack();
            return;
          }
          if (pick === "events") {
            await this.handleCommunityEvents();
            return;
          }
          await this.handleRentRoom();
          lines = [this.t("npc.more")];
        }
      } finally {
        this.isTalking = false;
      }
    },

    /** Rent a Room: confirm the price, then charge the wallet and sleep off the night (full HP and MP). */
    async handleRentRoom() {
      const quote = quoteCare("room", this.user?.stats);
      if (!quote.canPay) {
        this.play$fx("no");
        await this.reveal.ask(conciergeNotice(roomRefusalLine(quote, this.words)));
        return;
      }

      const pick = await this.reveal.ask(roomConfirmPrompt(this.words));
      if (pick !== "yes") return;
      await this.rentRoom(quote);
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
      await this.reveal.ask(conciergeNotice(roomReceiptLine(quote.cost, stats?.hp, stats?.mp, this.words), "bed"));
    },

    /** Community Events: the notice board lives in the Town Hall. */
    async handleCommunityEvents() {
      const hasTownHall = this.$router.getRoutes().some(route => route.name === "town-hall");
      if (hasTownHall) {
        this.play$fx("select");
        this.$router.push({ name: "town-hall", params: { userId: this.userId } });
        return;
      }
      await this.reveal.ask(conciergeNotice(nothingOnTheBoard(this.words)));
    },
  },
  setup(props) {
    const userStore = useUserStore();
    // Leaving goes back, or up to Home Town when the hotel was opened with no history behind it
    const { back: goBack } = useBack();
    // The concierge talks, asks and answers in the game's own dialog, not in native alerts
    const reveal = useRevealPrompt();
    // The concierge's words follow the hero's voice (simple, adventure or classic)
    const t = useCopy();
    const { voice: words } = useVoice();
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
      t,
      words,
      goBack,
      userStore,
      reveal,
      prompt: reveal.prompt,
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
