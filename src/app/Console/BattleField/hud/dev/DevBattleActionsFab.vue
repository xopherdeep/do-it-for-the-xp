<template>
  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button color="primary" @click="openBattleActionsSheet">
      <i class="fad fa-bolt fa-2x"></i>
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { actionSheetController } from '@ionic/vue';
import {
  flashOutline,
  flameOutline,
  pulseOutline,
  trophyOutline,
  skullOutline,
  refreshOutline,
  closeOutline
} from 'ionicons/icons';

export default defineComponent({
  name: 'BattleActionsFab',
  emits: [
    'attack-animation',
    'enemy-hit',
    'player-hit',
    'victory-animation',
    'defeat-animation',
    'reset-battle'
  ],
  setup(props, { emit }) {
    // Action sheet for battle animations and actions
    const openBattleActionsSheet = async () => {
      const actionSheet = await actionSheetController.create({
        header: 'Battle Actions',
        mode: 'ios',
        buttons: [
          {
            text: 'Attack Animation',
            icon: flashOutline,
            handler: () => {
              emit('attack-animation');
            }
          },
          {
            text: 'Enemy Hit Animation',
            icon: flameOutline,
            handler: () => {
              emit('enemy-hit');
            }
          },
          {
            text: 'Player Hit Animation',
            icon: pulseOutline,
            handler: () => {
              emit('player-hit');
            }
          },
          {
            text: 'Victory Animation',
            icon: trophyOutline,
            handler: () => {
              emit('victory-animation');
            }
          },
          {
            text: 'Defeat Animation',
            icon: skullOutline,
            handler: () => {
              emit('defeat-animation');
            }
          },
          {
            text: 'Reset Battle',
            icon: refreshOutline,
            handler: () => {
              emit('reset-battle');
            }
          },
          {
            text: 'Cancel',
            icon: closeOutline,
            role: 'cancel',
          }
        ]
      });
      
      await actionSheet.present();
    };

    return {
      openBattleActionsSheet,
      // Pass down the icons
      flashOutline,
      flameOutline,
      pulseOutline,
      trophyOutline,
      skullOutline,
      refreshOutline,
      closeOutline
    };
  }
});
</script>

<style scoped>
/* Add any specific styling for the FAB here if needed */
</style>
