/**
 * Timed privileges for the packs: real-life Powers with minutes on the clock (PowerTimers.ts). The hero casts one
 * with MP, a countdown runs, and the game says when time is up, so earning screen time is something a hero can see.
 * Honor system: nothing locks a device.
 *
 * One list per audience; a pack picks its Powers by id (catalog/definePack.ts), and ids shared between packs stay
 * while any loaded pack still lists them, so the ids here never change. The Family ones are in the starter world.
 */
import { AbilityType, TimePeriod } from "@/hooks/abilities/abilityConstants";
import type { Ability } from "@/hooks/abilities/abilityConstants";

type Often = typeof TimePeriod.Daily | typeof TimePeriod.Weekly | typeof TimePeriod.Monthly;

interface PrivilegeSeed {
  id: string;
  name: string;
  description: string;
  minutes: number;
  mp: number;
  often: Often;
  /** AP to earn in the same window (today, this week, this month) before it unlocks */
  ap: number;
  icon: string;
}

let column = 0;

/** A timed privilege from one line: cast once per `often`, unlocked by `ap` earned in the same window */
const privilege = (seed: PrivilegeSeed): Ability => {
  column += 1;
  return {
    id: seed.id,
    name: seed.name,
    description: seed.description,
    type: AbilityType.RealLife,
    frequency: seed.often,
    mpCost: seed.mp,
    apRequirement: { amount: seed.ap, period: seed.often },
    icon: seed.icon,
    iconPrefix: "fad",
    prerequisites: [],
    isPreset: true,
    timerMinutes: seed.minutes,
    position: { x: 100 * (column % 8), y: 700 + 100 * Math.floor(column / 8) },
  };
};

const { Daily, Weekly, Monthly } = TimePeriod;

/** Family (kids): screen time, freedoms and outings */
export const FAMILY_PRIVILEGES: Ability[] = [
  // Screen time
  { id: "irl-timed-game-on", name: "Game On", description: "30 minutes of video games.", minutes: 30, mp: 8, often: Daily, ap: 30, icon: "gamepad-alt" },
  { id: "irl-timed-tablet", name: "Tablet Time", description: "30 minutes on the tablet, any app you're allowed.", minutes: 30, mp: 8, often: Daily, ap: 30, icon: "tablet-alt" },
  { id: "irl-timed-tv", name: "TV Time", description: "30 minutes of a show or cartoons.", minutes: 30, mp: 6, often: Daily, ap: 25, icon: "tv-retro" },
  { id: "irl-timed-videos", name: "Video Time", description: "20 minutes of YouTube or other videos.", minutes: 20, mp: 5, often: Daily, ap: 20, icon: "play-circle" },
  { id: "irl-timed-phone", name: "Phone Time", description: "30 minutes on your phone: texting, apps or games.", minutes: 30, mp: 10, often: Daily, ap: 40, icon: "mobile-alt" },
  { id: "irl-timed-co-op", name: "Co-op Quest", description: "45 minutes of online games with friends.", minutes: 45, mp: 15, often: Weekly, ap: 150, icon: "headset" },
  { id: "irl-timed-movie-marathon", name: "Movie Marathon", description: "A whole movie on a school night.", minutes: 180, mp: 30, often: Monthly, ap: 600, icon: "film" },
  // Freedom
  { id: "irl-timed-lantern", name: "Lantern Light", description: "Read in bed for 20 minutes past lights out.", minutes: 20, mp: 5, often: Daily, ap: 20, icon: "book-reader" },
  { id: "irl-timed-house-dj", name: "House DJ", description: "You pick the music at home for 30 minutes.", minutes: 30, mp: 5, often: Daily, ap: 20, icon: "volume-up" },
  { id: "irl-timed-remote", name: "Remote Master", description: "You choose what's on the TV for an hour.", minutes: 60, mp: 8, often: Daily, ap: 30, icon: "tv" },
  { id: "irl-timed-free-roam", name: "Free Roam", description: "30 minutes of free time: nobody asks you to do anything.", minutes: 30, mp: 10, often: Daily, ap: 40, icon: "walking" },
  { id: "irl-timed-lazy-morning", name: "Lazy Morning", description: "Stay in bed 30 more minutes on a weekend morning.", minutes: 30, mp: 8, often: Weekly, ap: 100, icon: "bed" },
  // Treats and outings
  { id: "irl-timed-friend-hangout", name: "Friend Hangout", description: "A friend comes over for two hours.", minutes: 120, mp: 25, often: Weekly, ap: 250, icon: "user-friends" },
  { id: "irl-timed-call-friend", name: "Call a Friend", description: "A 30 minute video call with a friend.", minutes: 30, mp: 6, often: Daily, ap: 25, icon: "video" },
  { id: "irl-timed-adventure", name: "Adventure Hour", description: "A grown-up takes you to the park, pool or skate park for an hour.", minutes: 60, mp: 20, often: Weekly, ap: 200, icon: "tree-alt" },
  { id: "irl-timed-dusk-patrol", name: "Dusk Patrol", description: "Play outside 30 minutes past the usual time.", minutes: 30, mp: 8, often: Daily, ap: 30, icon: "sunset" },
].map(privilege);

/** Classroom and homeschool: short breaks a teacher can give */
export const SCHOOL_PRIVILEGES: Ability[] = [
  { id: "irl-timed-free-choice", name: "Free Choice Time", description: "15 minutes of any quiet activity you choose.", minutes: 15, mp: 10, often: Daily, ap: 30, icon: "puzzle-piece" },
  { id: "irl-timed-learning-games", name: "Learning Games", description: "15 minutes of learning games on the computer.", minutes: 15, mp: 8, often: Daily, ap: 25, icon: "laptop" },
  { id: "irl-timed-headphones", name: "Headphones Pass", description: "Music in your headphones while you work, for 20 minutes.", minutes: 20, mp: 6, often: Daily, ap: 20, icon: "headphones" },
  { id: "irl-timed-sit-anywhere", name: "Sit Anywhere", description: "Choose your seat for one class period.", minutes: 45, mp: 8, often: Daily, ap: 25, icon: "chair" },
  { id: "irl-timed-extra-recess", name: "Extra Recess", description: "Ten more minutes outside.", minutes: 10, mp: 20, often: Weekly, ap: 150, icon: "basketball-ball" },
  { id: "irl-timed-teachers-chair", name: "Teacher's Chair", description: "Sit in the teacher's chair for 30 minutes.", minutes: 30, mp: 15, often: Weekly, ap: 150, icon: "chair-office" },
  { id: "irl-timed-recess-plus", name: "Recess Plus", description: "A 15 minute longer break between lessons.", minutes: 15, mp: 8, often: Daily, ap: 25, icon: "running" },
].map(privilege);

/** Teens, college and adults on their own: breaks between the work */
export const BREAK_PRIVILEGES: Ability[] = [
  { id: "irl-timed-game-break", name: "Game Break", description: "30 minutes of games between study blocks.", minutes: 30, mp: 10, often: Daily, ap: 40, icon: "gamepad-alt" },
  { id: "irl-timed-scroll-break", name: "Scroll Break", description: "15 minutes of social media, guilt-free.", minutes: 15, mp: 5, often: Daily, ap: 20, icon: "mobile-alt" },
  { id: "irl-timed-episode-break", name: "Episode Break", description: "One episode of a show, about 45 minutes.", minutes: 45, mp: 12, often: Daily, ap: 50, icon: "tv-retro" },
  { id: "irl-timed-power-nap", name: "Power Nap", description: "A 20 minute nap with the alarm set.", minutes: 20, mp: 6, often: Daily, ap: 25, icon: "bed-alt" },
  { id: "irl-timed-guilt-free-gaming", name: "Guilt-free Gaming", description: "An hour of games, no guilt.", minutes: 60, mp: 12, often: Daily, ap: 50, icon: "headset" },
].map(privilege);

/** Getting active: rest that has been earned */
export const FITNESS_PRIVILEGES: Ability[] = [
  { id: "irl-timed-couch-quest", name: "Couch Quest", description: "45 minutes of couch and TV after a workout.", minutes: 45, mp: 10, often: Daily, ap: 40, icon: "couch" },
  { id: "irl-timed-recovery-soak", name: "Recovery Soak", description: "30 minutes in the bath, sauna or hot tub.", minutes: 30, mp: 8, often: Daily, ap: 30, icon: "hot-tub" },
].map(privilege);

/** Roommates and couples: shared spaces, one at a time */
export const HOUSEHOLD_PRIVILEGES: Ability[] = [
  { id: "irl-timed-remote-control", name: "Remote Control", description: "The TV is yours for two hours.", minutes: 120, mp: 10, often: Weekly, ap: 100, icon: "tv" },
  { id: "irl-timed-aux-cord", name: "Aux Cord", description: "You pick the music in the shared space for an hour.", minutes: 60, mp: 5, often: Daily, ap: 20, icon: "music" },
  { id: "irl-timed-living-room", name: "Living Room Claim", description: "The living room is yours for three hours: guests, a date, a party.", minutes: 180, mp: 25, often: Weekly, ap: 250, icon: "couch" },
  { id: "irl-timed-first-shower", name: "First Shower", description: "The bathroom is yours first, for 20 minutes.", minutes: 20, mp: 6, often: Daily, ap: 25, icon: "shower" },
].map(privilege);

/** Teams at work: time the team agrees to protect */
export const WORKPLACE_PRIVILEGES: Ability[] = [
  { id: "irl-timed-focus-shield", name: "Focus Shield", description: "Two hours of deep work: no meetings, no pings.", minutes: 120, mp: 20, often: Daily, ap: 60, icon: "shield-alt" },
  { id: "irl-timed-long-lunch", name: "Long Lunch", description: "Thirty extra minutes at lunch.", minutes: 30, mp: 15, often: Weekly, ap: 150, icon: "utensils" },
  { id: "irl-timed-coffee-run", name: "Coffee Run", description: "A 20 minute walk for coffee.", minutes: 20, mp: 5, often: Daily, ap: 20, icon: "mug-hot" },
  { id: "irl-timed-learning-hour", name: "Learning Hour", description: "An hour for a course, a talk or a side project.", minutes: 60, mp: 15, often: Weekly, ap: 150, icon: "lightbulb-on" },
  { id: "irl-timed-early-out", name: "Early Out", description: "Leave an hour early.", minutes: 60, mp: 30, often: Monthly, ap: 500, icon: "door-open" },
].map(privilege);

/** Every timed privilege the packs can pick by id */
export const PRIVILEGE_PRESETS: Ability[] = [
  ...FAMILY_PRIVILEGES,
  ...SCHOOL_PRIVILEGES,
  ...BREAK_PRIVILEGES,
  ...FITNESS_PRIVILEGES,
  ...HOUSEHOLD_PRIVILEGES,
  ...WORKPLACE_PRIVILEGES,
];
