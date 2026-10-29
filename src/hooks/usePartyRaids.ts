import { usePartyCall } from "@/hooks/usePartyCall";
import { startPartyRaid } from "@/lib/services/party/partyClient";
import type { RaidWindow } from "@/lib/services/party/raidRules";

/** What a party's leader does about raids with other families: start one on a beast from the library */
export const usePartyRaids = () => {
  const { runCall } = usePartyCall();

  const startRaid = (partyId: string, beastId: string, window: RaidWindow) => runCall((auth) => startPartyRaid(auth, partyId, beastId, window));

  return { startRaid };
};
