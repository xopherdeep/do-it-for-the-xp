import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ionic from "@/lib/mixins/ionic";

import {
  arrowBack,
  checkmark,
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
  banOutline
} from "ionicons/icons";
import { actionSheetController, modalController, onIonViewWillEnter } from "@ionic/vue";
import { appSheet } from "@/components/organisms/XpApp/useAppSkin";
import debug from "@/lib/utils/debug";
import { play$fx } from "@/assets/fx";
// Import ATM Modal component
import ATMModal from "@/app/Console/MyPortal/HomeTown/GoldBank/components/ATMModal.vue";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { useCopy, useVoice } from "@/hooks/useVoice";
import ShopShelfSlider from "./components/ShopShelfSlider.vue";
import ShopItemModal from "./components/ShopItemModal.vue";
import { useUserStore } from "@/lib/store/stores/user";
import shopsDb, {
  ShopInterface,
  clerkDefaultFor,
  customClerkName,
  customGreeting,
  customIcon,
  customWorld,
} from "@/lib/databases/ShopsDb";
import { hoursSummary, isShopOpen, opensAtLabel } from "@/lib/services/shops/shopHours";
import AccessoriesDb, { accessoriesStorage } from "@/lib/databases/AccessoriesDb";
import {
  buyItem as purchaseItem,
  InsufficientFundsError,
  PurchaseError,
  isConsumableItem,
  stockShelf,
} from "@/lib/services/shop/PurchaseService";
import type { ShelfItem } from "@/lib/services/shop/PurchaseService";
import { buyWalletUpgrade, hospitalBillOf } from "@/lib/services/gp/wallet";
import { gold, walletOfferAt } from "@/lib/services/gp/walletShops";
import { type BankAction, bankMove, bankReceipt, bankRefusal } from "@/lib/services/gp/bankTeller";
import { announceBillPaid } from "@/lib/services/hometown/hospitalAdmission";
import {
  atmNotice,
  clerkPrompt,
  consumablePurchaseReceipt,
  purchaseFailure,
  purchaseReceipt,
  shopAccent,
  shopRefusal,
  walletPitch,
  walletReceipt,
  walletRefusal,
  type ShopVoice,
} from "@/lib/services/shop/shopPrompts";
import { shopDiscountLabel, shopPrice } from "@/lib/services/stats/StatEffects";
import { SHOP_METADATA } from "@/lib/engine/core/shopRegistry";
import { WORLD_METADATA, worldColor } from "@/lib/engine/core/worldRegistry";
import { merchantWorldOn } from "@/lib/services/shops/travelingMerchant";
import { parentOf } from "@/router/parentOf";

/** What the ATM hands over: the amount picked on its stepper */
interface GpAmount {
  gp?: number | string;
}

type ShelfFilter = "all" | "affordable" | "out-of-budget";

// The ways to look at the shelves, picked from the shelves sheet
const SHELF_FILTERS: ReadonlyArray<{ id: ShelfFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "affordable", label: "Can Afford" },
  { id: "out-of-budget", label: "Can't Afford" },
];

// The general store you reach from Home Town; also where an unknown shop id ends up.
const DEFAULT_SHOP_ID = "hometown-market";

const resolveAssetUrl = (asset: any): string => {
  if (!asset) return "";
  if (typeof asset === "string") return asset;
  const isAssetModule = typeof asset === "object" && typeof asset.default === "string";
  if (isAssetModule) return asset.default;
  return String(asset);
};

// The Game Master can dress a shop in a world's art (Compendium > Economy > Shops > Decorate).
// Only world-*.webp / hometown.webp are looked up by key; keep the filter (a bare context bundles all 90 MB)
const requireWorldBg = require.context("@/assets/images/backgrounds/", false, /^\.\/(world-[a-z-]+|hometown)\.webp$/);
// Empty when the world has no art of its own, so the shop keeps its usual picture.
const worldBackground = (world: string): string => {
  if (!world) return "";
  try {
    const raw = requireWorldBg(world === "hometown" ? "./hometown.webp" : `./world-${world}.webp`);
    return resolveAssetUrl(raw);
  } catch {
    return "";
  }
};

export default defineComponent({
  props: ["userId", "merchant"],
  name: "accessory-shop",
  components: {
    ATMModal,
    XpRevealPrompt,
    ShopShelfSlider,
    ShopItemModal,
  },
  mixins: [ionic],
  data() {
    return {
      showAtm: false,
      // The clerk is talking (the FAB, or being turned away at a shut door): the FAB does nothing until it ends
      isTalking: false,
      // Map shop IDs to background image paths
      shopBackgrounds: {
        "pegasus-ranch": require("@/assets/images/backgrounds/shops/pegasus-ranch.webp"),
        "wrecked-ship": require("@/assets/images/backgrounds/shops/wrecked-ship.webp"),
        "witchs-hut": require("@/assets/images/backgrounds/shops/witchs-hut.webp"),
        "snow-shack": require("@/assets/images/backgrounds/shops/snow-shack.webp"),
        "pond-of-life": require("@/assets/images/backgrounds/shops/pond-of-life.webp"),
        "hermits-tent": require("@/assets/images/backgrounds/shops/hermits-tent.webp"),
        "crystal-caverns": require("@/assets/images/backgrounds/shops/crystal-caverns.webp"),
        "cloud-market": require("@/assets/images/backgrounds/shops/cloud-market.webp"),
        "theia-city": require("@/assets/images/backgrounds/shops/theia-city.webp"),
        // The balloon stands in whichever world it visits today, so it shows that world (shopBackgroundUrl)
        "traveling-merchant": require("@/assets/images/midjourney/shop.webp"),
        // Home Town's market and any shop the Game Master adds
        default: require("@/assets/images/midjourney/shop.webp")
      },
      // Each shop's sign. Who minds the shop and what they say live in SHOP_CLERK_DEFAULTS (ShopsDb),
      // where the Game Master's clerk tab shows them as the placeholder.
      merchants: {
        "pegasus-ranch": { icon: "farm" },
        "wrecked-ship": { icon: "ship" },
        "hermits-tent": { icon: "campground" },
        "witchs-hut": { icon: "cauldron" },
        "crystal-caverns": { icon: "dungeon" },
        "snow-shack": { icon: "igloo" },
        "traveling-merchant": { icon: "wagon-covered" },
        "theia-city": { icon: "chess-rook" },
        default: { icon: "store" }
      }
    };
  },
  computed: {
    // The Game Master's name for the shop, else its address read out ("hometown-market" -> "hometown market")
    shopName(): string {
      if (this.shopRecord?.name) return this.shopRecord.name;
      return this.merchant ? this.merchant.replace(/-/g, " ") : "Shop";
    },
    shopIcon() {
      return this.currentMerchant
        ? this.currentMerchant.icon
        : this.merchants.default.icon
    },
    currentMerchant() {
      // console.log(this.merchant);
      return this.merchants[this.merchant]
    },
    // The Game Master's own clerk and line (Compendium > Economy > Shops > Clerk), else the portal's.
    shopGreeting(): string {
      return customGreeting(this.shopRecord) || clerkDefaultFor(this.shopRecord?.id ?? this.merchant).greeting;
    },
    shopkeeper(): string {
      return customClerkName(this.shopRecord) || clerkDefaultFor(this.shopRecord?.id ?? this.merchant).shopkeep;
    },
    // The Game Master's icon for the sign, else the one this portal has always hung there.
    shopIconClass(): string {
      const custom = customIcon(this.shopRecord);
      return custom ? `${custom} fa-lg` : `fad fa-lg fa-${this.shopIcon}`;
    },
    // Boobeedeedle's balloon shop, which stands in a different world every day
    isTraveling(): boolean {
      const shopId = this.shopRecord?.id ?? this.merchant ?? "";
      return SHOP_METADATA[shopId]?.type === "traveling";
    },
    // Where the shop stands: the world picked on the Decorate tab, else its own, else wherever the merchant is today
    shopWorld(): string {
      const shopId = this.shopRecord?.id ?? this.merchant ?? "";
      const world = this.shopRecord?.world || SHOP_METADATA[shopId]?.world || "";
      const followsTheMerchant = this.isTraveling && (!world || world === "traveling");
      return followsTheMerchant ? merchantWorldOn(this.now) : world;
    },
    // Where Back goes with no history behind the shop: the world it stands in, or Home Town for the town's own market.
    backHref(): string | undefined {
      const here = { name: "shop", params: { merchant: this.merchant, userId: this.heroId } };
      return parentOf(here, { shopWorld: this.shopWorld }) ?? undefined;
    },
    // The shop wears its world's colour.
    shopColor(): string {
      return worldColor(this.shopWorld);
    },
    // Who speaks at the counter, and the colour of their box: the region's own, or the general store's
    voice(): ShopVoice {
      return { shopkeeper: this.shopkeeper, accent: shopAccent(this.shopWorld) };
    },
    // What the clerk says while the doors are shut.
    closedLine(): string {
      return this.t("shop.closed", { opensAt: this.opensAt });
    },
    // What the clerk says when you talk to them: the greeting, a word on your charm, how to shop.
    clerkLines(): string[] {
      if (!this.isOpen) return [this.closedLine];
      const lines = [this.shopGreeting];
      if (this.charismaDiscount) {
        lines.push(this.t("shop.charm", { discount: this.charismaDiscount }));
      }
      if (this.walletWare?.status === "for-sale") {
        lines.push(this.t("shop.walletUp"));
      }
      if (this.isTraveling) {
        const where = WORLD_METADATA[this.shopWorld]?.name || "these parts";
        lines.push(this.t("shop.traveling", { where }));
      }
      lines.push(this.t("shop.swipe"));
      return lines;
    },
    shopBackgroundUrl(): string {
      const travelingWorld = this.isTraveling ? worldBackground(this.shopWorld) : "";
      const candidate =
        worldBackground(customWorld(this.shopRecord)) ||
        travelingWorld ||
        this.shopBackgrounds[this.merchant] ||
        this.shopBackgrounds.default;
      return resolveAssetUrl(candidate);
    },
    dynamicShopBackground() {
      // A world picked on the Decorate tab wins; an untouched shop keeps its own picture.
      const backgroundImage = this.shopBackgroundUrl;
      return {
        // Quoted: the browser drops an unquoted url() whose file name holds an apostrophe or a space (the old witch's-hut)
        backgroundImage: `url("${backgroundImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    },
    user() {
      return this.userStore.getUserById(this.heroId);
    }
  },
  methods: {
    talkToClerk() {
      this.play$fx("select");
      return this.converse();
    },
    // The clerk's lines type out in the game's own dialog, then the menu: browse, or the ATM. Behind a shut door the
    // clerk says when the shop opens and that is all.
    async converse() {
      if (this.isTalking) return;
      this.isTalking = true;
      try {
        const pick = await this.reveal.ask(clerkPrompt(this.voice, this.clerkLines, this.isOpen));
        if (pick === "atm" && this.isOpen) this.openATM();
      } finally {
        this.isTalking = false;
      }
    },
    // ATM methods
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

    // The ATM asks how much (on its stepper) and hands the amount over; the move and its receipt are the shop's,
    // by the same rules as the Gold Bank: a refusal says why, and paying the Hospital's bill to 0 lifts the grounding.
    async atmErrand(action: BankAction, data: GpAmount) {
      const amount = Number(data?.gp);
      const hero = this.user;
      if (!(amount > 0) || !hero?.stats) return;
      const before = hero.stats.gp;
      const move = bankMove(action, before, amount);
      const refusal = bankRefusal(action, before, move, this.words);
      if (refusal) {
        await this.reveal.ask(atmNotice(this.voice, refusal, { sound: "no" }));
        return;
      }
      const clearsBill = hospitalBillOf(before) > 0 && hospitalBillOf(move.gp) === 0;
      const receipt = bankReceipt(action, before, move, this.words);
      this.userStore.setWallet(this.heroId, move.gp);
      if (clearsBill) announceBillPaid(this.heroId);
      await this.reveal.ask(atmNotice(this.voice, receipt, { sprite: "coins", sound: action === "payDebt" ? "success" : "coins" }));
    },

    // The shelves rise as the game's sheet at the bottom of the screen, ringed in the shop's colour
    async openShelfFilter() {
      if (!this.isOpen) return;
      const sheet = await actionSheetController.create({
        header: "Shelves",
        ...appSheet(undefined, `xp-app-sheet--${this.voice.accent}`),
        buttons: [
          ...SHELF_FILTERS.map((filter) => ({
            text: filter.label,
            icon: filter.id === this.shelfFilter ? checkmark : undefined,
            handler: () => {
              play$fx("select");
              this.setShelfFilter(filter.id);
            },
          })),
          { text: "Cancel", role: "cancel" },
        ],
      });
      play$fx("openMenu");
      await sheet.present();
    },
    closeModal(_itemId) {
      debug.log("Closing modal with itemId:", _itemId);
      return modalController.dismiss(null, 'cancel');
      // this.$refs[`modal-${itemId}`].$el.dismiss(null, 'cancel');
    },
    // The Game Master's hours (Compendium > Economy > Shops > Hours): behind a shut door the clerk says when the
    // shop opens and nothing is sold, even if the hour struck while an item was open on screen.
    turnedAwayWhileClosed(): boolean {
      if (this.isOpen) return false;
      this.play$fx("no");
      this.closeInspect();
      void this.converse();
      return true;
    },
    // The shop's own ware, not something the Game Master stocked: the next wallet size, sold here and only here.
    // The shopkeeper pitches it (or says why not), the hero says yes, and it pays out of savings first, then the wallet;
    // the new limit takes effect at once (no delivery to wait on).
    async buyWallet() {
      const ware = this.walletWare;
      const isPurchaseBlocked = !ware || this.isBuying || this.turnedAwayWhileClosed();
      if (isPurchaseBlocked) return;
      const stats = this.userStore.users[this.heroId]?.stats;
      const pick = await this.reveal.ask(walletPitch(this.voice, ware, stats?.gp, Number(stats?.level) || 1, this.words));
      if (pick !== "yes") return;

      // Time passed while the hero thought: the purse is read again before it is charged
      const fresh = this.userStore.users[this.heroId]?.stats;
      const result = buyWalletUpgrade(fresh?.gp, Number(fresh?.level) || 1);
      if (result.ok) {
        this.userStore.setWallet(this.heroId, result.gp);
        await this.reveal.ask(walletReceipt(this.voice, result.offer.limit, this.words));
      } else {
        await this.reveal.ask(shopRefusal(this.voice, walletRefusal(result, this.words), "coins"));
      }
    },
    // The GP leaves the wallet now; the Game Master hands the real thing over later
    // (it shows up under Approvals > Accessories until they do). Nothing goes into the bag, so a full bag never matters here.
    async buyItem(item: ShelfItem) {
      if (this.isBuying) return;
      if (this.turnedAwayWhileClosed()) return;
      this.isBuying = true;
      try {
        await purchaseItem(this.heroId, item);
      } catch (error) {
        this.isBuying = false;
        const shortBy = error instanceof InsufficientFundsError ? error.shortBy : null;
        const reasonCode = error instanceof PurchaseError ? error.code : undefined;
        if (shortBy === null && reasonCode !== "bag-full") debug.error("Purchase failed:", error);
        await this.reveal.ask(purchaseFailure(this.voice, item.name, shortBy, this.words, reasonCode));
        return;
      }

      try {
        this.play$fx("buyItem");
        this.closeInspect();
        await modalController.dismiss(null, "confirm").catch(() => false);
      } finally {
        this.isBuying = false;
      }
      // Consumables are packed in the bag immediately; real-life goods await Game Master handover
      const isConsumable = isConsumableItem(item);
      const receiptPrompt = isConsumable
        ? consumablePurchaseReceipt(this.voice, item.name, this.words)
        : purchaseReceipt(this.voice, item.name, this.words);
      await this.reveal.ask(receiptPrompt);
    }
  },
  mounted() {
    this.$fx?.ui?.[this.$fx?.theme?.ui]?.openShop?.play?.();
  },
  setup(props) {
    const userStore = useUserStore();
    const accessoriesDb = new AccessoriesDb(accessoriesStorage);
    // The clerk, the wallet and the receipts speak in the game's own dialog, not in native alerts and sheets
    const reveal = useRevealPrompt();
    // The clerk's words follow the hero's voice (simple, adventure or classic); `voice` here is the shopkeeper
    const t = useCopy();
    const { voice: words } = useVoice();

    // Shops reached from the world map are opened without a hero id, so fall back to whoever is playing.
    const heroId = computed(() => String(props.userId || userStore.currentUser.id || ""));
    const wallet = computed(() => Number(userStore.users[heroId.value]?.stats?.gp?.wallet) || 0);
    const canAfford = (price: number) => wallet.value >= price;
    // The catalogue keeps a bare Font Awesome name ("film"); a full class ("fad fa-film") is honoured as given
    const itemIconClass = (icon: string): string => {
      if (!icon) return "fad fa-gift";
      const isFullClass = icon.includes("fa-");
      return isFullClass ? icon : `fad fa-${icon}`;
    };
    // Null at shops that sell no wallet (Home Town, the Swamps, the Tundra, the Clouds)
    const walletWare = computed(() => {
      const stats = userStore.users[heroId.value]?.stats;
      return walletOfferAt(props.merchant, stats?.gp, Number(stats?.level) || 1);
    });

    const shelf = ref<ShelfItem[]>([]);
    // The Game Master's shop record: its clerk, sign, picture and hours
    const shopRecord = ref<ShopInterface | null>(null);
    const isLoading = ref(true);
    const isBuying = ref(false);
    const search = ref("");
    // The slider on the shop floor, and where it stands, for the footer's < > buttons
    const shelfRef = ref<{ prev: () => void; next: () => void } | null>(null);
    const shelfPosition = ref({ index: 0, count: 0 });
    const canGoBack = computed(() => Boolean(shelfRef.value) && shelfPosition.value.index > 0);
    const canGoForward = computed(
      () => Boolean(shelfRef.value) && shelfPosition.value.index < shelfPosition.value.count - 1
    );
    const shelves = ref<string[]>(["affordable", "out-of-budget"]);
    const inspectedItem = ref<ShelfItem | null>(null);
    const openInspect = (item: ShelfItem) => {
      play$fx("select");
      inspectedItem.value = item;
    };
    const closeInspect = () => {
      inspectedItem.value = null;
    };
    const shelfFilter = ref<ShelfFilter>("all");
    const shelfFilterLabel = computed(() => SHELF_FILTERS.find((filter) => filter.id === shelfFilter.value)?.label ?? "All");
    const setShelfFilter = (filter: ShelfFilter) => {
      shelfFilter.value = filter;
      if (filter === "all") {
        shelves.value = ["affordable", "out-of-budget"];
      } else {
        shelves.value = [filter];
      }
    };

    // Trained charisma takes 1% a point off every price on the shelf, up to 20% (docs/Stats-Contract.md);
    // the shelf carries the price this hero pays, so the badge, the "need more" line and the charge agree.
    const charismaDiscount = computed(() => shopDiscountLabel(userStore.users[heroId.value]));

    // Whether the shop is open right now by the Game Master's hours; the clock keeps ticking while you stand there.
    const now = ref(new Date());
    const clockTimer = setInterval(() => {
      now.value = new Date();
    }, 30000);
    onBeforeUnmount(() => clearInterval(clockTimer));
    const isOpen = computed(() => isShopOpen(shopRecord.value?.hours, now.value));
    const opensAt = computed(() => opensAtLabel(shopRecord.value?.hours, now.value));
    const hoursLine = computed(() => hoursSummary(shopRecord.value?.hours));

    // What the Game Master stocked in this shop (Compendium > Accessories > Shops).
    // Only the newest load may write the shelf, so a slow earlier read can't overwrite a fresh one.
    let latestLoad = 0;
    const loadShelf = async () => {
      const thisLoad = ++latestLoad;
      try {
        const requested = props.merchant ? await shopsDb.getShopById(props.merchant) : null;
        const shop = requested || (await shopsDb.getShopById(DEFAULT_SHOP_ID));
        const accessories = await accessoriesDb.getAccessories();
        if (thisLoad === latestLoad) {
          now.value = new Date();
          shopRecord.value = shop ?? null;
          const hero = userStore.users[heroId.value];
          shelf.value = stockShelf(shop?.items ?? [], accessories, heroId.value).map((item) => ({
            ...item,
            price: shopPrice(item.price, hero),
          }));
        }
      } catch (error) {
        debug.error("Failed to stock the shelves:", error);
        if (thisLoad === latestLoad) {
          shelf.value = [];
          shopRecord.value = null;
        }
      } finally {
        if (thisLoad === latestLoad) isLoading.value = false;
      }
    };
    onMounted(loadShelf);
    onIonViewWillEnter(loadShelf);
    watch([() => props.merchant, heroId], () => {
      isLoading.value = true;
      void loadShelf();
    });

    const visibleItems = computed(() => {
      const term = search.value.trim().toLowerCase();
      return shelf.value.filter((item) => {
        const isHiddenBySearch = term !== "" && !item.name.toLowerCase().includes(term);
        if (isHiddenBySearch) return false;
        return shelves.value.includes(canAfford(item.price) ? "affordable" : "out-of-budget");
      });
    });

    return {
      t,
      words,
      reveal,
      prompt: reveal.prompt,
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
      sunnyOutline,
      partlySunnyOutline,
      moonOutline,
      cloudyNightOutline,
      fitnessOutline,
      sparklesOutline,
      keyOutline,
      cartOutline,
      starSharp,
      userStore,
      heroId,
      wallet,
      canAfford,
      itemIconClass,
      walletWare,
      shopRecord,
      isOpen,
      opensAt,
      hoursLine,
      gold,
      charismaDiscount,
      shelf,
      shelves,
      isLoading,
      isBuying,
      search,
      now,
      visibleItems,
      shelfRef,
      shelfPosition,
      canGoBack,
      canGoForward,
      inspectedItem,
      openInspect,
      closeInspect,
      shelfFilter,
      shelfFilterLabel,
      setShelfFilter,
    };
  },
});
