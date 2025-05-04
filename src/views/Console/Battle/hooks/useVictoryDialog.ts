import { ref, computed } from 'vue';
import { useDialog } from '../../../../hooks/useDialog';
import debug from '@/lib/utils/debug';

/**
 * Interface for reward information
 */
export interface VictoryRewards {
  xp: number;
  gold: number;
  items?: string[];
  achievements?: string[];
}

/**
 * Hook for managing victory dialog and celebrations
 */
export function useVictoryDialog() {
  // Base dialog functionality
  const { dialogRef, showDialog } = useDialog();
  
  // Victory dialog state
  const victoryDialogText = ref('');
  const victoryDialogQueue = ref<string[]>([]);
  const isTyping = ref(false);
  const showVictoryTitle = ref(false);
  const victoryRewards = ref<VictoryRewards>({ xp: 0, gold: 0 });
  const hasMoreVictoryDialog = computed(() => victoryDialogQueue.value.length > 0);
  
  /**
   * Queue up victory dialog messages
   * @param messages Array of dialog messages to show sequentially
   */
  const queueVictoryDialog = (messages: string[]) => {
    debug.log('Queueing victory dialog:', messages);
    victoryDialogQueue.value = [...victoryDialogQueue.value, ...messages];
    
    if (!isTyping.value && victoryDialogText.value === '') {
      showNextVictoryDialog();
    }
  };
  
  /**
   * Display the next message from the victory dialog queue
   */
  const showNextVictoryDialog = () => {
    if (victoryDialogQueue.value.length === 0) {
      victoryDialogText.value = '';
      return;
    }
    
    const nextMessage = victoryDialogQueue.value.shift() || '';
    victoryDialogText.value = nextMessage;
    isTyping.value = true;
    
    // If using the XpDialog component
    if (dialogRef.value) {
      showDialog('victory');
    }
  };
  
  /**
   * Handle when victory dialog text typing animation completes
   */
  const onVictoryDialogComplete = () => {
    isTyping.value = false;
  };
  
  /**
   * Advance to next victory dialog or complete current typing
   */
  const advanceVictoryDialog = () => {
    if (isTyping.value) {
      // Complete the current typing animation
      isTyping.value = false;
      
      // If using the XpTypingText component directly, you'd call completeTyping
      // typingRef.value?.completeTyping();
    } else if (hasMoreVictoryDialog.value) {
      showNextVictoryDialog();
    } else {
      // Clear the current dialog if there's no more to show
      victoryDialogText.value = '';
      // Hide the victory title if we're done
      showVictoryTitle.value = false;
    }
  };
  
  /**
   * Clear all victory dialogs
   */
  const clearVictoryDialog = () => {
    victoryDialogQueue.value = [];
    victoryDialogText.value = '';
    isTyping.value = false;
    showVictoryTitle.value = false;
  };
  
  /**
   * Show the victory sequence with appropriate dialogs
   */
  const showVictory = (enemyName: string, rewards: VictoryRewards) => {
    victoryRewards.value = rewards;
    showVictoryTitle.value = true;
    
    // Create dynamic victory messages based on rewards
    const messages = [`You defeated ${enemyName}!`];
    
    // Add reward messages
    if (rewards.xp > 0) {
      messages.push(`You earned ${rewards.xp} experience points!`);
    }
    
    if (rewards.gold > 0) {
      messages.push(`You collected ${rewards.gold} gold!`);
    }
    
    if (rewards.items && rewards.items.length > 0) {
      rewards.items.forEach(item => {
        messages.push(`You found: ${item}!`);
      });
    }
    
    if (rewards.achievements && rewards.achievements.length > 0) {
      rewards.achievements.forEach(achievement => {
        messages.push(`Achievement unlocked: ${achievement}!`);
      });
    }
    
    // Add a congratulatory message at the end
    messages.push('Great job!');
    
    // Queue all the victory messages
    queueVictoryDialog(messages);
  };
  
  return {
    // State
    victoryDialogText,
    victoryDialogQueue,
    isTyping,
    showVictoryTitle,
    victoryRewards,
    hasMoreVictoryDialog,
    
    // Dialog utility functions
    dialogRef,
    
    // Methods
    queueVictoryDialog,
    showNextVictoryDialog,
    onVictoryDialogComplete,
    advanceVictoryDialog,
    clearVictoryDialog,
    showVictory
  };
}