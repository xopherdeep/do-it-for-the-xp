<template>
  <!-- BATTLE ACTIONS MENU -->
  <ion-fab
    vertical="top"
    horizontal="start"
    class="fab-battle battle-actions icon-colors"
    :class="$options.name"
    :activated="fabActive"
    v-if="user && $attrs.isBattleFabOn"
  >
    <ion-grid class="p-0">
      <ion-row>
        <ion-col>
          <ion-fab-button
            color="primary"
            @click="toggleFab"
          >
            <i class="fad fa-sword fa-lg"></i>
          </ion-fab-button>

          <ion-badge>
            Battle
          </ion-badge>
        </ion-col>
      </ion-row>
    </ion-grid>
    <ion-fab-list
      class="fab-battle"
      side="bottom"
      ref="battleFab"
    >
      <ion-card class="fixed b-0">
        <ion-card-title>
          Battle Actions
        </ion-card-title>
        <ion-buttons>
          <ion-grid class="ion-no-padding">
            <ion-row>
              <!-- First row: Attack, Goods, Abilities -->
              <ion-col
                v-for="action in displayActions.slice(0, 3)"
                :key="action.label"
                size="4"
              >
                <ion-button
                  @click="clickAction(action)"
                  :id="action.id ? action.id : undefined"
                  size="small"
                  :color="getBattleActionColor(action.label)"
                  class="p-0 m-0 ion-no-padding text-left"
                  expand="block"
                >
                    <!-- <i
                      slot="start"
                      class="fad fa-lg hidden"
                      :class="`fa-${action.faIcon?.replace('fa-', '')}`"
                    /> -->
                    <ion-label>{{ action.label }}</ion-label>
                </ion-button>
              </ion-col>
              <!-- Second row: Defend, Run Away -->
              <ion-col
                v-for="action in displayActions.slice(3)"
                :key="action.label"
                :size="4"
              >
                <ion-button
                  @click="clickAction(action)"
                  :id="action.id ? action.id : undefined"
                  size="small"
                  :color="getBattleActionColor(action.label)"
                  class="p-0 m-0"
                  expand="full"
                >
                    <!-- <i
                    slot="start"
                      class="fad fa-lg hidden"
                      :class="`fa-${action.faIcon?.replace('fa-', '')}`"
                    /> -->
                    <ion-label>{{ action.label }}</ion-label>
                </ion-button>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-buttons>
      </ion-card>
    </ion-fab-list>
  </ion-fab>
</template>

<script lang="ts">
import { computed, defineComponent, ref, PropType } from "vue";
import { toastController } from "@ionic/vue";
import ionic from "@/mixins/ionic";
import userActions from "@/mixins/userActions";

interface UserAction {
  label: string;
  id?: string;
  faIcon?: string;
  color?: string;
  click?: (event?: Event) => void;
}

export default defineComponent({
  name: "xp-fab-battle-actions",
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
    // Accept the battle actions as a prop to make it dynamic
    actions: {
      type: Array as PropType<UserAction[]>,
      default: () => []
    }
  },
  emits: ["battle-action"],
  setup(props, { emit }) {
    const userId = computed(() => props.user.id);
    const fabActive = ref(false);
    const toggleFab = () => (fabActive.value = !fabActive.value);
    
    // Default battle actions if none are provided
    const defaultBattleActions = computed<UserAction[]>(() => [
      {
        label: "Attack",
        faIcon: "sword",
        click($ev) {
          const toast = toastController.create({
            header: `${props.user.name?.nick || 'You'} prepare to attack...`,
            message: "Choose your target!",
            position: "top",
            duration: 2000,
          });
          toast.then(t => t.present());
          emit("battle-action", { action: "attack", event: $ev });
        }
      },
      {
        label: "Goods",
        faIcon: "backpack",
        click($ev) {
          emit("battle-action", { action: "goods", event: $ev });
        }
      },
      {
        label: "Abilities",
        faIcon: "hand-holding-magic",
        click($ev) {
          emit("battle-action", { action: "abilities", event: $ev });
        }
      },
      {
        label: "Defend",
        faIcon: "shield",
        click($ev) {
          const toast = toastController.create({
            header: `${props.user.name?.nick || 'You'} take defensive stance!`,
            message: "Defense increased for this turn.",
            position: "top",
            duration: 2000,
          });
          toast.then(t => t.present());
          emit("battle-action", { action: "defend", event: $ev });
        }
      },
      {
        label: "Run ",
        faIcon: "running",
        click($ev) {
          const toast = toastController.create({
            header: "Trying to escape...",
            position: "top",
            duration: 1500,
          });
          toast.then(t => t.present());
          emit("battle-action", { action: "run", event: $ev });
        }
      }
    ]);
    
    // Use provided actions or fallback to defaults
    const displayActions = computed(() => {
      return props.actions && props.actions.length > 0 ? props.actions : defaultBattleActions.value;
    });

    const getBattleActionColor = (label) => {
      switch(label.toLowerCase()) {
        case 'attack': return 'danger';
        case 'roll': return 'danger';
        case 'goods': return 'success';
        case 'abilities': return 'tertiary';
        case 'defend': return 'warning';
        case 'run away': return 'medium';
        default: return 'primary';
      }
    };

    const clickAction = async (action) => {
      fabActive.value = false; // Close the fab list regardless
      if (action.click) {
        action.click(); // Execute the original click handler if it exists
      }
    };

    return {
      clickAction,
      toggleFab,
      fabActive,
      userId,
      displayActions,
      getBattleActionColor
    };
  }
});
</script>

<style lang="scss" scoped>
ion-fab {
  &.fab-battle {
    width: 400px;
    max-width: 95vw;

    ion-fab-list{
      margin-top: 65px;

      ion-col{
        padding: 0;
      }


    } 

    ion-chip {
      box-shadow: 3px 3px 0px;
      width: 100%;
      padding: 1em 15px;

      i {
        margin: 0.25em;
      }
    }
  }
}

ion-button {
  // width: 100%;
  justify-content: center !important;
  padding: 10px 0 !important;

  * {
    display: flex;
    justify-content: center !important;
    flex-direction: column;
    align-items: center;
  }
}

ion-badge {
  margin-top: 5px;
}
</style>