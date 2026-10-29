import type { ActionResult } from "@/hooks/usePartyCall";
import { problemText } from "@/lib/services/party/partyProblemText";
import type { HeroPartyMode } from "@/lib/services/party/partyRules";

/** One hero on the Settings > Party list */
export interface HeroModeRow {
  id: string;
  name: string;
}

/** The three ways a hero may party, in the order the buttons run */
export const MODE_OPTIONS: readonly { id: HeroPartyMode; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "ask", label: "Ask first" },
  { id: "home", label: "Home only" },
];

/** What the page says once a hero is set to stay home: how many parties they left, why they could not, or nothing when they were in none */
export const leaveNoteFor = (name: string, result: ActionResult<number>): string => {
  const wasRefused = !result.ok;
  if (wasRefused) {
    return `${name} is set to stay home, but is still in a party with other families: ${problemText(result.problem)} Use Leave below to take them out.`;
  }
  const wasInNone = result.value === 0;
  if (wasInNone) return "";
  const parties = result.value === 1 ? "a party" : `${result.value} parties`;
  return `${name} left ${parties} with other families.`;
};
