/**
 * What the Quick Start screen says about the Howling Spire (the Wind Temple): where tonight's quests also wait. The Spire
 * holds only as many of them as have a free fight room near the door, so the line says which: all of them, some ({count}
 * arrives as digits) or one. A temple that holds none says nothing (quickStartSpireNote.ts). Place and temple names stay
 * the same in every voice.
 */
import type { CopyCatalog } from "../voices";

export const quickStart = {
  "quickStart.spireAll": {
    simple: "Tonight's quests are in the Howling Spire too.",
    adventure: "Tonight's quests also wait in the Howling Spire, the temple out on the Plains.",
    classic: "Tonight's quests are also in the Howling Spire, the temple on the Plains.",
  },
  "quickStart.spireSome": {
    simple: "{count} of tonight's quests are in the Howling Spire too.",
    adventure: "{count} of tonight's quests also wait in the Howling Spire, the temple out on the Plains.",
    classic: "{count} of tonight's quests are also in the Howling Spire, the temple on the Plains.",
  },
  // A single quest reads its own line so no voice says "1 of tonight's quests also wait"
  "quickStart.spireOne": {
    simple: "One of tonight's quests is in the Howling Spire too.",
    adventure: "One of tonight's quests also waits in the Howling Spire, the temple out on the Plains.",
    classic: "One of tonight's quests is also in the Howling Spire, the temple on the Plains.",
  },
} satisfies CopyCatalog;
