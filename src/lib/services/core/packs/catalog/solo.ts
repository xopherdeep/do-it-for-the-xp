/** The Solo adult habits pack: a grown-up running the game for themselves, from morning routine to money admin */
import { definePack, reward } from "./definePack";

export const SOLO_PACK = definePack(
  {
    id: "solo",
    name: "Solo adult habits",
    version: "1.0.0",
    audience: "Adults on their own",
    description: "Morning routine, home upkeep, health, money and growth habits for one adventurer playing solo.",
    icon: "hiking",
    terms: { member: "Adventurer", members: "Adventurers", gm: "Game Master" },
  },
  {
    categories: [
      { id: "cat-solo-routine", name: "Daily Routine" },
      { id: "cat-solo-home", name: "Home Base" },
      { id: "cat-solo-health", name: "Health" },
      { id: "cat-solo-admin", name: "Money & Admin" },
      { id: "cat-solo-growth", name: "Growth & Friends" },
    ],
    quests: [
      { id: "solo-wake", name: "Rouse the Snooze Sloth", categoryId: "cat-solo-routine", beastId: "beast-snooze-sloth", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
      { id: "solo-bed", name: "Smooth the Bed Basilisk", categoryId: "cat-solo-routine", beastId: "beast-bed-basilisk", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
      { id: "solo-screen", name: "Silence the Scroll Troll", categoryId: "cat-solo-routine", beastId: "beast-scroll-troll", schedule: "daily", difficulty: 1, timesOfDay: ["night"] },
      { id: "solo-dishes", name: "Defeat the Suds Serpent", categoryId: "cat-solo-home", beastId: "beast-suds-serpent", schedule: "daily", difficulty: 1, timesOfDay: ["evening"] },
      { id: "solo-laundry", name: "Corner the Laundry Lurker", categoryId: "cat-solo-home", beastId: "beast-laundry-lurker", schedule: "weekly", difficulty: 2 },
      { id: "solo-fold", name: "Flatten the Wrinkle Wyvern", categoryId: "cat-solo-home", beastId: "beast-wrinkle-wyvern", schedule: "weekly", difficulty: 1 },
      { id: "solo-trash", name: "Haul off the Garbage Gargoyle", categoryId: "cat-solo-home", beastId: "beast-garbage-gargoyle", schedule: "weekly", difficulty: 1 },
      { id: "solo-plants", name: "Quench the Droop Dryad", categoryId: "cat-solo-home", beastId: "beast-droop-dryad", schedule: "weekly", difficulty: 1 },
      { id: "solo-move", name: "Outpace the Couch Potato", categoryId: "cat-solo-health", beastId: "beast-couch-potato", schedule: "daily", difficulty: 2 },
      { id: "solo-water", name: "Chug the Elixir of Life", categoryId: "cat-solo-health", schedule: "daily", difficulty: 1, timesOfDay: ["morning", "noon"] },
      { id: "solo-cook", name: "Cook with the Simmer Salamander", categoryId: "cat-solo-health", beastId: "beast-simmer-salamander", schedule: "weekly", difficulty: 2 },
      { id: "solo-sleep", name: "Pacify the Night Owlbear", categoryId: "cat-solo-health", beastId: "beast-night-owlbear", schedule: "daily", difficulty: 1, timesOfDay: ["night"] },
      { id: "solo-budget", name: "Review the Treasury", categoryId: "cat-solo-admin", schedule: "weekly", difficulty: 2 },
      { id: "solo-mail", name: "Open the Mailbox Mimic", categoryId: "cat-solo-admin", beastId: "beast-mailbox-mimic", schedule: "weekly", difficulty: 1 },
      { id: "solo-read", name: "Feed the Bookwyrm", categoryId: "cat-solo-growth", beastId: "beast-bookwyrm", schedule: "daily", difficulty: 1, timesOfDay: ["night"] },
      { id: "solo-friend", name: "Send a Raven to a Friend", categoryId: "cat-solo-growth", schedule: "weekly", difficulty: 1 },
    ],
    dosDonts: [
      { id: "solo-do-cook", type: "do", whatFor: "Cooking at home instead of ordering in", difficulty: 1 },
      { id: "solo-do-walk", type: "do", whatFor: "Walking or biking instead of driving", difficulty: 1 },
      { id: "solo-do-save", type: "do", whatFor: "Putting money into savings", difficulty: 2 },
      { id: "solo-dont-doomscroll", type: "dont", whatFor: "Doomscrolling in bed", difficulty: 1 },
      { id: "solo-dont-impulse", type: "dont", whatFor: "An impulse buy you didn't plan", difficulty: 2 },
    ],
    rewards: [
      reward("solo-reward-coffee", "Fancy Coffee", "The good coffee from the café.", 60, "coffee"),
      reward("solo-reward-book", "A New Book", "A book you've been wanting.", 150, "book"),
      reward("solo-reward-takeout", "Takeout Night", "Order in from your favorite place.", 250, "pizza-slice"),
      reward("solo-reward-movie", "Night at the Movies", "A movie at the theater, snacks included.", 300, "film"),
      reward("solo-reward-treat", "Treat Yourself", "Something you've had your eye on.", 600, "gift"),
    ],
    powers: ["irl-day-off", "irl-snooze", "irl-extra-time"],
  }
);
