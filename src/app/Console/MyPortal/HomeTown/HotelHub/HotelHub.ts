import { defineComponent } from "vue";
import ionic from "@/lib/mixins/ionic";

import { useBack } from "@/hooks/useBack";
import { useCopy, useVoice } from "@/hooks/useVoice";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import debug from "@/lib/utils/debug";
import { useUserStore } from "@/lib/store/stores/user";
import ATMModal from "@/app/Console/MyPortal/HomeTown/GoldBank/components/ATMModal.vue";
import { getGPService } from "@/lib/services/gp";
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
import {
  getHotelByWorld,
  getHotelMetadata,
  type HotelMetadata,
} from "@/lib/engine/core/hotelRegistry";

export default defineComponent({
  props: ["userId", "world"],
  name: "hotel-hub",
  mixins: [ionic],
  components: {
    XpRevealPrompt,
    ATMModal,
  },
  data() {
    return {
      isLoading: false,
      /** The concierge is talking: the FAB waits until the conversation ends */
      isTalking: false,
      // ATM modal state
      showAtm: false,
    };
  },
  computed: {
    user() {
      return this.userStore.getUserById(this.userId);
    },
    activeWorld(): string {
      const propWorld = typeof this.world === "string" ? this.world : "";
      const routeWorld = typeof this.$route?.params?.world === "string" ? this.$route.params.world : "";
      return propWorld || routeWorld || "hometown";
    },
    hotelMeta(): HotelMetadata {
      return getHotelByWorld(this.activeWorld) || getHotelMetadata("hometown-hotel");
    },
    hotelTitle(): string {
      return this.hotelMeta.name;
    },
    clerkName(): string {
      return this.hotelMeta.clerkName;
    },
    dialogBlocks(): string[] {
      return [
        this.t("hotel.greet.welcome", { hotel: this.hotelTitle }),
        this.t("hotel.greet.amenities"),
        this.t("hotel.greet.ask"),
      ];
    },
  },
  methods: {
    openATM() {
      this.play$fx("select");
      this.showAtm = true;
    },

    clickDeposit(data: { gp?: number | string }) {
      const amount = Number(data.gp);
      if (amount > 0) {
        getGPService()
          .depositToSavings(this.userId, amount)
          .then(() => {
            this.play$fx("countCoins");
          })
          .catch((error) => {
            debug.log("Deposit error:", error.message);
          });
      }
    },

    clickWithdraw(data: { gp?: number | string }) {
      const amount = Number(data.gp);
      if (amount > 0) {
        getGPService()
          .withdrawFromSavings(this.userId, amount)
          .then(() => {
            this.play$fx("countCoins");
          })
          .catch((error) => {
            debug.log("Withdraw error:", error.message);
          });
      }
    },

    clickPayDebt(data: { gp?: number | string }) {
      const amount = Number(data.gp);
      if (amount > 0) {
        getGPService()
          .payDebtFromWallet(this.userId, amount)
          .then(() => {
            this.play$fx("finish");
          })
          .catch((error) => {
            debug.log("Pay debt error:", error.message);
          });
      }
    },

    /**
     * The concierge's conversation, in the game's own dialog: lines type out, then the menu. After each errand,
     * they ask if there is anything else until the hero leaves, steps away or views events.
     */
    async showHotelDialog() {
      if (this.isTalking) return;
      this.isTalking = true;
      try {
        this.play$fx("select");
        let lines = this.dialogBlocks;
        for (;;) {
          const pick = (await this.reveal.ask(
            conciergeMenuPrompt(lines, this.clerkName)
          )) as ConciergeMenuId | "stay";
          if (pick === "stay") return;
          if (pick !== "room") {
            await this.walkAway(pick);
            return;
          }
          await this.handleRentRoom();
          lines = [this.t("npc.more")];
        }
      } finally {
        this.isTalking = false;
      }
    },

    /** Leave the desk: out of the hotel, or on to the Town Hall's notice board. */
    async walkAway(pick: "leave" | "events") {
      if (pick === "leave") this.goBack();
      else await this.handleCommunityEvents();
    },

    /**
     * Rent a Room: price grows with the hero's level. Confirm it, charge the wallet, and restore full HP and MP.
     */
    async handleRentRoom() {
      const quote = quoteCare("room", this.user?.stats, Number(this.user?.stats?.level) || 1);
      if (!quote.canPay) {
        this.play$fx("no");
        await this.reveal.ask(
          conciergeNotice(roomRefusalLine(quote, this.words), undefined, this.clerkName)
        );
        return;
      }

      const pick = await this.reveal.ask(
        roomConfirmPrompt(this.words, quote.cost, this.clerkName)
      );
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
        // A short beat so the rest reads as a night's sleep, not an instant glitch
        await new Promise((resolve) => setTimeout(resolve, 900));
      } finally {
        this.isLoading = false;
      }

      const stats = this.user?.stats;
      await this.reveal.ask(
        conciergeNotice(
          roomReceiptLine(quote.cost, stats?.hp, stats?.mp, this.words),
          "bed",
          this.clerkName
        )
      );
    },

    /** Community Events: notice board lives in Town Hall. */
    async handleCommunityEvents() {
      const hasTownHall = this.$router.getRoutes().some((route) => route.name === "town-hall");
      if (hasTownHall) {
        this.play$fx("select");
        this.$router.push({ name: "town-hall", params: { userId: this.userId } });
        return;
      }
      await this.reveal.ask(
        conciergeNotice(nothingOnTheBoard(this.words), undefined, this.clerkName)
      );
    },
  },
  setup() {
    const userStore = useUserStore();
    const { stepBack: goBack } = useBack();
    const reveal = useRevealPrompt();
    const t = useCopy();
    const { voice: words } = useVoice();

    return {
      t,
      words,
      goBack,
      userStore,
      reveal,
      prompt: reveal.prompt,
    };
  },
});
