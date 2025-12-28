<template>
  <!-- USER MENU -->
  <ion-fab
    vertical="top"
    horizontal="center"
    class="fab-user user-hud icon-colors"
    :class="$options.name"
    :activated="fabActive"
    v-if="user.stats && isUserFabOn"
  >
    <ion-grid class="p-0">
      <ion-row>
        <ion-col class="ion-no-padding">
          <div class="avatar-wrapper">
            <ion-fab-button
              color="light"
              v-if="user.avatar"
              class="avatar-button"
            >
              <ion-img
                class="ion-no-padding"
                :src="userAvatar"
              ></ion-img>
            </ion-fab-button>
            <ion-badge color="secondary" class="avatar-badge" v-if="apPercent !== null">
              AP {{ apPercent }}%
            </ion-badge>
          </div>

          <ion-badge class="name-badge">
            {{ user.name.nick }}
          </ion-badge>
        </ion-col>
      </ion-row>
    </ion-grid>
    <ion-fab-list
      class="fab-user"
      side="bottom"
      ref="userFab"
    >
      <xp-rpg-menu
        :actions="allUserActions"
        @action-click="clickAction"
      >
        <template #header>
          <div class="header-content">
            <div class="title-group">
              <span class="menu-title">{{ user.name.nick }}</span>
              <div class="level-badge-pill" v-if="user.stats">
                <small>LVL</small>{{ user.stats.level }}
              </div>
            </div>
            <div v-if="walletHtml" class="menu-subtitle" v-html="walletHtml"></div>
          </div>
        </template>
      </xp-rpg-menu>
    </ion-fab-list>
    <!-- <ion-modal trigger="talk-to" :breakpoints="[0.9]" :initialBreakpoint="0.9">
      <ion-card>
        <ion-card-title> Talk </ion-card-title>
        <ion-card-header>
          <ion-card-subtitle> What do you want to say? </ion-card-subtitle>
          <ion-card-content> </ion-card-content>
        </ion-card-header>
      </ion-card>
    </ion-modal> -->
  </ion-fab>

  <!-- Save & Quit Modal - Moved outside ion-fab to prevent double backdrop -->
  <save-and-quit-modal
    v-if="user.stats && isUserFabOn"
    :is-open="showSaveQuitModal"
    :user-avatar="userAvatar"
    @close="closeSaveQuitModal"
    @confirm="confirmSaveQuit"
  />
</template>

<script lang="ts">
  import { computed, defineComponent, ref, PropType } from "vue";
  import { walletOutline, colorWand, fitnessOutline } from "ionicons/icons";
  import { useRouter } from "vue-router";
  import ionic from "@/mixins/ionic";
  import userActions from "@/mixins/userActions";
  import { modalController } from "@ionic/vue";
  import XpChat from "@/views/App/SideMenu/XpGameMaster/XpChat/XpChat.vue";
  import XpNotifications from "./XpNotifications/XpNotifications.vue";
  import SaveAndQuitModal from "@/components/molecules/Modals/SaveAndQuitModal.vue";
  import XpRpgMenu from "@/components/molecules/RpgMenu/XpRpgMenu.vue";

  export default defineComponent({
    name: "xp-fab-user-hud",
    components: {
      SaveAndQuitModal,
      XpRpgMenu,
    },
    mixins: [userActions, ionic],
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
    emits: ["open-profile"],
    computed: {
      userAvatar() {
        const avatar = `./${this.user.avatar}.svg`;
        return this.$requireAvatar(avatar);
      },
      walletHtml() {
        return `<span class="wallet"><i class="fad fa-coin mr-1"></i> <small>₲</small>${this.user.stats.gp.wallet}<small>00</small></span>`;
      },
      apPercent() {
        const ap = this.user?.stats?.ap;
        if (ap === undefined || ap === null) return null;
        if (typeof ap === 'object') {
          const today = Number(ap.today) || 0;
          const week = Number(ap.week || ap.total) || 1;
          return Math.round((today / week) * 100);
        }
        return Number(ap) || 0;
      },
      allUserActions() {
        return [
          ...this.staticActions,
          {
            label: "Menu",
            faIcon: "bars",
            click: () => {
              // Menu toggle is usually handled by ion-menu-toggle automatically if inside,
              // but here we might need manual trigger if we replaced the toggle.
              // For simplicity, we can just trigger the menu controller if needed.
            }
          }
        ];
      }
    },
    setup(props, { emit }) {
      const router = useRouter();
      const userId = computed(() => props.user.id);
      const fabActive = ref(false);
      const showSaveQuitModal = ref(false);
      const toggleFab = () => (fabActive.value = !fabActive.value);

      const closeSaveQuitModal = () => {
        showSaveQuitModal.value = false;
      };

      const confirmSaveQuit = () => {
        router.push({ name: 'xp-profile' });
        closeSaveQuitModal();
      };

      const clickAction = async (action) => {
        fabActive.value = false; // Close the fab list regardless
        if (action.action === "openProfile") {
          emit("open-profile"); // Emit event for the parent
        } else if (action.click) {
          action.click(); // Execute the original click handler if it exists
        }
        // If it's just a trigger like 'talk-to', the button's `id` handles it.
      };

      const staticActions = [
        {
          label: "Talk",
          id: "talk-to",
          faIcon: "comment",
          async click() {
            // Create and present the chat modal using modalController
            const modal = await modalController.create({
              component: XpChat,
              componentProps: {},
              cssClass: 'chat-modal',
              breakpoints: [0, 0.5, 0.75, 1],
              initialBreakpoint: 1,
            });
            await modal.present();

          }
        },
        {
          label: "Notifications",
          id: "notifications",
          faIcon: "bell-exclamation",
          async click() {
            // Create and present the notifications modal
            const modal = await modalController.create({
              component: XpNotifications,
              componentProps: {},
              cssClass: 'notifications-modal',
              breakpoints: [0, 0.5, 0.75, 1],
              initialBreakpoint: 1,
            });
            await modal.present();
          },
        },
        {
          id: "abilities",
          label: "Abilities",
          faIcon: "book-spells",
          click() {
            router.push({
              name: "my-abilities",
              params: { userId: userId.value },
            });
          },
        },
        {
          label: "Quests",
          id: "staff",
          faIcon: "medal",
          click() {
            router.push({ name: "my-tasks", params: { userId: userId.value } });
          },
        },
        {
          label: "Goods",
          id: "my-inventory",
          faIcon: "backpack",
          click() {
            router.push({
              name: "my-inventory",
              params: { userId: userId.value },
            });
          },
        },
        {
          label: "Stats",
          action: "openProfile",
          faIcon: "hand-holding-seedling",
        },
        {
          label: "Wallet",
          id: "wallet",
          faIcon: "wallet",
          click() {
            router.push({
              name: "my-gold-points",
              params: { userId: userId.value },
            });
          },
        },
        {
          label: "Save & Quit",
          id: "save-quit",
          faIcon: "sign-out",
          click() {
            showSaveQuitModal.value = true;
          },
        },
      ];

      return {
        clickAction,
        toggleFab,
        fabActive,
        userId,
        walletOutline,
        colorWand,
        fitnessOutline,
        staticActions,
        showSaveQuitModal,
        closeSaveQuitModal,
        confirmSaveQuit,
      };
    },
  });
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound.scss" as *;

  ion-fab {
    &.fab-user {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative; // Allow it to sit in the flow of the organism anchor
      margin: 0;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      transform: none;

      ion-fab-list {
        margin-top: 65px;

        ion-col {
          padding: 0;
        }

      }

      .avatar-wrapper {
        position: relative;
        display: inline-block;
        
        .avatar-button {
          --border-radius: 50%;
          --padding-start: 0;
          --padding-end: 0;
          --padding-top: 0;
          --padding-bottom: 0;
          --background: transparent;
          --background-hover: transparent;
          --background-focused: transparent;
          --background-activated: transparent;
          margin-bottom: 0.5rem;
          margin-top: 0.5rem;
          transition: all 0.3s ease;
          overflow: hidden;

          ion-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: scale(1.1); // Scale up to ensure it covers the original button area
          }

          &:hover {
            transform: scale(1.12);
          }
        }

        .avatar-badge {
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 20;
          font-family: 'StatusPlz', sans-serif;
          font-size: 0.7rem;
          padding: 3px 8px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          pointer-events: none;
        }

      }

      .name-badge {
        display: none; // Hidden in the organism view to keep it clean
      }

      // RPG Menu Header Styles (used in slot)
      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding-top: 4px;

        .title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .menu-title {
          font-family: "Apple Kid", "Twoson", sans-serif;
          font-size: 1.5rem;
          font-weight: normal;
          text-transform: uppercase;
          letter-spacing: 3px;
        }

        .level-badge-pill {
          background: #50fa7b;
          color: #111;
          font-weight: 900;
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          gap: 2px;
          font-family: 'StatusPlz', sans-serif;

          small {
            font-size: 0.5rem;
            font-weight: 700;
            opacity: 0.7;
          }
        }

        .menu-subtitle {
          font-family: "StatusPlz", monospace;
          font-size: 1.25rem;
          opacity: 0.9;
          letter-spacing: 3px; // Matching your update
        }
      }

      .wallet {
        float: right;
        letter-spacing: 3px;
      }
    }
  }

  ion-button {
    // width: 100%;
    justify-content: flex-start !important;

    * {
      display: flex;
      justify-content: flex-start !important;
    }
  }
</style>
