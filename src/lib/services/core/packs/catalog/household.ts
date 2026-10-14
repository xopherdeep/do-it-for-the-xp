/** The Roommates & household pack: shared chores, supplies and bills for adults living together */
import { definePack, reward } from "./definePack";

export const HOUSEHOLD_PACK = definePack(
  {
    id: "household",
    name: "Roommates & household",
    version: "1.0.0",
    audience: "Roommates and couples",
    description: "The shared kitchen, bathroom and common rooms, plus supplies and bills, split fairly as quests.",
    icon: "couch",
    terms: { member: "Roommate", members: "Roommates", gm: "House Lead" },
  },
  {
    categories: [
      { id: "cat-house-kitchen", name: "The Shared Kitchen" },
      { id: "cat-house-common", name: "Common Rooms" },
      { id: "cat-house-bath", name: "The Bathroom" },
      { id: "cat-house-supplies", name: "Supplies & Bills" },
    ],
    quests: [
      { id: "house-dishes", name: "Defeat the Suds Serpent", categoryId: "cat-house-kitchen", beastId: "beast-suds-serpent", schedule: "daily", difficulty: 2, timesOfDay: ["evening"] },
      { id: "house-unload", name: "Unload the Cupboard Kobold", categoryId: "cat-house-kitchen", beastId: "beast-cupboard-kobold", schedule: "daily", difficulty: 1 },
      { id: "house-stove", name: "Scour the Grease Gorgon", categoryId: "cat-house-kitchen", beastId: "beast-grease-gorgon", schedule: "weekly", difficulty: 2 },
      { id: "house-fridge", name: "Purge the Leftover Lich", categoryId: "cat-house-kitchen", beastId: "beast-leftover-lich", schedule: "weekly", difficulty: 2 },
      { id: "house-trash", name: "Haul off the Garbage Gargoyle", categoryId: "cat-house-kitchen", beastId: "beast-garbage-gargoyle", schedule: "weekly", difficulty: 1 },
      { id: "house-vacuum", name: "Wrangle the Fluffalo", categoryId: "cat-house-common", beastId: "beast-fluffalo", schedule: "weekly", difficulty: 2 },
      { id: "house-couch", name: "Tidy the Cushion Croc", categoryId: "cat-house-common", beastId: "beast-cushion-croc", schedule: "weekly", difficulty: 1 },
      { id: "house-mail", name: "Open the Mailbox Mimic", categoryId: "cat-house-common", beastId: "beast-mailbox-mimic", schedule: "weekly", difficulty: 1 },
      { id: "house-bins", name: "Roll out the Trash Troll", categoryId: "cat-house-common", beastId: "beast-trash-troll", schedule: "weekly", difficulty: 1 },
      { id: "house-toilet", name: "Exorcise the Potty Poltergeist", categoryId: "cat-house-bath", beastId: "beast-potty-poltergeist", schedule: "weekly", difficulty: 3 },
      { id: "house-shower", name: "Scrub away the Mildew Medusa", categoryId: "cat-house-bath", beastId: "beast-mildew-medusa", schedule: "weekly", difficulty: 2 },
      { id: "house-roll", name: "Replace the Bare Roll Imp", categoryId: "cat-house-bath", beastId: "beast-bare-roll-imp", schedule: "weekly", difficulty: 1 },
      { id: "house-groceries", name: "Stock the Pantry Phantom", categoryId: "cat-house-supplies", beastId: "beast-pantry-phantom", schedule: "weekly", difficulty: 2 },
      { id: "house-bills", name: "Settle the Rent and Bills", categoryId: "cat-house-supplies", schedule: "weekly", difficulty: 2, requiresApproval: true },
      { id: "house-meeting", name: "Hold the House Council", categoryId: "cat-house-supplies", schedule: "weekly", difficulty: 1 },
    ],
    dosDonts: [
      { id: "house-do-replace", type: "do", whatFor: "Replacing what you used up", difficulty: 1 },
      { id: "house-do-clean-as-you-go", type: "do", whatFor: "Cleaning as you cook", difficulty: 1 },
      { id: "house-do-heads-up", type: "do", whatFor: "Giving a heads-up before guests come over", difficulty: 1 },
      { id: "house-dont-overnight", type: "dont", whatFor: "Leaving dishes in the sink overnight", difficulty: 2 },
      { id: "house-dont-food", type: "dont", whatFor: "Eating someone else's food without asking", difficulty: 2 },
      { id: "house-dont-noise", type: "dont", whatFor: "Loud noise after quiet hours", difficulty: 2 },
    ],
    rewards: [
      reward("house-reward-movie", "Pick the House Movie", "Choose what everyone watches on movie night.", 100, "film"),
      reward("house-reward-skip", "Skip-a-Chore Ticket", "Someone else takes one of your chores this week.", 200, "ticket-alt"),
      reward("house-reward-takeout", "Takeout Night", "The house orders in, and you pick the place.", 300, "pizza-slice"),
      reward("house-reward-thermostat", "Thermostat Control", "Set the temperature your way for a weekend.", 150, "thermometer-half"),
    ],
    powers: ["irl-snooze", "irl-extra-time", "irl-day-off"],
  }
);
