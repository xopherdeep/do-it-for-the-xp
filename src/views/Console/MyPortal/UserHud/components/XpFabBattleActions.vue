<template>
  <!-- BATTLE ACTIONS MENU -->
  <ion-fab
    vertical="bottom"
    horizontal="center"
    class="fab-battle battle-actions icon-colors"
    :class="$options.name"
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
  import { toastController, actionSheetController, IonFab, IonFabButton } from "@ionic/vue";
  import { ActionSheetButton } from '@ionic/core';

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
    components: { IonFab, IonFabButton },
    mixins: [],
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
      },
      // Add missing props that are being passed from BattleField component
      getIcon: {
        type: Function as PropType<(label: string) => string>,
        default: null
      },
      getColor: {
        type: Function as PropType<(label: string) => string>,
        default: null
      }
    },
    emits: ["action", "battle-action"],  // Support both event names for backward compatibility
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
              emit("action", { action: "attack", event: $ev });
              emit("battle-action", { action: "attack", event: $ev });
            }
          },
          {
            label: "Abilities",
            faIcon: "hand-holding-magic",
            click($ev) {
              emit("action", { action: "abilities", event: $ev });
              emit("battle-action", { action: "abilities", event: $ev });
            }
          },
          {
            label: "Goods",
            faIcon: "backpack",
            click($ev) {
              emit("action", { action: "goods", event: $ev });
              emit("battle-action", { action: "goods", event: $ev });
            }
          },
          {
            label: "Defend",
            faIcon: "shield",
            click($ev) {
              // Remove the toast as we now handle this in the BattleField component
              // with the dialog system for more consistency
              emit("action", { action: "defend", event: $ev });
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
              emit("action", { action: "run", event: $ev });
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
        // Use the provided color function if available
        if (props.getColor) {
          return props.getColor(label);
        }

        // Otherwise use the default implementation
        switch (label.toLowerCase()) {
          case 'attack': return 'danger';
          case 'roll': return 'danger';
          case 'goods': return 'success';
          case 'abilities': return 'tertiary';
          case 'defend': return 'warning';
          case 'run': return 'medium';
          default: return 'primary';
        }
      };

      const getBattleActionIcon = (label: string): string => {
        // Use the provided icon function if available
        if (props.getIcon) {
          return props.getIcon(label);
        }

        // Default icon mapping if no function was provided
        switch (label.toLowerCase()) {
          case 'attack': return 'sword';
          case 'goods': return 'backpack';
          case 'abilities': return 'hand-holding-magic';
          case 'defend': return 'shield';
          case 'run': return 'running';
          default: return 'question';
        }
      };

      // New action sheet presentation function
      const openActionSheet = async (): Promise<void> => {
        const buttons: ActionSheetButton[] = displayActions.value.map(action => {
          // Use the icon from props if available
          const iconName = action.faIcon || getBattleActionIcon(action.label);
          return {
            text: action.label,
            icon: `fas:${iconName}`,
            cssClass: `action-${action.label.toLowerCase()}`,
            handler: () => {
              if (action.click) {
                action.click();
              }
              return true;
            }
          };
        });

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
        getBattleActionIcon,
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
  /* Global styles for battle action sheet are now handled in earthbound.scss */
</style>