/**
 * The Quest Wizard's words (XpQuestWizardModal, questWizard.ts): the guide line on each screen, the small headings,
 * the notes and the toasts. Chore, beast, size and part-of-day names stay the same in every voice.
 */
import type { CopyCatalog } from "../voices";

export const questWizard = {
  // The guide asks one question per screen; the simple voice reads it aloud
  "questWizard.guide.what": {
    simple: "Pick a chore.",
    adventure: "Which beast is bugging you?",
    classic: "Select a chore.",
  },
  "questWizard.guide.steps": {
    simple: "Add the steps. Or skip.",
    adventure: "Plan the attack. What are the steps?",
    classic: "List the steps. Optional.",
  },
  "questWizard.guide.when": {
    simple: "When does it happen?",
    adventure: "When does the beast strike?",
    classic: "Set the schedule.",
  },
  "questWizard.guide.size": {
    simple: "How big is the chore?",
    adventure: "How big is this beast?",
    classic: "Set the size.",
  },
  "questWizard.guide.who": {
    simple: "Who will do it?",
    adventure: "Who is brave enough to fight it?",
    classic: "Assign a hero.",
  },
  "questWizard.guide.ready": {
    simple: "Ready? Tap Summon!",
    adventure: "Ready to summon it?",
    classic: "Confirm and summon.",
  },

  "questWizard.what.own": {
    simple: "My own chore",
    adventure: "Something else",
    classic: "Custom",
  },
  "questWizard.what.searchPlaceholder": {
    simple: "Type a chore",
    adventure: "Search or type a chore",
    classic: "Search or enter a chore",
  },
  "questWizard.what.noMatch": {
    simple: "No picture yet. Use the first tile.",
    adventure: "No picture for that yet. The first tile makes it a new beast.",
    classic: "No match. The first tile adds a new entry.",
  },
  "questWizard.steps.none": {
    simple: "No steps. The chore is 1 step.",
    adventure: "No steps. The whole chore is one step.",
    classic: "No steps. The chore counts as one step.",
  },
  "questWizard.when.time": {
    simple: "What time?",
    adventure: "What time?",
    classic: "Time of day",
  },
  "questWizard.size.earn": {
    simple: "You get",
    adventure: "Your loot",
    classic: "Rewards",
  },
  "questWizard.ready.kidNote": {
    simple: "The Game Master checks it after.",
    adventure: "The Game Master checks it when you finish.",
    classic: "Requires Game Master approval on completion.",
  },
  "questWizard.summon": {
    simple: "Summon!",
    adventure: "Summon!",
    classic: "Summon",
  },

  "questWizard.fanfare.title": {
    simple: "New quest!",
    adventure: "A new quest joins the log!",
    classic: "Quest added to the log.",
  },
  "questWizard.fanfare.action": {
    simple: "Accept",
    adventure: "Accept quest",
    classic: "Accept quest",
  },

  // Toasts
  "questWizard.problem.noChore": {
    simple: "Pick a chore first.",
    adventure: "Pick a chore or type its name",
    classic: "Select a chore or enter a name.",
  },
  "questWizard.error.notSaved": {
    simple: "It did not save. Try again.",
    adventure: "The beast slipped away! The quest did not save. Try again.",
    classic: "The quest did not save. Try again.",
  },
  "questWizard.toast.header": {
    simple: "New quest!",
    adventure: "New quest!",
    classic: "Quest added.",
  },
  "questWizard.toast.approval": {
    simple: "{name}. The Game Master checks it after.",
    adventure: "{name}: the Game Master checks it when you finish.",
    classic: "{name}. Awaiting Game Master approval.",
  },
} satisfies CopyCatalog;
