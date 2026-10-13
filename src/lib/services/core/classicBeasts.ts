import type { Beast } from "@/lib/databases/BestiaryDb";

/**
 * The classic beasts: the family's original monster art (src/assets/images/beasts/001-093) as beasts a Game
 * Master can pick, next to the painted chore library. 001-040 are the small monsters, 047-073 the painted ones,
 * 074-093 the pixel chore beasts. 041-046 are Pegasus sprites, not monsters, so they are not here.
 *
 * Names are placeholders the family can rename once a beast is in the bestiary; a few are already known.
 * A classic beast has no chore, room or age band (those belong to the chore library), only art and a
 * generic task list to edit.
 *
 * Classic beasts are for picking, never for chance: they carry no element, and the automatic pools (a free
 * fight's random beast, a temple room's beast by element) skip them by their id (isClassicBeastId), so they
 * only fight where a Game Master chose them for a quest or a room.
 */
export interface ClassicBeast extends Beast {
  slug: string;
  classic: true;
  /** Absent on purpose: these belong to the chore library, which classic beasts are not part of */
  chore?: undefined;
  room?: undefined;
  age?: undefined;
}

/** Every classic beast id starts like this; it survives a rename, so it is how the automatic pools tell them apart */
export const CLASSIC_ID_PREFIX = "beast-classic-";

export const isClassicBeastId = (id: unknown): boolean => String(id).startsWith(CLASSIC_ID_PREFIX);

export const CLASSIC_FIRST_AVATAR = 1;
export const CLASSIC_LAST_AVATAR = 93;
/** The Pegasus sprites sit in the middle of the original art numbering */
export const PEGASUS_AVATARS: readonly number[] = [41, 42, 43, 44, 45, 46];

/** Names the family already uses for a picture; every other beast waits for one */
const KNOWN_NAMES: Readonly<Record<number, string>> = {
  50: "Moanin Ronan",
};

/** Same range the library beasts' battle backgrounds come from (BestiaryService.MAX_BG_INDEX) */
const BG_COUNT = 326;

const padded = (avatar: number): string => String(avatar).padStart(3, "0");

/** Spread across the backgrounds so neighbours differ, but the same every time so ids and records stay stable */
const backgroundsFor = (avatar: number): Pick<Beast, "bg1" | "bg2"> => {
  const bg1 = (avatar * 53 + 17) % BG_COUNT;
  const bg2 = (bg1 + 111 + (avatar % 7) * 13) % BG_COUNT;
  return { bg1, bg2 };
};

const classicBeast = (avatar: number): ClassicBeast => ({
  id: `${CLASSIC_ID_PREFIX}${padded(avatar)}`,
  slug: `classic-${padded(avatar)}`,
  name: KNOWN_NAMES[avatar] ?? `Classic Beast ${padded(avatar)}`,
  avatar,
  ...backgroundsFor(avatar),
  aspectRatio: 48,
  checklist: ["Get ready", "Do the chore", "Check that it is done"],
  classic: true,
});

const isMonster = (avatar: number): boolean => !PEGASUS_AVATARS.includes(avatar);

export const CLASSIC_BEASTS: ClassicBeast[] = Array.from(
  { length: CLASSIC_LAST_AVATAR - CLASSIC_FIRST_AVATAR + 1 },
  (_, index) => CLASSIC_FIRST_AVATAR + index
)
  .filter(isMonster)
  .map(classicBeast);
