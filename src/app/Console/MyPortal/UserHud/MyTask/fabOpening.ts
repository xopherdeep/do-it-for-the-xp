/**
 * The hero's fab opens its buttons (Fight!, Claim, Magic, Goods, Run) by itself a moment after the quest card
 * appears. A hero who taps the avatar just then means "go": toggling would shut the menu they were about to use.
 * Inside this window after the menu opened, that tap runs the primary action instead.
 */
export const FAB_OPENING_MS = 1500;

/** True while the menu that opened by itself at `openedAt` is still opening; 0 means it has not opened yet. */
export const isFabOpening = (openedAt: number, now: number, openingMs: number = FAB_OPENING_MS): boolean =>
  openedAt > 0 && now >= openedAt && now - openedAt < openingMs;
