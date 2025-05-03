<template>
  <!-- BATTLE ACTIONS MENU -->
  <ion-fab
    vertical="bottom"
    horizontal="center"
    class="fab-battle battle-actions icon-colors"
    :class="$options.name"
    v-if="user && $attrs.isBattleFabOn"
  >
          <ion-fab-button
            color="primary"
            @click="openActionSheet"
          >
            <i class="fad fa-sword fa-2x"></i>
          </ion-fab-button>

  </ion-fab>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue";
import { toastController, actionSheetController } from "@ionic/vue";
import { ActionSheetButton } from '@ionic/core';
import ionic from "@/mixins/ionic";
import userActions from "@/mixins/userActions";

interface UserAction {
  label: string;
  id?: string;
  faIcon?: string;
  icon?: string;
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
    
    // Default battle actions if none are provided
    const defaultBattleActions = computed(() => {
      const actions: UserAction[] = [
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
          label: "Abilities",
          faIcon: "hand-holding-magic",
          click($ev) {
            emit("battle-action", { action: "abilities", event: $ev });
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
          label: "Defend",
          faIcon: "shield",
          click($ev) {
            // Remove the toast as we now handle this in the BattleGround component
            // with the dialog system for more consistency
            emit("battle-action", { action: "defend", event: $ev });
          }
        },
        {
          label: "Run",
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
        },
      ];
      return actions;
    });
    
    // Use provided actions or fallback to defaults
    const displayActions = computed(() => {
      return props.actions && props.actions.length > 0 ? props.actions : defaultBattleActions.value;
    });

    const getBattleActionColor = (label: string): string => {
      switch(label.toLowerCase()) {
        case 'attack': return 'danger';
        case 'roll': return 'danger';
        case 'goods': return 'success';
        case 'abilities': return 'tertiary';
        case 'defend': return 'warning';
        case 'run': return 'medium';
        default: return 'primary';
      }
    };

    // New action sheet presentation function
    const openActionSheet = async (): Promise<void> => {
      const buttons: ActionSheetButton[] = displayActions.value.map(action => ({
        text: action.label,
        icon: `fas:${action.faIcon}`,
        cssClass: `action-${action.label.toLowerCase()}`,
        handler: () => {
          if (action.click) {
            action.click();
          }
          return true;
        }
      }));

      // Add cancel button
      buttons.push({
        text: 'Cancel',
        icon: 'fas:times',
        role: 'cancel'
      } as ActionSheetButton);

      const actionSheet = await actionSheetController.create({
        header: 'What to do...?',
        cssClass: 'battle-action-sheet',
        buttons,
        mode: 'ios'
      });

      await actionSheet.present();
    };

    return {
      userId,
      displayActions,
      getBattleActionColor,
      openActionSheet
    };
  }
});
</script>

<style lang="scss" scoped>
ion-fab {
  &.fab-battle {

    ion-badge {
      margin-top: 5px;
    }
  }
}

/* Add global styles in a separate non-scoped style block */
</style>

<style lang="scss">
/* Global styles for action sheet - not scoped */
.battle-action-sheet {
  --background: rgba(var(--ion-background-color-rgb), 0.9);
  --backdrop-opacity: 0.6;
  --button-background-selected: rgba(var(--ion-color-primary-rgb), 0.1);

  .action-attack::part(icon) {
    color: var(--ion-color-danger);
    opacity: 1;
  }

  .action-defend::part(icon) {
    color: var(--ion-color-warning);
    opacity: 1;
  }

  .action-run::part(icon) {
    color: var(--ion-color-medium);
    opacity: 1;
  }

  .action-goods::part(icon) {
    color: var(--ion-color-success);
    opacity: 1;
  }

  .action-abilities::part(icon) {
    color: var(--ion-color-tertiary);
    opacity: 1;
  }
}
</style>