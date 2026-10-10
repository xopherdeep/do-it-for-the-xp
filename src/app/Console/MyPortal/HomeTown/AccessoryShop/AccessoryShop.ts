import { computed, defineComponent, onMounted, ref, watch } from "vue";
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
import shopsDb from "@/lib/databases/ShopsDb";
import AccessoriesDb, { accessoriesStorage } from "@/lib/databases/AccessoriesDb";
import {
  buyItem as purchaseItem,
  InsufficientFundsError,
  stockShelf,
} from "@/lib/services/shop/PurchaseService";
import type { ShelfItem } from "@/lib/services/shop/PurchaseService";
// Bigger wallets, Majora's Mask style: each region shop sells one tier, and only as the hero's next one.
import { buyWalletUpgrade } from "@/lib/services/gp/wallet";
import { gold, walletOfferAt } from "@/lib/services/gp/walletShops";

// The general store you reach from Home Town; also where an unknown shop id ends up.
const DEFAULT_SHOP_ID = "hometown-market";
const ITEMS_PER_PAGE = 4;

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
      merchants: {
        "pegasus-ranch": {
          icon: "farm",
          shopkeep: "Francis the Rancher",
          greeting: "Howdy partner, let me know what I can do ya for."
        },
        "wrecked-ship": {
          icon: "ship",
          shopkeep: "Douglas the Pirate",
          greeting: "Rrrrrr matey, I be wilin ta trade with ya."
        },
        "hermits-tent": {
          icon: "campground",
          shopkeep: "Terrance the Hermit",
          greeting: "No loitering, I have work that needs my attention."
        },
        "witchs-hut": {
          icon: "cauldron",
          shopkeep: "Dr. Who",
          greeting: "Hello my sweet, will you be staying long?"
        },
        "crystal-caverns": {
          icon: "dungeon",
          shopkeep: "Jeff",
          greeting: "Hi there, take a look at our lovely jewels!"
        },
        "snow-shack": {
          icon: "igloo",
          shopkeep: "Abominable Snowman",
          greeting: "Greetings, the warmth is free, but please buy something if you plan on staying."
        },
        "traveling-merchant": {
          icon: "wagon-covered",
          shopkeep: "Boobeedeedle",
          greeting: "Ah, It's you! Here's what I have today."
        },
        "theia-city": {
          icon: "chess-rook",
          shopkeep: "The Watcher",
          greeting: "Ah, It's you! Here's what I have today."
        },
        default: {
          icon: "store",
          shopkeep: "Dr. Who",
          greeting: "Hello! What shelf can I show you?"
        }
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
    shopGreeting() {
      return this.currentMerchant?.greeting
    },
    shopkeeper() {
      return this.currentMerchant?.shopkeep
    },
    dynamicShopBackground() {
      const backgroundImage = this.shopBackgrounds[this.merchant] || this.shopBackgrounds.default;
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
    // The shop's own ware, not something the Game Master stocked: the next wallet size, sold here and only here.
    // Pays out of savings first, then the wallet, and the new limit takes effect at once (no delivery to wait on).
    async buyWallet() {
      const ware = this.walletWare;
      if (!ware || this.isBuying) return;
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
        const why =
          result.reason === "poor"
            ? `Not enough GP! You are ${gold(result.short)} short, savings and all.`
            : result.reason === "locked"
              ? `LVL ${result.offer?.minLevel} needed.`
              : "You already carry the biggest wallet there is.";
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
    // Null at shops that sell no wallet (Home Town, the Swamps, the Tundra, the Clouds)
    const walletWare = computed(() => {
      const stats = userStore.users[heroId.value]?.stats;
      return walletOfferAt(props.merchant, stats?.gp, Number(stats?.level) || 1);
    });

    const shelf = ref<ShelfItem[]>([]);
    const isLoading = ref(true);
    const isBuying = ref(false);
    const search = ref("");
    const page = ref(1);
    const shelves = ref<string[]>(["affordable", "out-of-budget"]);

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
          shelf.value = stockShelf(shop?.items ?? [], accessories, heroId.value);
        }
      } catch (error) {
        debug.error("Failed to stock the shelves:", error);
        if (thisLoad === latestLoad) shelf.value = [];
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
      walletWare,
      gold,
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
