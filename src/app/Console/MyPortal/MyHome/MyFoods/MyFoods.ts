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
import { FOOD_OPTIONS } from "@/constants/FOOD_OPTIONS";

const FOOD_TABS: AppNavTab[] = [
  { id: "all", label: "All", ionIcon: restaurantOutline },
  { id: "favorites", label: "Favorites", ionIcon: heartOutline },
  { id: "meal", label: "Meals", ionIcon: fastFoodOutline },
  { id: "snack", label: "Snacks", ionIcon: pizzaOutline },
  { id: "dessert", label: "Desserts", ionIcon: iceCreamOutline },
  { id: "ingredient", label: "Pantry", ionIcon: cartOutline },
];

type FoodCategory = 'meal' | 'snack' | 'dessert' | 'ingredient';

// Mock Data Interface
interface FoodItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: FoodCategory;
  // Optional: ingredients, recipe steps, cooking time etc.
}

interface FoodSection {
  id: FoodCategory;
  label: string;
  foods: FoodItem[];
}

interface FoodGroup {
  id: FoodCategory;
  label: string;
  tag: string;
  icon: string;
}

// The kitchen lists its foods in these groups, in this order
const FOOD_GROUPS: FoodGroup[] = [
  { id: 'meal', label: 'Meals', tag: 'Meal', icon: 'utensils' },
  { id: 'snack', label: 'Snacks', tag: 'Snack', icon: 'cookie' },
  { id: 'dessert', label: 'Desserts', tag: 'Dessert', icon: 'ice-cream' },
  { id: 'ingredient', label: 'Pantry', tag: 'Pantry', icon: 'carrot' },
];

// "Cookies" and "Cookie" are the same sprite: match the profile's food list on the singular name
const singular = (name: string): string => name.trim().toLowerCase().replace(/s$/, '');

export default defineComponent({
  props: ['userId'],
  name: 'my-foods',
  components: {
    XpAppBottomNav,
  },
  mixins: [ionic],
  data() {
    return {
      selectedCategory: 'all', // Default category
      searchTerm: '',
      // Mock food data
      mockFoods: [
        { id: '1', name: 'Pizza', description: 'Cheesy and delicious', imageUrl: '/assets/mock/pizza.jpg', category: 'meal' },
        { id: '2', name: 'Burger', description: 'Classic beef burger', imageUrl: '/assets/mock/burger.jpg', category: 'meal' },
        { id: '3', name: 'Salad', description: 'Healthy green salad', imageUrl: '/assets/mock/salad.jpg', category: 'meal' },
        { id: '4', name: 'Apple', description: 'A crisp red apple', imageUrl: '/assets/mock/apple.jpg', category: 'snack' },
        { id: '5', name: 'Ice Cream', description: 'Sweet vanilla ice cream', imageUrl: '/assets/mock/icecream.jpg', category: 'dessert' },
        { id: '6', name: 'Pasta', description: 'Italian pasta dish', imageUrl: '/assets/mock/pasta.jpg', category: 'meal' },
        { id: '7', name: 'Cookies', description: 'Chocolate chip cookies', imageUrl: '/assets/mock/cookies.jpg', category: 'snack' },
      ] as FoodItem[],
      userStore: useUserStore(), // Use Pinia store
    };
  },
  computed: {
    // Get the user profile based on the userId prop using the getUserById getter
    currentUserProfileData(): any { // Use 'any' or a more specific Profile type if available
      // Ensure userId is treated as a string or number as expected by the getter
      return this.userStore.getUserById(this.userId);
    },

    userFavoriteFood(): string | null {
      // Access favoriteFood from the fetched profile data
      return this.currentUserProfileData?.favoriteFood || null;
    },

    filteredFoods(): FoodItem[] {
      let foods = this.mockFoods;

      // Filter by Category
      if (this.selectedCategory === 'favorites') {
        if (this.userFavoriteFood) {
          const favFood = this.userFavoriteFood; // Store in a local const to avoid null check warnings
          foods = foods.filter(food => food.name.toLowerCase() === favFood.toLowerCase());
        } else {
          foods = []; // No favorite food set or found
        }
      } else if (this.selectedCategory !== 'all') {
        foods = foods.filter(food => food.category === this.selectedCategory);
      }

      // Filter by Search Term
      if (this.searchTerm) {
        const lowerSearchTerm = this.searchTerm.toLowerCase();
        foods = foods.filter(food =>
          food.name.toLowerCase().includes(lowerSearchTerm) ||
          food.description.toLowerCase().includes(lowerSearchTerm)
        );
      }

      return foods;
    },
    foodTabs(): AppNavTab[] {
      return FOOD_TABS;
    },
    // The route params that keep the kitchen's links with this hero (the page may be opened without an id)
    heroParams(): { userId?: string } {
      const id = String(this.userId || this.userStore.currentUser?.id || '');
      return id ? { userId: id } : {};
    },
    // The filtered foods, grouped by kind of food (only the groups that hold something)
    foodSections(): FoodSection[] {
      return FOOD_GROUPS
        .map(({ id, label }) => ({ id, label, foods: this.filteredFoods.filter(food => food.category === id) }))
        .filter(section => section.foods.length > 0);
    },
    foodsMeta(): string {
      const count = this.filteredFoods.length;
      return `${count} ${count === 1 ? 'item' : 'items'}`;
    },
    emptyText(): string {
      if (this.selectedCategory === 'favorites' && !this.userFavoriteFood) {
        return this.t('kitchen.empty.noFavorite');
      }
      return this.t('kitchen.empty.none');
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
    // The row's sprite: the Font Awesome icon the profile's food picker uses for it, else one for its kind of food
    foodIcon(food: FoodItem): string {
      const match = FOOD_OPTIONS.find(option => singular(option.value) === singular(food.name));
      return match?.icon ?? FOOD_GROUPS.find(group => group.id === food.category)?.icon ?? 'utensils';
    },
    categoryLabel(category: FoodCategory): string {
      return FOOD_GROUPS.find(group => group.id === category)?.tag ?? category;
    },
    // True for the food the hero named as their favourite in their profile
    isFavorite(food: FoodItem): boolean {
      const favorite = this.userFavoriteFood;
      return !!favorite && food.name.toLowerCase() === favorite.toLowerCase();
    },
  },
  setup() {
    // The phone-app skin follows the Retro / Modern toggle of the profile
    const { rootClass, rootStyle } = useAppSkin('kitchen');
    const t = useCopy();

    return { rootClass, rootStyle, t };
  },
});
