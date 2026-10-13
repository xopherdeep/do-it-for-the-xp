/**
 * The beast card's words (XpBeastCardModal, beastCard.ts): the state chip and note, the hint under the steps, the
 * kill-count and due-clock lines and the claim toasts. Beast, tier and button names (Hunt, Claim) stay the same in
 * every voice. A voice that reads the same as adventure is left out: the adventure line is the fallback.
 */
import type { CopyCatalog } from "../voices";

export const beastCard = {
  "beastCard.loading": {
    simple: "Loading...",
    adventure: "Reading the entry...",
    classic: "Loading entry...",
  },
  "beastCard.state.done": {
    simple: "Done!",
    adventure: "Tamed",
  },
  "beastCard.state.pending": {
    simple: "Waiting",
    adventure: "Pending",
  },
  "beastCard.note.done": {
    simple: "Done! The beast is calm.",
    adventure: "Tamed. This beast is calm for now.",
    classic: "Tamed.",
  },
  "beastCard.note.pending": {
    simple: "Waiting for the Game Master.",
    adventure: "Waits for the Game Master to approve.",
    classic: "Awaiting Game Master approval.",
  },
  "beastCard.note.later": {
    simple: "Not time yet.",
    adventure: "Not due yet. It stirs when its time comes.",
    classic: "Not yet due.",
  },
  // The hint under the steps: the card's guide line, read aloud for the simple voice
  "beastCard.hint.claim": {
    simple: "All steps done! Tap Claim.",
    adventure: "Every step is done. Claim your reward.",
    classic: "All steps complete. Claim the reward.",
  },
  "beastCard.hint.hunt": {
    simple: "Tap Hunt. Or check each step.",
    adventure: "Hunt it down, or check off every step to claim.",
    classic: "Hunt, or check every step to claim.",
  },
  "beastCard.tamed.never": {
    simple: "Not done yet",
    adventure: "Never tamed",
  },
  "beastCard.tamed.one": {
    simple: "Done 1 time",
    adventure: "Tamed 1 time",
    classic: "Tamed: 1",
  },
  "beastCard.tamed.many": {
    simple: "Done {n} times",
    adventure: "Tamed {n} times",
    classic: "Tamed: {n}",
  },
  "beastCard.due.left": {
    simple: "Due {label}",
    adventure: "Due {label} · {left} left",
  },
  "beastCard.due.later": {
    adventure: "Due {label}",
  },
  "beastCard.due.notYet": {
    adventure: "Not due yet",
  },
  "beastCard.due.overdue": {
    simple: "Late! Due {label}",
    adventure: "Overdue · was due {label}",
  },
  "beastCard.due.anytime": {
    simple: "Do it any time today.",
    adventure: "Anytime today",
  },

  // Toasts
  "beastCard.toast.sent": {
    simple: "Sent to the Game Master",
    adventure: "Sent to the Game Master for approval",
    classic: "Awaiting Game Master approval",
  },
  "beastCard.toast.tamed": {
    simple: "{nick} did it!",
    adventure: "{nick} tamed {quest}!",
    classic: "{quest} tamed.",
  },
  "beastCard.toast.loot": {
    simple: "+{xp} XP +{gp} GP +{ap} AP",
    adventure: "+{xp} XP · +{gp} GP · +{ap} AP",
  },
  "beastCard.toast.levelUp": {
    simple: "Level up! Now level {level}",
    adventure: "LEVEL UP! Now level {level}",
    classic: "Level {level} reached.",
  },
  "beastCard.error.log": {
    simple: "Could not save. Try again.",
    adventure: "The quest log did not respond. Try again.",
    classic: "Quest log unavailable. Try again.",
  },
} satisfies CopyCatalog;
