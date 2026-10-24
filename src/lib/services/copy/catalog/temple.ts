/**
 * What a temple says as the hero moves through it (TempleGrounds): the beasts of a floor stirring the first time the
 * hero arrives on it (wakeOnEntry.ts, "floor by floor"), and the stairs that stay shut until the floor's chores are done
 * (travel.ts). Button names (Onward) and floor names (2F, B1) stay the same in every voice. {count} arrives as digits,
 * {floor} as the floor's name. A voice that reads the same as adventure is left out: the adventure line is the fallback.
 */
import type { CopyCatalog } from "../voices";

export const temple = {
  // Several beasts stirred; a single one reads its own line (floorWakeOne) so no voice says "1 beasts"
  "temple.floorWake": {
    simple: "{count} beasts woke up on {floor}!",
    adventure: "{count} beasts stir on {floor}.",
    classic: "{count} beasts stir on {floor}.",
  },
  "temple.floorWakeOne": {
    simple: "A beast woke up on {floor}!",
    adventure: "A beast stirs on {floor}.",
    classic: "A beast stirs on {floor}.",
  },
  // The stairs of a project tower, shut until every chore on the floor is done (the sheet's line and the turned-back toast)
  "temple.floorClearedLock": {
    simple: "Do every chore on this floor to go up",
    adventure: "Clear every chore on this floor to climb",
    classic: "The stairs stay sealed until this floor's chores are done",
  },
} satisfies CopyCatalog;
