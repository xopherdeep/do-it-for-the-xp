/**
 * useBattleDialogs
 * 
 * Composable for managing battle dialog queue and display.
 * Extracted from BattleField.ts and BattleGround.ts.
 * 
 * Features:
 * - Dialog message queue (strings and callbacks)
 * - Typing animation state
 * - Skip/advance functionality
 * - Auto-advance after typing complete
 * 
 * @see BattleField.ts (original source - lines 558-647)
 * @see BattleGround.ts (original source - lines 585-693)
 */

import { ref, computed, type Ref } from 'vue';

export interface BattleDialogOptions {
  /** Callback when dialog queue is empty and player turn should start */
  onDialogComplete?: () => void;
  /** Callback to play typing sound */
  onTypingStart?: () => void;
  /** Reference to the XpTypingText component for skip functionality */
  typingComponentRef?: Ref<{ completeTyping?: () => void } | null>;
  /** Delay between messages in ms (default: 1500) */
  messageDelay?: number;
}

export type DialogQueueItem = string | (() => void);

/**
 * Battle dialogs composable
 * 
 * @param options - Configuration and callbacks
 */
export function useBattleDialogs(options: BattleDialogOptions = {}) {
  const { 
    onDialogComplete, 
    onTypingStart,
    typingComponentRef,
    messageDelay = 1500 
  } = options;

  // Dialog state
  const dialogQueue = ref<DialogQueueItem[]>([]);
  const currentDialogText = ref('');
  const isTyping = ref(false);
  const isVictoryMessage = ref(false);

  // Computed
  const hasMoreDialog = computed(() => dialogQueue.value.length > 0);
  const isDialogVisible = computed(() => currentDialogText.value !== '' || isTyping.value);

  /**
   * Queue multiple dialog messages
   * Messages can be strings or callback functions
   */
  function queue(messages: DialogQueueItem[]) {
    // Add messages to the queue
    dialogQueue.value = [...dialogQueue.value, ...messages];
    
    // If no dialog is currently displaying, show the first message
    if (!isTyping.value && currentDialogText.value === '') {
      showNext();
    }
  }

  /**
   * Queue a single message
   */
  function queueSingle(message: DialogQueueItem) {
    queue([message]);
  }

  /**
   * Show the next dialog message from the queue
   */
  function showNext() {
    if (dialogQueue.value.length === 0) {
      // No more messages to show
      currentDialogText.value = '';
      isTyping.value = false;
      
      // Notify that dialog is complete
      onDialogComplete?.();
      return;
    }
    
    // Get the next message or function from the queue
    const next = dialogQueue.value.shift();
    
    // Check if it's a function and execute it
    if (typeof next === 'function') {
      next();
      // Process the next item in the queue
      showNext();
      return;
    }
    
    // It's a string message, so display it
    currentDialogText.value = next || '';
    isTyping.value = true;
    
    // Play typing sound
    onTypingStart?.();
  }

  /**
   * Called when a dialog text finishes typing
   */
  function onTypingComplete() {
    isTyping.value = false;
    
    // Add a standard pause before showing the next message
    setTimeout(() => {
      if (dialogQueue.value.length > 0) {
        showNext();
      }
    }, messageDelay);
  }

  /**
   * Called when the dialog box is clicked
   * Either skips current typing or advances to next message
   */
  function advance() {
    if (isTyping.value) {
      // Complete the current text immediately
      const typingComponent = typingComponentRef?.value;
      if (typingComponent?.completeTyping) {
        typingComponent.completeTyping();
      }
      isTyping.value = false;
    } else if (dialogQueue.value.length > 0) {
      // Show next message
      showNext();
    } else if (currentDialogText.value) {
      // Clear dialog and notify completion
      currentDialogText.value = '';
      onDialogComplete?.();
    }
  }

  /**
   * Skip to the end of all dialogs
   */
  function skipAll() {
    // Execute any callbacks in the queue
    dialogQueue.value.forEach(item => {
      if (typeof item === 'function') {
        item();
      }
    });
    
    // Clear the queue
    dialogQueue.value = [];
    currentDialogText.value = '';
    isTyping.value = false;
    
    onDialogComplete?.();
  }

  /**
   * Clear all dialog state
   */
  function clear() {
    dialogQueue.value = [];
    currentDialogText.value = '';
    isTyping.value = false;
    isVictoryMessage.value = false;
  }

  /**
   * Set victory message styling flag
   */
  function setVictoryMode(enabled: boolean) {
    isVictoryMessage.value = enabled;
  }

  return {
    // State
    dialogQueue,
    currentDialogText,
    isTyping,
    hasMoreDialog,
    isDialogVisible,
    isVictoryMessage,
    
    // Actions
    queue,
    queueSingle,
    showNext,
    onTypingComplete,
    advance,
    skipAll,
    clear,
    setVictoryMode,
  };
}
