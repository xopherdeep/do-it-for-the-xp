/** One scheduled quest on the Events tab (the hero's quests over the coming week). */
export interface TownEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  type: "quest" | "bounty";
}

/** The numbers on the Updates tab's Game Statistics card. */
export interface TownStats {
  heroes: number;
  quests: number;
  openToday: number;
  pendingApprovals: number;
}

/** What every tab offers the page: load again (the clerk asked the courier to try again). */
export interface TownHallTab {
  reload(): Promise<void>;
}

/** WordPress dates carry no zone (the site's own clock), so they read as the same day and time here. */
export function formatTownDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(parsed);
}
