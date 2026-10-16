/**
 * Settings that are planned but not wired to anything yet. The pages show them greyed out under "Coming soon"
 * (XpComingSoonCard). When one is built, move it out of here and onto its page as a working control.
 */
export interface ComingSoonItem {
  title: string;
  description: string;
}

export const GENERAL_COMING_SOON: ComingSoonItem[] = [
  { title: "App language", description: "Play in Spanish, French, German or Japanese" },
  { title: "Landing page", description: "Pick the screen you see after signing in" },
  { title: "Start the week on Sunday", description: "Calendars begin on Sunday instead of Monday" },
  { title: "Helper dialogs", description: "Turn the in-app guides and walkthroughs on or off" },
  { title: "Family overview", description: "See the whole family from Choose A Profile" },
];

export const THEME_COMING_SOON: ComingSoonItem[] = [
  { title: "Dark mode", description: "A darker look across the app" },
  { title: "Color theme", description: "Fantasy and retro color sets" },
];

export const ALERTS_COMING_SOON: ComingSoonItem[] = [
  { title: "Due reminders", description: "Remind Game Masters when a hero's chore is due" },
  { title: "Done notices", description: "Tell Game Masters, or other heroes, when a chore is finished" },
];

/** The stored bedtime (familySettings.ts) is kept, but nothing locks, warns or blocks at night yet */
export const FAMILY_COMING_SOON: ComingSoonItem[] = [
  { title: "Bedtime", description: "Set when the family's night begins and ends, and lock the portal after lights out" },
];

export const CHORE_COMING_SOON: ComingSoonItem[] = [
  { title: "Game Masters do chores too", description: "Give quests to Game Masters and track them like a hero's" },
  { title: "Finish overdue chores", description: "Let heroes mark past chores done and still collect the reward" },
  { title: "Photo proof", description: "Heroes add a photo when they finish; Game Masters review it later" },
  { title: "Lock late chores", description: "A chore not done by its due time can't be claimed" },
  { title: "Late penalty", description: "Take points when a chore isn't done on time" },
  { title: "Auto-save GP", description: "Put a share of every reward straight into savings" },
];

export const REWARD_COMING_SOON: ComingSoonItem[] = [
  { title: "Cash out GP", description: "Trade gold for real money at a rate you set, for the heroes you pick" },
  { title: "Approve every purchase", description: "Check game-item purchases too, not only Real Life rewards" },
];

export const PARTY_COMING_SOON: ComingSoonItem[] = [
  { title: "Parties with friends", description: "Form parties and guilds with other families" },
  { title: "Family circle posts", description: "See posts from families in your circle, and choose who can post or read" },
  { title: "Join requests", description: "Approve who joins your party" },
  { title: "Party invites", description: "Let members invite others, and choose who can" },
];

/** Social sign-in is a site job (a login plugin on the Town Hall network); the app's link flow picks it up once the site offers it */
export const ACCOUNT_COMING_SOON: ComingSoonItem[] = [
  { title: "Sign in with Google", description: "Link it on the site once the Town Hall offers it" },
  { title: "Sign in with Apple", description: "Link it on the site once the Town Hall offers it" },
];
