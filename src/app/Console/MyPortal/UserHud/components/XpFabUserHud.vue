<template>
  <!-- USER MENU -->
  <ion-fab ref="userFab" vertical="top" horizontal="center" class="fab-user user-hud icon-colors" :class="$options.name"
    v-if="user.stats && isUserFabOn" @ionFabActivated="onFabActivated">
    <ion-grid class="p-0">
      <ion-row>
        <ion-col class="ion-no-padding">
          <div class="avatar-wrapper">
            <ion-fab-button color="light" class="avatar-button">
              <i v-if="isImpersonating" class="fad fa-mask fa-2x text-danger"></i>
              <ion-img v-else-if="user.avatarImage || user.avatar" class="ion-no-padding" :src="userAvatar"></ion-img>
            </ion-fab-button>
            <ion-badge color="secondary" class="avatar-badge" v-if="user?.stats">
              AP {{ apTotalLabel }}
            </ion-badge>
            <ion-badge color="danger" class="notification-badge" v-if="hasUnreadNotifications">
              {{ notificationBadgeLabel }}
            </ion-badge>
            <ion-badge color="warning" class="notification-badge approvals-badge" v-if="waitingCount > 0"
              :aria-label="`${waitingCount} chores waiting for approval`">
              <i class="fad fa-clipboard-check"></i> {{ waitingCount }}
            </ion-badge>
          </div>

          <ion-badge class="name-badge">
            {{ user.name.nick }}
          </ion-badge>
        </ion-col>
      </ion-row>
    </ion-grid>
    <ion-fab-list class="fab-user" side="bottom">
      <xp-rpg-menu :actions="allUserActions" @action-click="clickAction">
        <template #header>
          <div class="header-content">
            <div class="title-group">
              <span class="menu-title">{{ user.name.nick }}</span>
              <div class="level-badge-pill" v-if="user.stats">
                <small>LVL</small>{{ user.stats.level }}
              </div>
            </div>
            <div v-if="walletHtml" class="menu-subtitle" v-html="sanitizeHtml(walletHtml)"></div>
          </div>
        </template>
      </xp-rpg-menu>
    </ion-fab-list>
  </ion-fab>

  <!-- Save & Quit Modal - Moved outside ion-fab to prevent double backdrop -->
  <save-and-quit-modal v-if="user.stats && isUserFabOn" :is-open="showSaveQuitModal" :user-avatar="userAvatar"
    @close="closeSaveQuitModal" @confirm="confirmSaveQuit" />
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch, PropType } from "vue";
import { walletOutline, colorWand, fitnessOutline } from "ionicons/icons";
import { useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { heroAvatarSrc } from "@/lib/hero-look/look";
import { play$fx } from "@/assets/fx";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import { abbreviateNumber } from "@/lib/utils/format";
import { waitingClaimCount } from "@/lib/services/quests/waitingClaims";
import { APPROVALS_LINK } from "@/lib/services/notifications/Notifications";
import { heroApWindows } from "@/lib/services/abilities/heroAbilityStatus";
import {
  menuController,
  modalController,
  IonFab,
  IonGrid,
  IonRow,
  IonCol,
  IonFabButton,
  IonImg,
  IonBadge,
  IonFabList,
} from "@ionic/vue"; // Added explicit imports
import XpChat from "@/app/Admin/XpChat/XpChat.vue";
import XpNotifications from "./XpNotifications/XpNotifications.vue";
import SaveAndQuitModal from "@/components/molecules/Modals/SaveAndQuitModal.vue";
import XpRpgMenu, { RpgMenuAction } from "@/components/molecules/RpgMenu/XpRpgMenu.vue";
import { USER_MENU_CONFIG } from "@/constants";

export default defineComponent({
  name: "xp-fab-user-hud",
  components: {
    SaveAndQuitModal,
    XpRpgMenu,
    IonFab,
    IonGrid,
    IonRow,
    IonCol,
    IonFabButton,
    IonImg,
    IonBadge,
    IonFabList,
  },
  mixins: [],
  props: {
    user: {
      type: Object as PropType<any>,
      default() {
        return {
          avatar: "",
          id: 0,
          stats: {
            gp: {
              wallet: 0,
            },
          },
          name: {
            full: "",
            nick: "",
          },
        };
      },
    },
    isUserFabOn: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["open-profile", "open-pegasus", "open-guide"],
  computed: {
    userAvatar() {
      return heroAvatarSrc(this.user, (key: string) => this.$requireAvatar(key));
    },
    walletHtml() {
      return `<span class="wallet"><i class="fad fa-coin mr-1"></i> <small>₲</small>${this.user.stats.gp.wallet}<small>00</small></span>`;
    },
    apTotal(): number {
      return heroApWindows(this.user?.stats?.ap).total;
    },
    apTotalLabel(): string {
      return abbreviateNumber(this.apTotal, 1);
    },
    isImpersonating() {
      return (this as any).userStore.currentUser.isImpersonating;
    },
    allUserActions(): RpgMenuAction[] {
      // Use a broad RpgMenuAction type to allow any labels/icons; the Notifications entry carries the unread count
      const badge = (this as any).notificationBadgeLabel;
      const actions: RpgMenuAction[] = this.staticActions.map((action: RpgMenuAction) =>
        action.id === USER_MENU_CONFIG.notifications.id ? { ...action, badge } : action
      );

      const waiting = (this as any).waitingCount;
      const hasWaiting = waiting > 0;
      if (hasWaiting) {
        actions.splice(1, 0, {
          label: "Approvals",
          faIcon: "clipboard-check",
          badge: waiting,
          click: () => {
            this.$router.push(APPROVALS_LINK);
          },
        });
      }

      actions.push({
        label: "Menu",
        faIcon: "bars",
        click: async () => {
          await menuController.toggle();
        },
      });

      if (this.isImpersonating) {
        actions.push({
          label: "End Masquerade",
          faIcon: "mask",
          iconClass: "text-danger",
          click: () => {
            (this as any).userStore.stopImpersonating();
            play$fx("start");
            this.$router.push({ name: "xp-dashboard" });
          },
        });
      }

      return actions;
    },
  },
  setup(props, { emit }) {
    const router = useRouter();
    const userStore = useUserStore();
    const notificationsStore = useNotificationsStore();
    const userId = computed(() => props.user.id);
    // The hero's feed is read once per hero; the badge follows the unread count
    watch(
      userId,
      (id) => {
        const hasHeroId = id !== undefined && id !== null && id !== 0 && id !== "";
        if (hasHeroId) void notificationsStore.load(String(id));
      },
      { immediate: true }
    );
    const unreadNotifications = computed(() => notificationsStore.unreadCount(String(userId.value)));
    const hasUnreadNotifications = computed(() => Boolean(unreadNotifications.value && unreadNotifications.value > 0));
    const notificationBadgeLabel = computed(() => {
      const count = unreadNotifications.value;
      if (!count) return undefined;
      return count > 99 ? "99+" : count;
    });
    // A Game Master sees how many chores wait on their word (always zero for a hero)
    const waitingCount = computed(() => waitingClaimCount.value);
    const fabActive = ref(false);
    const showSaveQuitModal = ref(false);

    const userFab = ref(null);

    const toggleFab = () => {
      fabActive.value = !fabActive.value;
    };

    const closeFab = () => {
      fabActive.value = false;
      const fabEl = (userFab.value as any)?.$el;
      if (fabEl) fabEl.activated = false;
    };

    const onFabActivated = (event: CustomEvent) => {
      fabActive.value = event.detail;
    };

    const shouldLogout = ref(false);

    const closeSaveQuitModal = () => {
      showSaveQuitModal.value = false;
      if (shouldLogout.value) {
        shouldLogout.value = false;
        router.replace({ name: "xp-profile" });
      }
    };

    const confirmSaveQuit = () => {
      shouldLogout.value = true;
      showSaveQuitModal.value = false;
    };

    const clickAction = async (action) => {
      closeFab(); // Close the fab menu on any action
      const isOpenProfile = action.action === "openProfile";
      if (isOpenProfile) {
        emit("open-profile"); // Emit event for the parent
      }
      const isOpenPegasus = action.action === "openPegasus";
      if (isOpenPegasus) {

        emit("open-pegasus"); // The portal (or the temple) owns the world map modal
      }
      const isOpenGuide = action.action === "openGuide";
      if (isOpenGuide) emit("open-guide"); // The portal owns the Guide
    };

    const staticActions: RpgMenuAction[] = [
      {
        label: USER_MENU_CONFIG.talk.label,
        id: USER_MENU_CONFIG.talk.id,
        faIcon: USER_MENU_CONFIG.talk.icon,
        async click() {
          // Create and present the chat modal using modalController
          const modal = await modalController.create({
            component: XpChat,
            componentProps: {},
            cssClass: "chat-modal",
            breakpoints: [0, 0.5, 0.75, 1],
            initialBreakpoint: 1,
          });
          await modal.present();
        },
      },
      {
        label: USER_MENU_CONFIG.funds.label,
        id: USER_MENU_CONFIG.funds.id,
        faIcon: USER_MENU_CONFIG.funds.icon,
        click() {
          router.push({
            name: "my-gold-points",
            params: { userId: userId.value },
          });
        },
      },
      {
        label: USER_MENU_CONFIG.quests.label,
        id: USER_MENU_CONFIG.quests.id,
        faIcon: USER_MENU_CONFIG.quests.icon,
        click() {
          router.push({ name: "my-tasks", params: { userId: userId.value } });
        },
      },
      {
        label: USER_MENU_CONFIG.notifications.label,
        id: USER_MENU_CONFIG.notifications.id,
        faIcon: USER_MENU_CONFIG.notifications.icon,
        async click() {
          // Create and present the notifications modal
          const modal = await modalController.create({
            component: XpNotifications,
            componentProps: { heroId: String(userId.value) },
            cssClass: "notifications-modal",
            breakpoints: [0, 0.5, 0.75, 1],
            initialBreakpoint: 1,
          });
          await modal.present();
        },
      },
      {
        id: USER_MENU_CONFIG.powers.id,
        label: USER_MENU_CONFIG.powers.label,
        faIcon: USER_MENU_CONFIG.powers.icon,
        click() {
          router.push({
            name: "my-abilities",
            params: { userId: userId.value },
          });
        },
      },
      {
        label: USER_MENU_CONFIG.stats.label,
        action: USER_MENU_CONFIG.stats.action,
        faIcon: USER_MENU_CONFIG.stats.icon,
      },
      {
        label: USER_MENU_CONFIG.goods.label,
        id: USER_MENU_CONFIG.goods.id,
        faIcon: USER_MENU_CONFIG.goods.icon,
        click() {
          router.push({
            name: "my-inventory",
            params: { userId: userId.value },
          });
        },
      },
      {
        label: USER_MENU_CONFIG.guide.label,
        action: USER_MENU_CONFIG.guide.action,
        faIcon: USER_MENU_CONFIG.guide.icon,
      },
      {
        label: USER_MENU_CONFIG.pegasus.label,
        action: USER_MENU_CONFIG.pegasus.action,
        faIcon: USER_MENU_CONFIG.pegasus.icon,
      },
      {
        label: USER_MENU_CONFIG.saveQuit.label,
        id: USER_MENU_CONFIG.saveQuit.id,
        faIcon: USER_MENU_CONFIG.saveQuit.icon,
        click() {
          showSaveQuitModal.value = true;
        },
      },
    ];

    return {
      clickAction,
      toggleFab,
      closeFab,
      onFabActivated,
      userFab,
      fabActive,
      userId,
      userStore,
      unreadNotifications,
      hasUnreadNotifications,
      notificationBadgeLabel,
      waitingCount,
      walletOutline,
      colorWand,
      fitnessOutline,
      staticActions,
      showSaveQuitModal,
      closeSaveQuitModal,
      confirmSaveQuit,
      sanitizeHtml,
    };
  },
});
</script>

<style lang="scss" scoped src="./_XpFabUserHud.scss" />
