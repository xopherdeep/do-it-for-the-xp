/** The Fitness pack: movement, food, water and sleep as daily quests for anyone getting in shape */
import { gpForDollars } from "@/lib/services/gp/exchangeRate";
import { definePack, reward } from "./definePack";

export const FITNESS_PACK = definePack(
  {
    id: "fitness",
    name: "Fitness",
    version: "1.1.0",
    audience: "Anyone getting active",
    description: "Steps, workouts, stretching, water and sleep as quests, with gear and treats to save up for.",
    icon: "dumbbell",
    terms: { member: "Athlete", members: "Athletes", gm: "Coach" },
  },
  {
    categories: [
      { id: "cat-fit-move", name: "Movement" },
      { id: "cat-fit-fuel", name: "Fuel & Water" },
      { id: "cat-fit-rest", name: "Rest & Recovery" },
    ],
    quests: [
      { id: "fit-steps", name: "Outpace the Couch Potato (8,000 steps)", categoryId: "cat-fit-move", beastId: "beast-couch-potato", schedule: "daily", difficulty: 2 },
      { id: "fit-workout", name: "Train at the Dojo", categoryId: "cat-fit-move", schedule: "daily", difficulty: 2 },
      { id: "fit-stretch", name: "Stretch Like a Cat", categoryId: "cat-fit-move", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
      { id: "fit-long", name: "Expedition into the Wilds", categoryId: "cat-fit-move", schedule: "weekly", difficulty: 3 },
      { id: "fit-gear", name: "Stow away the Cleat Creep", categoryId: "cat-fit-move", beastId: "beast-cleat-creep", schedule: "weekly", difficulty: 1 },
      { id: "fit-water", name: "Chug the Elixir of Life", categoryId: "cat-fit-fuel", schedule: "daily", difficulty: 1, timesOfDay: ["morning", "noon", "evening"] },
      { id: "fit-breakfast", name: "Feed the Hangry Hob", categoryId: "cat-fit-fuel", beastId: "beast-hangry-hob", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
      { id: "fit-greens", name: "Eat the Green Potion", categoryId: "cat-fit-fuel", schedule: "daily", difficulty: 1, timesOfDay: ["evening"] },
      { id: "fit-prep", name: "Prepare the Week's Rations", categoryId: "cat-fit-fuel", schedule: "weekly", difficulty: 2 },
      { id: "fit-shower", name: "Wash off the Stinkwisp", categoryId: "cat-fit-rest", beastId: "beast-stinkwisp", schedule: "daily", difficulty: 1 },
      { id: "fit-wake", name: "Rouse the Snooze Sloth", categoryId: "cat-fit-rest", beastId: "beast-snooze-sloth", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
      { id: "fit-screen", name: "Silence the Scroll Troll", categoryId: "cat-fit-rest", beastId: "beast-scroll-troll", schedule: "daily", difficulty: 1, timesOfDay: ["night"] },
      { id: "fit-sleep", name: "Pacify the Night Owlbear", categoryId: "cat-fit-rest", beastId: "beast-night-owlbear", schedule: "daily", difficulty: 1, timesOfDay: ["night"] },
    ],
    dosDonts: [
      { id: "fit-do-buddy", type: "do", whatFor: "Working out with a buddy", difficulty: 1 },
      { id: "fit-do-warmup", type: "do", whatFor: "Warming up before you train", difficulty: 1 },
      { id: "fit-do-stairs", type: "do", whatFor: "Taking the stairs", difficulty: 1 },
      { id: "fit-dont-skip", type: "dont", whatFor: "Skipping two workouts in a row", difficulty: 2 },
      { id: "fit-dont-soda", type: "dont", whatFor: "A sugary drink instead of water", difficulty: 1 },
    ],
    rewards: [
      reward("fit-reward-smoothie", "Smoothie", "A fresh smoothie after a workout.", gpForDollars(8), "blender"), // about $8
      reward("fit-reward-socks", "New Training Socks", "A fresh pair of sports socks.", gpForDollars(12), "socks"), // about $12
      reward("fit-reward-class", "Drop-in Class", "Try a new class: climbing, yoga, dance or spin.", gpForDollars(25), "running"), // about $25
      reward("fit-reward-gear", "New Workout Gear", "A shirt, shorts or a water bottle of your choice.", gpForDollars(40), "tshirt"), // about $40
      reward("fit-reward-massage", "Massage", "A massage to recover.", gpForDollars(80), "spa"), // about $80
    ],
    powers: [
      "irl-day-off",
      "irl-snooze",
      "irl-timed-couch-quest",
      "irl-timed-recovery-soak",
      "irl-timed-power-nap",
    ],
  }
);
