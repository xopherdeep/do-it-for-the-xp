import { defineComponent, ref } from 'vue'

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonModal
} from '@ionic/vue'

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  url: string;
}

export default defineComponent({
  name: 'help-videos',
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonModal
  },
  setup() {
    const isModalOpen = ref(false);
    const selectedVideo = ref<Video | null>(null);

    const playVideo = (video: Video) => {
      selectedVideo.value = video;
      isModalOpen.value = true;
    };

    const closeModal = () => {
      isModalOpen.value = false;
    };

    return {
      isModalOpen,
      selectedVideo,
      playVideo,
      closeModal
    };
  },
  data() {
    return {
      videos: [
        {
          id: '1',
          title: 'Getting Started Guide',
          description: 'Learn the basics of the app and how to navigate through different sections.',
          thumbnail: 'https://via.placeholder.com/300x200',
          duration: '5:30',
          url: '#'
        },
        {
          id: '2',
          title: 'Character Creation Tutorial',
          description: 'A step-by-step guide to creating and customizing your character.',
          thumbnail: 'https://via.placeholder.com/300x200',
          duration: '4:15',
          url: '#'
        },
        {
          id: '3',
          title: 'Battle System Explained',
          description: 'Understand how the battle system works and learn strategies to win.',
          thumbnail: 'https://via.placeholder.com/300x200',
          duration: '7:45',
          url: '#'
        },
        {
          id: '4',
          title: 'Inventory Management',
          description: 'Tips and tricks for managing your inventory efficiently.',
          thumbnail: 'https://via.placeholder.com/300x200',
          duration: '3:20',
          url: '#'
        },
        {
          id: '5',
          title: 'Achievement Hunting Guide',
          description: 'Learn how to find and complete achievements to level up faster.',
          thumbnail: 'https://via.placeholder.com/300x200',
          duration: '6:10',
          url: '#'
        },
        {
          id: '6',
          title: 'Advanced Combat Techniques',
          description: 'Master advanced combat techniques to defeat powerful enemies.',
          thumbnail: 'https://via.placeholder.com/300x200',
          duration: '8:30',
          url: '#'
        }
      ]
    };
  }
})
