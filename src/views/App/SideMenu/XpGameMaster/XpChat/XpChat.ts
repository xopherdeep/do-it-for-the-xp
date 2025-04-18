import { computed, defineComponent, ref } from "vue";
import ionic from "@/mixins/ionic";
import { useStore } from "vuex";
import { useRouter } from "vue-router";

// Define message interface
interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  avatar?: string;
  isOwnMessage: boolean;
}

export default defineComponent({
  name: "xp-chat",
  mixins: [ionic],
  setup() {
    const store = useStore();
    const router = useRouter();
    
    // Get users from store (assuming you have a users getter)
    const users = computed(() => store.getters.usersAz || []);
    
    // Current user - for determining if message is from current user
    const currentUser = computed(() => store.getters.currentUser);
    
    // Messages state
    const messages = ref<Message[]>([
      {
        id: '1',
        sender: 'Mama S\'mores',
        text: 'Hello family! How is everyone doing with their quests today?',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        avatar: require('@/assets/images/avatars/001-gamer.svg'),
        isOwnMessage: false
      },
      {
        id: '2',
        sender: 'Khronus Infinidee',
        text: 'I played Mario Kart with Ronan!',
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        avatar: require('@/assets/images/avatars/002-gamer.svg'),
        isOwnMessage: true
      },
      {
        id: '3',
        sender: 'Ronan',
        text: 'It was fun! I won twice!',
        timestamp: new Date(Date.now() - 1700000), // 28 minutes ago
        avatar: require('@/assets/images/avatars/003-gamer.svg'), 
        isOwnMessage: false
      },
      {
        id: '4',
        sender: 'Papa Bear',
        text: 'Great job Ronan! Would you like to play again after dinner?',
        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
        avatar: require('@/assets/images/avatars/004-gamer.svg'),
        isOwnMessage: false
      }
    ]);
    
    // New message input
    const newMessage = ref('');
    
    // Send message function
    const sendMessage = () => {
      if (!newMessage.value.trim()) return;
      
      // Create new message
      const message: Message = {
        id: Date.now().toString(),
        sender: currentUser.value?.name?.nick || 'You',
        text: newMessage.value,
        timestamp: new Date(),
        avatar: currentUser.value?.avatar ? require(`@/assets/images/avatars/${currentUser.value.avatar}`) : undefined,
        isOwnMessage: true
      };
      
      // Add to messages
      messages.value.push(message);
      
      // Clear input
      newMessage.value = '';
      
      // In a real app, you would send this to your API/backend here
    };
    
    // Format timestamp to user-friendly time
    const formatTime = (timestamp: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(new Date(timestamp));
    };
    
    return {
      messages,
      newMessage,
      sendMessage,
      formatTime,
      users,
      currentUser,
      clickSettings(){
        router.push({ name: 'xp-settings-notifications' });
      }
    };
  }
});