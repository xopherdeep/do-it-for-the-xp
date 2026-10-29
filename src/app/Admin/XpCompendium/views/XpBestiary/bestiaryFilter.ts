import type { Beast } from "@/lib/databases/BestiaryDb";
import { creditLine, isLive, isReturned, isWaiting } from "@/lib/services/creations/creations";

/**
 * What the Game Master's Bestiary lists. Pure: no storage, no Vue.
 *
 * The page reads every beast record (getBeasts), because a beast a hero proposed is not in play yet and must not sit
 * among the beasts the family fights. The segment under the search box splits them: All is the beasts in play,
 * Creations is every beast a hero made, whatever state its proposal is in (waiting, sent back, approved).
 */

export type BestiarySegment = "all" | "creations";

// Storage can hand back a hole in the list: neither segment lists it
const hasProposal = (beast: Beast | null | undefined): boolean => Boolean(beast?.proposal);

/** The beasts of a segment whose name has the search in it (any case). */
export function bestiaryFilter(beasts: readonly Beast[], segment: BestiarySegment, search: string): Beast[] {
  const isCreations = segment === "creations";
  const inSegment = isCreations ? hasProposal : isLive;
  const query = search.toLowerCase();
  return beasts.filter((beast) => {
    const isInSegment = inSegment(beast);
    return isInSegment && beast.name.toLowerCase().includes(query);
  });
}

/** What the page says when a segment lists nothing. */
export function emptyBestiaryLine(segment: BestiarySegment): string {
  return segment === "creations" ? "No creations yet" : "No beasts found in the bestiary...";
}

/**
 * The small chip on a beast's card: "Waiting" for one no Game Master has looked at, "Came back" for one sent back, the
 * credit line ("Drawn by Ronan") for an approved kid beast, and nothing for any other beast.
 */
export function beastBadge(beast: Beast, nickOf: (id: string) => string): string {
  if (isWaiting(beast)) return "Waiting";
  if (isReturned(beast)) return "Came back";
  return creditLine(beast, "beast", nickOf);
}
