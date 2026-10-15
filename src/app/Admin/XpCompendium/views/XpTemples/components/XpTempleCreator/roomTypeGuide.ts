/**
 * The room type guide: plain words for every room a Game Master can put in a temple, shown by the full-screen
 * room type picker (components/RoomTypeModal.vue). Pure copy, no Vue, so it has a spec.
 *
 * `master` is the Master Room: the temple's last chamber, holding the Pegasus Egg, placed AFTER the boss. It is not a
 * key room. The key that opens the boss door is the Boss Key (item id `master-key`): only an item a Chest can hold
 * (Dungeon Item -> Boss Key), never a room. `dragon-egg` is an older name for the same room; play handles both alike,
 * so it shares the entry and is never offered in the picker.
 */
import { MASTER_EGG_ICON } from "@/lib/engine/dungeons/roomTypes";

export interface RoomTypeGuideEntry {
  /** What the picker calls the room (the guide card's name) */
  label: string;
  /** A short name for tight spots: the rail buttons, the room header, the Confirm button. Defaults to `label`. */
  short?: string;
  /** Font Awesome class(es) without the style prefix; the Master Room's carries `icon-master-egg` (the golds) */
  icon: string;
  /** One short line: what the room is */
  blurb: string;
  /** What happens in play */
  inPlay: string;
  /** Where in the temple it belongs */
  place: string;
  /** What else the temple needs for it to work */
  needs?: string;
}

const ANYWHERE = "Anywhere.";
const KIND_BEFORE_A_FIGHT = "Anywhere; kind before a fight.";

/** The Master Room and its older alias `dragon-egg` */
const EGG_ROOM: RoomTypeGuideEntry = {
  label: "Master Room (Pegasus Egg)",
  short: "Master Room",
  icon: MASTER_EGG_ICON,
  blurb: "The temple's prize: the Pegasus Egg.",
  inPlay:
    "The hero opens the egg, frees this world's Pegasus and clears the temple; from then on they can fly here. Pick which Pegasus the egg holds.",
  place: "Right AFTER the boss.",
};

export const ROOM_TYPE_GUIDE: Record<string, RoomTypeGuideEntry> = {
  entrance: {
    label: "Entrance",
    icon: "fa-door-open",
    blurb: "Where the hero steps in.",
    inPlay: "The temple starts here; it is also the way out.",
    place: "First room.",
  },
  gate: {
    label: "Gate",
    icon: "fa-archway",
    blurb: "The way out once the temple is beaten.",
    inPlay: "Opens with the Boss Key or once the boss is beaten; clears the temple and pays its reward.",
    place: "After the boss.",
  },
  // The quest room is a guide entry, not an engine type: confirming it opens the quest picker, and the quest's
  // difficulty makes the room a monster, miniboss or boss room (questRooms.questTier).
  quest: {
    label: "Quest room",
    short: "Quest",
    icon: "fa-scroll-old",
    blurb: "A real chore guards this room.",
    inPlay:
      "The hero fights the beast of one of your quests, and the chore's checklist is the fight. Winning finishes the quest, and finishing the quest on the board clears the room. The beast is back when the quest is due again.",
    place: "Anywhere on the path. The quest's difficulty makes it a Monster, Miniboss or Boss room.",
    needs: "A quest to hold: pick one you have, or make one from the library.",
  },
  monster: {
    label: "Monster",
    icon: "fa-dragon",
    blurb: "A beast guards this room.",
    inPlay: "Classic beast room: the hero fights the beasts you pick, with no chore behind them.",
    place: "Anywhere on the path.",
  },
  miniboss: {
    label: "Mini-boss",
    icon: "fa-skull",
    blurb: "A tougher beast halfway in.",
    inPlay: "Classic beast room: guards the Boss Key side of the temple.",
    place: "Between the entrance and the boss.",
  },
  boss: {
    label: "Boss",
    icon: "fa-crown",
    blurb: "The big fight.",
    inPlay: "Its door needs the Boss Key. Beating it opens the way to the Pegasus.",
    place: "Near the end; the Pegasus Egg goes right after.",
    needs: "Needs a Chest holding the Boss Key before its door.",
  },
  trap: {
    label: "Trap",
    icon: "fa-spider-web",
    blurb: "A room that bites.",
    inPlay: "Costs HP unless the hero has the agility to clear it.",
    place: ANYWHERE,
  },
  loot: {
    label: "Chest",
    icon: "fa-treasure-chest",
    blurb: "Treasure.",
    inPlay:
      "GP, potions or a dungeon item; you pick what is inside. A chest can hold the Boss Key that opens the boss door: pick Dungeon Item → Boss Key.",
    place: ANYWHERE,
  },
  key: {
    label: "Small Key",
    icon: "fa-key",
    blurb: "Opens one locked door.",
    inPlay: "The hero picks it up and spends it on a locked door.",
    place: "Before the door it opens.",
  },
  master: EGG_ROOM,
  "dragon-egg": EGG_ROOM,
  shop: {
    label: "Shop",
    icon: "fa-store",
    blurb: "A shopkeeper in the dark.",
    inPlay: "Sells the wares you give it for GP.",
    place: ANYWHERE,
  },
  health: {
    label: "Spring",
    icon: "fa-heart",
    blurb: "Heals HP.",
    inPlay: "The hero drinks and gets HP back.",
    place: KIND_BEFORE_A_FIGHT,
  },
  mana: {
    label: "Fountain",
    icon: "fa-tint",
    blurb: "Restores MP.",
    inPlay: "The hero drinks and gets MP back.",
    place: KIND_BEFORE_A_FIGHT,
  },
  save: {
    label: "Save Point",
    icon: "fa-save",
    blurb: "Remembers the hero's progress.",
    inPlay: "The hero can save their place here.",
    place: KIND_BEFORE_A_FIGHT,
  },
  camp: {
    label: "Camp",
    icon: "fa-campfire",
    blurb: "Rest to restore HP and MP.",
    inPlay: "The hero rests by the fire and gets HP and MP back.",
    place: KIND_BEFORE_A_FIGHT,
  },
  teleport: {
    label: "Portal",
    icon: "fa-portal-enter",
    blurb: "Jumps to another room.",
    inPlay: "A two-way door to a far room.",
    place: ANYWHERE,
  },
  puzzle: {
    label: "Glyphs",
    icon: "fa-puzzle-piece",
    blurb: "A riddle on the wall.",
    inPlay: "Answer right for a reward.",
    place: ANYWHERE,
  },
  secret: {
    label: "Secret",
    icon: "fa-eye-slash",
    blurb: "A hidden room.",
    inPlay: "Found by searching.",
    place: "Off the path.",
  },
  // The bundled Font Awesome (Pro 5.15.4) has no `fa-stairs`; the level arrows are the nearest match
  "stairs-up": {
    label: "Stairs Up",
    icon: "fa-level-up-alt",
    blurb: "To the floor above.",
    inPlay: "Changes floor.",
    place: "Where floors meet.",
  },
  "stairs-down": {
    label: "Stairs Down",
    icon: "fa-level-down-alt",
    blurb: "To the floor below.",
    inPlay: "Changes floor.",
    place: "Where floors meet.",
  },
  empty: {
    label: "Empty",
    icon: "fa-square",
    blurb: "Just a room.",
    inPlay: "Nothing happens; the hero walks through.",
    place: ANYWHERE,
  },
  wall: {
    label: "Wall",
    icon: "fa-square-full",
    blurb: "Solid stone.",
    inPlay: "The hero cannot walk in.",
    place: "Wherever the maze needs a block.",
  },
  pit: {
    label: "Pit",
    icon: "fa-circle",
    blurb: "A hole; the hero falls a floor.",
    inPlay: "The hero drops to the floor below.",
    place: "Anywhere with a floor under it.",
  },
  void: {
    label: "Void",
    icon: "fa-ban",
    blurb: "Nothing is here.",
    inPlay: "There is no room; the hero cannot step in.",
    place: "Empty space in the maze.",
  },
};

/** What an unknown type reads as */
export const DEFAULT_ROOM_GUIDE: RoomTypeGuideEntry = {
  label: "Room",
  icon: "fa-question",
  blurb: "A room.",
  inPlay: "Pick a type to see what it does.",
  place: ANYWHERE,
};

/** The short name of a room type (`short`, else `label`): rail buttons, the room header, the Confirm button. */
export const roomTypeShortLabel = (type: string | null | undefined): string => {
  const entry = roomTypeGuide(type);
  return entry.short ?? entry.label;
};

/** The guide entry for a room type; an unknown type reads as `DEFAULT_ROOM_GUIDE`. */
export const roomTypeGuide = (type: string | null | undefined): RoomTypeGuideEntry =>
  hasRoomTypeGuide(type) ? ROOM_TYPE_GUIDE[type as string] : DEFAULT_ROOM_GUIDE;

export const hasRoomTypeGuide = (type: string | null | undefined): boolean =>
  Boolean(type) && Object.prototype.hasOwnProperty.call(ROOM_TYPE_GUIDE, type as string);

/** `dragon-egg` is the older name of the `master` room; the picker only knows `master`. */
export const canonicalRoomType = (type: string | null | undefined): string => (type === "dragon-egg" ? "master" : type ?? "");

// ---- Categories -------------------------------------------------------------------------------------

/** One line on what each category of the picker is for */
export const CATEGORY_BLURBS: Record<string, string> = {
  Combat: "Rooms where a chore fights back.",
  Resources: "Treasure, keys, shops and the Pegasus Egg.",
  Recovery: "Rooms that heal, rest and save.",
  Navigation: "How the hero gets in, out and around.",
  Structure: "The bones of the maze: floors, walls and holes.",
};

export const categoryBlurb = (name: string | null | undefined): string =>
  name && Object.prototype.hasOwnProperty.call(CATEGORY_BLURBS, name) ? CATEGORY_BLURBS[name] : "";

/** What the type step says under the quest room: its difficulty picks the stop, so the path has no fixed one for it. */
export const QUEST_PATH_NOTE =
  "The quest's difficulty picks the stop: 1-2 a monster, 3-5 a miniboss, 8 and up the boss.";

// ---- The critical path --------------------------------------------------------------------------------

export interface CriticalPathStop {
  label: string;
  /** Room types that belong at this stop */
  types: string[];
}

/** The order every temple is played in, start to finish: the strip at the top of the picker's type step. */
export const CRITICAL_PATH: readonly CriticalPathStop[] = [
  { label: "Entrance", types: ["entrance"] },
  { label: "Keys and locks", types: ["key"] },
  { label: "Mini-boss", types: ["miniboss"] },
  { label: "Chest with the Boss Key", types: ["loot"] },
  { label: "Boss door", types: ["boss"] },
  { label: "Boss", types: ["boss"] },
  { label: "Master Room (Pegasus Egg)", types: ["master"] },
  { label: "Gate", types: ["gate"] },
];

/** The critical path with the stops that `type` belongs to lit up (none for a room that can go anywhere). */
export const criticalPathStops = (type: string | null | undefined): Array<{ label: string; active: boolean }> => {
  const kind = canonicalRoomType(type);
  return CRITICAL_PATH.map((stop) => ({ label: stop.label, active: stop.types.includes(kind) }));
};

export const isOnCriticalPath = (type: string | null | undefined): boolean => criticalPathStops(type).some((stop) => stop.active);
