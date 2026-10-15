import { computed, defineComponent, ref } from "vue";

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
  serverOutline,
  bagOutline,
  cartOutline
} from "ionicons/icons";
import { useUserStore } from "@/lib/store/stores/user";
import ionic from "@/lib/mixins/ionic"

import XpGp from "@/components/atoms/Currency/XpGp.vue";
import { modalController } from "@ionic/vue";
import XpSendRequest from "./SendRequest.vue"
import { ProfileDb } from "@/lib/databases";

import { profileStorage } from "@/lib/databases/profileStorage"
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { useVoice } from "@/hooks/useVoice";
import { GOLD_APP, amountAsk, noticePrompt, savingsMenuPrompt } from "@/lib/services/gp/bankPrompts";
import { type BankAction, bankMove, bankReceipt, bankRefusal } from "@/lib/services/gp/bankTeller";
import { type BankMove, hospitalBillOf } from "@/lib/services/gp/wallet";
import { announceBillPaid } from "@/lib/services/hometown/hospitalAdmission";

export default defineComponent({
  mixins: [ionic],
  props: ["userId"],
  name: "my-gold-points",
  data() {
    return {
      date: 'Today'
    }
  },
  components: {
    XpGp,
    XpRevealPrompt
  },
  computed: {
    getUserById() {
      return (id: string) => this.userStore.getUserById(id);
    }
  },
  methods: {
    loadUsers() {
      return this.userStore.loadUsers();
    },
    segmentChanged() {
      // console.warn("Segment changed", ev);
    },
    changeDate(event) {
      const date = event.detail.value;
      // console.log("date" + date);
      this.date = date;
      // localStorage.setItem("date", date);
    },
    async openSendRequest() {
      const modal = await modalController.create({
        component: XpSendRequest
      })
      modal.present()
    },

    /** The hospital bill is paid at the Gold Bank (grounding lifts when it reaches 0) */
    openBank() {
      void this.$router.push({ name: "bank", params: { userId: this.userId } });
    },

    /** Pay down debt (the Hospital's bill first): how much on the stepper, then the move and its receipt. */
    async clickPayDebt() {
      await this.moneyErrand("payDebt")
    },

    /** The savings counter: deposit or withdraw, then how much on the stepper. */
    async clickAddSavings() {
      const pick = await this.reveal.showPrompt(savingsMenuPrompt(this.user.stats.gp, this.words))
      const isSavingsErrand = pick === "deposit" || pick === "withdraw"
      if (isSavingsErrand) await this.moneyErrand(pick)
    },

    /** A money move in the game's own dialog, by the bank's rules: the stepper reaches what the move can take. */
    async moneyErrand(action: BankAction) {
      const ask = amountAsk(action, this.user.stats.gp, GOLD_APP, this.words)
      const isRefused = "refusal" in ask
      if (isRefused) {
        this.play$fx("no")
        await this.reveal.showPrompt(noticePrompt(ask.refusal, undefined, GOLD_APP))
        return
      }
      const { id, amount } = await this.reveal.showAmountPrompt(ask.prompt)
      const isCancelled = id !== "ok" || !amount
      if (isCancelled) return

      const gp = this.user.stats.gp
      const move = bankMove(action, gp, amount)
      await this.applyMove(action, move)
    },

    /** Every money move ends here: refuse with a reason, or save the purse the rules computed and read the receipt. */
    async applyMove(action: BankAction, move: BankMove) {
      const before = this.user.stats.gp
      const refusal = bankRefusal(action, before, move, this.words)
      if (refusal) {
        this.play$fx("no")
        await this.reveal.showPrompt(noticePrompt(refusal, undefined, GOLD_APP))
        return
      }
      this.play$fx("select")
      // The bill reaching 0 lifts the grounding at once; the family hears of it after the purse is saved
      const clearsBill = hospitalBillOf(before) > 0 && hospitalBillOf(move.gp) === 0
      const heroId = this.user.id
      const receipt = bankReceipt(action, before, move, this.words)
      await this.profileDb.updateStats(this.user.id, {
        ...this.user.stats,
        // keep the GP ledger and anything else the purse carries; the rules only speak for the four numbers
        gp: { ...before, ...move.gp }
      }).then(this.loadUsers)
      if (clearsBill) announceBillPaid(heroId)
      await this.reveal.showPrompt(noticePrompt(receipt, "coins", GOLD_APP))
    }
  },
  setup(props) {
    const userStore = useUserStore();
    const profileDb = new ProfileDb(profileStorage)
    const customAlertOptions = {
      header: 'Choose Date Range',
      subHeader: 'Calculate GP',
      message: 'Options unlock with time',
      translucent: true
    };

    const customPopoverOptions = {
      header: 'Hair Color',
      subHeader: 'Select your hair color',
      message: 'Only select your dominant hair color'
    };

    const customActionSheetOptions = {
      header: 'Colors',
      subHeader: 'Select your favorite color'
    };

    const walletSegment = ref("wallet");
    // The Gold app asks and answers in the game's own dialog, not in native alerts
    const reveal = useRevealPrompt();
    // The Gold app's words follow the hero's voice (simple, adventure or classic)
    const { voice: words } = useVoice();

    const user = computed(() => userStore.getUserById(props.userId));
    return {
      words,
      user,
      userStore,
      reveal,
      prompt: reveal.prompt,
      // date: computed(() => localStorage.getItem("date")),
      profileDb,
      walletSegment,
      customAlertOptions,
      customPopoverOptions,
      customActionSheetOptions,
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
      serverOutline,
      cartOutline
    };
  },
});
