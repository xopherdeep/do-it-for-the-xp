import { defineComponent } from 'vue';
import { useUserStore } from '@/lib/store/stores/user';
import ionic from '@/lib/mixins/ionic';

// Only import the icons that are actually used
import {
  addCircleOutline,
  removeCircleOutline, // Added missing icon
  close,
  arrowBack,
  chevronBack,
  chevronForward,
  restaurantOutline,
  fastFoodOutline, // Added missing icon
  heartOutline,
  pizzaOutline,
  iceCreamOutline,
  cartOutline,
} from 'ionicons/icons';
import { actionSheetController } from '@ionic/vue';

// Mock Data Interface
interface FoodItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: 'meal' | 'snack' | 'dessert' | 'ingredient';
  // Optional: ingredients, recipe steps, cooking time etc.
}

export default defineComponent({
  props: ['userId'],
  name: 'my-foods',
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
    }
  },
  methods: {
    selectCategory($event: CustomEvent) {
      this.selectedCategory = $event.detail.value;
    },
    async presentActionSheet() {
      // Example action sheet for food items
      const actionSheet = await actionSheetController.create({
        header: 'Kitchen Actions',
        cssClass: 'my-custom-class', // Optional custom styling
        buttons: [
          {
            text: 'Cook Something',
            icon: restaurantOutline, // Use a relevant icon
            handler: () => {
              // Implement cooking logic
            },
          },
          {
            text: 'Add New Recipe',
            icon: addCircleOutline,
            handler: () => {
              // Implement recipe addition logic
            },
          },
          {
            text: 'View Grocery List',
            icon: cartOutline,
            handler: () => {
              // Implement grocery list navigation
            },
          },
          {
            text: 'Cancel',
            icon: close,
            role: 'cancel',
            handler: () => {
              // Just close the action sheet
            },
          },
        ],
      });
      await actionSheet.present();
    },
    // Helper to get image source, handling potential missing images
    getFoodImageUrl(imageUrl: string): string {
      // Basic check, replace with actual placeholder logic if needed
      return imageUrl || '/assets/placeholder-food.png';
    }
  },
  mounted() {
    // Optional: Play a sound effect when entering the kitchen
    // this.$fx.ui[this.$fx.theme.ui].openPage.play() // Example sound
  },
  setup() {
    const customAlertOptions = {
      header: 'Food Categories',
      subHeader: 'Select which foods to view',
      message: 'Filter by category or view all.',
      translucent: true,
    };

    // Return icons needed in the template
    return {
      customAlertOptions,
      chevronBack, // Keep if used elsewhere, maybe not needed now
      chevronForward, // Keep if used elsewhere, maybe not needed now
      arrowBack,
      addCircleOutline,
      removeCircleOutline, // Keep if used elsewhere, maybe not needed now
      close,
      fastFoodOutline, // Icon for the FAB
      restaurantOutline,
      heartOutline,
      pizzaOutline,
      iceCreamOutline,
      cartOutline,
      // Add any other icons used directly in the template here
    };
  },
});
