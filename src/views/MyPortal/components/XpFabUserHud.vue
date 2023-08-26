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
      <ion-card>
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
                :key="action.id"
                size="6"
              >
                <ion-button
                  :id="action.id"
                  @click="clickAction(action)"
                  size="large"
                  class=""
                >
                  <i
                    class="fad fa-lg"
                    :class="`fa-${action.faIcon.replace('fa-', '')}`"
                  ></i>
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
    <ion-modal
      trigger="talk-to"
      :breakpoints="[.9]"
      :initialBreakpoint=".9"
    >
      <ion-card>
        <ion-card-title>
          Talk
        </ion-card-title>
        <ion-card-header>
          <ion-card-subtitle>
            What do you want to say?
          </ion-card-subtitle>
          <ion-card-content>

          </ion-card-content>
        </ion-card-header>
      </ion-card>
    </ion-modal>
  </ion-fab>
</template>

<script lang="ts">
  import { computed, defineComponent, ref } from 'vue'
  import { walletOutline, colorWand, fitnessOutline } from 'ionicons/icons';
  import { useRouter } from 'vue-router';
  import ionic from "@/mixins/ionic";
  import userActions from "@/mixins/userActions";

  const XpFabUserHud = defineComponent({
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
                wallet: 0
              }
            },
            name: {
              full: '',
              nick: ''
            }
          }
        }
      }
    },
    computed: {
      userAvatar() {
        const avatar = `./${this.user.avatar}.svg`;
        return this.$requireAvatar(avatar);
      },
    },

    setup(props) {
      const router = useRouter()
      const userId = computed(() => props.user.id)
      const fabActive = ref(false)
      const toggleFab = () => fabActive.value = !fabActive.value

      const clickAction = (action) => {
        // console.log("clickAction");
        if (action.click)
          action.click()
        fabActive.value = false
      }


      return {
        clickAction,
        toggleFab,
        fabActive,
        userId,
        walletOutline,
        colorWand,
        fitnessOutline,
        // staticActions: [
        //   {
        //     label: "Talk",
        //     id: "talk-to",
        //     faIcon: "comment",
        //   },
        //   {
        //     label: "Notifications",
        //     id: "notifications",
        //     faIcon: "bell-exclamation",
        //   },
        //   {
        //     id: "abilities",
        //     label: "My Abilities",
        //     faIcon: "book-spells",
        //     click($ev) {
        //       router.push({ name: "my-abilities", params: { userId: userId.value }})
        //     }
        //   },
        //   {
        //     label: "My Items",
        //     id: "my-inventory",
        //     faIcon: "backpack",
        //     click($ev) {
        //       router.push({ name: "my-inventory", params: { userId: userId.value } });
        //     },
        //   },
        //   {
        //     label: "Stats",
        //     id: "user-profile",
        //     faIcon: "hand-holding-seedling",
        //   },
        //   {
        //     label: "My Wallet",
        //     id: "wallet",
        //     faIcon: "wallet",
        //     click(){
        //       router.push({name: 'my-gold-points', params: {userId: userId.value}})
        //     }
        //   },
        //   {
        //     label: "Save & Quit",
        //     id: 'save-quit',
        //     faIcon: "save",
        //   },
        //   {
        //     label: "Inventory Screen",
        //     id: "toolbox",
        //     faIcon: "compass",
        //     // link: 'storage',
        //     click($ev) {
        //       this.isRPGBoxOpen = true;
        //     },
        //   },
        //   {
        //     label: "Gold Points",
        //     id: "gold-points",
        //     faIcon: "hand-holding-usd",
        //     click($ev) {
        //       router.push({ name: "my-gold-points", params: { userId } });
        //       // console.log($ev.preventDefault());
        //     },
        //   },
        //   {
        //     label: "Settings",
        //     id: "settings",
        //     faIcon: "cogs",
        //   },
        // ],

        staticActions: [
          // userActions: [
          {
            label: "Talk",
            id: "talk-to",
            faIcon: "comment",
          },
          {
            label: "Notifications",
            id: "notifications",
            faIcon: "bell-exclamation",
          },
          {
            id: "abilities",
            label: "My Abilities",
            faIcon: "book-spells",
            click() {
              // console.log("click", userId);
              router.push({ name: "my-abilities", params: { userId: userId.value } });
            },
          },
          {
            label: "My Quests",
            id: "staff",
            faIcon: "medal quest",
            click() {
              router.push({ name: 'my-tasks', params: { userId: userId.value } })
            }
          },
          {
            label: "My Items",
            id: "my-inventory",
            faIcon: "backpack",
            click() {
              router.push({ name: "my-inventory", params: { userId: userId.value } });
            },
          },
          {
            label: "Stats",
            id: "user-profile",
            faIcon: "hand-holding-seedling",
          },
          {
            label: "My Wallet",
            id: "wallet",
            faIcon: "wallet",
            click() {
              router.push({ name: 'my-gold-points', params: { userId: userId.value } })
            }
          },
          {
            label: "Save & Quit",
            id: 'save-quit',
            faIcon: "save",
          },
        ],
      }
    }
  })

  export default XpFabUserHud;
</script>
<style lang="scss" scoped>
ion-fab {
  &.fab-user {
    width: 500px;
    max-width: 95vw;

    ion-chip {
      box-shadow: 3px 3px 0px;
      width: 100%;
      padding: 1em 15px;

      i {
        margin: 0.25em;
      }
    }

    .wallet {
      float: right
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