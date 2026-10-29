import { failure, usePartyCall, type ActionResult } from "@/hooks/usePartyCall";
import { formParty, joinByCode, leaveParty, resolveRequest as resolveRequestOnSite, type NewParty } from "@/lib/services/party/partyClient";
import type { WireRequest } from "@/lib/services/party/partyWire";
import { usePartyStore } from "@/lib/store/stores/party";
import { useProStore } from "@/lib/store/stores/pro";

export interface PartyDraft {
  name: string;
  emblem: string;
  inviteRule: NewParty["inviteRule"];
  leaderId: string;
}

/**
 * Who is in a party: forming one, asking for a hero to join by a code, answering a join request and taking a hero out.
 * A hero who stays home never leaves the household, and the site is not asked about them.
 */
export const usePartyMembership = () => {
  const { runCall } = usePartyCall();
  const store = usePartyStore();
  const pro = useProStore();

  async function createParty(draft: PartyDraft) {
    const leader = store.heroCard(draft.leaderId);
    if (!leader.ok) return failure(leader.problem);
    return runCall((auth) => formParty(auth, { name: draft.name, emblem: draft.emblem, inviteRule: draft.inviteRule, leader: leader.card }));
  }

  /** Asks for one of our heroes to join the party that holds a code; the Game Master asking is the approval, so it is remembered */
  async function requestJoin(code: string, heroId: string): Promise<ActionResult<WireRequest>> {
    const hero = store.heroCard(heroId);
    if (!hero.ok) return failure(hero.problem);
    const result = await runCall((auth) => joinByCode(auth, code, hero.card));
    const wasSent = result.ok;
    if (wasSent) store.approveParty(heroId, result.value.partyId);
    return result;
  }

  const resolveRequest = (partyId: string, requestId: string, decision: "approve" | "decline") =>
    runCall((auth) => resolveRequestOnSite(auth, partyId, requestId, decision));

  /** Takes one of our heroes out of a party (the family's own id says which family's hero) */
  const removeHero = (partyId: string, heroId: string) => runCall((auth) => leaveParty(auth, partyId, pro.familyId, heroId));

  return { createParty, requestJoin, resolveRequest, removeHero };
};
