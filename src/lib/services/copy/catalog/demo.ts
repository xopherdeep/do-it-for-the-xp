/**
 * Demo lines: they exercise the voices end to end (the spec and the first user of useCopy). Real screens get a catalogue
 * file of their own beside this one and are added in catalog/index.ts.
 */
import type { CopyCatalog } from "../voices";

export const demo = {
  "demo.questDone": {
    simple: "You did it! Get {xp} XP!",
    adventure: "The {beast} falls! {xp} XP is yours, and it earned every point.",
    classic: "{beast} defeated. {xp} XP.",
  },
  "demo.hello": {
    adventure: "Welcome back, {name}. The quests missed you.",
  },
} satisfies CopyCatalog;
