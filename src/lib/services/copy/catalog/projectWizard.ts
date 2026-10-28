/**
 * The Start a Project wizard's words (XpProjectWizardModal, projectWizard.ts, the Packs card): the guide on each step,
 * the reasons Next is shut, the small headings and the toasts. Project, tower, phase, room and hero names stay the same
 * in every voice, and so does a plain step title.
 */
import type { CopyCatalog } from "../voices";

export const projectWizard = {
  "projectWizard.title": { adventure: "Start a Project" },

  // The Packs card that opens the wizard
  "projectWizard.card.title": { adventure: "Family projects" },
  "projectWizard.card.subtitle": { adventure: "Spring Cleaning, Moving Out" },
  "projectWizard.card.body": {
    adventure: "Turn a big job into a tower: a floor for each stage, a boss on the roof and a prize at the end.",
  },
  "projectWizard.card.action": { adventure: "Start a project" },

  // The steps: a plain title for the dot, and the guide's question (the simple voice is read aloud)
  "projectWizard.step.type": { adventure: "The project" },
  "projectWizard.step.house": { adventure: "The house" },
  "projectWizard.step.chores": { adventure: "The chores" },
  "projectWizard.step.dates": { adventure: "The dates" },
  "projectWizard.step.build": { adventure: "Build" },

  "projectWizard.guide.type": {
    simple: "Pick a big project.",
    adventure: "Which tower shall we raise?",
    classic: "Select a project.",
  },
  "projectWizard.guide.house": {
    simple: "Which rooms does your home have?",
    adventure: "Which rooms are in your castle?",
    classic: "Set the rooms in the house.",
  },
  "projectWizard.guide.chores": {
    simple: "Check the chores on each floor.",
    adventure: "Review the beasts on each floor.",
    classic: "Review the chores on each floor.",
  },
  "projectWizard.guide.dates": {
    simple: "When does it end? What is the prize?",
    adventure: "When does the quest end, and what is the prize?",
    classic: "Set the end date and the family reward.",
  },
  "projectWizard.guide.build": {
    simple: "Ready? Tap Build!",
    adventure: "Ready to raise the tower?",
    classic: "Confirm and build.",
  },

  // Why Next is shut: one line, in the Game Master's reading voice
  "projectWizard.problem.house": {
    simple: "Pick at least 1 room.",
    adventure: "Pick at least one room for the tower.",
    classic: "Select at least one room.",
  },
  "projectWizard.problem.floor": {
    simple: "{phase} needs a chore.",
    adventure: "The {phase} floor needs a chore.",
    classic: "{phase} has no chores.",
  },
  "projectWizard.problem.name": {
    simple: "Give each chore a name.",
    adventure: "Every beast needs a name.",
    classic: "Name every chore.",
  },
  "projectWizard.problem.date": {
    simple: "Pick a real date.",
    adventure: "That is not a real day.",
    classic: "Enter a valid date.",
  },
  "projectWizard.problem.tooSoon": {
    simple: "Pick {date} or later.",
    adventure: "Every floor needs a day. Pick {date} or later.",
    classic: "The earliest end date is {date}.",
  },
  "projectWizard.problem.reward": {
    simple: "Name the family prize.",
    adventure: "What is the family's prize?",
    classic: "Enter the family reward.",
  },

  // 1. The project
  "projectWizard.type.meta": {
    simple: "{floors} floors. {days} days.",
    adventure: "{floors} floors and a roof, {days} days",
    classic: "{floors} floors and a roof, {days} days.",
  },
  "projectWizard.type.rerun": {
    simple: "Same chores as last time. Change what you like.",
    adventure: "Started from your last run. Change anything you like.",
    classic: "Loaded from the last run. All of it can be edited.",
  },

  // 2. The house
  "projectWizard.house.rooms": { adventure: "Rooms in the home" },
  "projectWizard.house.fewer": { adventure: "Fewer" },
  "projectWizard.house.more": { adventure: "More" },
  "projectWizard.house.basement": { adventure: "Storage is a basement" },

  // 3. The chores
  "projectWizard.chores.count": {
    simple: "{count} chores",
    adventure: "{count} chores",
    classic: "{count} chores",
  },
  "projectWizard.chores.roof": { adventure: "The roof" },
  "projectWizard.chores.roofNote": {
    simple: "The last boss.",
    adventure: "The final boss waits up here.",
    classic: "The final chore.",
  },
  "projectWizard.chores.add": { adventure: "Add a chore" },
  "projectWizard.chores.newName": { adventure: "New chore" },
  "projectWizard.chores.name": { adventure: "Chore name" },
  "projectWizard.chores.size": { adventure: "Size of {name}" },
  "projectWizard.chores.who": { adventure: "Who does {name}" },
  "projectWizard.chores.drop": { adventure: "Drop {name}" },
  "projectWizard.chores.nobody": { adventure: "Nobody" },
  "projectWizard.chores.everyone": { adventure: "Everyone" },

  // 4. The dates and the reward
  "projectWizard.dates.endLabel": { adventure: "Last day" },
  "projectWizard.dates.rewardLabel": { adventure: "Family reward" },
  "projectWizard.dates.rewardPlaceholder": { adventure: "Pizza night at the new house" },
  "projectWizard.dates.window": { adventure: "{phase}: {from} to {to}" },
  "projectWizard.dates.windowDay": { adventure: "{phase}: {day}" },

  // 5. Build
  "projectWizard.build.verb": { adventure: "Build" },
  "projectWizard.build.floors": {
    simple: "{floors} floors and a roof",
    adventure: "{floors} floors and a roof",
    classic: "{floors} floors and a roof",
  },
  "projectWizard.build.chores": { adventure: "{count} chores" },
  "projectWizard.build.ends": { adventure: "Ends {date}" },
  "projectWizard.build.reward": { adventure: "Reward: {text}" },

  // A project already running
  "projectWizard.blocked": {
    simple: "Finish or abandon {name} first.",
    adventure: "Finish or abandon {name} first.",
    classic: "Finish or abandon {name} first.",
  },
  "projectWizard.blocked.close": { adventure: "Close" },

  // After Build
  "projectWizard.built": {
    simple: "{tower} is built! Find it in Hometown.",
    adventure: "{tower} rises in Hometown!",
    classic: "{tower} is built. It is in Hometown.",
  },
  "projectWizard.failed": {
    simple: "The tower did not build. Try again.",
    adventure: "The tower could not be raised. Try again.",
    classic: "The build failed. Try again.",
  },
} satisfies CopyCatalog;
