<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/"></ion-back-button>
        </ion-buttons>
        <ion-title>Dialog System Demo</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>Dialog System Demo</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>Click the buttons below to test different dialog scenarios:</p>
          
          <ion-button expand="block" @click="showSimpleDialog">
            Simple Dialog
          </ion-button>

          <ion-button expand="block" @click="showMultiDialog">
            Multi-paragraph Dialog
          </ion-button>

          <ion-button expand="block" @click="showLongStory">
            Long Story Dialog
          </ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>

    <xp-dialog
      ref="dialog"
      :text-blocks="dialogBlocks"
      :text-speed="50"
      @block-complete="onBlockComplete"
      @dialog-complete="onDialogComplete"
    />
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import XpDialog from '@/components/XpDialog/XpDialog.vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonButtons, IonBackButton } from '@ionic/vue';

export default defineComponent({
  name: 'DialogDemo',
  components: {
    XpDialog,
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonButtons,
    IonBackButton
  },
  setup() {
    const dialog = ref<InstanceType<typeof XpDialog> | null>(null);
    const dialogBlocks = ref<string[]>([]);

    const showSimpleDialog = () => {
      dialogBlocks.value = [
        "Hello adventurer! This is a simple dialog message."
      ];
      dialog.value?.show();
    };

    const showMultiDialog = () => {
      dialogBlocks.value = [
        "Welcome to the multi-paragraph dialog system!",
        "You can click or tap anywhere to advance to the next message.",
        "This makes it perfect for RPG-style conversations and tutorials."
      ];
      dialog.value?.show();
    };

    const showLongStory = () => {
      dialogBlocks.value = [
        "Long ago, in a kingdom far away...",
        "There lived a brave hero who sought to level up and gain XP.",
        "Each day, they would complete quests and tasks...",
        "Growing stronger and more accomplished with every challenge.",
        "And that hero... could be you!"
      ];
      dialog.value?.show();
    };

    const onBlockComplete = (blockIndex: number) => {
      // Log removed to comply with ESLint rules
    };

    const onDialogComplete = () => {
      // Log removed to comply with ESLint rules
    };

    return {
      dialog,
      dialogBlocks,
      showSimpleDialog,
      showMultiDialog,
      showLongStory,
      onBlockComplete,
      onDialogComplete
    };
  }
});
</script>