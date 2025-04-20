<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="warning">
        <ion-buttons slot="start">
          <ion-back-button default-href="/about-xp" />
          <i class="fad fa-hand-holding-usd fa-lg mr-2" style="color: gold"></i>
        </ion-buttons>
        <ion-title>About Gold Points</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Main content with a background that matches the theme color -->
      <div class="gp-theme-background h-full flex items-center justify-center">
        <i class="fad fa-hand-holding-usd fa-10x"></i>
        <!-- FAB button to trigger the dialog -->
        <ion-fab vertical="bottom" horizontal="center" slot="fixed">
          <ion-fab-button color="warning" @click="showGpDialog">
            <i class="fad fa-hand-holding-usd fa-lg"></i>
          </ion-fab-button>
        </ion-fab>
      </div>
    </ion-content>

    <!-- Custom GP Dialog (RPG style) -->
    <div class="gp-dialog-overlay" v-if="isDialogVisible" @click="advanceDialog">
      <ion-card class="gp-dialog-box rpg-box">
        <ion-card-title class="dialog-header">
          <i class="fad fa-hand-holding-usd fa-lg mr-2"></i>
          <span>Gold Points</span>
        </ion-card-title>
        <div class="dialog-content">
          <xp-typing-text
            ref="gpDialogText"
            :text="currentDialogText"
            :speed="30"
            :auto-start="true"
            :sound-theme="$fx.theme.rpg"
            sound-type="text"
            @typing-complete="onTypingComplete"
            class="gp-text"
            :has-more-text="hasMoreDialog"
          />
        </div>
        <div v-if="hasMoreDialog" class="dialog-indicator">
          <i class="fad fa-chevron-down blink"></i>
        </div>
      </ion-card>
    </div>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import ionic from '@/mixins/ionic';
import { actionSheetController } from '@ionic/vue';
import XpTypingText from '@/components/XpTypingText/XpTypingText.vue';
import { medalOutline, cartOutline, bulbOutline } from 'ionicons/icons';

// Define the interface for XpTypingText instance methods
interface XpTypingTextInstance {
  isTyping: boolean;
  startTyping: () => void;
  completeTyping: () => void;
  resetTyping: () => void;
  pauseTyping: () => void;
  resumeTyping: () => void;
}

export default defineComponent({
  name: 'XpAboutGp',
  mixins: [ionic],
  components: {
    XpTypingText
  },
  data() {
    return {
      isDialogVisible: false,
      currentDialogIndex: 0,
      currentDialogText: "",
      hasMoreDialog: true,
      isTyping: false
    };
  },
  computed: {
    dialogBlocks() {
      return [
        "Gold Points (GP) are the currency used in the XP system. They represent your economic progress!",
        "You earn GP by completing tasks, challenges, and quests. Think of them as your reward for hard work.",
        "GP can be spent in the shop to buy items, unlock features, or trade with other players.",
        "Save your GP for special items and opportunities. Strategic spending will help you progress faster.",
        "You can also earn bonus GP by participating in events or maintaining streaks of completed tasks.",
        "Remember: while XP measures your growth, GP measures your wealth and purchasing power!"
      ];
    },
    actionButtons() {
      return [
        {
          text: 'Earning GP',
          icon: medalOutline,
          handler: () => {
            this.showCustomDialog([
              "You can earn GP in several ways:",
              "• Complete daily quests and challenges",
              "• Maintain streaks of completed tasks",
              "• Participate in special events",
              "• Trade with other players",
              "Higher difficulty tasks typically reward more GP!"
            ]);
          }
        },
        {
          text: 'Spending GP',
          icon: cartOutline,
          handler: () => {
            this.showCustomDialog([
              "GP can be spent on various things:",
              "• Equipment and items in the shop",
              "• Character customizations",
              "• Special abilities and features",
              "• Trading with other players",
              "Spend wisely to maximize your progress!"
            ]);
          }
        },
        {
          text: 'GP Strategy',
          icon: bulbOutline,
          handler: () => {
            this.showCustomDialog([
              "Here are some smart GP strategies:",
              "• Save for high-value items rather than spending on small things",
              "• Focus on completing high-GP tasks",
              "• Look for GP multiplier opportunities",
              "• Keep some GP in reserve for unexpected opportunities",
              "• Balance spending between immediate needs and long-term goals"
            ]);
          }
        }
      ];
    }
  },
  mounted() {
    // Set initial dialog text
    this.currentDialogText = this.dialogBlocks[0];
  },
  methods: {
    showGpDialog() {
      // Play a sound effect for immersion
      this.play$fx("select");
      
      // Reset and show the dialog
      this.currentDialogIndex = 0;
      this.currentDialogText = this.dialogBlocks[0];
      this.hasMoreDialog = this.dialogBlocks.length > 1;
      this.isDialogVisible = true;
      this.isTyping = true;
    },
    
    advanceDialog() {
      // If typing is in progress, complete the current text immediately
      if (this.isTyping) {
        this.isTyping = false;
        // Skip typing animation by immediately showing the full text
        const typingComponent = this.$refs.gpDialogText as XpTypingTextInstance;
        if (typingComponent) {
          typingComponent.completeTyping();
        }
        return;
      }
      
      // If not typing, advance to next dialog block
      if (this.currentDialogIndex < this.dialogBlocks.length - 1) {
        this.currentDialogIndex++;
        this.currentDialogText = this.dialogBlocks[this.currentDialogIndex];
        this.hasMoreDialog = this.currentDialogIndex < this.dialogBlocks.length - 1;
        this.isTyping = true;
      } else {
        // End of dialog, close and show options
        this.isDialogVisible = false;
        this.presentActionSheet();
      }
    },
    
    onTypingComplete() {
      // The current text block has finished typing
      console.log(`Dialog block ${this.currentDialogIndex} completed`);
      this.isTyping = false;
      
      // Play subtle sound effect between blocks if there are more blocks
      if (this.currentDialogIndex < this.dialogBlocks.length - 1) {
        this.play$fx("text");
      }
    },
    
    async presentActionSheet() {
      const actionSheet = await actionSheetController
        .create({
          header: 'Learn more about Gold Points:',
          cssClass: 'gp-action-sheet',
          buttons: this.actionButtons,
          mode: 'ios',
        });
      await actionSheet.present();
    },
    
    showCustomDialog(blocks: string[]) {
      // Store original blocks
      const originalBlocks = this.dialogBlocks;
      // Override with custom blocks
      this.$options.computed.dialogBlocks = function() { return blocks; };
      // Show dialog with custom content
      this.showGpDialog();
      // Reset to original blocks after dialog is closed
      this.$watch('isDialogVisible', (newVal) => {
        if (!newVal) {
          this.$options.computed.dialogBlocks = function() { return originalBlocks; };
        }
      });
    }
  }
}); 
</script>

<style lang="scss" scoped>
.gp-theme-background {
  background: linear-gradient(135deg, var(--ion-color-warning-shade) 0%, var(--ion-color-warning) 100%);
  background-size: cover;
  min-height: 100%;
}

.gp-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
}

.gp-dialog-box {
  width: 100%;
  max-width: 600px;
  background-color: rgba(0, 0, 0, 0.9);
  border: 2px solid gold;
  color: white;
  
  .dialog-header {
    background-color: var(--ion-color-warning);
    color: black;
    padding: 0.5rem 1rem;
    font-weight: bold;
    display: flex;
    align-items: center;
  }
  
  .dialog-content {
    padding: 1rem;
    min-height: 100px;
  }
  
  .dialog-indicator {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    color: gold;
    
    .blink {
      animation: blink 1s infinite;
    }
  }
}

.gp-text {
  font-size: 1.1rem;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.swiper-pagination-bullet-active {
  background: var(--ion-color-warning);
}

.swiper-button-next,
.swiper-button-prev {
  color: var(--ion-color-warning);
}
</style>