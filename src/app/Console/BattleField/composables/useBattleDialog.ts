import { computed, onUnmounted, ref } from "vue";
import type { DialogLine, EngineMessage } from "../battle/battleView";

/** A line to type out (tap-gated, or auto-advancing), or a side effect to run when the queue reaches it. */
export type DialogItem = EngineMessage | (() => void);

export interface BattleDialogOptions {
  /** The queue drained with nothing left on screen. */
  onIdle?: () => void;
  /** The player dismissed the last line on screen. */
  onDismiss?: () => void;
}

/** Auto lines linger long enough to be read: 35 ms a character, at least 1.5 s. */
export const autoAdvanceDelay = (text: string): number => Math.max(1500, 35 * text.length);

const toLine = (item: EngineMessage): DialogLine => (typeof item === "string" ? { text: item } : item);

/** Side effects are not something to read: the caret only promises another line. */
const hasLinesAhead = (items: DialogItem[]): boolean => items.some((item) => typeof item !== "function");

/**
 * Earthbound-style message box: lines type out one at a time, the player taps to
 * advance, and "append mode" stacks level-up lines instead of replacing them.
 * Result lines (a chore landing, "Running away...") move on by themselves once typed.
 */
export const useBattleDialog = ({ onIdle, onDismiss }: BattleDialogOptions = {}) => {
  const text = ref("");
  const queue = ref<DialogItem[]>([]);
  const isTyping = ref(false);
  const hasMore = ref(false);
  const isAppendMode = ref(false);
  const accumulatedLines = ref<string[]>([]);
  const isVictoryMessage = ref(false);
  const typingRef = ref<{ completeTyping?: () => void } | null>(null);
  let currentAuto = false;
  let autoTimer: number | undefined;

  const isShowing = computed(() => Boolean(text.value) || accumulatedLines.value.length > 0);

  const cancelAuto = () => {
    window.clearTimeout(autoTimer);
    autoTimer = undefined;
  };

  const showNext = () => {
    cancelAuto();
    const isQueueEmpty = queue.value.length === 0;
    if (isQueueEmpty) {
      text.value = "";
      hasMore.value = false;
      currentAuto = false;
      onIdle?.();
      return;
    }
    const next = queue.value.shift() as DialogItem;
    const isQueuedAction = typeof next === "function";
    if (isQueuedAction) {
      next();
      showNext();
      return;
    }
    const line = toLine(next);
    text.value = line.text;
    currentAuto = Boolean(line.auto);
    isTyping.value = true;
    hasMore.value = false; // shown once the line has finished typing
  };

  const enqueue = (items: DialogItem[]) => {
    queue.value.push(...items);
    const isDialogIdle = !isTyping.value && !text.value;
    if (isDialogIdle) showNext();
  };

  /** Finishing a line: either keep it on screen until a tap, or move on by itself. */
  const advanceAfterRead = () => {
    const hasQueuedItems = queue.value.length > 0;
    if (hasQueuedItems) {
      showNext();
      return;
    }
    text.value = "";
    currentAuto = false;
    onDismiss?.();
  };

  const onTypingComplete = () => {
    isTyping.value = false;
    const shouldStashLine = isAppendMode.value && Boolean(text.value);
    if (shouldStashLine) {
      accumulatedLines.value.push(text.value);
      text.value = "";
    }
    hasMore.value = hasLinesAhead(queue.value);
    if (currentAuto) {
      cancelAuto();
      autoTimer = window.setTimeout(advanceAfterRead, autoAdvanceDelay(text.value || accumulatedLines.value.at(-1) || ""));
    }
  };

  const advance = () => {
    if (isTyping.value) {
      typingRef.value?.completeTyping?.();
      isTyping.value = false;
      return;
    }
    cancelAuto();
    advanceAfterRead();
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
    cancelAuto();
    queue.value = [];
    isTyping.value = false;
    hasMore.value = false;
    isVictoryMessage.value = false;
    currentAuto = false;
    disableAppendMode();
  };

  onUnmounted(cancelAuto);

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
