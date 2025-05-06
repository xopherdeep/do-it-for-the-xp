<template>
  <ion-fab vertical="bottom" horizontal="start" slot="fixed">
    <ion-fab-button color="danger" @click="openDevToolsActionSheet">
      <i class="fad fa-wrench fa-2x"></i>
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { actionSheetController } from '@ionic/vue';
import {
  personOutline,
  pawOutline,
  settingsOutline,
  closeCircleOutline
} from 'ionicons/icons';

export default defineComponent({
  name: 'DevToolsFab',
  emits: ['open-profile-selector', 'open-beast-selector', 'open-controls-modal'],
  setup(props, { emit }) {
    // Action sheet for dev tools
    const openDevToolsActionSheet = async () => {
      const actionSheet = await actionSheetController.create({
        header: 'Battle field Dev Tools',
        mode: 'ios',
        buttons: [
          {
            text: 'Select Profile',
            icon: personOutline,
            handler: () => {
              emit('open-profile-selector');
            }
          },
          {
            text: 'Select Beast',
            icon: pawOutline,
            handler: () => {
              emit('open-beast-selector');
            }
          },
          {
            text: 'Battle Controls',
            icon: settingsOutline,
            handler: () => {
              emit('open-controls-modal');
            }
          },
          {
            text: 'Cancel',
            icon: closeCircleOutline,
            role: 'cancel',
          }
        ]
      });
      
      await actionSheet.present();
    };

    return {
      openDevToolsActionSheet,
      // Pass down the icons
      personOutline,
      pawOutline,
      settingsOutline,
      closeCircleOutline,
    };
  }
});
</script>

<style scoped>
/* Add any specific styling for the FAB here if needed */
.toolbox-fab {
  margin-top: 10px;
  margin-right: 10px;
  z-index: 100;
}

.toolbox-fab ion-fab-button {
  --box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s ease;
}

.toolbox-fab ion-fab-button:hover {
  transform: scale(1.05);
}
</style>