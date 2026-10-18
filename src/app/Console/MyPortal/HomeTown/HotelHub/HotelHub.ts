import { defineComponent } from "vue";
import { npcNews } from "@/lib/services/guide/guideProgress";
import { linesWithNews } from "@/lib/services/guide/npcHints";
import ionic from "@/lib/mixins/ionic";

import { useBack } from "@/hooks/useBack";
import { useCopy, useVoice } from "@/hooks/useVoice";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { useUserStore } from "@/lib/store/stores/user";
import ATMModal from "@/app/Console/MyPortal/HomeTown/GoldBank/components/ATMModal.vue";
import type { BankAction } from "@/lib/services/gp/bankTeller";
import { ATM_NOTES, runBankErrand } from "@/lib/services/gp/bankErrand";
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

/** What the ATM hands over: the amount picked on its stepper */
interface GpAmount {
  gp?: number | string;
}

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

    clickDeposit(data: GpAmount) {
      return this.atmErrand("deposit", data);
    },

    clickWithdraw(data: GpAmount) {
      return this.atmErrand("withdraw", data);
    },

    clickPayDebt(data: GpAmount) {
      return this.atmErrand("payDebt", data);
    },

    // The lobby ATM works like the shop's: a refusal says why, the move gets its line in the wallet's history, and
    // paying the Hospital's bill to 0 lifts the grounding and tells the family.
    async atmErrand(action: BankAction, data: GpAmount) {
      const errand = runBankErrand(String(this.userId), action, Number(data?.gp), this.words, `ATM: ${ATM_NOTES[action]}`);
      // No amount, or no hero loaded: the ATM says nothing
      const line = errand?.line ?? "";
      const isRefused = errand?.ok === false;
      const isPaid = errand?.ok === true;
      if (isRefused) {
        this.play$fx("no");
        await this.reveal.showPrompt(conciergeNotice(line, undefined, "ATM"));
      }
      if (isPaid) {
        this.play$fx(action === "payDebt" ? "finish" : "countCoins");
        await this.reveal.showPrompt(conciergeNotice(line, "coins", "ATM"));
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
        // The concierge passes on a traveler's news about the hero's quest (once per step)
        let lines = linesWithNews(this.dialogBlocks, await npcNews(String(this.userId || this.userStore.currentUser.id || ""), "hotel"));
        for (;;) {
          const pick = (await this.reveal.showPrompt(
            conciergeMenuPrompt(lines, this.clerkName)
          )) as ConciergeMenuId | "stay";
          const isStaying = pick === "stay";
          if (isStaying) return;
          const isWalkingAway = pick !== "room";
          if (isWalkingAway) {
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
      const isLeaving = pick === "leave";
      if (isLeaving) this.goBack();
      else await this.handleCommunityEvents();
    },

    /**
     * Rent a Room: price grows with the hero's level. Confirm it, charge the wallet, and restore full HP and MP.
     */
    async handleRentRoom() {
      const quote = quoteCare("room", this.user?.stats, Number(this.user?.stats?.level) || 1);
      if (!quote.canPay) {
        this.play$fx("no");
        await this.reveal.showPrompt(
          conciergeNotice(roomRefusalLine(quote, this.words), undefined, this.clerkName)
        );
        return;
      }

      const pick = await this.reveal.showPrompt(
        roomConfirmPrompt(this.words, quote.cost, this.clerkName)
      );
      const isDeclined = pick !== "yes";
      if (isDeclined) return;
      await this.rentRoom(quote);
    },

    async rentRoom(quote: CareQuote) {
      this.isLoading = true;
      try {
        await this.userStore.updateUserGP({ userId: this.userId, wallet: -quote.cost, kind: "spend", note: "Hotel stay" });
        this.userStore.updateUserHP({ userId: this.userId, amount: quote.hpGain });
        const hasMpGain = quote.mpGain > 0;
        if (hasMpGain) {

          this.userStore.updateUserMP({ userId: this.userId, amount: quote.mpGain });
        }
        this.play$fx("restoreAll");
        // A short beat so the rest reads as a night's sleep, not an instant glitch
        await new Promise((resolve) => setTimeout(resolve, 900));
      } finally {
        this.isLoading = false;
      }

      const stats = this.user?.stats;
      await this.reveal.showPrompt(
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
      await this.reveal.showPrompt(
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
