<template>
  <!-- USER MENU -->
  <ion-fab
    vertical="top"
    horizontal="start"
    class="fab-user user-hud"
    :class="$options.name"
    :activated="fabActive"
    v-if="user.stats && $attrs.isUserFabOn"
  >
    <ion-grid>
      <ion-row>
        <ion-col>
          <ion-fab-button
            color="light"
            v-if="user.avatar"
          >
            <ion-img
              class="ion-no-padding"
              :src="userAvatar"
            ></ion-img>

          </ion-fab-button>

          <ion-badge>
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
      <ion-card class="fixed t-0">
        <ion-card-title>
          {{ user.name.nick }}
          <ion-text class="wallet">
            <small>₲</small>
            {{ user.stats.gp.wallet }}
            <small>00</small>
          </ion-text>
        </ion-card-title>
        <ion-buttons>
          <ion-grid>
            <ion-row>
              <ion-col
                v-for="action in staticActions"
                :key="action.label"
                size="6"
              >
                <ion-button
                  @click="clickAction(action)"
                  size="large"
                  class="p-0"
                  :id="action.id ? action.id : undefined"
                >
                  <i
                    class="fad fa-lg"
                    :class="`fa-${action.faIcon.replace('fa-', '')}`"
                  />
                  {{ action.label }}
                </ion-button>
              </ion-col>
              <ion-col>
                <ion-menu-toggle>
                  <ion-button>
                    <i class="fad fa-lg fa-bars"></i>
                    Open Menu
                  </ion-button>
                </ion-menu-toggle>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-buttons>
      </ion-card>
      <!-- <CardUserStats :id="isUserModalOpen" /> -->
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
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import { walletOutline, colorWand, fitnessOutline } from "ionicons/icons";
import { useRouter } from "vue-router";
import ionic from "@/mixins/ionic";
import userActions from "@/mixins/userActions";
import { modalController } from "@ionic/vue";
import XpChat from "@/views/App/SideMenu/XpGameMaster/XpChat/XpChat.vue";
import XpNotifications from "@/views/Console/MyPortal/components/XpNotifications/XpNotifications.vue";

export default defineComponent({
  name: "xp-fab-user-hud",
  mixins: [userActions, ionic],
  props: {
    user: {
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
  },
  emits: ["open-profile"],
  computed: {
    userAvatar() {
      const avatar = `./${this.user.avatar}.svg`;
      return this.$requireAvatar(avatar);
    },
  },
  setup(props, { emit }) {
    const router = useRouter();
    const userId = computed(() => props.user.id);
    const fabActive = ref(false);
    const toggleFab = () => (fabActive.value = !fabActive.value);

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
        label: "My Abilities",
        faIcon: "book-spells",
        click() {
          router.push({
            name: "my-abilities",
            params: { userId: userId.value },
          });
        },
      },
      {
        label: "My Quests",
        id: "staff",
        faIcon: "medal",
        click() {
          router.push({ name: "my-tasks", params: { userId: userId.value } });
        },
      },
      {
        label: "My Items",
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
        label: "My Wallet",
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
        faIcon: "save",
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
    };
  },
});
</script>

<style lang="scss" scoped>
ion-fab {
  &.fab-user {
    width: 500px;
    max-width: 95vw;

    ion-fab-list{
      margin-top: 65px;
    } 

    ion-chip {
      box-shadow: 3px 3px 0px;
      width: 100%;
      padding: 1em 15px;

      i {
        margin: 0.25em;
      }
    }

    .wallet {
      float: right;
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
