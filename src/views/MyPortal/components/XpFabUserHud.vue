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
        <ion-col size="2">
          <ion-fab-button color="light" v-if="user.avatar">
            <ion-img
              class="ion-no-padding"
              :src="userAvatar"
            ></ion-img>
          </ion-fab-button>
          <!-- <ion-badge color="medium">
            0/10
            <i class="fad fa-diamond fa-lg"></i>
          </ion-badge> -->
          <ion-badge>
            {{ user.nick }}
          </ion-badge>
          <!-- <ion-badge class="gp-badge">
            <ion-badge>
              <ion-icon :icon="walletOutline" />
              <p>
                <small>₲</small>
                {{ user.stats.gp.wallet }}
                <small>00</small>
              </p>
            </ion-badge>
            <ion-progress-bar
              color="warning"
              v-if="user.stats"
              :value="user.stats.gp.wallet / user.stats.gp.limit"
            ></ion-progress-bar>
          </ion-badge> -->
        </ion-col>
        <ion-col size="5" size-lg="5" class="ion-no-margin ion-no-padding">
          <ion-badge class="hp-badge">
            <ion-progress-bar
              color="danger"
              v-if="user.stats"
              :value="user.stats.hp.now / user.stats.hp.max"
            >
            </ion-progress-bar>
            <ion-badge>
              <ion-icon  :icon="fitnessOutline" size="small" />
              <p>
                {{user.stats.hp.now}}
                / 
                {{user.stats.hp.max}}
              </p>
            </ion-badge>
          </ion-badge>
          <ion-badge class="mp-badge">
            <ion-progress-bar
              color="tertiary"
              v-if="user.stats"
              :value="user.stats.mp.now / user.stats.mp.max"
            ></ion-progress-bar>
            <ion-badge>
              <ion-icon :icon="colorWand" size="small" />
              <p>
                {{user.stats.mp.now}}
                / 
                {{user.stats.mp.max}}
              </p>
            </ion-badge>
          </ion-badge>
          <ion-badge class="gp-badge">
            <ion-progress-bar
              color="warning"
              v-if="user.stats"
              :value="user.stats.gp.wallet / user.stats.gp.limit"
            ></ion-progress-bar>
            <ion-badge>
              <ion-icon :icon="walletOutline" size="small" />
              <p>
                <small>₲</small>
                {{ user.stats.gp.wallet }}
                <small>00</small>
              </p>
            </ion-badge>
          </ion-badge>

        </ion-col>
      </ion-row>
    </ion-grid>
    <ion-fab-list class="fab-user" side="bottom" ref="userFab" >
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
                  @click.capture="clickAction(action)"
                  size="large"
                  expand="fill"
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
                    <i
                      class="fad fa-lg fa-bars"
                    ></i>
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

<script lang="js">
  import { computed, defineComponent, ref } from 'vue'
  import { walletOutline, colorWand, fitnessOutline } from 'ionicons/icons';
  import { useRouter } from 'vue-router';
  import ionic from "@/mixins/ionic";
  import userActions from "@/mixins/userActions";

  const XpFabUserHud = defineComponent({
    mixins: [ userActions, ionic ],
    props: {
      user: {
        default() {
          return {
            id: 0
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

    setup(props){
      const router = useRouter()
      const userId = computed({ get: () => props.user.id }) 
      const fabActive = ref(false)
      const toggleFab = () => fabActive.value = !fabActive.value

      const clickAction = (action) => {
        console.log("clickAction");
        if(action.click)
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
            click($ev) {
              router.push({ name: "my-abilities", params: { userId } });
            },
          },
          {
            label: "My Quests",
            id: "staff",
            faIcon: "medal quest",
            click(){
              router.push({name: 'my-tasks', params: {userId}})
            }
          },
          {
            label: "My Items",
            id: "my-inventory",
            faIcon: "backpack",
            click($ev) {
              router.push({ name: "my-inventory", params: { userId } });
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
            click(){
              router.push({name: 'my-gold-points', params: {userId}})
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

      .wallet{
        float: right
      }
    }
  }
  .user-hud {
    ion-badge {
      width: 150px;
      height: 27px;
      background-color: transparent;
      ion-badge {
        font-size: x-small;
        display: flex;
        align-items: center;
        justify-content: start;
        position: absolute;
        height: 20px;
        text-align: left;
        ion-icon {
          float: right;
        }
        p {
          margin-right: 1em;
        }
      }
      i {
        margin: 0.1em 0.5em 0.25em 0.15em;
      }

      &.hp-badge, &.mp-badge, &.gp-badge{
        margin: 0;
        display: flex;
        align-content: center;

        ion-progress-bar {
          border-radius: 5px 2px 1em 5px;
          box-shadow: 1px 2px 4px rgba(var(--ion-color-tertinary-rgb), 0.5);
          .progress-buffer-bar {
            background: rgba(var(--ion-color-base-rgb), 0.8);
          }
        }

        ion-badge {
          ion-icon {
            border-radius: 5px;
          }
          margin: 0 0.5em 0 0;
          justify-content: space-between;
        }
      }

      &.hp-badge {
        margin-top: .5em;
        ion-progress-bar {
          .progress {
            border-right: 4px solid maroon;
          }
        }
        ion-badge {
          color: var(--ion-color-danger-contrast);
          text-shadow: 0 0px 5px maroon;
          ion-icon {
            border-radius: 5px;
          }
          margin: 0 0.5em 0 0;
          justify-content: space-between;
        }
      }
      &.mp-badge {
        ion-badge {
          color: var(--ion-color-danger-contrast);
          text-shadow: 0 0px 5px blue;
          ion-icon {
            border-radius: 5px;
          }
          justify-content: space-between;
        }
      }
      &.gp-badge2 {
        display: flex;
        display: none;
        align-content: center;
        ion-progress-bar {
          border-radius: 5px 2px 1em 5px;
          box-shadow: 1px 2px 4px rgba(var(--ion-color-warning-rgb), 0.5);
        }
        ion-badge {
          color: var(--ion-color-light);
          text-shadow: 0 0px 5px var(--xp-color-blue);
          ion-icon {
            border-radius: 5px;
          }
          justify-content: space-between;
        }
      }
      i {
        color: var(--xp-color-white);
      }

      &.gp-badge {
        // ion-badge {
        //   overflow: visible;
        //   max-width: 100%;
        //   top: -2.5px;
        //   left: 0;
        //   font-size: small;
        //   font-family: "Courier New", Courier, monospace;
        //   background-color: rgba(0, 0, 0, 0.25);
        //   text-shadow: 0 0 2px black;
        //   height: 15px;
        //   position: relative;
        //   justify-content: space-between;
        //   p {
        //     margin: 0;
        //     letter-spacing: -1.5px;
        //     word-spacing: -5px;
        //   }
        // }

        // i {
        //   margin: 0;
        // }
      }
      ion-progress-bar {
        height: 100%;
        border-radius: 5px 5px 10px 10px;
      }
    }
    ion-card-content {
      margin: 0;
      padding: 0;
    }
  }
</style>@/mixins/ionic@/mixins/userActions@/mixins/ionic@/mixins/userActions