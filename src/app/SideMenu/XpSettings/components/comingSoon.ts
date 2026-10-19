/**
 * Settings that are planned but not wired to anything yet. The pages show them greyed out under "Coming soon"
 * (XpComingSoonCard). When one is built, move it out of here and onto its page as a working control.
 */
export interface ComingSoonItem {
  title: string;
  description: string;
}

/** Every screen's words are written in English in the code, so a second language needs a translation pass first */
export const GENERAL_COMING_SOON: ComingSoonItem[] = [
  { title: "App language", description: "Play in Spanish, French, German or Japanese" },
  { title: "Family overview", description: "See the whole family from Choose A Profile" },
];

/** Each game style paints its own windows and colors, so a dark mode and color sets need a pass over every style */
export const THEME_COMING_SOON: ComingSoonItem[] = [
  { title: "Dark mode", description: "A darker look across the app" },
  { title: "Color theme", description: "Fantasy and retro color sets" },
];

/**
 * Telling a Game Master's own phone about a hero's chore goes through the family server. The multiplayer flag is on in
 * production builds (.env.production), but the server is still being built on the site, so these stay planned
 */
export const ALERTS_COMING_SOON: ComingSoonItem[] = [
  { title: "Game Master reminders", description: "Remind Game Masters when a hero's chore is nearly due" },
  { title: "Done notices", description: "Tell Game Masters, or other heroes, when a chore is finished" },
];

/**
 * Parties across families go through the family server. The multiplayer flag is on in production builds
 * (.env.production), but the server is still being built on the site, so these stay planned
 */
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
