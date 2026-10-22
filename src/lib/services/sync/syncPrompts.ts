/**
 * What the Town Clerk says about a hero's turn and the family's save (family sync spec, section 5), as in-world prompts
 * (the game's own dialog, never a toast or a native alert). The wording is the `sync.*` lines of the copy catalogue;
 * this turns them into the prompt to show, so the screens stay thin and the wording is tested without a screen.
 */
import { noticeOf, type RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import { copyFor } from "@/lib/services/copy/copy";
import type { Voice } from "@/lib/services/copy/voices";
import { CLERK } from "@/lib/services/hometown/hometownPrompts";
import type { TurnBusy } from "./heroTurn";

/** The clerk's look for these lines: the Town Hall's colours with the stone tablet rising */
const CLERK_LOOK = { accent: "townHall", sprite: "tablet" } as const;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** How the busy line says a time, the newest first: the first step whose limit the time is under */
const AGO_STEPS: { under: number; say: (elapsed: number) => string }[] = [
  { under: MINUTE_MS, say: () => "just now" },
  { under: HOUR_MS, say: (elapsed) => `${Math.floor(elapsed / MINUTE_MS)} min ago` },
  { under: DAY_MS, say: (elapsed) => `${Math.floor(elapsed / HOUR_MS)} h ago` },
  { under: 2 * DAY_MS, say: () => "yesterday" },
];

/**
 * How long ago a device was last seen, the way the busy line says it: "just now", "5 min ago", "3 h ago", "yesterday",
 * "4 days ago". A time the site could not give (or one that is not a time) is "a while ago"; a time ahead of this
 * device's clock is "just now".
 */
export const agoOf = (iso: string | null, now: Date): string => {
  const at = iso === null ? Number.NaN : Date.parse(iso);
  const isUnknown = !Number.isFinite(at);
  if (isUnknown) return "a while ago";
  const elapsed = now.getTime() - at;
  const step = AGO_STEPS.find((candidate) => elapsed < candidate.under);
  return step ? step.say(elapsed) : `${Math.floor(elapsed / DAY_MS)} days ago`;
};

/** The device a busy answer names; a blank label is still a device */
const deviceOf = (label: string | null): string => label?.trim() || "another device";

/** A line that starts with a device's label ("the family tablet") starts with a capital */
const capitalized = (line: string): string => line.charAt(0).toUpperCase() + line.slice(1);

/**
 * "{nick} is still playing on {device} (last seen {ago}). Play here anyway?" with Play here (`play`, primary) and Not
 * now (`later`); Escape is Not now. Play here takes the turn over; Not now leaves the hero to the other device.
 */
export const busyPrompt = (nick: string, device: TurnBusy, now: Date, voice: Voice = "adventure"): RevealPromptOptions => ({
  speaker: CLERK,
  ...CLERK_LOOK,
  lines: [copyFor("sync.busy", voice, { nick, device: deviceOf(device.label), ago: agoOf(device.lastSeenAt, now) })],
  choices: [
    { id: "play", label: copyFor("sync.playHere", voice), icon: "gamepad", tone: "primary" },
    { id: "later", label: copyFor("sync.notNow", voice), icon: "times", tone: "ghost" },
  ],
  cancelId: "later",
});

/** "{device} took over {nick}'s game while this one was away. This device has caught up." and OK */
export const tookOverPrompt = (nick: string, label: string | null, voice: Voice = "adventure"): RevealPromptOptions =>
  noticeOf(CLERK, capitalized(copyFor("sync.tookOver", voice, { nick, device: deviceOf(label) })), CLERK_LOOK);

/** A progress line with the records so far once there are some; nothing to tap */
const progressPrompt = (line: string, count: number): RevealPromptOptions => {
  const hasCount = count > 0;
  return { speaker: CLERK, ...CLERK_LOOK, lines: [hasCount ? `${line} (${count})` : line], choices: [] };
};

/** "Fetching your family's world…" with the records landed so far; a progress line, so nothing to tap */
export const firstPullPrompt = (count: number, voice: Voice = "adventure"): RevealPromptOptions =>
  progressPrompt(copyFor("sync.firstPull", voice), count);

/** "Sending the family's save to the site…" with the records sent so far, on a family device's first push */
export const firstPushPrompt = (count: number, voice: Voice = "adventure"): RevealPromptOptions =>
  progressPrompt(copyFor("sync.firstPush", voice), count);

/** "Playing the whole game on this phone needs XP Pro. Ask your Game Master." and OK */
export const proRequiredPrompt = (voice: Voice = "adventure"): RevealPromptOptions =>
  noticeOf(CLERK, copyFor("sync.proRequired", voice), CLERK_LOOK);

/** "No signal. Play on; this device tells the others when it's back." and OK */
export const offlinePrompt = (voice: Voice = "adventure"): RevealPromptOptions =>
  noticeOf(CLERK, copyFor("sync.offline", voice), CLERK_LOOK);
