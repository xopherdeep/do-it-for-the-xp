/** The Homeschool pack: a school day at home, with lessons, projects and routine for a parent who teaches */
import { gpForDollars } from "@/lib/services/gp/exchangeRate";
import { definePack, reward } from "./definePack";

export const HOMESCHOOL_PACK = definePack(
  {
    id: "homeschool",
    name: "Homeschool",
    version: "1.1.0",
    audience: "Homeschooling families",
    description: "Core lessons, science and art projects, life skills and a school-day routine for kids learning at home.",
    icon: "school",
    terms: { member: "Student", members: "Students", gm: "Teacher" },
  },
  {
    categories: [
      { id: "cat-hs-core", name: "Core Lessons" },
      { id: "cat-hs-explore", name: "Explore & Create" },
      { id: "cat-hs-life", name: "Life Skills" },
      { id: "cat-hs-routine", name: "School Day Routine" },
    ],
    quests: [
      { id: "hs-math", name: "Solve the Sum Sphinx's Riddles", categoryId: "cat-hs-core", beastId: "beast-sum-sphinx", schedule: "daily", difficulty: 2 },
      { id: "hs-reading", name: "Feed the Bookwyrm", categoryId: "cat-hs-core", beastId: "beast-bookwyrm", schedule: "daily", difficulty: 1 },
      { id: "hs-writing", name: "Fill a Page of the Chronicle", categoryId: "cat-hs-core", schedule: "daily", difficulty: 1 },
      { id: "hs-show-work", name: "Present the Paperwork Pixie", categoryId: "cat-hs-core", beastId: "beast-paperwork-pixie", schedule: "daily", difficulty: 1, timesOfDay: ["evening"] },
      { id: "hs-science", name: "Run an Alchemy Experiment", categoryId: "cat-hs-explore", schedule: "weekly", difficulty: 3, requiresApproval: true },
      { id: "hs-history", name: "Explore the Ancient Map", categoryId: "cat-hs-explore", schedule: "weekly", difficulty: 2 },
      { id: "hs-art", name: "Paint a Masterwork", categoryId: "cat-hs-explore", schedule: "weekly", difficulty: 2 },
      { id: "hs-music", name: "Charm the Sour Note Siren", categoryId: "cat-hs-explore", beastId: "beast-sour-note-siren", schedule: "daily", difficulty: 1 },
      { id: "hs-field-trip", name: "Venture on a Field Trip", categoryId: "cat-hs-explore", schedule: "weekly", difficulty: 3 },
      { id: "hs-cook", name: "Assist the Simmer Salamander", categoryId: "cat-hs-life", beastId: "beast-simmer-salamander", schedule: "weekly", difficulty: 2 },
      { id: "hs-pe", name: "Outpace the Couch Potato (recess and PE)", categoryId: "cat-hs-life", beastId: "beast-couch-potato", schedule: "daily", difficulty: 1, timesOfDay: ["noon"] },
      { id: "hs-dressed", name: "Consult the Pajama Pooka", categoryId: "cat-hs-routine", beastId: "beast-pajama-pooka", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
      { id: "hs-breakfast", name: "Feed the Hangry Hob", categoryId: "cat-hs-routine", beastId: "beast-hangry-hob", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
      { id: "hs-desk", name: "Tame the Desk Drake", categoryId: "cat-hs-routine", beastId: "beast-desk-drake", schedule: "daily", difficulty: 1, timesOfDay: ["evening"] },
    ],
    dosDonts: [
      { id: "hs-do-self-start", type: "do", whatFor: "Starting a lesson without a reminder", difficulty: 2 },
      { id: "hs-do-help-sibling", type: "do", whatFor: "Helping a sibling with their lesson", difficulty: 2 },
      { id: "hs-do-curious", type: "do", whatFor: "Asking a curious question", difficulty: 1 },
      { id: "hs-dont-rush", type: "dont", whatFor: "Rushing through work to be done", difficulty: 1 },
      { id: "hs-dont-grumble", type: "dont", whatFor: "Grumbling about a subject before trying it", difficulty: 1 },
    ],
    rewards: [
      reward("hs-reward-recess", "Extra Recess", "Fifteen more minutes of recess.", 80, "running"),
      reward("hs-reward-library", "Library Trip", "A trip to the library to pick new books.", 100, "book-open"),
      reward("hs-reward-order", "Choose the Subject Order", "Decide the order of tomorrow's lessons.", 120, "list-ol"),
      reward("hs-reward-field-trip", "Pick the Field Trip", "Choose the next field trip: museum, zoo, park or farm.", gpForDollars(30), "map-marked-alt"), // about $30
    ],
    powers: [
      "irl-extra-time",
      "irl-bards-pick",
      "irl-timed-recess-plus",
      "irl-timed-learning-games",
      "irl-timed-headphones",
      "irl-timed-free-choice",
      "irl-timed-game-on",
    ],
  }
);
