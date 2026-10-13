/**
 * The Moving House pack: the quests and beasts a family plays through while packing and moving a home.
 *
 * Pure: no storage, no Vue. `buildMovingPack(answers)` turns the setup answers (the move date, the rooms in the
 * home, who is playing and how old they play) into quest categories, beasts and quests, and
 * `movingPackBackup(pack)` wraps them as a backup file for `restoreBackup(file, { mode: "merge" })`, so loading
 * the pack never wipes anything. Every id starts with "move" (quests `move-`, beasts `beast-move-`, categories
 * `cat-move-`), so loading the pack again with the same answers replaces only its own records.
 *
 * Every quest is a beast quest: the beast carries the checklist (a fight's attacks) and `attackCooldown`, the
 * minutes a hero gets per step, which is the quest's `estimatedMinutes` spread over its steps. The beasts reuse
 * the library's and the classics' art under moving-themed names.
 *
 * Due dates count back from the move date. A quest opens (`startsOn`) at the start of its phase and has no end:
 * an unfinished chore must never vanish from the board, so the due date shows in the summary and the list, not
 * as an expiry. When the move is closer than three weeks the pre-move phases are squeezed together, in order.
 */
import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import type { Achievement, AchievementCategoryInterface } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { BackupFile } from "@/lib/services/core/BackupService";
import type { TimeOfDay } from "@/lib/engine/quests/QuestSchedule";
import {
  PACK_BANDS,
  cooldownOf,
  dateKey,
  heroBandFor,
  packBackup,
  parseLocalDate,
  plural,
  rewardsFor,
} from "./packCommon";
import type { PackBand, PackBeast, PackHero, PackRole } from "./packCommon";

export { dateKey, parseLocalDate };

/** How a hero plays: the little one (about 6), the kid (about 12), the grown-up; "out" sits the move out. */
export type MovingBand = PackBand;
export type MovingRole = PackRole;

export const MOVING_BANDS = PACK_BANDS;

export type MovingRoomId =
  | "bedroom" | "bathroom" | "kitchen" | "living" | "dining" | "laundry"
  | "storage" | "garage" | "guest" | "office" | "yard" | "pets";

/** The rooms the setup asks about; `counted` ones take a number (bedrooms, bathrooms, spare rooms). */
export const MOVING_ROOMS: readonly { id: MovingRoomId; label: string; counted?: boolean; max?: number }[] = [
  { id: "bedroom", label: "Bedrooms", counted: true, max: 8 },
  { id: "bathroom", label: "Bathrooms", counted: true, max: 5 },
  { id: "kitchen", label: "Kitchen" },
  { id: "living", label: "Living room" },
  { id: "dining", label: "Dining room" },
  { id: "laundry", label: "Laundry room" },
  { id: "storage", label: "Storage, attic or basement" },
  { id: "garage", label: "Garage or shed" },
  { id: "yard", label: "Yard or patio" },
  { id: "guest", label: "Guest or spare rooms", counted: true, max: 4 },
  { id: "office", label: "Home office" },
  { id: "pets", label: "Pets" },
];

export type MovingHero = PackHero;

export interface MovingAnswers {
  /** The day of the move, "YYYY-MM-DD" */
  moveDate: string;
  /** How many of each room the home has; absent or 0 means none. A tick box is 1. */
  rooms: Partial<Record<MovingRoomId, number>>;
  heroes: MovingHero[];
  /** Today, "YYYY-MM-DD"; decides how far the phases are squeezed when the move is near. Defaults to today. */
  today?: string;
}

/** What the setup starts with: a typical family home with three bedrooms. */
export const DEFAULT_MOVING_ROOMS: Partial<Record<MovingRoomId, number>> = {
  bedroom: 3, bathroom: 2, kitchen: 1, living: 1, dining: 1, laundry: 1, storage: 1, garage: 1, yard: 1,
};

/** A hero's band from their profile: an adult is a grown-up; a child of 8 or younger is little, any older one a kid. */
export const movingBandFor = heroBandFor;

// ---------------------------------------------------------------------------------------------------------------
// The phases. Offsets are days from the move date: negative before, 0 the day itself, positive after.

type PhaseId = "declutter" | "quiet" | "living" | "last" | "day" | "unpack" | "camp";

interface Phase {
  id: PhaseId;
  name: string;
  opens: number;
  due: number;
}

export const MOVING_PHASES: readonly Phase[] = [
  { id: "declutter", name: "1 Declutter and Donate", opens: -21, due: -14 },
  { id: "quiet", name: "2 Pack the Quiet Rooms", opens: -16, due: -9 },
  { id: "living", name: "3 Bedrooms and Living Rooms", opens: -10, due: -3 },
  { id: "last", name: "4 Kitchen and Bathrooms Last", opens: -4, due: -1 },
  { id: "day", name: "5 Moving Day", opens: 0, due: 0 },
  { id: "unpack", name: "6 Unpack: Beds and Kitchen First", opens: 0, due: 7 },
  { id: "camp", name: "Keeping the Camp Running", opens: -21, due: 7 },
];

const PHASE_BY_ID = Object.fromEntries(MOVING_PHASES.map((phase) => [phase.id, phase])) as Record<PhaseId, Phase>;
const categoryIdOf = (phase: PhaseId): string => `cat-move-${phase}`;
const categoryNameOf = (phase: PhaseId): string => `Moving: ${PHASE_BY_ID[phase].name}`;

// ---------------------------------------------------------------------------------------------------------------
// The content. One template makes one quest (or one per hero) and the beast that carries its checklist.

interface Template {
  slug: string;
  quest: string;
  beast: string;
  /** Art: a library beast avatar (94-193, variants 194-293) or a classic one (1-93) */
  avatar: number;
  phase: PhaseId;
  who: MovingBand | "team";
  /** One quest for each hero of the band (their own stuff) instead of one shared by the band */
  hero?: boolean;
  /** The quest exists only if the home has any of these rooms */
  rooms?: MovingRoomId[];
  difficulty: number;
  /** Minutes for one room; `scale` adds more for each extra room of a kind */
  minutes: number;
  scale?: { room: MovingRoomId; perRoom: number };
  /** Day offset from the move date; the phase's own when absent */
  due?: number;
  steps: string[];
}

export const MOVING_TEMPLATES: readonly Template[] = [
  // 1 Declutter and Donate
  { slug: "supplies", quest: "Stock Up on Boxes and Tape", beast: "Tape Gremlin", avatar: 128, phase: "declutter", who: "grownup", difficulty: 5, minutes: 60, due: -19,
    steps: ["Count the rooms and make a box shopping list", "Buy or borrow boxes: small for books, big for light things", "Get tape, markers, packing paper and bubble wrap", "Book the truck or the movers and put the date on the calendar", "Set up a packing station with tape, markers and a box cutter"] },
  { slug: "paperwork", quest: "Change of Address Gauntlet", beast: "Address Imp", avatar: 143, phase: "declutter", who: "grownup", difficulty: 8, minutes: 90, due: -15,
    steps: ["Order mail forwarding at the post office", "Change your address with the bank, insurance and work", "Book the electric, water and internet stop and start dates", "Tell the school, doctor and dentist where you are going", "Put birth certificates, passports and papers in one folder that rides with you"] },
  { slug: "donation-run", quest: "Donation Run", beast: "Drop-Off Goblin", avatar: 66, phase: "declutter", who: "grownup", difficulty: 8, minutes: 75, due: -14,
    steps: ["Load the donate boxes into the car", "Find a drop-off that is open", "Drop the boxes off and ask for the receipt", "Book a pickup or a dump run for the bulky trash"] },
  { slug: "keep-donate-trash", quest: "Keep, Donate, Trash: Your Stuff", beast: "Sorting Chimera", avatar: 177, phase: "declutter", who: "kid", hero: true, difficulty: 3, minutes: 40,
    steps: ["Make three piles: keep, donate, trash", "Go through your closet and drawers: anything too small goes to donate", "Check your desk and shelves for broken things and old papers", "Put the donate pile in a labeled box and bag the trash", "Show a grown-up your keep pile"] },
  { slug: "toy-triage", quest: "Toy Triage", beast: "Toy Hoard Troll", avatar: 176, phase: "declutter", who: "little", hero: true, difficulty: 2, minutes: 15,
    steps: ["Sit down with your toys and a grown-up", "Pick 10 toys you do not play with any more", "Put them in the donate box", "Give your keep toys a high five"] },

  // 2 Pack the Quiet Rooms
  { slug: "storage", quest: "Conquer the Storage Room", beast: "Attic Hoard Dragon", avatar: 56, phase: "quiet", who: "grownup", rooms: ["storage"], difficulty: 8, minutes: 90, due: -12,
    steps: ["Sort the shelves into keep, donate and trash", "Box the keepers by kind and write the contents on the side", "Tape and label each box with the room it goes to", "Stack the boxes against the wall, heavy ones on the bottom", "Haul the trash and the donate pile out"] },
  { slug: "garage", quest: "Slay the Garage Colossus", beast: "Junkpile Colossus", avatar: 178, phase: "quiet", who: "grownup", rooms: ["garage"], difficulty: 13, minutes: 180, due: -10,
    steps: ["Sort tools and supplies into keep, donate and trash", "Set aside paint, fuel and chemicals for proper disposal: movers will not take them", "Pack the tools into the toolbox and the hardware into labeled jars", "Box the sports gear, bikes and camping stuff", "Take down the shelves and racks you plan to keep", "Sweep up and put the trash and donate pile out"] },
  { slug: "garage-gear", quest: "Gear Squad: Sports Stuff", beast: "Gear Creep", avatar: 171, phase: "quiet", who: "kid", rooms: ["garage"], difficulty: 3, minutes: 30, due: -10,
    steps: ["Gather the balls, helmets and outdoor toys", "Sort what you still use from what you outgrew", "Put them in the big bin", "Tape the bin and write SPORTS on it"] },
  { slug: "guest-room", quest: "Clear the Guest Room", beast: "Spare Room Ghost", avatar: 90, phase: "quiet", who: "grownup", rooms: ["guest"], difficulty: 5, minutes: 60, scale: { room: "guest", perRoom: 45 }, due: -11,
    steps: ["Strip the bed and bag the linens", "Empty the drawers and the closet", "Box the decorations and lamps", "Take the bed apart if nobody needs it before the move"] },
  { slug: "office", quest: "Back Up and Pack the Office", beast: "Cord Kraken", avatar: 54, phase: "quiet", who: "grownup", rooms: ["office"], difficulty: 8, minutes: 90, due: -10,
    steps: ["Back up the computers and keep the backups in your bag", "Take photos of how the cables plug in before you unplug", "Bag and label the cables, chargers and small parts", "Box the files and papers, and shred what you do not need", "Wrap the monitors and printer with towels or bubble wrap"] },
  { slug: "yard", quest: "Tame the Yard", beast: "Hose Serpent", avatar: 53, phase: "quiet", who: "grownup", rooms: ["yard"], difficulty: 5, minutes: 60, due: -10,
    steps: ["Drain and coil the hoses", "Empty the fuel from the mower and trimmer", "Box the garden tools and pots", "Stack the patio chairs and wrap the cushions", "Check the shed and fence for anything left"] },
  { slug: "frames", quest: "Wrap the Picture Frames", beast: "Bubble Wrap Blob", avatar: 52, phase: "quiet", who: "kid", difficulty: 3, minutes: 30,
    steps: ["Take down the pictures you can reach, with a grown-up", "Wrap each frame in bubble wrap or a towel", "Stand them in a flat box, glass side to glass side", "Tape the box and write FRAGILE on it"] },
  { slug: "books-kid", quest: "Box Your Bookshelf", beast: "Heavy Tome Wyrm", avatar: 170, phase: "quiet", who: "kid", hero: true, difficulty: 3, minutes: 30,
    steps: ["Take all your books off the shelf", "Keep the ones you love and donate the ones you outgrew", "Pack the keepers in a SMALL box, because books are heavy", "Fill the gaps with paper so they do not slide", "Tape it and label it BOOKS with your name"] },
  { slug: "books-little", quest: "Put Your Books in a Box", beast: "Book Nook Elf", avatar: 169, phase: "quiet", who: "little", hero: true, difficulty: 1, minutes: 10,
    steps: ["Gather your books into a pile", "Pick your favorite 5 to keep out", "Put the rest in the box a grown-up gave you", "Draw a book on the side of the box"] },

  // 3 Bedrooms and Living Rooms
  { slug: "toys-little", quest: "Rescue the Stuffed Animals and Toys", beast: "Plush Pile Gremlin", avatar: 77, phase: "living", who: "little", hero: true, rooms: ["bedroom"], difficulty: 2, minutes: 15, due: -5,
    steps: ["Line up your stuffed animals", "Pick one buddy to ride in the car with you", "Tuck the others into the big bag, heads out so they can breathe", "Put your toys in the toy box and close the lid", "Draw a heart on the box"] },
  { slug: "dresser-kid", quest: "Empty and Pack Your Dresser", beast: "Dresser Wraith", avatar: 175, phase: "living", who: "kid", hero: true, rooms: ["bedroom"], difficulty: 5, minutes: 45, due: -4,
    steps: ["Empty the top drawers into a box, clothes folded", "Empty the lower drawers", "Clear your desk: papers, supplies and gadgets", "Wrap cords with a twist tie and bag the chargers", "Label every box with your name and the room"] },
  { slug: "closet-grownup", quest: "Pack Your Closet and Dresser", beast: "Closet Kraken", avatar: 48, phase: "living", who: "grownup", hero: true, rooms: ["bedroom"], difficulty: 8, minutes: 90, due: -4,
    steps: ["Pull everything off the hangers into wardrobe boxes or bags", "Empty the dresser and nightstand drawers", "Keep a week of clothes out in a suitcase", "Pack the shoes, belts and bags", "Label every box with the room it goes to"] },
  { slug: "living-dining", quest: "Pack the Living and Dining Rooms", beast: "Sofa Croc", avatar: 193, phase: "living", who: "grownup", rooms: ["living", "dining"], difficulty: 8, minutes: 90, due: -3,
    steps: ["Take photos of how the TV and game cables connect", "Box the shelves, decor and lamps", "Wrap the fragile things in paper", "Pack the china, linens and tablecloths", "Label the boxes and stack them by the door"] },
  { slug: "game-shelf", quest: "Pack the Game Shelf", beast: "Game Piece Poltergeist", avatar: 167, phase: "living", who: "kid", rooms: ["living"], difficulty: 3, minutes: 30, due: -4,
    steps: ["Gather the board games, puzzles and movies", "Check that each game has all its pieces and goes back in its box", "Pack them flat in a small box", "Tape it and label it GAMES"] },
  { slug: "box-labels", quest: "Draw the Box Labels", beast: "Marker Sprite", avatar: 101, phase: "living", who: "little", difficulty: 1, minutes: 10,
    steps: ["Get your fat markers", "Pick a box that is taped shut", "Draw a picture of the room it goes to: a bed, a pot, a couch", "Draw a star on the side that faces up", "Do five boxes"] },

  // 4 Kitchen and Bathrooms Last
  { slug: "pantry-fridge", quest: "Empty the Pantry and Fridge", beast: "Fridge Lich", avatar: 146, phase: "last", who: "grownup", rooms: ["kitchen"], difficulty: 8, minutes: 90,
    steps: ["Plan the last meals so the food gets used up", "Toss the old food and the expired jars", "Pack the dry food and spices, and keep a few days of food out", "Empty and defrost the freezer, and plan a cooler for what is left", "Wipe down the shelves"] },
  { slug: "dishes", quest: "Wrap the Dishes and Pans", beast: "Crockery Colossus", avatar: 47, phase: "last", who: "grownup", rooms: ["kitchen"], difficulty: 13, minutes: 150,
    steps: ["Set aside a box of last-days dishes: plates, cups, forks", "Wrap each plate and bowl in paper and stack them on edge", "Wrap the glasses and mugs one by one, fragile on top", "Pack the pots, pans and small appliances; wrap the knives in a towel", "Seal each box and write KITCHEN with FRAGILE or HEAVY", "Pack the drawers and utensils last"] },
  { slug: "mugs", quest: "Wrap the Mugs and Plastics", beast: "Mug Thug", avatar: 189, phase: "last", who: "kid", rooms: ["kitchen"], difficulty: 3, minutes: 40,
    steps: ["Get packing paper and a medium box", "Wrap each mug and plastic cup in paper", "Nest the plastic containers and pack their lids", "Fill the gaps with paper", "Tape it and write MUGS"] },
  { slug: "bathrooms", quest: "Pack the Bathrooms", beast: "Bottle Banshee", avatar: 87, phase: "last", who: "grownup", rooms: ["bathroom"], difficulty: 5, minutes: 60, scale: { room: "bathroom", perRoom: 30 },
    steps: ["Pack the medicine in one bag that travels with you", "Box the extra toiletries and cleaning supplies, with no open bottle unbagged", "Take down the shower curtains and towel bars you are keeping", "Keep out one towel, soap and toilet paper per bathroom for the last day"] },
  { slug: "laundry", quest: "Last Load Showdown", beast: "Last Load Lurker", avatar: 110, phase: "last", who: "grownup", rooms: ["laundry"], difficulty: 5, minutes: 60,
    steps: ["Wash and dry the last loads of clothes", "Disconnect the washer hoses and the dryer vent once they are empty", "Pack the detergent in a sealed bag, upright", "Wipe the machines inside and out"] },
  { slug: "backpack-little", quest: "Pack Your Moving Day Backpack", beast: "Backpack Boggart", avatar: 181, phase: "last", who: "little", hero: true, difficulty: 1, minutes: 10,
    steps: ["Get your moving day backpack", "Put in pajamas, a change of clothes and your toothbrush", "Add your favorite buddy and a book", "Add snacks and a water bottle, with a grown-up", "Zip it and put it by the door"] },
  { slug: "backpack-kid", quest: "Pack Your Moving Day Bag", beast: "Carry-On Boggart", avatar: 281, phase: "last", who: "kid", hero: true, difficulty: 2, minutes: 15,
    steps: ["Pack 2 outfits, pajamas and a toothbrush in a bag", "Add the chargers, headphones and your device", "Add a book or a game and a water bottle", "Put anything you cannot lose in your pocket or the bag", "Leave the bag by the door"] },
  { slug: "open-first", quest: "Fill the Open First Box", beast: "Open-First Mimic", avatar: 172, phase: "last", who: "team", difficulty: 5, minutes: 45,
    steps: ["Get a box and write OPEN FIRST on it in big letters", "Put in sheets, pillows and towels for each bed", "Add toilet paper, soap, a shower curtain and a night light", "Add paper plates, cups, snacks and the kettle", "Add chargers, a flashlight, scissors and a few tools", "Tape it shut and keep it out of the truck: it rides in the car"] },
  { slug: "pets", quest: "Plan for the Pets", beast: "Carrier Furball", avatar: 102, phase: "last", who: "grownup", rooms: ["pets"], difficulty: 5, minutes: 60,
    steps: ["Book a vet check and get a copy of the records", "Update the tags and the microchip with the new address", "Set up the carrier and a quiet room for moving day", "Pack food, bowls, bedding and a favorite toy in their own bag", "Decide who watches the pet while the doors are open"] },

  // 5 Moving Day
  { slug: "load-van", quest: "Load the Van", beast: "Van Dragon", avatar: 64, phase: "day", who: "team", difficulty: 13, minutes: 180,
    steps: ["Grown-ups load the heavy furniture first", "Load the boxes by room with the labels facing out", "Kids load the light boxes and soft things to fill the gaps", "Strap everything so it cannot slide", "Count the boxes and furniture against the list"] },
  { slug: "walkthrough", quest: "The Final Walkthrough", beast: "Last Look Bogey", avatar: 174, phase: "day", who: "team", difficulty: 5, minutes: 30,
    steps: ["Open every closet, cupboard and drawer", "Check the attic, garage, shed and under the stairs", "Check the bathrooms and the laundry", "Turn off the lights and lock the windows and doors", "Take photos of the meters, then hand over the keys and remotes"] },
  { slug: "beds-apart", quest: "Take Apart the Beds", beast: "Bed Frame Basilisk", avatar: 161, phase: "day", who: "grownup", rooms: ["bedroom"], difficulty: 8, minutes: 60, scale: { room: "bedroom", perRoom: 30 },
    steps: ["Strip the beds and bag the bedding", "Take the frames apart and tape each bag of bolts to its headboard", "Wrap the mattresses", "Wrap the slats and rails together", "Label every piece with the room"] },
  { slug: "deep-clean", quest: "Deep Clean the Old Place", beast: "Grime Devil", avatar: 92, phase: "day", who: "grownup", difficulty: 13, minutes: 180, due: 1,
    steps: ["Sweep and vacuum every room", "Scrub the kitchen: oven, fridge and sink", "Scrub the bathrooms", "Wipe the shelves, door frames and light switches", "Take out the last trash and do a final look"] },
  { slug: "pillow-parade", quest: "Pillow Parade to the Car", beast: "Pillow Banshee", avatar: 160, phase: "day", who: "little", hero: true, difficulty: 1, minutes: 10,
    steps: ["Hug your pillow", "Carry your pillow to the car", "Carry your blanket", "Buckle in with your backpack and your buddy"] },
  { slug: "dust-bunny-hunt", quest: "Last Dust Bunny Hunt", beast: "Last Dust Bunny", avatar: 74, phase: "day", who: "little", hero: true, difficulty: 1, minutes: 10,
    steps: ["Walk through your old room", "Pick up anything left on the floor", "Peek in the closet and under the bed", "Shout All clear to a grown-up"] },
  { slug: "light-boxes", quest: "Light Box Brigade", beast: "Box Golem", avatar: 82, phase: "day", who: "kid", hero: true, difficulty: 3, minutes: 30,
    steps: ["Find the boxes marked LIGHT", "Carry them to the van one at a time, no running", "Stack them where the grown-ups point", "Go back for the next one until the LIGHT boxes are gone"] },
  { slug: "clear-old-room", quest: "Clear Your Old Room", beast: "Old Room Dervish", avatar: 97, phase: "day", who: "kid", hero: true, rooms: ["bedroom"], difficulty: 3, minutes: 30,
    steps: ["Strip your bed and bag the sheets", "Check the closet, drawers and under the bed", "Sweep the floor", "Wipe the light switches and the door handle"] },

  // 6 Unpack
  { slug: "first-night", quest: "First Night Setup", beast: "First Night Owlbear", avatar: 157, phase: "unpack", who: "team", difficulty: 8, minutes: 90, due: 0,
    steps: ["Put the beds together and make them", "Open the OPEN FIRST box", "Put toilet paper, soap and towels in the bathrooms", "Plug in the lights and chargers", "Make a simple dinner on paper plates", "Find the pajamas and brush teeth"] },
  { slug: "beds-together", quest: "Rebuild the Beds", beast: "Bolt Basilisk", avatar: 261, phase: "unpack", who: "grownup", rooms: ["bedroom"], difficulty: 8, minutes: 60, scale: { room: "bedroom", perRoom: 30 }, due: 0,
    steps: ["Find the bed pieces and the bags of bolts", "Put the frames together", "Lift the mattresses on", "Make each bed with its sheets and pillows"] },
  { slug: "kitchen-first", quest: "Set Up the Kitchen Essentials", beast: "Plate Tower Kobold", avatar: 184, phase: "unpack", who: "grownup", rooms: ["kitchen"], difficulty: 8, minutes: 90, due: 1,
    steps: ["Plug in and clean the fridge, then unpack the food", "Unpack the last-days dish box", "Set up the coffee maker, kettle and toaster", "Put paper down on the shelves", "Flatten the empty boxes"] },
  { slug: "kitchen-cupboards", quest: "Fill the Kitchen Cupboards", beast: "Teacup Tower", avatar: 76, phase: "unpack", who: "grownup", rooms: ["kitchen"], difficulty: 8, minutes: 90, due: 3,
    steps: ["Unwrap the dishes and glasses", "Wash anything that needs it before it goes on a shelf", "Put dishes, glasses and pans where you use them most", "Do the drawers: utensils and knives", "Unpack the pantry"] },
  { slug: "bathrooms-set", quest: "Set Up the Bathrooms", beast: "Shower Curtain Phantom", avatar: 106, phase: "unpack", who: "grownup", rooms: ["bathroom"], difficulty: 5, minutes: 60, scale: { room: "bathroom", perRoom: 30 }, due: 2,
    steps: ["Hang the shower curtains and towel bars", "Put out toilet paper, soap and towels", "Unpack the medicine and put it up high, away from little hands", "Unpack the toiletries bag"] },
  { slug: "laundry-set", quest: "Hook Up the Laundry Room", beast: "Washer Lurker", avatar: 210, phase: "unpack", who: "grownup", rooms: ["laundry"], difficulty: 5, minutes: 60, due: 2,
    steps: ["Connect the washer hoses and the dryer vent", "Run one test load", "Set up the hamper and shelves", "Unpack the detergent and supplies"] },
  { slug: "bedroom-unpack", quest: "Unpack Your Closet and Dresser", beast: "Hanger Wraith", avatar: 275, phase: "unpack", who: "grownup", hero: true, rooms: ["bedroom"], difficulty: 8, minutes: 75, due: 4,
    steps: ["Hang up the clothes", "Fill the drawers", "Put the nightstand things in place", "Flatten and stack the empty boxes"] },
  { slug: "living-unpack", quest: "Settle the Living and Dining Rooms", beast: "Sofa Croc Returns", avatar: 293, phase: "unpack", who: "grownup", rooms: ["living", "dining"], difficulty: 8, minutes: 90, due: 5,
    steps: ["Place the couch, tables and TV", "Plug in the TV and consoles, using your photos", "Unpack the shelves and the decor", "Hang the pictures and the curtains", "Flatten the boxes"] },
  { slug: "outer-realms", quest: "Settle the Garage, Storage and Yard", beast: "Shelf-Stacking Jotun", avatar: 278, phase: "unpack", who: "grownup", rooms: ["garage", "storage", "yard"], difficulty: 8, minutes: 90,
    steps: ["Put up the garage and storage shelves", "Unpack the tools and the sports gear", "Set up the yard furniture and the hose", "Stack the leftover boxes for recycling"] },
  { slug: "make-bed-little", quest: "Make Your New Bed", beast: "Pillow Pooka", avatar: 158, phase: "unpack", who: "little", hero: true, difficulty: 1, minutes: 10, due: 0,
    steps: ["Help a grown-up put the sheet on", "Put your pillow and blanket on", "Sit your buddy on the pillow", "Hop in for a trial snuggle"] },
  { slug: "toys-home", quest: "Bring the Toys Home", beast: "Homecoming Sock Monster", avatar: 75, phase: "unpack", who: "little", hero: true, rooms: ["bedroom"], difficulty: 1, minutes: 15, due: 3,
    steps: ["Open the box of buddies", "Give each one a spot on the shelf or the bed", "Put your toys in the toy box", "Draw a welcome sign for your new room"] },
  { slug: "kitchen-unwrap", quest: "Unwrap the Mugs and Cups", beast: "Wrapping Paper Pixie", avatar: 185, phase: "unpack", who: "kid", rooms: ["kitchen"], difficulty: 3, minutes: 30, due: 2,
    steps: ["Find the boxes marked MUGS", "Unwrap each mug and cup", "Put the paper in the recycling bin", "Put the cups on the shelf a grown-up points to"] },
  { slug: "dresser-unpack", quest: "Unpack Your Dresser and Desk", beast: "Desk and Dresser Drake", avatar: 166, phase: "unpack", who: "kid", hero: true, rooms: ["bedroom"], difficulty: 5, minutes: 45, due: 5,
    steps: ["Put your clothes in the drawers", "Hang up the clothes that go on hangers", "Set up your desk and put your gadgets on it", "Put your books on the shelf", "Flatten the boxes and add them to the pile"] },
];

interface DailyTemplate {
  slug: string;
  quest: string;
  beast: string;
  avatar: number;
  /** "all": every hero does it; "open": an open bounty, whoever gets to it first */
  who: "all" | "open";
  rooms?: MovingRoomId[];
  minutes: number;
  times: TimeOfDay[];
  steps: string[];
}

/** The few chores that keep the house running during the move */
export const MOVING_DAILIES: readonly DailyTemplate[] = [
  { slug: "teeth", quest: "Brush Your Teeth", beast: "Camp Fang Fairy", avatar: 138, who: "all", minutes: 6, times: ["morning", "night"],
    steps: ["Brush the top and bottom teeth for two minutes", "Rinse and spit", "Put the toothbrush back in the travel kit"] },
  { slug: "dishes", quest: "Dishes Before Bed", beast: "Paper Plate Goblin", avatar: 104, who: "open", minutes: 15, times: ["evening"],
    steps: ["Carry the plates and cups to the sink", "Rinse the food off", "Wash them or load them", "Dry them and stack them in the still-out box"] },
  { slug: "tidy", quest: "Ten Minute Tidy", beast: "Clutter Hog", avatar: 180, who: "all", minutes: 10, times: ["evening"],
    steps: ["Set a 10 minute timer", "Pick up everything on the floor", "Put loose things in the box for their room", "Throw away the real trash"] },
  { slug: "feed-pets", quest: "Feed the Pets", beast: "Pet Bowl Kobold", avatar: 188, who: "open", rooms: ["pets"], minutes: 10, times: ["morning", "evening"],
    steps: ["Fill the food bowl", "Fill the water bowl with fresh water", "Check that the pet is in a safe spot and give it a pat"] },
];

// ---------------------------------------------------------------------------------------------------------------
// The builder.

/** A beast the pack adds; `attackCooldown` is the minutes a hero gets per checklist step */
export type MovingBeast = PackBeast;

/** One line of the quest list for the Game Master */
export interface MovingPackRow {
  questId: string;
  phase: string;
  name: string;
  who: string;
  difficulty: number;
  minutes: number;
  /** Days from the move date the quest is due, after any squeezing: negative before, 0 the day itself */
  dueOffset: number;
  /** The date it is due, "YYYY-MM-DD" */
  dueOn: string;
  beast: string;
  steps: number;
  approval: boolean;
}

export interface MovingPack {
  categories: AchievementCategoryInterface[];
  beasts: MovingBeast[];
  quests: Achievement[];
  rows: MovingPackRow[];
  /** Playing heroes */
  heroCount: number;
  /** How many days the pre-move phases were squeezed (1 means the full three weeks) */
  scale: number;
  /** Days from today to the move date */
  daysToMove: number;
}

/** The same background spread for the same slug every time, so a reload replaces a beast with itself */
const backgroundsFor = (slug: string): Pick<Beast, "bg1" | "bg2"> => {
  let hash = 7;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) % 100003;
  const bg1 = hash % 326;
  return { bg1, bg2: (bg1 + 97 + (hash % 11) * 13) % 326 };
};

const MAX_MINUTES = 180;

const roundMinutes = (minutes: number): number => Math.min(MAX_MINUTES, Math.max(5, Math.round(minutes / 5) * 5));

const questRecord = (fields: {
  id: string;
  name: string;
  phase: PhaseId;
  beastId: string;
  type: string;
  assignee: string[];
  startsOn: Date;
  endsOn?: Date;
  difficulty: number;
  minutes: number;
  approval: boolean;
  times?: TimeOfDay[];
  daily?: boolean;
}): Achievement => ({
  id: fields.id,
  achievementName: fields.name,
  categoryId: categoryIdOf(fields.phase),
  beastId: fields.beastId,
  subAchievementIds: [],
  requiresApproval: fields.approval,
  bonusAchievement: false,
  type: fields.type,
  assignee: fields.assignee,
  startsOn: fields.startsOn.toISOString(),
  endsOn: fields.endsOn ? fields.endsOn.toISOString() : "",
  dueByTime: "",
  ...(fields.times?.length ? { timesOfDay: [...fields.times] } : {}),
  basicSchedule: fields.daily ? "daily" : "once",
  scheduleType: "basic",
  showDailyUntilComplete: Boolean(fields.daily),
  customFrequency: 1,
  customPeriodType: "day",
  customPeriodNumber: 1,
  repeatOnDays: [],
  difficulty: fields.difficulty,
  estimatedMinutes: fields.minutes,
  ...rewardsFor(fields.difficulty),
  adventureType: "beast",
});

const WHO_LABELS: Record<MovingBand | "team" | "all" | "open", string> = {
  little: "little", kid: "kid", grownup: "grown-up", team: "team", all: "everyone", open: "anyone",
};

export const buildMovingPack = (answers: MovingAnswers): MovingPack => {
  const today = startOfDay(answers.today ? parseLocalDate(answers.today) : new Date());
  const moveDay = parseLocalDate(answers.moveDate);
  const daysToMove = differenceInCalendarDays(moveDay, today);
  // A move closer than three weeks squeezes the pre-move phases together, still in order
  const scale = Math.min(1, Math.max(1 / 3, daysToMove / 21));
  const dayOf = (offset: number): Date => addDays(moveDay, offset < 0 ? Math.min(-1, Math.round(offset * scale)) : offset);

  const heroes = answers.heroes.filter((hero): hero is MovingHero & { band: MovingBand } => hero.band !== "out");
  const nameOf = (hero: MovingHero): string => hero.name || "Hero";
  const roomCount = (room: MovingRoomId): number => Math.max(0, Math.floor(Number(answers.rooms[room]) || 0));
  const hasRooms = (rooms?: MovingRoomId[]): boolean => !rooms || rooms.some((room) => roomCount(room) > 0);

  const quests: Achievement[] = [];
  const beasts: MovingBeast[] = [];
  const rows: MovingPackRow[] = [];
  const usedPhases = new Set<PhaseId>();

  const addBeast = (slug: string, name: string, avatar: number, steps: string[], minutes: number): string => {
    const id = `beast-move-${slug}`;
    beasts.push({
      id, name, avatar, ...backgroundsFor(slug), aspectRatio: 48, checklist: [...steps],
      attackCooldown: cooldownOf(minutes, steps.length),
    });
    return id;
  };

  for (const template of MOVING_TEMPLATES) {
    if (!hasRooms(template.rooms)) continue;
    const phase = PHASE_BY_ID[template.phase];
    const extraRooms = template.scale ? Math.max(0, roomCount(template.scale.room) - 1) : 0;
    const minutes = roundMinutes(template.minutes + (template.scale ? template.scale.perRoom * extraRooms : 0));
    const band = template.who === "team" ? heroes : heroes.filter((hero) => hero.band === template.who);
    if (!band.length) continue;

    const groups: { suffix: string; label: string; assignee: string[] }[] =
      template.hero && template.who !== "team"
        ? band.map((hero) => ({ suffix: `-${hero.id}`, label: band.length > 1 ? ` (${nameOf(hero)})` : "", assignee: [hero.id] }))
        : [{ suffix: "", label: "", assignee: band.map((hero) => hero.id) }];

    const beastId = addBeast(template.slug, template.beast, template.avatar, template.steps, minutes);
    const dueOffset = template.due ?? phase.due;
    usedPhases.add(template.phase);
    for (const group of groups) {
      const isSolo = group.assignee.length === 1;
      const approval = template.who === "kid" && template.difficulty >= 5;
      const id = `move-${template.slug}${group.suffix}`;
      quests.push(questRecord({
        id, name: `${template.quest}${group.label}`, phase: template.phase, beastId,
        type: isSolo ? "individual" : "collaborate", assignee: group.assignee,
        startsOn: dayOf(Math.min(phase.opens, dueOffset)), difficulty: template.difficulty, minutes, approval,
      }));
      rows.push({
        questId: id, phase: phase.name, name: `${template.quest}${group.label}`, who: WHO_LABELS[template.who],
        difficulty: template.difficulty, minutes, dueOffset: differenceInCalendarDays(dayOf(dueOffset), moveDay),
        dueOn: dateKey(dayOf(dueOffset)), beast: template.beast,
        steps: template.steps.length, approval,
      });
    }
  }

  const camp = PHASE_BY_ID.camp;
  for (const daily of MOVING_DAILIES) {
    if (!hasRooms(daily.rooms) || !heroes.length) continue;
    const beastId = addBeast(`daily-${daily.slug}`, daily.beast, daily.avatar, daily.steps, daily.minutes);
    const isAll = daily.who === "all";
    const id = `move-daily-${daily.slug}`;
    usedPhases.add("camp");
    quests.push(questRecord({
      id, name: daily.quest, phase: "camp", beastId, type: isAll ? "individual" : "asNeeded",
      assignee: isAll ? heroes.map((hero) => hero.id) : [], startsOn: dayOf(camp.opens), endsOn: dayOf(camp.due),
      difficulty: 1, minutes: daily.minutes, approval: false, times: daily.times, daily: true,
    }));
    rows.push({
      questId: id, phase: camp.name, name: daily.quest, who: WHO_LABELS[daily.who], difficulty: 1, minutes: daily.minutes,
      dueOffset: differenceInCalendarDays(dayOf(camp.due), moveDay), dueOn: dateKey(dayOf(camp.due)), beast: daily.beast, steps: daily.steps.length, approval: false,
    });
  }

  const categories = MOVING_PHASES.filter((phase) => usedPhases.has(phase.id)).map((phase) => ({
    id: categoryIdOf(phase.id), name: categoryNameOf(phase.id),
  }));
  return { categories, beasts, quests, rows, heroCount: heroes.length, scale, daysToMove };
};

/** The pack as a backup file for a merge restore; it names only categories, beasts and quests */
export const movingPackBackup = (pack: MovingPack, now: Date = new Date()): BackupFile => packBackup(pack, now);

/** "Added 52 quests and 24 beasts for 3 heroes. First up: ..." and a note when the move is near */
export const movingPackSummary = (pack: MovingPack): string => {
  const first = pack.rows.find((row) => row.phase !== PHASE_BY_ID.camp.name)?.name ?? pack.rows[0]?.name;
  const parts = [
    `Added ${plural(pack.quests.length, "quest")} and ${plural(pack.beasts.length, "beast")} for ${pack.heroCount} ${pack.heroCount === 1 ? "hero" : "heroes"}.`,
  ];
  if (first) parts.push(`First up: ${first}.`);
  if (pack.daysToMove < 21 && pack.daysToMove >= 0) {
    parts.push(`The move is ${plural(pack.daysToMove, "day")} away, so the early phases are squeezed together.`);
  }
  return parts.join(" ");
};

/** The quest list as plain text, grouped by phase, for the Game Master to read */
export const movingPackList = (pack: MovingPack): string => {
  const lines: string[] = [];
  let phase = "";
  const phaseOrder = (row: MovingPackRow): number => MOVING_PHASES.findIndex((candidate) => candidate.name === row.phase);
  for (const row of pack.rows.slice().sort((a, b) => phaseOrder(a) - phaseOrder(b) || a.dueOffset - b.dueOffset)) {
    if (row.phase !== phase) {
      phase = row.phase;
      lines.push("", `## ${phase}`, "", "| Quest | Who | Diff | Min | Due | Beast |", "|---|---|---|---|---|---|");
    }
    const days = Math.abs(row.dueOffset);
    const due = row.dueOffset === 0 ? "move day" : `${days} ${days === 1 ? "day" : "days"} ${row.dueOffset < 0 ? "before" : "after"}`;
    lines.push(`| ${row.name}${row.approval ? " (GM approves)" : ""} | ${row.who} | ${row.difficulty} | ${row.minutes} | ${due} | ${row.beast} |`);
  }
  return lines.join("\n");
};
