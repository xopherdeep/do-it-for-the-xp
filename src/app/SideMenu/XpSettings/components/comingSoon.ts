/**
 * Settings that are planned but not wired to anything yet. The pages show them greyed out under "Coming soon"
 * (XpComingSoonCard). When one is built, move it out of here and onto its page as a working control.
 */
export interface ComingSoonItem {
  title: string;
  description: string;
}

export const GENERAL_COMING_SOON: ComingSoonItem[] = [];

/**
 * Dark mode and color themes were dropped (2026-11-02): the game is dark only (dark-variables.scss), and the game
 * styles (Settings > Theme) are the color sets
 */
export const THEME_COMING_SOON: ComingSoonItem[] = [];

/**
 * Telling a Game Master's own phone about a hero's chore goes through the family server. The multiplayer flag is on in
 * production builds (.env.production), but the server is still being built on the site, so these stay planned
 */
export const ALERTS_COMING_SOON: ComingSoonItem[] = [
  { title: "Game Master reminders", description: "Remind Game Masters when a hero's chore is nearly due" },
  { title: "Done notices", description: "Tell Game Masters, or other heroes, when a chore is finished" },
];

/**
 * Parties with other families are built (Settings > Party, My Party), and raid alerts live in Settings > Alerts
 * (raidAlertWatch.ts). Left planned: posts from a circle of families, which the site does not serve yet
 */
export const PARTY_COMING_SOON: ComingSoonItem[] = [
  { title: "Family circle posts", description: "See posts from families in your circle, and choose who can post or read" },
];

/** Social sign-in is a site job (a login plugin on the Town Hall network); the app's link flow picks it up once the site offers it */
export const ACCOUNT_COMING_SOON: ComingSoonItem[] = [
  { title: "Sign in with Google", description: "Link it on the site once the Town Hall offers it" },
  { title: "Sign in with Apple", description: "Link it on the site once the Town Hall offers it" },
];
