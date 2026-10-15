/**
 * The first-run tour: the first time a hero opens their portal, a guide points at each part of the screen in turn and
 * says what it does, then sends them off to their quests. It runs once per hero on this device and can be replayed.
 *
 * Each stop names a `data-tour` mark on the page. A stop whose mark is not on screen (no HUD in a battle, say) is
 * skipped rather than pointing at nothing.
 */
export interface TourStop {
  /** The `data-tour` value of the thing to point at */
  target: string;
  title: string;
  lines: string[];
}

export const TOUR_GUIDE = "Guide";

export const FIRST_RUN_TOUR: readonly TourStop[] = [
  {
    target: "purse",
    title: "XP and GP",
    lines: [
      "Up top is your XP on the left and your GP on the right.",
      "Beat a chore beast and both go up. Fill the XP bar to level up!",
    ],
  },
  {
    target: "hands",
    title: "Your hands",
    lines: [
      "The corners are your hands. Put gear in them and one tap uses it.",
      "An empty hand opens your equipment.",
    ],
  },
  {
    target: "profile",
    title: "Your hero",
    lines: ["This is you. Tap here to see your stats and change your look."],
  },
  {
    target: "area",
    title: "Your gear",
    lines: ["The middle button opens your equipment: quests, spells, goods and your wallet all live here."],
  },
  {
    target: "party",
    title: "Your party",
    lines: ["Party shows everyone in your family and how they're doing."],
  },
  {
    target: "area",
    title: "Ready?",
    lines: ["Open your gear and pick My Quests to find your first beast. Good luck, hero!"],
  },
];

const keyFor = (heroId: string) => `xp.tour.${heroId}`;

const storage = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

/** True once this hero finished or skipped the tour on this device. */
export const hasSeenTour = (heroId: string): boolean => {
  if (!heroId) return true;
  try {
    return storage()?.getItem(keyFor(heroId)) === "seen";
  } catch {
    return true;
  }
};

export const markTourSeen = (heroId: string): void => {
  try {
    storage()?.setItem(keyFor(heroId), "seen");
  } catch {
    // chemx-allow: best-effort private mode or blocked storage, the tour just shows again next time
  }
};

/** Show the tour again on this hero's next portal visit. */
export const resetTour = (heroId: string): void => {
  try {
    storage()?.removeItem(keyFor(heroId));
  } catch {
    // chemx-allow: best-effort private mode or blocked storage
  }
};

/** The stops whose mark is on screen, in order. */
export const visibleStops = (stops: readonly TourStop[], isOnScreen: (target: string) => boolean): TourStop[] =>
  stops.filter((stop) => isOnScreen(stop.target));
