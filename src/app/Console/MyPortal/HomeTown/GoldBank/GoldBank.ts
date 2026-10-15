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
import { useBack } from "@/hooks/useBack";
import { useItemFetcher } from "@/hooks/useItemFetcher";
import { ProfileDb } from "@/lib/databases";
import { profileStorage } from "@/lib/databases/profileStorage";
import {
  type BankMove,
  type Purse,
  depositToSavings,
  hospitalBillOf,
  payDownBills,
  withdrawFromSavings
} from "@/lib/services/gp/wallet";
import { announceBillPaid } from "@/lib/services/hometown/hospitalAdmission";
import {
  type BankAction,
  bankMove,
  storageMaxed,
  bankReceipt,
  bankRefusal,
  gold,
  storageOffer,
  storageQuestion,
  storageReceipt,
  storageRefusal,
  storageTopUpQuestion
} from "@/lib/services/gp/bankTeller";
import { BANKER, amountAsk, bankMenuPrompt, noticePrompt, type BankMenuId } from "@/lib/services/gp/bankPrompts";
import { nextStorageTier, storagePurchase } from "@/lib/services/inventory/Storage";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { copyIn, useVoice } from "@/hooks/useVoice";
import ATMModal from "./components/ATMModal.vue";
import { walletLimitOf } from "@/lib/services/gp/wallet";
import { shopHintFor } from "@/lib/services/gp/walletShops";

/** What the ATM hands back: the amount picked on its stepper */
interface GpAmount {
  gp?: number | string;
}

export default defineComponent({
  props: ["userId"],
  name: "gold-bank",
  mixins: [ionic],
  components: {
    XpRevealPrompt,
    ATMModal
  },
  data() {
    return {
      isLoading: false,
      shelves: ['affordable'],
      /** The banker is talking: the FAB does nothing until the conversation ends */
      isTalking: false,
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
      const bill = hospitalBillOf(this.user?.stats?.gp);
      const nextStorage = nextStorageTier(this.user);
      const t = this.t;
      return [
        t("bank.greet.welcome"),
        // The Hospital's bill sits on its own line above the other debt; paying it to 0 lifts the grounding
        ...(bill > 0 ? [t("bank.greet.bill", { bill: gold(bill) })] : []),
        t("bank.greet.services"),
        // The bank does not sell wallets: it tells the hero how big theirs is and where a bigger one is sold
        t("bank.greet.wallet", { limit: `₲${walletLimitOf(this.user?.stats?.gp)}`, hint: shopHintFor(this.user?.stats?.gp) }).trim(),
        // Room at home is sold here: the next storage on offer, or that there is no bigger one
        nextStorage ? t("bank.greet.storage", { offer: storageOffer(nextStorage) }) : storageMaxed(this.words),
        t("bank.greet.atm")
      ];
    }
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

    /**
     * The banker's conversation, in the game's own dialog: his lines type out, then the menu. After each errand he asks
     * if there is anything else, until the hero leaves (back out of the bank) or steps away (Escape, or the ATM).
     */
    async showBankerDialog() {
      if (this.isTalking) return;
      this.isTalking = true;
      try {
        this.play$fx("select");
        let lines = this.dialogBlocks;
        for (;;) {
          const pick = (await this.reveal.showPrompt(bankMenuPrompt(lines, this.user?.stats?.gp))) as BankMenuId | "stay";
          if (pick === "stay") return;
          if (pick === "leave" || pick === "atm") {
            this.walkAway(pick);
            return;
          }
          await this.runErrand(pick);
          lines = [this.t("npc.more")];
        }
      } finally {
        this.isTalking = false;
      }
    },

    /** Leave the counter: out of the bank, or over to the ATM. */
    walkAway(pick: "leave" | "atm") {
      if (pick === "leave") this.goBack();
      else this.openATM();
    },

    /** One errand from the menu. */
    async runErrand(pick: Exclude<BankMenuId, "atm" | "leave">) {
      if (pick === "storage") return this.storageCounter();
      return this.moneyErrand(pick);
    },

    /** A deposit, a withdrawal or a payment: how much (on the stepper), then the move and its receipt. */
    async moneyErrand(action: BankAction) {
      const ask = amountAsk(action, this.user.stats.gp, undefined, this.words);
      if ("refusal" in ask) {
        this.play$fx("no");
        await this.reveal.showPrompt(noticePrompt(ask.refusal));
        return;
      }
      const { id, amount } = await this.reveal.showAmountPrompt(ask.prompt);
      if (id !== "ok" || !amount) return;
      const gp = this.user.stats.gp;
      const move = bankMove(action, gp, amount);
      await this.applyMove(action, move);
    },

    /**
     * The storage counter, in the banker's voice. The price comes out of the wallet; when the wallet is short but the
     * savings would cover the rest, he offers them (the hero is standing in the bank). A sale shows the chest rising.
     */
    async storageCounter() {
      const next = nextStorageTier(this.user);
      const purse = this.user.stats?.gp;
      const wallet = Number(purse?.wallet) || 0;
      const savings = Number(purse?.savings) || 0;
      const sale = storagePurchase(this.user, wallet, savings, false);
      if (!next) {
        this.play$fx("no");
        await this.reveal.showPrompt(noticePrompt(storageMaxed(this.words), "chestOpen"));
        return;
      }
      const question = storageQuestion(next, this.words);
      if (!sale.ok && sale.reason === "gp" && !sale.canTopUp) {
        this.play$fx("no");
        await this.reveal.showPrompt(noticePrompt(`${question} ${storageRefusal(sale, this.words)}`, "chest"));
        return;
      }
      const needsSavings = !sale.ok && sale.reason === "gp";
      const lines = needsSavings ? [question, storageTopUpQuestion(sale, this.words)] : [question];
      const yes = needsSavings ? "Use savings" : "Buy it";
      const no = needsSavings ? "Not now" : "No thanks";
      const pick = await this.reveal.showPrompt({
        speaker: BANKER,
        accent: "bank",
        sprite: "chest",
        lines,
        choices: [
          { id: "yes", label: yes, icon: needsSavings ? "piggy-bank" : "coins", tone: "primary" },
          { id: "no", label: no, icon: "times", tone: "ghost" }
        ],
        cancelId: "no"
      });
      if (pick === "yes") await this.sellStorage(needsSavings);
    },

    /** The sale itself: the store re-checks the purse, so a refusal here is read out the same way. */
    async sellStorage(useSavings: boolean) {
      const sale = this.userStore.buyStorageTier(this.user.id, useSavings);
      if (!sale.ok) {
        this.play$fx("no");
        await this.reveal.showPrompt(noticePrompt(storageRefusal(sale, this.words) ?? storageMaxed(this.words), "chest"));
        return;
      }
      this.play$fx("buyItem");
      await this.reveal.showPrompt({
        speaker: BANKER,
        accent: "bank",
        sprite: "chestOpen",
        glow: "gold",
        sound: "newItem",
        lines: [storageReceipt(sale, this.words)],
        choices: [{ id: "ok", label: "Great!", icon: "check", tone: "primary" }],
        cancelId: "ok"
      });
    },

    // The ATM's steppers hand over an amount; the move and its receipt are the bank's
    async withdrawSavings({ gp }: GpAmount) {
      await this.applyMove("withdraw", withdrawFromSavings(this.user.stats.gp, Number(gp)))
    },

    async depositGp({ gp }: GpAmount) {
      await this.applyMove("deposit", depositToSavings(this.user.stats.gp, Number(gp)))
    },

    async payDebt({ gp }: GpAmount) {
      await this.applyMove("payDebt", payDownBills(this.user.stats.gp, Number(gp)))
    },

    /** Every money move ends here: refuse with a reason, or save the purse the rules computed and read the receipt. */
    async applyMove(action: BankAction, move: BankMove) {
      const before = this.user.stats.gp
      const refusal = bankRefusal(action, before, move, this.words)
      if (refusal) {
        this.play$fx("no");
        await this.reveal.showPrompt(noticePrompt(refusal))
        return
      }
      this.play$fx("countCoins");
      // The bill reaching 0 lifts the grounding at once; the family hears of it after the purse is saved
      const clearsBill = hospitalBillOf(before) > 0 && hospitalBillOf(move.gp) === 0
      const heroId = this.user.id
      const receipt = bankReceipt(action, before, move, this.words)
      await this.savePurse(move.gp)
      if (clearsBill) announceBillPaid(heroId)
      // The coins rise with the receipt
      await this.reveal.showPrompt(noticePrompt(receipt, "coins"))
    },

    savePurse(purse: Purse) {
      const updatedStats = {
        ...this.user.stats,
        // keep the GP ledger and anything else the purse carries; the rules only speak for the four numbers
        gp: { ...this.user.stats.gp, ...purse }
      }
      return this.profileDb.updateStats(this.user.id, updatedStats).then(this.loadUsers)
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
    // Leaving the bank goes back, or up to Home Town when the bank was opened with no history behind it
    const { stepBack: goBack } = useBack();
    // The banker talks, offers and answers in the game's own dialog, not in native alerts
    const reveal = useRevealPrompt();
    // The banker's words follow the hero's voice (simple, adventure or classic)
    const { voice: words } = useVoice();
    const t = copyIn(words);

    return {
      t,
      words,
      goBack,
      profileDb,
      userStore,
      reveal,
      prompt: reveal.prompt,
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
