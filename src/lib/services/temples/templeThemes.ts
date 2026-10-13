/**
 * Temple themes (docs/Quest-Rooms-Spec.md sections 3 and 10): which chores a temple is about. A theme is the
 * temple's own element key ("shadow" for the Moonveil Shrine, which holds the kitchen), and every library beast
 * carries exactly one. It is not the beast's art `element` (10 per region element, with lightning and neutral
 * too), so the two never mix. Pure data: the editor and the Quests tab read the labels and blurbs from here.
 */

/** The nine temple element keys, in the order the editor lists them. */
export const TEMPLE_THEME_KEYS = ["wind", "earth", "water", "fire", "ice", "light", "shadow", "moon", "storm"] as const;
export type TempleTheme = (typeof TEMPLE_THEME_KEYS)[number];

export interface TempleThemeInfo {
  key: TempleTheme;
  /** The element's own name: "Shadow" */
  element: string;
  /** The chores that live here, short: "Kitchen" */
  focus: string;
  /** What the editor and the Quests tab show: "Kitchen · Shadow" */
  label: string;
  /** One line telling a Game Master what belongs in a temple of this theme */
  blurb: string;
}

const theme = (key: TempleTheme, element: string, focus: string, blurb: string): TempleThemeInfo => ({
  key,
  element,
  focus,
  label: `${focus} · ${element}`,
  blurb,
});

export const TEMPLE_THEMES: Readonly<Record<TempleTheme, TempleThemeInfo>> = {
  wind: theme("wind", "Wind", "Quick chores", "Quick, easy chores: dusting, sweeping and small pickups."),
  earth: theme("earth", "Earth", "Yard and pets", "Plants, the yard and the pets: weeds, leaves, the lawn, walks and feeding."),
  water: theme("water", "Water", "Bathroom", "Everything in the bathroom: the sink, tub, toilet, mirror and towels."),
  fire: theme("fire", "Fire", "Cooking and big jobs", "Cooking, and the big jobs: the garage, the car and the junk pile."),
  ice: theme("ice", "Ice", "Laundry and fridge", "Laundry, the fridge and freezer, and shovelling snow."),
  light: theme("light", "Light", "School", "School, homework, reading and practice."),
  shadow: theme("shadow", "Shadow", "Kitchen", "The kitchen: dishes, grease, crumbs and the trash."),
  moon: theme("moon", "Moon", "Bedtime and self-care", "Bedtime and looking after yourself: teeth, showers, getting dressed and lights out."),
  storm: theme("storm", "Storm", "Bedroom and clutter", "The bedroom, clutter and toys: the mess that piles up."),
};

export const isTempleTheme = (value: unknown): value is TempleTheme =>
  typeof value === "string" && (TEMPLE_THEME_KEYS as readonly string[]).includes(value);

/** "Kitchen · Shadow" for a theme key; the empty string for anything that is not a theme. */
export const templeThemeLabel = (value: unknown): string => (isTempleTheme(value) ? TEMPLE_THEMES[value].label : "");
