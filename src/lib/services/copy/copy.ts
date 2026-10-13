/**
 * Looking a line up in the copy catalogue: the voice picks the wording, adventure is the fallback, {placeholders} are
 * filled from the vars. Pure: the Vue side is hooks/useVoice.ts (`useCopy().t`), the non-Vue callers (a teller, a
 * toast helper) call `copyFor` with the hero's voice.
 */
import { CATALOG } from "./catalog";
import type { CopyCatalog, CopyEntry, CopyVars, Voice } from "./voices";

/** A simple-voice line is at most this many words (the lint-ish spec holds the whole catalogue to it) */
export const SIMPLE_MAX_WORDS = 10;

const PLACEHOLDER = /\{(\w+)\}/g;

/** `template` with every {name} replaced by `vars.name`; a placeholder with no value is left as written so it shows */
export const formatCopy = (template: string, vars: CopyVars = {}): string =>
  template.replace(PLACEHOLDER, (whole, name: string) => {
    const value = vars[name];
    const hasNoValue = value === undefined || value === null;
    return hasNoValue ? whole : String(value);
  });

const isWritten = (text: string | undefined): text is string => typeof text === "string" && text.trim() !== "";

/** The wording of an entry in a voice: its own, else the adventure line */
export const lineFor = (entry: CopyEntry, voice: Voice): string => {
  const own = entry[voice];
  return isWritten(own) ? own : entry.adventure;
};

/** `key` read from `catalog` in `voice`, placeholders filled. A key the catalogue does not hold comes back as the key. */
export const copyFrom = (catalog: CopyCatalog, key: string, voice: Voice, vars?: CopyVars): string => {
  const entry = Object.prototype.hasOwnProperty.call(catalog, key) ? catalog[key] : undefined;
  if (!entry) return key;
  return formatCopy(lineFor(entry, voice), vars);
};

/** `copyFrom` on the game's catalogue */
export const copyFor = (key: string, voice: Voice, vars?: CopyVars): string => copyFrom(CATALOG, key, voice, vars);

/** Whether the game's catalogue holds this key */
export const hasCopy = (key: string): boolean => Object.prototype.hasOwnProperty.call(CATALOG, key);

/** How many words a line holds: markup is ignored and a {placeholder} counts as one word; bare marks and icons do not */
export const wordCount = (line: string): number =>
  line
    .replace(/<[^>]*>/g, " ")
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}{}]/u.test(token)).length;
