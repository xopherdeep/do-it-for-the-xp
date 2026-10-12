import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
  bagOutline,
  cashOutline
} from "ionicons/icons";
import { actionSheetController, alertController, modalController, onIonViewWillEnter, toastController } from "@ionic/vue";
import debug from "@/lib/utils/debug";
import { play$fx } from "@/assets/fx";
// Import ATM Modal component
import ATMModal from "@/app/Console/MyPortal/HomeTown/GoldBank/components/ATMModal.vue";
import XpNpcDialog from "@/components/molecules/Dialog/XpNpcDialog.vue";
import ShopShelfSlider from "./components/ShopShelfSlider.vue";
import ShopItemModal from "./components/ShopItemModal.vue";
// Import the GPSystem
import { getGPService } from '@/lib/services/gp';
import { useUserStore } from "@/lib/store/stores/user";
import shopsDb, {
  ShopInterface,
  clerkDefaultFor,
  customClerkName,
  customGreeting,
  customIcon,
  customWorld,
} from "@/lib/databases/ShopsDb";
import { isShopOpen, opensAtLabel } from "@/lib/services/shops/shopHours";
import AccessoriesDb, { accessoriesStorage } from "@/lib/databases/AccessoriesDb";
import {
  buyItem as purchaseItem,
  InsufficientFundsError,
  stockShelf,
} from "@/lib/services/shop/PurchaseService";
import type { ShelfItem } from "@/lib/services/shop/PurchaseService";
import { buyWalletUpgrade } from "@/lib/services/gp/wallet";
import type { WalletUpgradeResult } from "@/lib/services/gp/wallet";
import { gold, walletOfferAt } from "@/lib/services/gp/walletShops";
import { shopDiscountLabel, shopPrice } from "@/lib/services/stats/StatEffects";
import { rpgToastOptions } from "@/hooks/useToast";
import { SHOP_METADATA } from "@/lib/engine/core/shopRegistry";
import { WORLD_METADATA, worldColor } from "@/lib/engine/core/worldRegistry";
import { merchantWorldOn } from "@/lib/services/shops/travelingMerchant";

const resolveUpgradeFailureMessage = (result: Extract<WalletUpgradeResult, { ok: false }>): string => {
  if (result.reason === "poor") {
    return `Not enough GP! You are ${gold(result.short)} short, savings and all.`;
  }
  if (result.reason === "locked") {
    return `LVL ${result.offer?.minLevel} needed.`;
  }
  return "You already carry the biggest wallet there is.";
};

// The general store you reach from Home Town; also where an unknown shop id ends up.
const DEFAULT_SHOP_ID = "hometown-market";

const resolveAssetUrl = (asset: any): string => {
  if (!asset) return "";
  if (typeof asset === "string") return asset;
  if (typeof asset === "object" && typeof asset.default === "string") return asset.default;
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
    XpNpcDialog,
    ShopShelfSlider,
    ShopItemModal,
  },
  mixins: [ionic],
  data() {
    return {
      showAtm: false,
      // The clerk's conversation box (the FAB, or being turned away at a shut door)
      isTalking: false,
      // Map shop IDs to background image paths
      shopBackgrounds: {
        "pegasus-ranch": require("@/assets/images/backgrounds/shops/pegasus-ranch.webp"),
        "wrecked-ship": require("@/assets/images/backgrounds/shops/wrecked-ship.webp"),
        "witchs-hut": require("@/assets/images/backgrounds/shops/witch's-hut.webp"),
        "snow-shack": require("@/assets/images/backgrounds/shops/snow-shack.webp"),
        "pond-of-life": require("@/assets/images/backgrounds/shops/pond-of-life.webp"),
        // For other shops without specific backgrounds, use the default
        "hermits-tent": require("@/assets/images/midjourney/shop.webp"),
        "crystal-caverns": require("@/assets/images/midjourney/shop.webp"),
        "traveling-merchant": require("@/assets/images/midjourney/shop.webp"),
        "theia-city": require("@/assets/images/midjourney/shop.webp"),
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
    // The shop wears its world's colour.
    shopColor(): string {
      return worldColor(this.shopWorld);
    },
    // What the clerk says while the doors are shut.
    closedLine(): string {
      return `Sorry, we're closed right now. ${this.opensAt}.`;
    },
    // What the clerk says when you talk to them: the greeting, a word on your charm, how to shop.
    clerkLines(): string[] {
      if (!this.isOpen) return [this.closedLine];
      const lines = [this.shopGreeting];
      if (this.charismaDiscount) {
        lines.push(`My, what charm! Everything's ${this.charismaDiscount} for you, and the tags already show it.`);
      }
      if (this.walletWare?.status === "for-sale") {
        lines.push(`That wallet up front holds more GP than yours. Have a look if your purse is bursting.`);
      }
      if (this.isTraveling) {
        const where = WORLD_METADATA[this.shopWorld]?.name || "these parts";
        lines.push(`I'm only in ${where} today. Tomorrow? Wherever the wind takes my balloon!`);
      }
      lines.push("Swipe along the shelf, and tap anything for a closer look.");
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
        backgroundImage: `url(${backgroundImage})`,
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
      this.isTalking = true;
    },
    // After the last line, the clerk asks what you want, like the bank manager does.
    async clerkMenu() {
      if (!this.isOpen) return;
      const sheet = await actionSheetController.create({
        header: `${this.shopkeeper}: "What'll it be?"`,
        cssClass: "atm-action-sheet",
        buttons: [
          { text: "Browse the shelves", icon: bagOutline, role: "cancel" },
          { text: "Use the ATM", icon: cashOutline, handler: () => this.openATM() },
        ],
      });
      await sheet.present();
    },
    // ATM methods
    openATM() {
      this.play$fx("select");
      this.showAtm = true;
    },

    clickDeposit(data) {
      const amount = Number(data.gp);
      if (amount && amount > 0) {
        getGPService()
          .depositToSavings(this.heroId, amount)
          .then(() => {
            this.play$fx("coins");
          })
          .catch(error => {
            debug.log('Deposit error:', error.message);
          });
      }
    },

    clickWithdraw(data) {
      const amount = Number(data.gp);
      if (amount && amount > 0) {
        getGPService()
          .withdrawFromSavings(this.heroId, amount)
          .then(() => {
            this.play$fx("coins");
          })
          .catch(error => {
            debug.log('Withdraw error:', error.message);
          });
      }
    },

    clickPayDebt(data) {
      const amount = Number(data.gp);
      if (amount && amount > 0) {
        getGPService()
          .payDebtFromWallet(this.heroId, amount)
          .then(() => {
            this.play$fx("success");
          })
          .catch(error => {
            debug.log('Pay debt error:', error.message);
          });
      }
    },

    selectShelf($ev) {
      this.shelves = $ev.detail.value || [];
    },
    closeModal(_itemId) {
      debug.log("Closing modal with itemId:", _itemId);
      return modalController.dismiss(null, 'cancel');
      // this.$refs[`modal-${itemId}`].$el.dismiss(null, 'cancel');
    },
    // Every toast is the RPG message box in the middle of the screen, with an X (src/hooks/useToast.ts).
    async showToast(message: string) {
      const toast = await toastController.create(rpgToastOptions(message, 3000));
      await toast.present();
    },
    failureMessage(error: unknown, item: ShelfItem): string {
      if (error instanceof InsufficientFundsError) {
        return `Not enough GP! You need ${error.shortBy} more to buy ${item.name}.`;
      }
      debug.error("Purchase failed:", error);
      return "Something went wrong, so nothing was bought. Please try again.";
    },
    rpgToast(message: string) {
      return this.showToast(message);
    },
    // The Game Master's hours (Compendium > Economy > Shops > Hours): behind a shut door the clerk says when the
    // shop opens and nothing is sold, even if the hour struck while an item was open on screen.
    turnedAwayWhileClosed(): boolean {
      if (this.isOpen) return false;
      this.play$fx("no");
      this.closeInspect();
      this.isTalking = true;
      return true;
    },
    // The shop's own ware, not something the Game Master stocked: the next wallet size, sold here and only here.
    // Pays out of savings first, then the wallet, and the new limit takes effect at once (no delivery to wait on).
    async buyWallet() {
      const ware = this.walletWare;
      if (!ware || this.isBuying) return;
      if (this.turnedAwayWhileClosed()) return;
      if (!ware.offer) {
        this.play$fx("no");
        void this.rpgToast(ware.status === "owned" ? `${ware.note} ${ware.hint}` : ware.note);
        return;
      }
      if (ware.status === "locked") {
        this.play$fx("no");
        void this.rpgToast(`${this.shopkeeper}: "Come back at level ${ware.offer.minLevel}, kid."`);
        return;
      }
      const alert = await alertController.create({
        header: ware.name,
        message: `${this.shopkeeper}: "Holds ${gold(ware.offer.limit)}. That'll be ${gold(ware.offer.price)}, out of your savings first."`,
        buttons: [
          { text: "No thanks", role: "cancel" },
          { text: `Buy for ${gold(ware.offer.price)}`, role: "confirm" },
        ],
      });
      await alert.present();
      const { role } = await alert.onDidDismiss();
      if (role !== "confirm") return;

      const hero = this.userStore.users[this.heroId];
      const result = buyWalletUpgrade(hero?.stats?.gp, Number(hero?.stats?.level) || 1);
      if (!result.ok) {
        this.play$fx("no");
        const why = resolveUpgradeFailureMessage(result);
        void this.rpgToast(why);
        return;
      }
      this.userStore.setWallet(this.heroId, result.gp);
      this.play$fx("levelUp");
      void this.rpgToast(`Your wallet now holds ${gold(result.offer.limit)}!`);
    },
    // The GP leaves the wallet now; the Game Master hands the real thing over later
    // (it shows up under Approvals > Accessories until they do).
    async buyItem(item: ShelfItem) {
      if (this.isBuying) return;
      if (this.turnedAwayWhileClosed()) return;
      this.isBuying = true;
      try {
        await purchaseItem(this.heroId, item);
      } catch (error) {
        this.isBuying = false;
        this.play$fx("error");
        void this.showToast(this.failureMessage(error, item));
        return;
      }

      try {
        this.play$fx("buyItem");
        void this.showToast("Bought! The Game Master will deliver it.");
        this.closeInspect();
        await modalController.dismiss(null, "confirm").catch(() => false);
      } finally {
        this.isBuying = false;
      }
    }
  },
  mounted() {
    this.$fx?.ui?.[this.$fx?.theme?.ui]?.openShop?.play?.();
  },
  setup(props) {
    const userStore = useUserStore();
    const accessoriesDb = new AccessoriesDb(accessoriesStorage);

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
    const shelfFilter = ref<"all" | "affordable" | "out-of-budget">("all");
    const setShelfFilter = (filter: "all" | "affordable" | "out-of-budget") => {
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
        if (term && !item.name.toLowerCase().includes(term)) return false;
        return shelves.value.includes(canAfford(item.price) ? "affordable" : "out-of-budget");
      });
    });

    const customAlertOptions = {
      header: "Shelves",
      subHeader: "Select which shelves to see",
      message: "What can I show you...?",
      translucent: true,
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
      // Add cashOutline for ATM button
      cashOutline,
      userStore,
      heroId,
      wallet,
      canAfford,
      itemIconClass,
      walletWare,
      shopRecord,
      isOpen,
      opensAt,
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
      setShelfFilter,
    };
  },
});
