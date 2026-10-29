import { usePartyCall } from "@/hooks/usePartyCall";
import { blockCode, rotateCode as rotateCodeOnSite, sendPreset } from "@/lib/services/party/partyClient";
import type { WireRef } from "@/lib/services/party/partyWire";

/** What a party's people do about the party itself: change its code, block it, send one of the fixed words */
export const usePartyControls = () => {
  const { runCall } = usePartyCall();

  const rotateCode = (partyId: string) => runCall((auth) => rotateCodeOnSite(auth, partyId));

  const addBlock = (code: string) => runCall((auth) => blockCode(auth, code));

  const sendWord = (partyId: string, heroId: string, presetId: string, to?: WireRef) =>
    runCall((auth) => sendPreset(auth, partyId, heroId, presetId, to));

  return { rotateCode, addBlock, sendWord };
};
