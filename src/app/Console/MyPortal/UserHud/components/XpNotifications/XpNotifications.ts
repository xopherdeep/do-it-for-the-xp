import { computed, defineComponent, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { modalController, toastController } from "@ionic/vue";
import ionic from "@/lib/mixins/ionic";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import { play$fx } from "@/assets/fx";
import { useUserStore } from "@/lib/store/stores/user";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { iconOfKind, isUnread, whenCopy } from "@/lib/services/notifications/Notifications";
import type { XpNotification, XpNotificationKind } from "@/lib/services/notifications/Notifications";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";

export type NotificationFilter = "all" | "unread";

export interface NotificationSection {
  key: string;
  label: string;
  items: XpNotification[];
}

const KIND_LABELS: Record<XpNotificationKind, string> = {
  "quest-due": "Quest Due",
  "quest-overdue": "Overdue",
  "late-penalty": "Penalty",
  approved: "Approved",
  rejected: "Sent Back",
  "claim-waiting": "Awaiting GM",
  "level-up": "Level Up",
  "blood-moon": "Blood Moon",
  purchase: "Purchase",
  "power-cast": "Power Cast",
  hospital: "Hospital",
  gold: "Gold",
  "weekly-recap": "Recap",
  system: "System",
  "creation-waiting": "Creation Waiting",
  "creation-approved": "Creation Approved",
  "creation-returned": "Creation Returned",
};

export const kindLabelOf = (kind: XpNotificationKind): string => KIND_LABELS[kind] ?? "Notice";

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
    const currentFilter = ref<NotificationFilter>("all");

    const { rootClass, rootStyle } = useAppSkin("notifications");

    const heroId = computed(() => String(props.heroId || userStore.currentUser.id || ""));
    const notifications = computed(() => notificationsStore.forHero(heroId.value));
    const unreadCount = computed(() => notificationsStore.unreadCount(heroId.value));
    const unreadMeta = computed(() =>
      unreadCount.value > 0 ? `${unreadCount.value} unread` : "All caught up"
    );

    const filteredNotifications = computed(() =>
      currentFilter.value === "unread" ? notifications.value.filter(isUnread) : notifications.value
    );

    const sections = computed<NotificationSection[]>(() => {
      const list = filteredNotifications.value;
      if (!list.length) return [];

      if (currentFilter.value === "unread") {
        return [{ key: "unread", label: "Unread", items: list }];
      }

      const unreadItems = list.filter(isUnread);
      const readItems = list.filter((n) => !isUnread(n));

      const hasBoth = unreadItems.length > 0 && readItems.length > 0;
      if (hasBoth) {
        return [
          { key: "unread", label: "New", items: unreadItems },
          { key: "read", label: "Earlier", items: readItems },
        ];
      }

      if (unreadItems.length > 0) {
        return [{ key: "unread", label: "New", items: unreadItems }];
      }

      return [{ key: "all", label: "Recent", items: list }];
    });

    onMounted(() => {
      if (heroId.value) void notificationsStore.load(heroId.value);
    });

    const showToast = async (message: string) => {
      const toast = await toastController.create({
        message,
        duration: 1800,
        position: "top",
        cssClass: "rpg-toast",
      });
      await toast.present();
    };

    const setFilter = (filter: NotificationFilter) => {
      if (currentFilter.value === filter) return;
      currentFilter.value = filter;
      play$fx("cursor");
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
      play$fx("select");
      notificationsStore.markRead(notification.id);
    };

    const deleteNotification = (notification: XpNotification) => {
      play$fx("trash");
      notificationsStore.remove(notification.id);
    };

    const markAllAsRead = () => {
      const marked = notificationsStore.markAllRead(heroId.value);
      play$fx("select");
      void showToast(marked ? `${marked} marked as read` : "Nothing unread");
    };

    const deleteAllNotifications = () => {
      const cleared = notificationsStore.clear(heroId.value);
      play$fx("trash");
      void showToast(cleared ? "Notifications cleared" : "Nothing to clear");
    };

    return {
      currentFilter,
      notifications,
      filteredNotifications,
      unreadCount,
      unreadMeta,
      sections,
      rootClass,
      rootStyle,
      setFilter,
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
      kindLabel: kindLabelOf,
    };
  },
});
