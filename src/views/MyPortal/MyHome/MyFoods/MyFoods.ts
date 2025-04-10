import { defineComponent } from 'vue';
import { mapGetters } from 'vuex';
import ionic from '@/mixins/ionic';

import {
  calendarOutline,
  addCircleOutline,
  removeCircleOutline,
  close,
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
  fastFoodOutline,
  restaurantOutline, // Added for food
  heartOutline, // Added for favorites
  pizzaOutline, // Added for meals
  iceCreamOutline, // Added for snacks/desserts
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
    };
  },
  computed: {
    // Get the user profile based on the userId prop using the getUserById getter
    currentUserProfileData(): any { // Use 'any' or a more specific Profile type if available
      // Ensure userId is treated as a string or number as expected by the getter
      return this.$store.getters.getUserById(this.userId);
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
           foods = foods.filter(food => food.name.toLowerCase() === this.userFavoriteFood.toLowerCase());
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
                console.log('Cook Something clicked (implement logic)');
                // Example: Navigate to a cooking detail page or show a modal
              },
            },
            {
              text: 'Add New Recipe',
              icon: addCircleOutline,
              handler: () => {
                console.log('Add New Recipe clicked (implement logic)');
                // Example: Show a form to add a new food item/recipe
              },
            },
             {
              text: 'View Grocery List',
              icon: cartOutline,
              handler: () => {
                console.log('View Grocery List clicked (implement logic)');
                 // Example: Navigate to a grocery list page
              },
            },
            {
              text: 'Cancel',
              icon: close,
              role: 'cancel',
              handler: () => {
                // console.log('Cancel clicked');
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
