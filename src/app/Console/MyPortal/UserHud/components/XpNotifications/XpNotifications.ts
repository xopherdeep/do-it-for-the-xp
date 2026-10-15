import { computed, defineComponent, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { modalController, toastController } from "@ionic/vue";
import ionic from "@/lib/mixins/ionic";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import { play$fx } from "@/assets/fx";
import { useUserStore } from "@/lib/store/stores/user";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { iconOfKind, isUnread, whenCopy } from "@/lib/services/notifications/Notifications";
import type { XpNotification } from "@/lib/services/notifications/Notifications";

type Filter = "all" | "unread";

/**
 * The hero's notification feed, newest first: unread rows carry a dot, a tap marks the row read and follows
 * its link (quest board, wallet), the footer marks everything read or clears the feed. Opened from the
 * avatar menu (XpFabUserHud) with the hero's id.
 */
export default defineComponent({
  name: "xp-notifications",
  mixins: [ionic],
  components: {
    XpCloseButton,
  },
  props: {
    heroId: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    const router = useRouter();
    const userStore = useUserStore();
    const notificationsStore = useNotificationsStore();
    const currentFilter = ref<Filter>("all");

    const heroId = computed(() => String(props.heroId || userStore.currentUser.id || ""));
    const notifications = computed(() => notificationsStore.forHero(heroId.value));
    const unreadCount = computed(() => notificationsStore.unreadCount(heroId.value));
    const filteredNotifications = computed(() =>
      currentFilter.value === "unread" ? notifications.value.filter(isUnread) : notifications.value
    );

    onMounted(() => {
      if (heroId.value) void notificationsStore.load(heroId.value);
    });

    const showToast = async (message: string) => {
      const toast = await toastController.create({ message, duration: 1800, position: "top", cssClass: "rpg-toast" });
      await toast.present();
    };

    const filterNotifications = (event: CustomEvent) => {
      const value = event.detail?.value;
      currentFilter.value = value === "unread" ? "unread" : "all";
    };

    const handleClose = async () => {
      await modalController.dismiss();
    };

    /** Tap: mark it read, then follow its link (closing the modal first) when it has one. */
    const openNotification = async (notification: XpNotification) => {
      play$fx("select");
      notificationsStore.markRead(notification.id);
      const link = notification.link;
      if (!link) return;
      await handleClose();
      await router.push(link);

    };

    const markAsRead = (notification: XpNotification) => {
      notificationsStore.markRead(notification.id);
    };

    const deleteNotification = (notification: XpNotification) => {
      notificationsStore.remove(notification.id);
    };

    const markAllAsRead = () => {
      const marked = notificationsStore.markAllRead(heroId.value);
      play$fx("select");
      void showToast(marked ? `${marked} marked as read` : "Nothing unread");
    };

    const deleteAllNotifications = () => {
      const cleared = notificationsStore.clear(heroId.value);
      play$fx("select");
      void showToast(cleared ? "Notifications cleared" : "Nothing to clear");
    };

    return {
      currentFilter,
      notifications,
      filteredNotifications,
      unreadCount,
      filterNotifications,
      openNotification,
      markAsRead,
      deleteNotification,
      markAllAsRead,
      deleteAllNotifications,
      handleClose,
      iconOfKind,
      isUnread,
      whenCopy,
    };
  },
});
