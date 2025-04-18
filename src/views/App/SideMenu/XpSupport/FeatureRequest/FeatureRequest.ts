import { defineComponent, ref } from 'vue'

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
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonList,
  IonToast,
  toastController,
  IonModal
} from '@ionic/vue'

interface FeatureRequest {
  title: string;
  category: string;
  description: string;
  importance: string;
}

interface PopularFeature {
  id: number;
  title: string;
  description: string;
  votes: number;
}

export default defineComponent({
  name: 'feature-request',
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
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonList,
    IonToast,
    IonModal
  },
  setup() {
    const showToast = ref(false);
    const toastMessage = ref('');

    const presentToast = async (message: string) => {
      toastMessage.value = message;
      showToast.value = true;
    };

    return {
      showToast,
      toastMessage,
      presentToast
    };
  },
  data() {
    return {
      featureRequest: {
        title: '',
        category: 'gameplay',
        description: '',
        importance: ''
      } as FeatureRequest,
      popularFeatures: [
        {
          id: 1,
          title: 'Multiplayer Battles',
          description: 'Add the ability to battle against other players in real-time.',
          votes: 156
        },
        {
          id: 2,
          title: 'Pet Companions',
          description: 'Allow players to have pet companions that provide bonuses in battles.',
          votes: 124
        },
        {
          id: 3,
          title: 'Crafting System',
          description: 'Implement a crafting system to create custom items from gathered materials.',
          votes: 98
        },
        {
          id: 4,
          title: 'Daily Quests',
          description: 'Add daily quests with special rewards to encourage regular play.',
          votes: 87
        },
        {
          id: 5,
          title: 'Character Customization',
          description: 'More options for customizing character appearance and abilities.',
          votes: 76
        }
      ] as PopularFeature[],
      showSubmitModal: false // Added to control the modal visibility
    };
  },
  methods: {
    submitFeatureRequest() {
      this.presentToast('Your feature request has been submitted successfully!');
      // Reset the form
      this.featureRequest = {
        title: '',
        category: 'gameplay',
        description: '',
        importance: ''
      };
      // Ensure modal closes - added setTimeout to avoid potential race conditions
      setTimeout(() => {
        this.showSubmitModal = false;
      }, 100);
    },
    voteForFeature(featureId: number) {
      // Find the feature and increment its vote count
      const feature = this.popularFeatures.find(f => f.id === featureId);
      if (feature) {
        feature.votes++;
        this.presentToast('Thanks for your vote!');
      }
    }
  }
})
