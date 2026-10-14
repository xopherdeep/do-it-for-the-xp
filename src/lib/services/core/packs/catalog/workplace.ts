/** The Workplace pack: a team's routine work as quests, with tech debt and inbox clutter as beasts to beat */
import { definePack, reward } from "./definePack";

export const WORKPLACE_PACK = definePack(
  {
    id: "workplace",
    name: "Workplace",
    version: "1.1.0",
    audience: "Teams at work",
    description: "Standups, reviews, shipping and tech debt as quests, with team rituals and rewards the whole team can enjoy.",
    icon: "briefcase",
    terms: { member: "Teammate", members: "Teammates", gm: "Team Lead" },
  },
  {
    categories: [
      { id: "cat-work-ship", name: "Shipping" },
      { id: "cat-work-upkeep", name: "Upkeep & Tech Debt" },
      { id: "cat-work-team", name: "Team Rituals" },
      { id: "cat-work-growth", name: "Growth & Wellbeing" },
    ],
    quests: [
      { id: "work-ship", name: "Ship a Feature", categoryId: "cat-work-ship", schedule: "weekly", difficulty: 3, requiresApproval: true },
      { id: "work-review", name: "Review a Teammate's Work", categoryId: "cat-work-ship", schedule: "daily", difficulty: 2 },
      { id: "work-bug", name: "Squash a Bug", categoryId: "cat-work-ship", schedule: "daily", difficulty: 2 },
      { id: "work-docs", name: "Write it Down in the Docs", categoryId: "cat-work-ship", schedule: "weekly", difficulty: 2 },
      { id: "work-tech-debt", name: "Untangle the Cable Kraken (tech debt)", categoryId: "cat-work-upkeep", beastId: "beast-cable-kraken", schedule: "weekly", difficulty: 2 },
      { id: "work-inbox", name: "Clear out the Paperwork Pixie (inbox)", categoryId: "cat-work-upkeep", beastId: "beast-paperwork-pixie", schedule: "daily", difficulty: 1 },
      { id: "work-junk", name: "Sort the Junk Drawer Jackalope (old tickets)", categoryId: "cat-work-upkeep", beastId: "beast-junk-drawer-jackalope", schedule: "weekly", difficulty: 2 },
      { id: "work-desk", name: "Tame the Desk Drake", categoryId: "cat-work-upkeep", beastId: "beast-desk-drake", schedule: "weekly", difficulty: 1 },
      { id: "work-kitchen", name: "Banish the Mug Thug from the Kitchen", categoryId: "cat-work-upkeep", beastId: "beast-mug-thug", schedule: "daily", difficulty: 1 },
      { id: "work-standup", name: "Report at the Daily Standup", categoryId: "cat-work-team", schedule: "daily", difficulty: 1, timesOfDay: ["morning"] },
      { id: "work-retro", name: "Hold the Retro", categoryId: "cat-work-team", schedule: "weekly", difficulty: 2 },
      { id: "work-one-on-one", name: "One-on-One Council", categoryId: "cat-work-team", schedule: "weekly", difficulty: 1 },
      { id: "work-thanks", name: "Send a Shout-out", categoryId: "cat-work-team", schedule: "weekly", difficulty: 1 },
      { id: "work-learn", name: "Feed the Bookwyrm (learn a skill)", categoryId: "cat-work-growth", beastId: "beast-bookwyrm", schedule: "weekly", difficulty: 2 },
      { id: "work-break", name: "Silence the Scroll Troll (screen break)", categoryId: "cat-work-growth", beastId: "beast-scroll-troll", schedule: "daily", difficulty: 1, timesOfDay: ["noon"] },
    ],
    dosDonts: [
      { id: "work-do-help", type: "do", whatFor: "Unblocking a teammate", difficulty: 2 },
      { id: "work-do-ask", type: "do", whatFor: "Asking for help early", difficulty: 1 },
      { id: "work-do-better", type: "do", whatFor: "Leaving the code or doc better than you found it", difficulty: 2 },
      { id: "work-do-thanks", type: "do", whatFor: "Thanking someone in public", difficulty: 1 },
      { id: "work-dont-late", type: "dont", whatFor: "Joining a meeting late without a heads-up", difficulty: 1 },
      { id: "work-dont-broken", type: "dont", whatFor: "Leaving a broken build for someone else", difficulty: 3 },
      { id: "work-dont-dishes", type: "dont", whatFor: "Leaving dishes in the office sink", difficulty: 1 },
    ],
    rewards: [
      reward("work-reward-coffee", "Team Coffee Run", "Someone else fetches your coffee order.", 80, "coffee"),
      reward("work-reward-plant", "Desk Plant", "A small plant for your desk.", 150, "seedling"),
      reward("work-reward-focus", "Focus Afternoon", "An afternoon with no meetings.", 200, "headphones"),
      reward("work-reward-late-start", "Late Start", "Start an hour later one morning.", 250, "clock"),
      reward("work-reward-lunch", "Pick the Team Lunch", "Choose where the team goes for lunch.", 400, "utensils"),
    ],
    powers: [
      "irl-snooze",
      "irl-extra-time",
      "irl-quiet-day",
      "irl-trusted-hour",
      "irl-timed-focus-shield",
      "irl-timed-long-lunch",
      "irl-timed-coffee-run",
      "irl-timed-learning-hour",
      "irl-timed-early-out",
    ],
  }
);
