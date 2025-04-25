<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <ion-back-button default-href="/about-xp" />
          <i class="fad fa-hand-holding-magic fa-lg mr-2" style="color: lightcoral"></i>
        </ion-buttons>
        <ion-title>About Ability Points</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Main content with a background that matches the theme color -->
      <div class="ap-theme-background h-full flex items-center justify-center">
        <i class="fad fa-hand-holding-magic fa-10x"></i> AP
        <!-- FAB button to trigger the dialog -->
        <ion-fab vertical="bottom" horizontal="center" slot="fixed">
          <ion-fab-button color="danger" @click="showApDialog">
            <i class="fad fa-hand-holding-magic fa-lg"></i>
          </ion-fab-button>
        </ion-fab>
      </div>
    </ion-content>

    <!-- Custom AP Dialog (RPG style) -->
    <div class="ap-dialog-overlay" v-if="isDialogVisible" @click="advanceDialog">
      <ion-card class="ap-dialog-box rpg-box">
        <ion-card-title class="dialog-header">
          <i class="fad fa-hand-holding-magic fa-lg mr-2"></i>
          <span>Ability Points</span>
        </ion-card-title>
        <div class="dialog-content">
          <xp-typing-text
            ref="apDialogText"
            :text="currentDialogText"
            :speed="30"
            :auto-start="true"
            :sound-theme="$fx.theme.rpg"
            sound-type="text"
            @typing-complete="onTypingComplete"
            class="ap-text"
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
import { defineComponent } from 'vue';
import ionic from '@/mixins/ionic';
import { actionSheetController } from '@ionic/vue';
import XpTypingText from '@/components/XpTypingText/XpTypingText.vue';
import debug from '@/utils/debug';
import { bulbOutline, flameOutline, flashOutline } from 'ionicons/icons';

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
  name: 'XpAboutAp',
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
      // Return custom blocks if available, otherwise return default blocks
      if ((this as any)._dialogBlocks) {
        return (this as any)._dialogBlocks;
      }
      
      return [
        "Ability Points (AP) are special resources used for your most powerful abilities and actions!",
        "Unlike XP and GP, AP are limited and regenerate slowly, making them precious for special occasions.",
        "You earn AP by accomplishing difficult tasks, mastering skills, and making exceptional progress.",
        "AP can be spent to activate special abilities, skip difficult challenges, or unlock rare opportunities.",
        "Managing your AP wisely is a key strategic element - saving them for when they'll have the most impact.",
        "Remember: While XP represents growth and GP represents wealth, AP represents your special powers!"
      ];
    },
    actionButtons() {
      return [
        {
          text: 'Earning AP',
          icon: flameOutline,
          handler: () => {
            this.showCustomDialog([
              "Ways to earn Ability Points:",
              "• Complete difficult challenges",
              "• Master specialized skills",
              "• Achieve exceptional progress",
              "• Participate in special events",
              "• Complete rare quests with AP rewards"
            ]);
          }
        },
        {
          text: 'Using AP',
          icon: flashOutline,
          handler: () => {
            this.showCustomDialog([
              "Ways to use Ability Points:",
              "• Activate special abilities and powers",
              "• Skip difficult challenges",
              "• Unlock rare opportunities or items",
              "• Recover from setbacks quickly",
              "• Access premium features and content"
            ]);
          }
        },
        {
          text: 'AP Strategy',
          icon: bulbOutline,
          handler: () => {
            this.showCustomDialog([
              "Strategies for managing Ability Points:",
              "• Save AP for critical moments rather than routine use",
              "• Balance AP spending between different life areas",
              "• Use AP when they'll create the biggest impact",
              "• Plan ahead for AP regeneration cycles",
              "• Consider AP costs vs. benefits before spending"
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
    showApDialog() {
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
        const typingComponent = this.$refs.apDialogText as XpTypingTextInstance;
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
      debug.log(`Dialog block ${this.currentDialogIndex} completed`);
      this.isTyping = false;
      
      // Play subtle sound effect between blocks if there are more blocks
      if (this.currentDialogIndex < this.dialogBlocks.length - 1) {
        this.play$fx("text");
      }
    },
    
    async presentActionSheet() {
      const actionSheet = await actionSheetController
        .create({
          header: 'Learn more about Ability Points:',
          cssClass: 'ap-action-sheet',
          buttons: this.actionButtons,
          mode: 'ios',
        });
      await actionSheet.present();
    },
    
    showCustomDialog(blocks: string[]) {
      
      // Store the current dialog blocks temporarily
      const tempDialogBlocks = [...this.dialogBlocks as string[]];
      
      // Set the custom blocks directly
      (this as any)._dialogBlocks = blocks;
      
      // Show dialog with custom content
      this.showApDialog();
      
      // Reset to original blocks after dialog is closed
      this.$watch('isDialogVisible', (newVal) => {
        if (!newVal) {
          // Restore original dialog blocks
          (this as any)._dialogBlocks = tempDialogBlocks;
        }
      }, { once: true });
    }
  }
}); 
</script>

<style lang="scss" scoped>
.ap-theme-background {
  background: linear-gradient(135deg, var(--ion-color-danger-shade) 0%, var(--ion-color-danger) 100%);
  background-size: cover;
  min-height: 100%;
}

.ap-dialog-overlay {
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

.ap-dialog-box {
  width: 100%;
  max-width: 600px;
  background-color: rgba(0, 0, 0, 0.9);
  border: 2px solid lightcoral;
  color: white;
  
  .dialog-header {
    background-color: var(--ion-color-danger);
    color: white;
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
    color: lightcoral;
    
    .blink {
      animation: blink 1s infinite;
    }
  }
}

.ap-text {
  font-size: 1.1rem;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>