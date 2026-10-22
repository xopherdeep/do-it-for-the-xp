/**
 * What the Town Clerk says about keeping the family's phones in step (family sync): who holds a hero's turn, the first
 * download and upload, the Pro gate, a verdict on its way and a missing signal. Written in the adventure voice; the
 * simple and classic voices fall back to it until they get wording of their own. Spoken through the reveal prompt,
 * never a toast or native alert.
 */
import type { CopyCatalog } from "../voices";

export const sync = {
  "sync.busy": {
    adventure: "{nick} is still playing on {device} (last seen {ago}). Play here anyway?",
  },
  "sync.tookOver": {
    adventure: "{device} took over {nick}'s game while this one was away. This device has caught up.",
  },
  "sync.firstPull": {
    adventure: "Fetching your family's world…",
  },
  "sync.firstPush": {
    adventure: "Sending the family's save to the site…",
  },
  "sync.proRequired": {
    adventure: "Playing the whole game on this phone needs XP Pro. Ask your Game Master.",
  },
  "sync.offline": {
    adventure: "No signal. Play on; this device tells the others when it's back.",
  },
  "sync.verdictSent": {
    adventure: "Approved · paying on {nick}'s device",
  },
  "sync.verdictRejectedSent": {
    adventure: "Not this time · sent",
  },
  "sync.playHere": {
    adventure: "Play here",
  },
  "sync.notNow": {
    adventure: "Not now",
  },
  "sync.thisPhone": {
    adventure: "This is {nick}'s phone",
  },
} satisfies CopyCatalog;
