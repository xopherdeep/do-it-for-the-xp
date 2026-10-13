import { defineComponent } from "vue";
import ionic from "@/lib/mixins/ionic";
import { useBack } from "@/hooks/useBack";
import { useCopy, useVoice } from "@/hooks/useVoice";
import XpIcon from "@/components/atoms/Icon/XpIcon.vue";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { useUserStore } from "@/lib/store/stores/user";
import { quoteBenchRest, quoteCare } from "@/lib/services/hometown/Lodging";
import type { CareKind } from "@/lib/services/hometown/Lodging";
import { ADMITTED_QUERY, takeAdmissionReceipt } from "@/lib/services/hometown/hospitalAdmission";
import { nurseAdmissionBlocks } from "@/lib/services/hometown/hospitalBill";
import {
  benchReceiptLine,
  benchRefusalLine,
  careConfirmPrompt,
  careReceiptLine,
  careRefusalLine,
  nurseMenuPrompt,
  nurseNotice,
  type NurseMenuId,
} from "@/lib/services/hometown/hometownPrompts";
import { hospitalBillOf } from "@/lib/services/gp/wallet";

export default defineComponent({
  props: ["userId"],
  name: "hospital-hub",
  mixins: [ionic],
  components: {
    XpIcon,
    XpRevealPrompt
  },
  data() {
    return {
      isLoading: false,
      isModalOpen: false,
      /** Nurse Joy is talking: the FAB waits until the conversation ends */
      isTalking: false,
      /** What Nurse Joy reads when a hero is carried in; empty for an ordinary visit */
      admissionBlocks: [] as string[]
    };
  },
  computed: {
    users() {
      return this.userStore.usersAz;
    },
    dialogBlocks() {
      if (this.admissionBlocks.length) return this.admissionBlocks;
      return [this.t("nurse.greet.welcome"), this.t("nurse.greet.adventure"), this.t("nurse.greet.services")];
    }
  },
  // The router keeps this page alive, so a hero carried in from a lost fight arrives on the enter hook, not on mount
  ionViewWillEnter() {
    this.greetAdmittedHero();
  },
  methods: {
    /**
     * A lost fight or a trap sends the hero here with ?admitted=1 (docs/Quest-Rooms-Spec.md 5.8): the treatment and the
     * bill are already done, so Nurse Joy opens with the bill instead of the usual welcome. The cue is read once and
     * taken off the address, so coming back to this page later gets the ordinary welcome.
     */
    greetAdmittedHero() {
      if (this.$route.query[ADMITTED_QUERY] !== "1") return;
      this.$router.replace({ name: "hospital", params: { userId: this.userId } });
      const owed = hospitalBillOf(this.userStore.getUserById(this.userId)?.stats?.gp);
      const blocks = nurseAdmissionBlocks(takeAdmissionReceipt(this.userId)?.charge ?? null, owed);
      if (!blocks.length) return;
      this.admissionBlocks = blocks;
      this.showNurseDialog();
    },

    /**
     * Nurse Joy's conversation, in the game's own dialog: her lines type out, then the menu. After each errand she asks
     * if there is anything else, until the hero leaves (back out of the hospital), steps away (Escape) or goes to the
     * patients list or their chart.
     */
    async showNurseDialog() {
      if (this.isTalking) return;
      this.isTalking = true;
      try {
        this.play$fx("select");
        let lines = this.dialogBlocks;
        // An admitted hero's lines are read once: the next welcome is the ordinary one
        this.admissionBlocks = [];
        for (;;) {
          const pick = (await this.reveal.ask(nurseMenuPrompt(lines))) as NurseMenuId | "stay";
          if (pick === "stay") return;
          if (pick === "leave") {
            this.goBack();
            return;
          }
          if (pick === "patients") {
            this.openPatientsModal();
            return;
          }
          if (pick === "stats") {
            this.$router.push(`/my-portal/${this.userId}/hospital/stats`);
            return;
          }
          if (pick === "bench") await this.handleBenchRest();
          else await this.handleCare(pick);
          lines = [this.t("npc.more")];
        }
      } finally {
        this.isTalking = false;
      }
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

    /**
     * Heal or Revive: Nurse Joy turns the hero away first when it cannot work (already healthy, or the wallet is short),
     * else the price and the question, then the co-pay.
     */
    async handleCare(kind: "heal" | "revive") {
      const quote = quoteCare(kind, this.userStore.getUserById(this.userId)?.stats);
      if (!quote.canPay) {
        this.play$fx("no");
        await this.reveal.ask(nurseNotice(careRefusalLine(quote, this.words)));
        return;
      }
      const pick = await this.reveal.ask(careConfirmPrompt(kind, this.words));
      if (pick !== "yes") return;
      await this.payCoPay(kind);
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
        await this.reveal.ask(nurseNotice(careRefusalLine(quote, this.words)));
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
      const mp = quote.mpGain > 0 ? stats?.mp : null;
      await this.reveal.ask(nurseNotice(careReceiptLine(kind, quote.cost, stats?.hp, mp, this.words), "heart"));
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
        await this.reveal.ask(nurseNotice(benchRefusalLine(quote, this.words)));
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
      await this.reveal.ask(nurseNotice(benchReceiptLine(quote.hpGain, stats?.hp, this.words), "heart"));
    }
  },
  setup() {
    const userStore = useUserStore();
    // Leaving goes back, or up to Home Town when the hospital was opened with no history behind it
    const { back: goBack } = useBack();
    // Nurse Joy talks, asks and answers in the game's own dialog, not in native alerts
    const reveal = useRevealPrompt();
    // Nurse Joy's words follow the hero's voice (simple, adventure or classic)
    const t = useCopy();
    const { voice: words } = useVoice();
    return { userStore, goBack, reveal, prompt: reveal.prompt, t, words };
  }
});
