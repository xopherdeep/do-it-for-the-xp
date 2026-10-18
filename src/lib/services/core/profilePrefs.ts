/**
 * Choices each profile makes for itself on this device (Settings > General): where signing in lands, and whether the
 * Guide and the first-run tour speak up on their own. Kept in localStorage per profile, like the tour's own "seen"
 * mark; blocked storage just means the defaults.
 */

export type LandingChoice = "my-home" | "home-town" | "world-map" | "my-party" | "game-master";

export interface LandingOption {
  value: LandingChoice;
  label: string;
  /** Only a Game Master can land here; anyone else lands at home */
  gameMasterOnly?: boolean;
}

export const LANDING_OPTIONS: readonly LandingOption[] = [
  { value: "my-home", label: "My Home" },
  { value: "home-town", label: "Home Town" },
  { value: "world-map", label: "World Map" },
  { value: "my-party", label: "Party" },
  { value: "game-master", label: "Game Master console", gameMasterOnly: true },
];

export const DEFAULT_LANDING: LandingChoice = "my-home";

const landingKey = (profileId: string) => `xp.landing.${profileId}`;
const guidesKey = (profileId: string) => `xp.guides.${profileId}`;

const read = (key: string): string | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // chemx-allow: best-effort blocked storage, the choice lasts until the page is left
  }
};

const isLandingChoice = (value: unknown): value is LandingChoice => LANDING_OPTIONS.some((option) => option.value === value);

/** The screen this profile chose to land on, or My Home */
export const landingChoiceOf = (profileId: string): LandingChoice => {
  const stored = profileId ? read(landingKey(profileId)) : null;
  return isLandingChoice(stored) ? stored : DEFAULT_LANDING;
};

export const setLandingChoice = (profileId: string, choice: LandingChoice): void => {
  const isSavable = Boolean(profileId) && isLandingChoice(choice);
  if (isSavable) write(landingKey(profileId), choice);
};

/** The landing options a profile may pick: the Game Master console only for a Game Master */
export const landingOptionsFor = (isGameMaster: boolean): LandingOption[] =>
  LANDING_OPTIONS.filter((option) => isGameMaster || !option.gameMasterOnly);

/** Where signing in takes the profile: their chosen screen, or My Home when the choice is not theirs to make */
export const landingPathFor = (profile: { id: string | number; isAdult?: unknown }, choice: LandingChoice): string => {
  const id = String(profile.id);
  const isGameMaster = profile.isAdult === true;
  const isAllowed = landingOptionsFor(isGameMaster).some((option) => option.value === choice);
  const landing = isAllowed ? choice : DEFAULT_LANDING;
  const isConsole = landing === "game-master";
  if (isConsole) return "/game-master/dashboard";
  return `/my-portal/${id}/${landing}`;
};

/** The Guide and the first-run tour speak up on their own unless this profile turned them off */
export const guidesOn = (profileId: string): boolean => (profileId ? read(guidesKey(profileId)) !== "off" : true);

export const setGuidesOn = (profileId: string, on: boolean): void => {
  if (profileId) write(guidesKey(profileId), on ? "on" : "off");
};
