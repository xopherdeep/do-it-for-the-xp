/** The Classroom pack: classwork, reading and class jobs for a teacher running the game for their students */
import { definePack, reward } from "./definePack";

export const CLASSROOM_PACK = definePack(
  {
    id: "classroom",
    name: "Classroom",
    version: "1.1.0",
    audience: "Teachers and their class",
    description: "Homework streaks, reading time, class jobs and kindness quests, with class rules as Dos and Don'ts.",
    icon: "chalkboard-teacher",
    terms: { member: "Student", members: "Students", gm: "Teacher" },
  },
  {
    categories: [
      { id: "cat-class-work", name: "Classwork" },
      { id: "cat-class-reading", name: "The Reading Corner" },
      { id: "cat-class-crew", name: "Classroom Crew" },
      { id: "cat-class-kindness", name: "Kindness Quests" },
    ],
    quests: [
      { id: "class-homework", name: "Behead the Homework Hydra", categoryId: "cat-class-work", beastId: "beast-homework-hydra", schedule: "daily", difficulty: 2 },
      { id: "class-math", name: "Solve the Sum Sphinx's Riddles", categoryId: "cat-class-work", beastId: "beast-sum-sphinx", schedule: "daily", difficulty: 1 },
      { id: "class-quiz", name: "Prepare for the Pop Quiz Poltergeist", categoryId: "cat-class-work", beastId: "beast-pop-quiz-poltergeist", schedule: "weekly", difficulty: 3, requiresApproval: true },
      { id: "class-papers", name: "Deliver the Paperwork Pixie", categoryId: "cat-class-work", beastId: "beast-paperwork-pixie", schedule: "daily", difficulty: 1 },
      { id: "class-reading", name: "Feed the Bookwyrm", categoryId: "cat-class-reading", beastId: "beast-bookwyrm", schedule: "daily", difficulty: 1 },
      { id: "class-book-report", name: "Scribe a Book Report", categoryId: "cat-class-reading", schedule: "weekly", difficulty: 3, requiresApproval: true },
      { id: "class-library", name: "Visit the Great Library", categoryId: "cat-class-reading", schedule: "weekly", difficulty: 1 },
      { id: "class-desk", name: "Tame the Desk Drake", categoryId: "cat-class-crew", beastId: "beast-desk-drake", schedule: "daily", difficulty: 1 },
      { id: "class-backpack", name: "Pack the Backpack Boggart", categoryId: "cat-class-crew", beastId: "beast-backpack-boggart", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
      { id: "class-shelf", name: "Help the Shelf Elf", categoryId: "cat-class-crew", beastId: "beast-shelf-elf", schedule: "weekly", difficulty: 1 },
      { id: "class-litter", name: "Chase the Litter Imp from the Playground", categoryId: "cat-class-crew", beastId: "beast-litter-imp", schedule: "weekly", difficulty: 2 },
      { id: "class-line-leader", name: "Lead the Line", categoryId: "cat-class-crew", schedule: "weekly", difficulty: 1 },
      { id: "class-kind", name: "Cheer up the Grump Goblin", categoryId: "cat-class-kindness", beastId: "beast-grump-goblin", schedule: "daily", difficulty: 1 },
      { id: "class-new-friend", name: "Welcome a New Ally", categoryId: "cat-class-kindness", schedule: "weekly", difficulty: 2 },
      { id: "class-music", name: "Charm the Sour Note Siren", categoryId: "cat-class-kindness", beastId: "beast-sour-note-siren", schedule: "weekly", difficulty: 2 },
    ],
    dosDonts: [
      { id: "class-do-hand", type: "do", whatFor: "Raising your hand to speak", difficulty: 1 },
      { id: "class-do-help", type: "do", whatFor: "Helping a classmate who is stuck", difficulty: 2 },
      { id: "class-do-tidy", type: "do", whatFor: "Cleaning up your station without being asked", difficulty: 1 },
      { id: "class-do-on-time", type: "do", whatFor: "Handing work in on time", difficulty: 2 },
      { id: "class-dont-shout", type: "dont", whatFor: "Shouting out over others", difficulty: 1 },
      { id: "class-dont-run", type: "dont", whatFor: "Running in the halls", difficulty: 1 },
      { id: "class-dont-phone", type: "dont", whatFor: "Using a phone during lessons", difficulty: 2 },
      { id: "class-dont-unkind", type: "dont", whatFor: "Leaving someone out on purpose", difficulty: 3 },
    ],
    rewards: [
      reward("class-reward-sticker", "Sticker Pick", "Choose a sticker from the treasure box.", 40, "star"),
      reward("class-reward-friend-seat", "Sit by a Friend", "Sit next to a friend for a whole day.", 100, "user-friends"),
      reward("class-reward-homework-pass", "Homework Pass", "Skip one homework assignment, teacher's choice of which.", 150, "ticket-alt"),
      reward("class-reward-class-game", "Pick the Class Game", "Choose the game the class plays at the end of the week.", 200, "dice"),
      reward("class-reward-lunch", "Lunch with the Teacher", "Eat lunch in the classroom with the teacher and a friend.", 300, "utensils"),
    ],
    powers: [
      "irl-extra-time",
      "irl-snooze",
      "irl-timed-free-choice",
      "irl-timed-learning-games",
      "irl-timed-headphones",
      "irl-timed-sit-anywhere",
      "irl-timed-extra-recess",
      "irl-timed-teachers-chair",
    ],
  }
);
