import { defineComponent } from 'vue';
import { useUserStore } from '@/lib/store/stores/user';
import { useCopy } from '@/hooks/useVoice';
import ionic from '@/lib/mixins/ionic';

// Only import the icons that are actually used
import {
  close,
  restaurantOutline,
  fastFoodOutline,
  heartOutline,
  pizzaOutline,
  iceCreamOutline,
  cartOutline,
  storefrontOutline,
} from 'ionicons/icons';
import { actionSheetController } from '@ionic/vue';
import XpAppBottomNav from "@/components/organisms/BottomNav/XpAppBottomNav.vue";
import type { AppNavTab } from "@/components/organisms/BottomNav/appBottomNav";
import { appSheet, useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import XpComingSoonCard from "@/app/SideMenu/XpSettings/components/XpComingSoonCard.vue";
import type { ComingSoonItem } from "@/app/SideMenu/XpSettings/components/comingSoon";

const FOOD_TABS: AppNavTab[] = [
  { id: "all", label: "All", ionIcon: restaurantOutline },
  { id: "favorites", label: "Favorites", ionIcon: heartOutline },
  { id: "meal", label: "Meals", ionIcon: fastFoodOutline },
  { id: "snack", label: "Snacks", ionIcon: pizzaOutline },
  { id: "dessert", label: "Desserts", ionIcon: iceCreamOutline },
  { id: "ingredient", label: "Pantry", ionIcon: cartOutline },
];

/** The kitchen has no pantry or recipes to show yet: the room says so in its own words (GitHub issue 140) */
const KITCHEN_COMING_SOON: ComingSoonItem[] = [
  { title: "Recipe book", description: "Learn dishes and cook them with your family" },
  { title: "Pantry shelf", description: "Stock the ingredients you have at home" },
];

export default defineComponent({
  props: ['userId'],
  name: 'my-foods',
  components: {
    XpAppBottomNav,
    XpComingSoonCard,
  },
  mixins: [ionic],
  data() {
    return {
      selectedCategory: 'all', // Default category
      userStore: useUserStore(), // Use Pinia store
    };
  },
  computed: {
    foodTabs(): AppNavTab[] {
      return FOOD_TABS;
    },
    // The route params that keep the kitchen's links with this hero (the page may be opened without an id)
    heroParams(): { userId?: string } {
      const id = String(this.userId || this.userStore.currentUser?.id || '');
      return id ? { userId: id } : {};
    },
    comingSoonItems(): ComingSoonItem[] {
      return KITCHEN_COMING_SOON;
    },
  },
  methods: {
    // The kitchen's FAB (the same button the town's buildings use): every option leads somewhere real
    async presentActionSheet() {
      const actionSheet = await actionSheetController.create({
        ...appSheet("kitchen"),
        header: 'Kitchen Actions',
        subHeader: this.t('kitchen.menu.sub'),
        buttons: [
          {
            text: 'Feast Decree',
            icon: restaurantOutline,
            handler: () => this.openFeastDecree(),
          },
          {
            text: 'Buy a Treat at the Market',
            icon: storefrontOutline,
            handler: () => this.openMarket(),
          },
          {
            text: 'Cancel',
            icon: close,
            role: 'cancel',
          },
        ],
      });
      await actionSheet.present();
    },
    // Feast Decree ("Choose what the family cooks for dinner one night") is a real-life Power: it is cast on the Powers page
    openFeastDecree() {
      this.$router.push({ name: 'my-abilities', params: this.heroParams });
    },
    // The hometown Market stocks the real-life treats (Frost Treat and the rest of the reward catalogue), bought with GP
    openMarket() {
      this.$router.push({ name: 'shop', params: this.heroParams });
    },
  },
  setup() {
    // The phone-app skin follows the Retro / Modern toggle of the profile
    const { rootClass, rootStyle } = useAppSkin('kitchen');
    const t = useCopy();

    return { rootClass, rootStyle, t };
  },
});
