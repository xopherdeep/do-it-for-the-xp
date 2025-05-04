import { ref, computed } from 'vue';
import { useDialog } from '../../../../hooks/useDialog';
import debug from '@/lib/utils/debug';

/**
 * Hook for managing battle dialog and messages
 * This handles the specialized dialog needs for battle sequences
 */
export function useBattleDialog() {
  // Base dialog functionality
  const { dialogRef, showDialog } = useDialog();

  // Battle dialog state
  const battleDialogText = ref('');
  const battleDialogQueue = ref<string[]>([]);
  const isTyping = ref(false);
  const isVictoryMessage = ref(false);
  const hasMoreBattleDialog = computed(() => battleDialogQueue.value.length > 0);
  
  /**
   * Queue up battle dialog messages
   * @param messages Array of dialog messages to show sequentially
   */
  const queueBattleDialog = (messages: string[]) => {
    debug.log('Queueing battle dialog:', messages);
    battleDialogQueue.value = [...battleDialogQueue.value, ...messages];
    
    if (!isTyping.value && battleDialogText.value === '') {
      showNextBattleDialog();
    }
  };

  /**
   * Display the next message from the battle dialog queue
   */
  const showNextBattleDialog = () => {
    if (battleDialogQueue.value.length === 0) {
      battleDialogText.value = '';
      return;
    }
    
    const nextMessage = battleDialogQueue.value.shift() || '';
    battleDialogText.value = nextMessage;
    isTyping.value = true;
    
    // Reference the XpDialog component if you're using that
    if (dialogRef.value) {
      showDialog('battle');
    }
  };
  
  /**
   * Handle when battle dialog text typing animation completes
   */
  const onBattleDialogComplete = () => {
    isTyping.value = false;
  };
  
  /**
   * Advance to the next dialog message or complete current typing
   */
  const advanceBattleDialog = () => {
    if (isTyping.value) {
      // Complete the current typing animation
      isTyping.value = false;
      
      // If using the XpTypingText component directly, you'd call completeTyping
      // typingRef.value?.completeTyping();
    } else if (hasMoreBattleDialog.value) {
      showNextBattleDialog();
    } else {
      // Clear the current dialog if there's no more to show
      battleDialogText.value = '';
    }
  };

  /**
   * Clear all battle dialogs
   */
  const clearBattleDialog = () => {
    battleDialogQueue.value = [];
    battleDialogText.value = '';
    isTyping.value = false;
  };

  /**
   * Common battle dialog messages
   */
  const showEnemyAttack = (enemyName: string) => {
    queueBattleDialog([`${enemyName} attacks!`]);
  };

  const showPlayerDamage = (damage: number) => {
    queueBattleDialog([`You take ${damage} damage!`]);
  };

  const showPlayerAttack = (attackName = 'attack') => {
    queueBattleDialog([`You use ${attackName}!`]);
  };

  const showEnemyDamage = (enemyName: string, damage: number) => {
    queueBattleDialog([`${enemyName} takes ${damage} damage!`]);
  };

  const showDefend = () => {
    queueBattleDialog(['You take a defensive stance.']);
  };

  const showSpecialAbility = (abilityName: string) => {
    queueBattleDialog([`You use ${abilityName}!`]);
  };

  const showEscapeAttempt = (success: boolean) => {
    if (success) {
      queueBattleDialog(['You escaped successfully!']);
    } else {
      queueBattleDialog(['You failed to escape!']);
    }
  };

  return {
    // State
    battleDialogText,
    battleDialogQueue,
    isTyping,
    hasMoreBattleDialog,
    isVictoryMessage,
    
    // Dialog utility functions
    dialogRef,
    
    // Methods
    queueBattleDialog,
    showNextBattleDialog,
    onBattleDialogComplete,
    advanceBattleDialog,
    clearBattleDialog,
    
    // Common battle message helpers
    showEnemyAttack,
    showPlayerDamage,
    showPlayerAttack,
    showEnemyDamage,
    showDefend,
    showSpecialAbility,
    showEscapeAttempt
  };
}