import { computed, type Ref } from "vue";
import { usePartyControls } from "@/hooks/usePartyControls";
import { failure } from "@/hooks/usePartyCall";
import { ownHeroIn } from "@/lib/services/party/partyFeedView";
import type { WireParty } from "@/lib/services/party/partyWire";
import type { HeroChoice } from "@/app/Console/MyPortal/party/partyEmblems";
import { usePartyStore } from "@/lib/store/stores/party";
import { useProStore } from "@/lib/store/stores/pro";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * Who speaks for the family in a party with other families, and the fixed words they send. The speaker is the hero
 * signed in when that hero is in the party, else the first of the family's heroes in it; the family's id (not the hero
 * id) says which heroes are ours, since hero ids are only unique inside a family.
 */
export const usePartyVoice = (party: Ref<WireParty | undefined>) => {
  const store = usePartyStore();
  const pro = useProStore();
  const users = useUserStore();
  const { sendWord } = usePartyControls();

  const senderHeroId = computed(() => {
    const open = party.value;
    return open ? ownHeroIn(open, pro.familyId, String(users.currentUser.id ?? "")) : "";
  });
  const showWords = computed(() => senderHeroId.value !== "");

  /** The household's heroes as the form-or-join panel offers them */
  const partyHeroes = computed<HeroChoice[]>(() =>
    users.usersAz.map((user: any) => ({
      id: String(user.id),
      name: user.name?.nick || user.name?.full || "Hero",
      staysHome: store.modeOf(String(user.id)) === "home",
    }))
  );

  /** Sends a cheer or a poke aimed at a member ("family|hero") as the speaking hero */
  async function sendWordTo(memberKey: string, word: "cheer" | "poke") {
    const open = party.value;
    if (!open) return failure("gone");
    const sender = senderHeroId.value;
    const hasNoSender = sender === "";
    if (hasNoSender) return failure("not-member");
    const [familyId, heroId] = memberKey.split("|");
    return sendWord(open.id, sender, word, { familyId, heroId });
  }

  return { senderHeroId, showWords, partyHeroes, sendWordTo };
};
