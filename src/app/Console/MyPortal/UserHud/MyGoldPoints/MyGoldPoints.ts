import { computed, defineComponent, onMounted, ref } from "vue";

import { useUserStore } from "@/lib/store/stores/user";
import ionic from "@/lib/mixins/ionic";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { useCountUp } from "@/hooks/useCountUp";
import { useVoice } from "@/hooks/useVoice";
import { copyFor } from "@/lib/services/copy/copy";
import { getPurchaseLogDb, type PurchaseLogEntry } from "@/lib/databases/PurchaseLogDb";
import { DEFAULT_FAMILY_SETTINGS, loadFamilySettings, type CashOutSettings } from "@/lib/services/family/familySettings";
import { GOLD_APP, amountAsk, debtMenuPrompt, noticePrompt, savingsMenuPrompt } from "@/lib/services/gp/bankPrompts";
import { type BankAction, bankMove, bankReceipt, bankRefusal, gold } from "@/lib/services/gp/bankTeller";
import { cashOutQuote, cashValue, dollars, isPendingCashOut, requestCashOut } from "@/lib/services/gp/cashOut";
import { askForGp, declineRequest, heroName, payRequest, requestsOf, sendGp } from "@/lib/services/gp/gpGifts";
import {
  LEDGER_RANGES,
  entriesIn,
  entryAmount,
  entryIcon,
  groupByDay,
  ledgerOf,
  ledgerTotals,
  type GpLedgerEntry,
  type LedgerRange,
} from "@/lib/services/gp/gpLedger";
import { WALLET_TIERS, creditLineOf, hospitalBillOf, loanRoom, normalizePurse, type BankMove } from "@/lib/services/gp/wallet";
import { walletShopFor } from "@/lib/services/gp/walletShops";
import { cashOutPrompt, cashOutRefusal, giftAmountPrompt, pickHeroPrompt, sendMenuPrompt, walletNotice } from "@/lib/services/gp/walletPrompts";
import { announceBillPaid } from "@/lib/services/hometown/hospitalAdmission";
import { whenCopy } from "@/lib/services/notifications/Notifications";

type WalletTab = "activity" | "wallet" | "wallets";

/** How many lines the GP tab shows before "See all" */
const RECENT_LINES = 5;

/**
 * My Funds, the hero's wallet app: the wallet and its gauge, savings and debt, requests from the family, the money
 * moves (pay down or borrow, cash out, send or ask), and the history of every GP move (services/gp/gpLedger.ts).
 * The rules live in services/gp; this screen asks in the game's own dialog and shows the results.
 */
export default defineComponent({
  mixins: [ionic],
  props: ["userId"],
  name: "my-gold-points",
  components: {
    XpRevealPrompt,
  },
  methods: {
    selectTab(id: string) {
      this.tab = id as WalletTab;
    },

    /** The savings counter: deposit or withdraw, then how much on the stepper. */
    async clickSavings() {
      const pick = await this.reveal.showPrompt(savingsMenuPrompt(this.user.stats.gp, this.words));
      const isSavingsErrand = pick === "deposit" || pick === "withdraw";
      if (isSavingsErrand) await this.moneyErrand(pick);
    },

    /** The debt counter: pay it down (the Hospital's bill first) or borrow from the bank. */
    async clickDebt() {
      const pick = await this.reveal.showPrompt(debtMenuPrompt(this.user.stats.gp, this.words));
      const isDebtErrand = pick === "payDebt" || pick === "borrow";
      if (isDebtErrand) await this.moneyErrand(pick);
    },

    /** A money move in the game's own dialog, by the bank's rules: the stepper reaches what the move can take. */
    async moneyErrand(action: BankAction) {
      const ask = amountAsk(action, this.user.stats.gp, GOLD_APP, this.words);
      const isRefused = "refusal" in ask;
      if (isRefused) {
        this.play$fx("no");
        await this.reveal.showPrompt(noticePrompt(ask.refusal, undefined, GOLD_APP));
        return;
      }
      const { id, amount } = await this.reveal.showAmountPrompt(ask.prompt);
      const isCancelled = id !== "ok" || !amount;
      if (isCancelled) return;
      await this.applyMove(action, bankMove(action, this.user.stats.gp, amount));
    },

    /** Every bank move ends here: refuse with a reason, or save the purse the rules computed and read the receipt. */
    async applyMove(action: BankAction, move: BankMove) {
      const before = this.user.stats.gp;
      const refusal = bankRefusal(action, before, move, this.words);
      if (refusal) {
        this.play$fx("no");
        await this.reveal.showPrompt(noticePrompt(refusal, undefined, GOLD_APP));
        return;
      }
      this.play$fx("countCoins");
      // The bill reaching 0 lifts the grounding at once; the family hears of it after the purse is saved
      const clearsBill = hospitalBillOf(before) > 0 && hospitalBillOf(move.gp) === 0;
      const heroId = this.user.id;
      const receipt = bankReceipt(action, before, move, this.words);
      this.userStore.setWallet(heroId, move.gp, { kind: action });
      if (clearsBill) announceBillPaid(heroId);
      await this.reveal.showPrompt(noticePrompt(receipt, "coins", GOLD_APP));
    },

    /** Trade GP for real money at the Game Master's rate; it waits in Approvals until they hand it over. */
    async clickCashOut() {
      const settings = await loadFamilySettings();
      this.cashOut = settings.cashOut;
      const quote = cashOutQuote(this.user.stats.gp, settings.cashOut, this.user.id);
      const refusal = cashOutRefusal(quote, this.words);
      if (refusal) {
        this.play$fx("no");
        await this.reveal.showPrompt(walletNotice(refusal));
        return;
      }
      const { id, amount } = await this.reveal.showAmountPrompt(cashOutPrompt(quote, this.words));
      const isCancelled = id !== "ok" || !amount;
      if (isCancelled) return;
      const entry = await requestCashOut(this.user.id, amount, quote.rate);
      if (!entry) return;
      this.play$fx("countCoins");
      await this.loadPendingCashOuts();
      const cash = dollars(cashValue(amount, quote.rate));
      await this.reveal.showPrompt(walletNotice(copyFor("wallet.cashOut.sent", this.words, { gp: amount, cash }), true));
    },

    /** Send GP to someone in the family, or ask them for some. */
    async clickSendRequest() {
      const mode = await this.reveal.showPrompt(sendMenuPrompt(this.words));
      const isPicked = mode === "send" || mode === "ask";
      if (!isPicked) return;
      const hasNobody = this.family.length === 0;
      if (hasNobody) {
        await this.reveal.showPrompt(walletNotice(copyFor("wallet.send.alone", this.words)));
        return;
      }
      const purse = normalizePurse(this.user.stats.gp);
      const isSendingNothing = mode === "send" && purse.wallet <= 0;
      if (isSendingNothing) {
        this.play$fx("no");
        await this.reveal.showPrompt(walletNotice(copyFor("wallet.send.empty", this.words)));
        return;
      }
      const toId = await this.reveal.showPrompt(pickHeroPrompt(mode, this.family, this.user.id, this.words));
      const to = this.userStore.users[toId];
      if (!to) return;
      const name = heroName(to);
      const max = mode === "send" ? purse.wallet : purse.limit;
      const { id, amount } = await this.reveal.showAmountPrompt(giftAmountPrompt(mode, name, max, purse.wallet, this.words));
      const isCancelled = id !== "ok" || !amount;
      if (isCancelled) return;
      if (mode === "ask") {
        askForGp(this.user.id, toId, amount);
        this.play$fx("select");
        await this.reveal.showPrompt(walletNotice(copyFor("wallet.ask.done", this.words, { name, amount: gold(amount) })));
        return;
      }
      const sent = await sendGp(this.user.id, toId, amount);
      if (!sent.ok) {
        this.play$fx("no");
        await this.reveal.showPrompt(walletNotice(copyFor("wallet.send.empty", this.words)));
        return;
      }
      this.play$fx("countCoins");
      await this.reveal.showPrompt(walletNotice(copyFor("wallet.send.done", this.words, { name, amount: gold(amount) }), true));
    },

    /** Pay a request from the family out of the wallet. */
    async payAsk(requestId: string, fromId: string) {
      const result = await payRequest(this.user.id, requestId);
      if (!result.ok) {
        this.play$fx("no");
        await this.reveal.showPrompt(walletNotice(copyFor("wallet.request.short", this.words)));
        return;
      }
      this.play$fx("countCoins");
      const name = heroName(this.userStore.users[fromId]);
      await this.reveal.showPrompt(walletNotice(copyFor("wallet.request.paid", this.words, { name, amount: gold(result.amount) }), true));
    },

    declineAsk(requestId: string) {
      this.play$fx("closeMenu");
      declineRequest(this.user.id, requestId);
    },

    /** The line's amount as the row prints it: +₲12, -₲5, or ₲20 for a move between wallet and savings. */
    amountText(entry: GpLedgerEntry): string {
      const amount = entryAmount(entry);
      const isTransfer = entry.kind === "deposit" || entry.kind === "withdraw";
      if (isTransfer) return gold(amount);
      return `${amount >= 0 ? "+" : "-"}${gold(Math.abs(amount))}`;
    },

    amountClass(entry: GpLedgerEntry): string {
      const isTransfer = entry.kind === "deposit" || entry.kind === "withdraw";
      if (isTransfer) return "is-move";
      return entry.gp >= 0 ? "is-in" : "is-out";
    },

    /** The row's second line: when, and the debt it changed when it did */
    entrySubtitle(entry: GpLedgerEntry): string {
      const when = whenCopy(entry.at);
      const owed = entry.debt + entry.bill;
      const isDebtChange = owed !== 0;
      return isDebtChange ? `${when} · debt ${owed > 0 ? "+" : "-"}${gold(Math.abs(owed))}` : when;
    },

    entryIcon,
    gold,
  },
  setup(props) {
    const userStore = useUserStore();
    // The Gold app asks and answers in the game's own dialog, not in native alerts
    const reveal = useRevealPrompt();
    // The Gold app's words follow the hero's voice (simple, adventure or classic)
    const { voice: words } = useVoice();
    const { rootClass, rootStyle } = useAppSkin("wallet");

    const tab = ref<WalletTab>("wallet");
    const range = ref<LedgerRange>("all");
    const cashOut = ref<CashOutSettings>(DEFAULT_FAMILY_SETTINGS.cashOut);
    const pendingCashOuts = ref<PurchaseLogEntry[]>([]);

    const user = computed(() => userStore.getUserById(props.userId));
    const purse = computed(() => normalizePurse(user.value?.stats?.gp));
    const ledger = computed(() => ledgerOf(user.value?.stats?.gp));
    const requests = computed(() => requestsOf(user.value?.stats?.gp));

    // The balance rolls to its new value after a move, like the battle's odometers
    const { shown: walletShown, pulse: walletPulse, delta: walletDelta } = useCountUp(() => purse.value.wallet);
    const fill = computed(() => Math.min(100, Math.round((purse.value.wallet / Math.max(1, purse.value.limit)) * 100)));
    const isWalletFull = computed(() => purse.value.wallet >= purse.value.limit);
    const owed = computed(() => purse.value.debt + purse.value.hospitalBill);
    const netWorth = computed(() => purse.value.wallet + purse.value.savings - owed.value);

    const family = computed(() =>
      Object.values(userStore.users as Record<string, any>).filter((member) => member && String(member.id) !== String(props.userId))
    );

    const recent = computed(() => entriesIn(ledger.value, "all").slice(0, RECENT_LINES));
    const inRange = computed(() => entriesIn(ledger.value, range.value));
    const days = computed(() => groupByDay(inRange.value));
    const totals = computed(() => ledgerTotals(inRange.value));

    const debtSubtitle = computed(() => {
      const isDebtFree = owed.value <= 0;
      if (isDebtFree) return `Debt-free · borrow up to ${gold(loanRoom(purse.value))}`;
      return `Owe ${gold(owed.value)} · pay it back to clear it`;
    });

    const cashOutAllowed = computed(() => {
      const settings = cashOut.value;
      return settings.enabled && (!settings.heroIds.length || settings.heroIds.includes(String(props.userId)));
    });
    const cashOutSubtitle = computed(() => {
      const isOff = !cashOutAllowed.value;
      if (isOff) return "Off · ask a Game Master";
      return `${cashOut.value.gpPerDollar} GP = $1 · a Game Master pays it`;
    });

    /** The wallet sizes, smallest first, with where each is sold and whether the hero has it */
    const tiers = computed(() => {
      const level = Number(user.value?.stats?.level) || 1;
      const nextLimit = WALLET_TIERS.find((tier) => tier.limit > purse.value.limit)?.limit;
      return WALLET_TIERS.map((tier) => {
        const shop = walletShopFor(tier.limit);
        const isOwned = tier.limit <= purse.value.limit;
        const isCurrent = tier.limit === purse.value.limit;
        const isNext = tier.limit === nextLimit;
        const isLocked = !isOwned && level < tier.minLevel;
        const region = shop ? shop.region.charAt(0).toUpperCase() + shop.region.slice(1) : "";
        const where = shop ? `${shop.shop}, ${region}` : "Every hero starts with one";
        const subtitle = isOwned ? where : `${where} · Lv ${tier.minLevel}`;
        return { ...tier, isOwned, isCurrent, isNext, isLocked, subtitle };
      });
    });

    const tabs = computed(() => [
      { id: "activity", label: "Activity", faIcon: "receipt", badge: null },
      { id: "wallet", label: "GP", faIcon: "wallet", badge: requests.value.length || null, badgeColor: "danger" },
      { id: "wallets", label: "Wallets", faIcon: "sack", badge: null },
    ]);

    const headerMeta = computed(() => (user.value ? `${gold(purse.value.wallet)} / ${gold(purse.value.limit)}` : ""));

    const loadPendingCashOuts = async () => {
      try {
        const pending = await getPurchaseLogDb().getPending();
        pendingCashOuts.value = pending.filter((entry) => isPendingCashOut(entry, String(props.userId)));
      } catch {
        pendingCashOuts.value = [];
      }
    };

    onMounted(async () => {
      cashOut.value = (await loadFamilySettings()).cashOut;
      await loadPendingCashOuts();
    });

    return {
      words,
      user,
      userStore,
      reveal,
      prompt: reveal.prompt,
      rootClass,
      rootStyle,
      tab,
      tabs,
      range,
      ranges: LEDGER_RANGES,
      cashOut,
      cashOutSubtitle,
      cashOutAllowed,
      pendingCashOuts,
      loadPendingCashOuts,
      purse,
      walletShown,
      walletPulse,
      walletDelta,
      fill,
      isWalletFull,
      owed,
      netWorth,
      creditLine: computed(() => creditLineOf(purse.value)),
      debtSubtitle,
      requests,
      family,
      recent,
      days,
      totals,
      tiers,
      headerMeta,
      heroName,
      whenCopy,
      copyFor,
    };
  },
});
