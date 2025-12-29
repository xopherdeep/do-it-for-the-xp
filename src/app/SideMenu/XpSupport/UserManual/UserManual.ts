import { defineComponent } from 'vue'

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/vue'

export default defineComponent({
  name: 'user-manual',
  data() {
    return {
      sections: [
        {
          title: 'Profile Setup',
          content: 'Setting up your profile is the first step to get started with the app.',
          steps: [
            'Navigate to the Profile section from the side menu',
            'Fill in your personal details',
            'Choose an avatar that represents you',
            'Save your profile to continue'
          ],
          image: ''
        },
        {
          title: 'Achievements',
          content: 'Achievements are tasks you can complete to earn rewards and level up your character.',
          steps: [
            'Go to the Achievements section',
            'Browse available achievements by category',
            'Select an achievement to view details',
            'Complete the requirements to earn the achievement'
          ],
          image: ''
        },
        {
          title: 'Battle System',
          content: 'The battle system allows you to engage in combat with various creatures and earn rewards.',
          steps: [
            'Enter the Battle Ground from your Home Town',
            'Select an opponent to battle',
            'Use your abilities and items during combat',
            'Defeat your opponent to earn experience and items'
          ],
          image: ''
        },
        {
          title: 'Inventory Management',
          content: 'Your inventory contains all the items you have collected during your journey.',
          steps: [
            'Access your inventory from the side menu',
            'Organize items by category',
            'Equip items to enhance your character\'s abilities',
            'Sell unwanted items to the merchant for gold'
          ],
          image: ''
        },
        {
          title: 'Character Stats',
          content: 'Understanding your character stats is crucial for progression in the game.',
          steps: [
            'View your stats from your profile page',
            'HP (Health Points) determines how much damage you can take',
            'MP (Magic Points) is used for casting spells',
            'Special stats like Strength and Intelligence affect your abilities'
          ],
          image: ''
        }
      ]
    }
  },
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel
  }
})
