/**
 * What the Town Clerk asks and says about the family on the server, as in-world prompts (the game's own dialog, never
 * a toast or a native alert). The wording is the `family.*` lines of the copy catalogue; this turns them into the
 * prompt to show, in the clerk's voice, so the screens stay thin and the wording is tested without a screen.
 */
import { noticeOf, yesNoOf, type RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import type { family } from "@/lib/services/copy/catalog/family";
import { copyFor } from "@/lib/services/copy/copy";
import type { CopyVars, Voice } from "@/lib/services/copy/voices";
import { CLERK } from "@/lib/services/hometown/hometownPrompts";

/** A line the clerk says about the family: `family.taken`, `family.codeInvalid` and so on */
export type FamilyCopyKey = keyof typeof family;

/** The clerk's look for these lines: the Town Hall's colours with the stone tablet rising */
const CLERK_LOOK = { accent: "townHall", sprite: "tablet" } as const;

/** The clerk says one of the family lines and waits for OK; `vars` fill its {placeholders} */
export const familyNotice = (key: FamilyCopyKey, vars?: CopyVars, voice: Voice = "adventure"): RevealPromptOptions =>
  noticeOf(CLERK, copyFor(key, voice, vars), CLERK_LOOK);

/** "This family's home is another device. Make this one home?" Yes moves home here; No (or Escape) leaves it. */
export const homeQuestionPrompt = (voice: Voice = "adventure"): RevealPromptOptions =>
  yesNoOf(CLERK, copyFor("family.homeElsewhere", voice), { yes: "Make it home", no: "Not now" }, CLERK_LOOK);

/** "Unlink {label}? It stops working right away." Yes unlinks it; No leaves it. */
export const removePhonePrompt = (label: string, voice: Voice = "adventure"): RevealPromptOptions =>
  yesNoOf(CLERK, copyFor("family.removePhone", voice, { label }), { yes: "Unlink", no: "Keep" }, CLERK_LOOK);
