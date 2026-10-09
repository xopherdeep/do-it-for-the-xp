import { computed, ref } from "vue";

/** A line to type out, or a side effect to run when the queue reaches it. */
export type DialogItem = string | (() => void);

export interface BattleDialogOptions {
  playSound: (effect: string) => void;
  /** The queue drained with nothing left on screen. */
  onIdle?: () => void;
  /** The player dismissed the last line on screen. */
  onDismiss?: () => void;
}

/**
 * Earthbound-style message box: lines type out one at a time, the player taps to
 * advance, and "append mode" stacks level-up lines instead of replacing them.
 */
export const useBattleDialog = ({ playSound, onIdle, onDismiss }: BattleDialogOptions) => {
  const text = ref("");
  const queue = ref<DialogItem[]>([]);
  const isTyping = ref(false);
  const hasMore = ref(false);
  const isAppendMode = ref(false);
  const accumulatedLines = ref<string[]>([]);
  const isVictoryMessage = ref(false);
  const typingRef = ref<{ completeTyping?: () => void } | null>(null);

  const isShowing = computed(() => Boolean(text.value) || accumulatedLines.value.length > 0);

  const showNext = () => {
    if (!queue.value.length) {
      text.value = "";
      hasMore.value = false;
      onIdle?.();
      return;
    }
    const next = queue.value.shift() as DialogItem;
    if (typeof next === "function") {
      next();
      showNext();
      return;
    }
    text.value = next;
    isTyping.value = true;
    hasMore.value = queue.value.length > 0;
    playSound("text");
  };

  const enqueue = (items: DialogItem[]) => {
    queue.value.push(...items);
    if (!isTyping.value && !text.value) showNext();
  };

  const onTypingComplete = () => {
    isTyping.value = false;
    if (isAppendMode.value && text.value) {
      accumulatedLines.value.push(text.value);
      text.value = "";
    }
    hasMore.value = queue.value.length > 0;
  };

  const advance = () => {
    if (isTyping.value) {
      typingRef.value?.completeTyping?.();
      isTyping.value = false;
      return;
    }
    if (queue.value.length) {
      showNext();
      return;
    }
    text.value = "";
    onDismiss?.();
  };

  const enableAppendMode = () => {
    isAppendMode.value = true;
    accumulatedLines.value = [];
  };

  const disableAppendMode = () => {
    isAppendMode.value = false;
    accumulatedLines.value = [];
    text.value = "";
  };

  const clear = () => {
    queue.value = [];
    isTyping.value = false;
    hasMore.value = false;
    isVictoryMessage.value = false;
    disableAppendMode();
  };

  return {
    text,
    isTyping,
    hasMore,
    isAppendMode,
    accumulatedLines,
    isVictoryMessage,
    isShowing,
    typingRef,
    enqueue,
    advance,
    onTypingComplete,
    enableAppendMode,
    disableAppendMode,
    clear,
  };
};

export type BattleDialog = ReturnType<typeof useBattleDialog>;
