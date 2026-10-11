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
import { alertController, modalController, onIonViewWillEnter, toastController } from "@ionic/vue";
import debug from "@/lib/utils/debug";
// Import ATM Modal component
import ATMModal from "@/app/Console/MyPortal/HomeTown/GoldBank/components/ATMModal.vue";
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
const ITEMS_PER_PAGE = 4;

// The Game Master can dress a shop in a world's art (Compendium > Economy > Shops > Decorate).
// Only world-*.jpg / hometown.jpg are looked up by key; keep the filter (a bare context bundles all 90 MB)
const requireWorldBg = require.context("@/assets/images/backgrounds/", false, /^\.\/(world-[a-z-]+|hometown)\.jpg$/);
// Empty when the world has no art of its own, so the shop keeps its usual picture.
const worldBackground = (world: string): string => {
  if (!world) return "";
  try {
    return requireWorldBg(world === "hometown" ? "./hometown.jpg" : `./world-${world}.jpg`);
  } catch {
    return "";
  }
};

export default defineComponent({
  props: ["userId", "merchant"],
  name: "accessory-shop",
  components: {
    ATMModal
  },
  mixins: [ionic],
  data() {
    return {
      showAtm: false,
      // Map shop IDs to background image paths
      shopBackgrounds: {
        "pegasus-ranch": require("@/assets/images/backgrounds/shops/pegasus-ranch.png"),
        "wrecked-ship": require("@/assets/images/backgrounds/shops/wrecked-ship.png"),
        "witchs-hut": require("@/assets/images/backgrounds/shops/witch's-hut.png"),
        "snow-shack": require("@/assets/images/backgrounds/shops/snow-shack.png"),
        // For other shops without specific backgrounds, use the default
        "hermits-tent": require("@/assets/images/midjourney/shop.png"),
        "crystal-caverns": require("@/assets/images/midjourney/shop.png"),
        "traveling-merchant": require("@/assets/images/midjourney/shop.png"),
        "theia-city": require("@/assets/images/midjourney/shop.png"),
        default: require("@/assets/images/midjourney/shop.png")
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
    shopName() {
      return this.merchant ? this.merchant.replace("-", " ") : "Shop";
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
      return custom ? `${custom} fa-2x` : `fa fa-2x fa-${this.shopIcon}`;
    },
    // What the clerk says while the doors are shut.
    closedLine(): string {
      return `Sorry, we're closed right now. ${this.opensAt}.`;
    },
    dynamicShopBackground() {
      // A world picked on the Decorate tab wins; an untouched shop keeps its own picture.
      const backgroundImage =
        worldBackground(customWorld(this.shopRecord)) ||
        this.shopBackgrounds[this.merchant] ||
        this.shopBackgrounds.default;
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
    async showToast(message: string, color: "success" | "danger" = "success") {
      const toast = await toastController.create({
        message,
        duration: 3000,
        position: "top",
        color,
      });
      await toast.present();
    },
    failureMessage(error: unknown, item: ShelfItem): string {
      if (error instanceof InsufficientFundsError) {
        return `Not enough GP! You need ${error.shortBy} more to buy ${item.name}.`;
      }
      debug.error("Purchase failed:", error);
      return "Something went wrong, so nothing was bought. Please try again.";
    },
    async rpgToast(message: string) {
      const toast = await toastController.create({ message, duration: 3000, position: "top", cssClass: "rpg-toast" });
      await toast.present();
    },
    // The Game Master's hours (Compendium > Economy > Shops > Hours): behind a shut door the clerk says when the
    // shop opens and nothing is sold, even if the hour struck while an item was open on screen.
    turnedAwayWhileClosed(): boolean {
      if (this.isOpen) return false;
      this.play$fx("no");
      void this.rpgToast(`${this.shopkeeper}: "${this.closedLine}"`);
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
        void this.showToast(this.failureMessage(error, item), "danger");
        return;
      }

      try {
        this.play$fx("buyItem");
        void this.showToast("Bought! The Game Master will deliver it.");
        await modalController.dismiss(null, "confirm").catch(() => false);
      } finally {
        this.isBuying = false;
      }
    }
  },
  mounted() {
    this.$fx.ui[this.$fx.theme.ui].openShop.play();
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
    const page = ref(1);
    const shelves = ref<string[]>(["affordable", "out-of-budget"]);

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
    const totalPages = computed(() => Math.max(1, Math.ceil(visibleItems.value.length / ITEMS_PER_PAGE)));
    const hasNextPage = computed(() => page.value < totalPages.value);
    const pagedItems = computed(() =>
      visibleItems.value.slice((page.value - 1) * ITEMS_PER_PAGE, page.value * ITEMS_PER_PAGE)
    );
    const prevPage = () => {
      if (page.value > 1) page.value--;
    };
    const nextPage = () => {
      if (hasNextPage.value) page.value++;
    };
    // A new search or shelf filter starts from page 1; a shrinking list can't leave you on a missing page.
    watch([search, shelves], () => {
      page.value = 1;
    });
    watch(totalPages, (pages) => {
      if (page.value > pages) page.value = pages;
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
      page,
      pagedItems,
      hasNextPage,
      prevPage,
      nextPage,
    };
  },
});
