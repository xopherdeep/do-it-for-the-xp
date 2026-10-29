import { failure, usePartyCall } from "@/hooks/usePartyCall";
import { blockCode, rotateCode as rotateCodeOnSite, sendPreset } from "@/lib/services/party/partyClient";
import type { WireRef } from "@/lib/services/party/partyWire";
import { usePartyStore } from "@/lib/store/stores/party";

/** What a party's people do about the party itself: change its code, block it, send one of the fixed words */
export const usePartyControls = () => {
  const { runCall } = usePartyCall();
  const store = usePartyStore();

  const rotateCode = (partyId: string) => runCall((auth) => rotateCodeOnSite(auth, partyId));

  const addBlock = (code: string) => runCall((auth) => blockCode(auth, code));

  /** A hero who stays home says nothing to other families, even in a party they joined before the setting changed */
  const sendWord = async (partyId: string, heroId: string, presetId: string, to?: WireRef) => {
    await store.load();
    const staysHome = store.modeOf(heroId) === "home";
    if (staysHome) return failure("forbidden");
    return runCall((auth) => sendPreset(auth, partyId, heroId, presetId, to));
  };

  return { rotateCode, addBlock, sendWord };
};
