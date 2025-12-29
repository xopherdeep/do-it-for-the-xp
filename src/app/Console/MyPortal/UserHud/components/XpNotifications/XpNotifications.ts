import { defineComponent, ref, computed } from 'vue';
import { format } from 'date-fns';
import ionic from "@/mixins/ionic";
import { toastController } from '@ionic/vue';

// Define the Notification interface
interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'xp' | 'ap' | 'gp' | 'system' | 'message';
  avatar?: string;
  actionUrl?: string;
  pointAmount?: number;
}

export default defineComponent({
  name: 'xp-notifications',
  mixins: [ionic],
  setup() {
    const showFilters = ref(true);
    const currentFilter = ref('all');
    
    // Setup require.context for avatar images, following app pattern
    const requireAvatar = require.context("@/assets/images/avatars", false, /\.svg$/);

    // Sample notifications data - this would typically come from a store or API
    const notifications = ref<Notification[]>([
      {
        id: '1',
        title: 'GP Earned',
        message: 'You earned 50 GP for cleaning your room!',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        read: false,
        type: 'gp',
        avatar: '001-gamer', // Just the base name without extension
        pointAmount: 50
      },
      {
        id: '2',
        title: 'XP Gained',
        message: 'You gained 100 XP for completing your homework!',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        read: true,
        type: 'xp',
        avatar: '002-gamer',
        pointAmount: 100
      },
      {
        id: '3',
        title: 'AP Awarded',
        message: 'You received 25 AP for skill advancement.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
        read: false,
        type: 'ap',
        avatar: '003-gamer',
        pointAmount: 25
      },
      {
        id: '4',
        title: 'Request Approved',
        message: 'Your parent approved your reward request.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: false,
        type: 'system',
        avatar: '004-gamer'
      }
    ]);

    // Filter notifications based on the selected filter
    const filteredNotifications = computed(() => {
      if (currentFilter.value === 'all') {
        return notifications.value;
      } else if (currentFilter.value === 'unread') {
        return notifications.value.filter(notification => !notification.read);
      } else {
        return notifications.value.filter(notification => notification.type === currentFilter.value);
      }
    });

    // Format timestamp to a readable string
    const formatTime = (timestamp: Date) => {
      return format(new Date(timestamp), 'MMM d, h:mm a');
    };

    // Toggle settings/filters visibility
    const toggleSettings = () => {
      showFilters.value = !showFilters.value;
    };

    // Handle filter change
    const filterNotifications = (event: CustomEvent) => {
      currentFilter.value = event.detail.value;
    };

    // Mark a notification as read
    const markAsRead = (index: number) => {
      if (index >= 0 && index < notifications.value.length) {
        notifications.value[index].read = true;
        showToast('Notification marked as read');
      }
    };

    // Delete a notification
    const deleteNotification = (index: number) => {
      if (index >= 0 && index < notifications.value.length) {
        notifications.value.splice(index, 1);
        showToast('Notification deleted');
      }
    };

    // Mark all notifications as read
    const markAllAsRead = () => {
      notifications.value.forEach(notification => {
        notification.read = true;
      });
      showToast('All notifications marked as read');
    };

    // Delete all notifications
    const deleteAllNotifications = () => {
      notifications.value = [];
      showToast('All notifications cleared');
    };

    // Show toast message
    const showToast = async (message: string) => {
      const toast = await toastController.create({
        message,
        duration: 2000,
        position: 'bottom'
      });
      toast.present();
    };

    // Get avatar src from avatar name
    const getAvatarSrc = (avatar?: string) => {
      if (avatar) {
        return requireAvatar(`./${avatar}.svg`);
      }
      return requireAvatar('./001-gamer.svg'); // Default avatar
    };

    return {
      showFilters,
      currentFilter,
      notifications,
      filteredNotifications,
      formatTime,
      toggleSettings,
      filterNotifications,
      markAsRead,
      deleteNotification,
      markAllAsRead,
      deleteAllNotifications,
      getAvatarSrc
    };
  }
});