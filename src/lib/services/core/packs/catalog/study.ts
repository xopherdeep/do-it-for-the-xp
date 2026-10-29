/** The Study & exam prep pack: steady study habits and an exam run-up for teens and students */
import { gpForDollars } from "@/lib/services/gp/exchangeRate";
import { definePack, reward } from "./definePack";

export const STUDY_PACK = definePack(
  {
    id: "study",
    name: "Study & exam prep",
    version: "1.1.0",
    audience: "Teens and college students",
    description: "Daily study blocks, flashcards, practice tests and good sleep, so exam week is a boss fight you are ready for.",
    icon: "book-reader",
    terms: { member: "Scholar", members: "Scholars", gm: "Study Coach" },
  },
  {
    categories: [
      { id: "cat-study-daily", name: "Daily Study" },
      { id: "cat-study-exam", name: "Exam Prep" },
      { id: "cat-study-focus", name: "Focus & Rest" },
    ],
    quests: [
      { id: "study-homework", name: "Behead the Homework Hydra", categoryId: "cat-study-daily", beastId: "beast-homework-hydra", schedule: "daily", difficulty: 2 },
      { id: "study-reading", name: "Feed the Bookwyrm (read a chapter)", categoryId: "cat-study-daily", beastId: "beast-bookwyrm", schedule: "daily", difficulty: 1 },
      { id: "study-flashcards", name: "Answer the Sum Sphinx (flashcards)", categoryId: "cat-study-daily", beastId: "beast-sum-sphinx", schedule: "daily", difficulty: 1 },
      { id: "study-notes", name: "Tame the Desk Drake (sort your notes)", categoryId: "cat-study-daily", beastId: "beast-desk-drake", schedule: "weekly", difficulty: 1 },
      { id: "study-bag", name: "Pack the Backpack Boggart", categoryId: "cat-study-daily", beastId: "beast-backpack-boggart", schedule: "daily", difficulty: 1, timesOfDay: ["night"] },
      { id: "study-block", name: "Banish the Pop Quiz Poltergeist (study block)", categoryId: "cat-study-exam", beastId: "beast-pop-quiz-poltergeist", schedule: "daily", difficulty: 2 },
      { id: "study-practice", name: "Survive a Practice Test", categoryId: "cat-study-exam", schedule: "weekly", difficulty: 3, requiresApproval: true },
      { id: "study-office-hours", name: "Seek the Sage (office hours or tutor)", categoryId: "cat-study-exam", schedule: "weekly", difficulty: 2 },
      { id: "study-group", name: "Gather the Study Guild", categoryId: "cat-study-exam", schedule: "weekly", difficulty: 2 },
      { id: "study-plan", name: "Chart the Week's Map", categoryId: "cat-study-exam", schedule: "weekly", difficulty: 1 },
      { id: "study-phone", name: "Silence the Scroll Troll (phone away)", categoryId: "cat-study-focus", beastId: "beast-scroll-troll", schedule: "daily", difficulty: 1 },
      { id: "study-move", name: "Outpace the Couch Potato (move between blocks)", categoryId: "cat-study-focus", beastId: "beast-couch-potato", schedule: "daily", difficulty: 1 },
      { id: "study-sleep", name: "Pacify the Night Owlbear", categoryId: "cat-study-focus", beastId: "beast-night-owlbear", schedule: "daily", difficulty: 1, timesOfDay: ["night"] },
    ],
    dosDonts: [
      { id: "study-do-early", type: "do", whatFor: "Starting an assignment the day it is set", difficulty: 2 },
      { id: "study-do-ask", type: "do", whatFor: "Asking a question you were stuck on", difficulty: 1 },
      { id: "study-do-teach", type: "do", whatFor: "Explaining a topic to someone else", difficulty: 2 },
      { id: "study-dont-cram", type: "dont", whatFor: "Pulling an all-nighter", difficulty: 3 },
      { id: "study-dont-phone", type: "dont", whatFor: "Phone out during a study block", difficulty: 1 },
    ],
    rewards: [
      reward("study-reward-snack", "Study Break Snack", "A favorite snack for a well-earned break.", gpForDollars(3), "cookie"), // about $3
      reward("study-reward-notebook", "New Notebook Set", "Fresh notebooks, pens or highlighters.", gpForDollars(12), "pencil-alt"), // about $12
      reward("study-reward-game", "Guilt-free Game Night", "An evening of games once the week's study is done.", 200, "gamepad"),
      reward("study-reward-movie", "After-exam Movie", "A trip to the movies when the exam is over.", gpForDollars(20), "film"), // about $20
    ],
    powers: [
      "irl-extra-time",
      "irl-quiet-day",
      "irl-timed-game-break",
      "irl-timed-scroll-break",
      "irl-timed-episode-break",
      "irl-timed-power-nap",
    ],
  }
);
