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
