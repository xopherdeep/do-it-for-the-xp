<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="success">
        <ion-buttons slot="start">
          <ion-back-button default-href="/about-xp" />
          <i class="fad fa-hand-holding-seedling fa-lg mr-2" style="color: lightgreen"></i>
        </ion-buttons>
        <ion-title>About Experience Points</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Main content with a background that matches the theme color -->
      <div class="xp-theme-background h-full flex items-center justify-center">
        <i class="fad fa-hand-holding-seedling fa-10x"></i>
        <!-- FAB button to trigger the dialog -->
        <ion-fab vertical="bottom" horizontal="center" slot="fixed">
          <ion-fab-button  @click="showXpDialog">
            <i class="fad fa-hand-holding-seedling fa-lg"></i>
          </ion-fab-button>
        </ion-fab>
      </div>
    </ion-content>

    <!-- Custom XP Dialog (RPG style) -->
    <div class="xp-dialog-overlay" v-if="isDialogVisible" @click="advanceDialog">
      <ion-card class="xp-dialog-box rpg-box">
        <ion-card-title class="dialog-header">
          <i class="fad fa-hand-holding-seedling fa-lg mr-2"></i>
          <span>Experience Points</span>
        </ion-card-title>
        <div class="dialog-content">
          <xp-typing-text
            ref="xpDialogText"
            :text="currentDialogText"
            :speed="30"
            :auto-start="true"
            :sound-theme="$fx.theme.rpg"
            sound-type="text"
            @typing-complete="onTypingComplete"
            class="xp-text"
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
import debug from '@/lib/utils/debug';
import { bulbOutline, starOutline, trophyOutline } from 'ionicons/icons';

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
  name: 'XpAboutXp',
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
        "Experience Points (XP) are the foundation of your progress in the system. They represent your personal growth!",
        "You earn XP by completing tasks, overcoming challenges, and achieving your goals in real life.",
        "As you accumulate XP, you level up, unlocking new abilities and opportunities in the system.",
        "XP is tracked across different categories, allowing you to see your growth in specific areas of your life.",
        "Regular XP gain leads to consistent progress - the key is to maintain a steady stream rather than seeking large bursts.",
        "Remember: XP represents real growth, so celebrate each point as a step toward becoming your best self!"
      ];
    },
    actionButtons() {
      return [
        {
          text: 'How to Earn XP',
          icon: trophyOutline,
          handler: () => {
            this.showCustomDialog([
              "Ways to earn Experience Points:",
              "• Complete daily tasks and quests",
              "• Achieve personal goals",
              "• Maintain consistent streaks",
              "• Overcome challenges",
              "• Participate in special events and activities"
            ]);
          }
        },
        {
          text: 'XP Benefits',
          icon: starOutline,
          handler: () => {
            this.showCustomDialog([
              "Benefits of earning XP:",
              "• Level up your character and abilities",
              "• Unlock new features and opportunities",
              "• Track your progress in different life areas",
              "• Set meaningful goals with measurable outcomes",
              "• Feel accomplished as you grow and improve"
            ]);
          }
        },
        {
          text: 'XP Strategy',
          icon: bulbOutline,
          handler: () => {
            this.showCustomDialog([
              "Strategies for maximizing XP gain:",
              "• Focus on consistency rather than perfection",
              "• Balance activities across different life areas",
              "• Set progressive goals that build on each other",
              "• Use XP boosters during challenging tasks",
              "• Track your XP trends to identify growth opportunities"
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
    showXpDialog() {
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
        const typingComponent = this.$refs.xpDialogText as XpTypingTextInstance;
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
          header: 'Learn more about Experience Points:',
          cssClass: 'xp-action-sheet',
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
      this.showXpDialog();
      
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
.xp-theme-background {
  background: linear-gradient(135deg, var(--ion-color-success-shade) 0%, var(--ion-color-success) 100%);
  background-size: cover;
  min-height: 100%;
}

.xp-dialog-overlay {
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

.xp-dialog-box {
  width: 100%;
  max-width: 600px;
  background-color: rgba(0, 0, 0, 0.9);
  border: 2px solid lightgreen;
  color: white;
  
  .dialog-header {
    background-color: var(--ion-color-success);
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
    color: lightgreen;
    
    .blink {
      animation: blink 1s infinite;
    }
  }
}

.xp-text {
  font-size: 1.1rem;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>