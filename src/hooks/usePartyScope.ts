import { computed, getCurrentInstance, onMounted, ref, watch, type Ref } from "vue";
import { usePartyFeed } from "@/hooks/usePartyFeed";
import { HOME_CHIP, NEW_CHIP, NEW_PARTY_ID, type PartyChip } from "@/app/Console/MyPortal/party/partyChips";
import { activityOf, heroIdsToday, rosterOf } from "@/lib/services/party/partyFeedView";
import { HOME_PARTY_ID } from "@/lib/services/party/partyRules";
import { toDayKey, type PartyActivityItem, type PartyMember } from "@/lib/services/party/partyStats";
import { usePartyStore } from "@/lib/store/stores/party";

/** What the four tabs read: who is in the party, what it did, and which heroes have struck or finished a chore today */
export interface HomeScope {
  members: PartyMember[];
  activity: PartyActivityItem[];
  heroIdsToday: string[];
}

/**
 * Which party My Party shows. The household's own is the default; a party with other families, or the panel that forms
 * or joins one, can be chosen from the switcher. The tabs read one `scope` whichever it is, so they stay the same four.
 * A chosen party that is gone from the site's answer (left, ended, blocked) sends the screen back to Home.
 */
export const usePartyScope = (home: Ref<HomeScope>, activeTab: Ref<string>) => {
  const store = usePartyStore();
  const feed = usePartyFeed();
  const activePartyId = ref(HOME_PARTY_ID);

  const parties = computed<PartyChip[]>(() => [HOME_CHIP, ...store.outside.map((party) => ({ id: party.id, name: party.name })), NEW_CHIP]);
  const outsideParty = computed(() => store.outsideParty(activePartyId.value));
  const isNewParty = computed(() => activePartyId.value === NEW_PARTY_ID);

  const scope = computed<HomeScope>(() => {
    const party = outsideParty.value;
    if (!party) return home.value;
    return {
      members: rosterOf(party),
      activity: activityOf(store.eventsOf(party.id), party),
      heroIdsToday: heroIdsToday(party, toDayKey()),
    };
  });

  watch(parties, (chips) => {
    const stillThere = chips.some((chip) => chip.id === activePartyId.value);
    if (!stillThere) activePartyId.value = HOME_PARTY_ID;
  });

  // Keep the parties with other families fresh while the screen is open, and read the open party's feed for Activity
  const isInScreen = Boolean(getCurrentInstance());
  if (isInScreen) {
    onMounted(() => {
      feed.start();
    });
  }
  watch([activePartyId, activeTab], ([partyId, tab]) => {
    const isOutsideActivity = Boolean(outsideParty.value) && tab === "activity";
    if (isOutsideActivity) void feed.refreshParty(String(partyId));
  });

  return { activePartyId, parties, outsideParty, isNewParty, scope };
};
