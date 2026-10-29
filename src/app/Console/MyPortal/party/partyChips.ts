import { HOME_PARTY_ID } from "@/lib/services/party/partyRules";

/** One party in the switcher at the foot of My Party */
export interface PartyChip {
  id: string;
  name: string;
}

/** The household's own party: always there, always first */
export const HOME_CHIP: PartyChip = { id: HOME_PARTY_ID, name: "Home" };

/** The chip that opens the panel to form a party or join one by a code: always last */
export const NEW_PARTY_ID = "new";
export const NEW_CHIP: PartyChip = { id: NEW_PARTY_ID, name: "+ Party" };
