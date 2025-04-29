import { defineComponent, ref } from "vue";
import ionic from "@/mixins/ionic";

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
import fetchItems from "@/mixins/fetchItems";
import { modalController } from "@ionic/vue";
import debug from "@/lib/utils/debug";
// Import ATM Modal component
import ATMModal from "@/views/Console/MyPortal/HomeTown/GoldBank/components/ATMModal.vue";
// Import the GPSystem
import { getGPSystem } from "@/lib/engine/core/GPSystem";

export default defineComponent({
  props: ["userId", "merchant"],
  name: "accessory-shop",
  components: {
    ATMModal
  },
  mixins: [ionic, fetchItems],
  data() {
    return {
      isLoading: false,
      shelves: ["affordable", "out-of-budget"],
      request: {
        type: "xp_accessory",
        params: {
          page: 1,
          search: "",
          per_page: 4,
        },
      },
      // ATM modal state
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
        getGPSystem()
          .depositToSavings(this.userId, amount)
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
        getGPSystem()
          .withdrawFromSavings(this.userId, amount)
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
        getGPSystem()
          .payDebtFromWallet(this.userId, amount)
          .then(() => {
            this.play$fx("success");
          })
          .catch(error => {
            debug.log('Pay debt error:', error.message);
          });
      }
    },
    
    selectShelf($ev) {
      this.shelves = $ev.detail.value;
    },
    closeModal(itemId) {
      debug.log("Closing modal with itemId:", itemId);
      return modalController.dismiss(null, 'cancel');
      // this.$refs[`modal-${itemId}`].$el.dismiss(null, 'cancel');
    },
    buyItem(itemId) {
      this.setThankYouOpen(true);
      debug.log("Buying item with itemId:", itemId);
      return modalController.dismiss(null, 'confirm');
      // this.$refs[`modal-${itemId}`].$el.dismiss(null, 'cancel');
    }
  },
  mounted() {
    this.$fx.ui[this.$fx.theme.ui].openShop.play();
  },
  setup() {
    const customAlertOptions = {
      header: "Shelves",
      subHeader: "Select which shelves to see",
      message: "What can I show you...?",
      translucent: true,
    };
    const isThankYouOpenRef = ref(false);
    const setThankYouOpen = (state) => isThankYouOpenRef.value = state;

    return {
      isThankYouOpenRef, setThankYouOpen,
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
    };
  },
});
