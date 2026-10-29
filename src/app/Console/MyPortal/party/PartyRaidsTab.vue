<template>
  <div class="party-raids" data-cy="party-raids">
    <template v-if="isStarting">
      <p v-if="startError" class="party-raids__error" data-cy="raid-start-error">{{ startError }}</p>
      <party-raid-start
        :beasts="pickable"
        :default-window="store.defaultWindow"
        :initial-beast-id="lastBeastId"
        @begin="begin"
        @cancel="isStarting = false"
      />
    </template>
    <raid-card
      v-else-if="hasRaid"
      :summary="summary"
      :beast-name="beastName"
      :beast-image="beastImage"
      :claims="claims"
      :claimed-lines="claimedLines"
      :can-start-next="canStartNext"
      @claim="claim"
      @again="isStarting = true"
    />
    <section v-else-if="mayStart" class="party-raids__empty" data-cy="party-raids-empty">
      <i class="fad fa-dragon" aria-hidden="true"></i>
      <h2>No raid yet</h2>
      <p>A great beast is waiting. Finish chores together to strike it down.</p>
      <button type="button" class="party-raids__start is-primary" data-cy="party-start-raid" @click="isStarting = true">
        Start a raid
      </button>
    </section>
    <section v-else class="party-raids__empty" data-cy="party-raids-waiting">
      <i class="fad fa-dragon" aria-hidden="true"></i>
      <h2>No raid yet</h2>
      <p>Waiting for the party leader to start a raid.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { play$fx } from "@/assets/fx";
import { usePartyRaids } from "@/hooks/usePartyRaids";
import { useTimers } from "@/hooks/useTimers";
import { BestiaryDb, beastStorage, type Beast } from "@/lib/databases/BestiaryDb";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { problemText } from "@/lib/services/party/partyProblemText";
import { HOME_PARTY_ID } from "@/lib/services/party/partyRules";
import type { PartyMember } from "@/lib/services/party/partyStats";
import { raidState, type Raid, type RaidReward, type RaidWindow } from "@/lib/services/party/raidRules";
import { claimRows, raidSummary } from "@/lib/services/party/raidView";
import { applyQuestRewards, paidQuestRewards } from "@/lib/services/quests/QuestCompletionService";
import { usePartyStore } from "@/lib/store/stores/party";
import { useProStore } from "@/lib/store/stores/pro";
import debug from "@/lib/utils/debug";
import { raidBeastImage } from "./beastFace";
import PartyRaidStart from "./PartyRaidStart.vue";
import RaidCard from "./RaidCard.vue";

const props = withDefaults(defineProps<{ members: PartyMember[]; partyId?: string }>(), { partyId: HOME_PARTY_ID });

const store = usePartyStore();
const pro = useProStore();
const { startRaid } = usePartyRaids();
const timers = useTimers();
const beasts = ref<Beast[]>([]);
const isStarting = ref(false);
const startError = ref("");
const now = ref(new Date());
const claimedLines = ref<Record<string, string>>({});

const isOutside = computed(() => props.partyId !== HOME_PARTY_ID);
const outsideParty = computed(() => store.outsideParty(props.partyId));
/** The household starts its own raids; in a party with other families only the leader's family does */
const mayStart = computed(() => !isOutside.value || outsideParty.value?.leader.familyId === pro.familyId);
/** A raid with other families takes a beast from the shipped library, so no family's own words cross to another */
const pickable = computed<Beast[]>(() => (isOutside.value ? BEAST_LIBRARY : beasts.value));

const names = computed(() =>
  Object.fromEntries(props.members.map((member) => [member.id, member.name?.nick || member.name?.full || "Hero"]))
);

/** Whether a hero named in a raid is ours to pay: all of the household's, only this family's in a party with others */
const isOurs = (heroKey: string): boolean => !isOutside.value || heroKey.startsWith(`${pro.familyId}|`);
const ourClaims = (candidate: Raid) => claimRows(candidate, names.value, store.paid).filter((row) => isOurs(row.heroId));

/** The newest raid, unless an older one that fell still has loot waiting for one of our heroes */
const raid = computed<Raid>(() => {
  const all = store.raidsOf(props.partyId);
  const waiting = all.find((candidate) => {
    const isDown = raidState(candidate, now.value).status === "defeated";
    return isDown && ourClaims(candidate).some((row) => !row.isClaimed);
  });
  return waiting ?? all[0];
});
const hasRaid = computed(() => Boolean(raid.value));
const summary = computed(() => raidSummary(raid.value, names.value, now.value));
const beast = computed(() => {
  const source: readonly Beast[] = isOutside.value ? BEAST_LIBRARY : beasts.value;
  return source.find((candidate) => String(candidate.id) === raid.value?.beastId);
});
const beastName = computed(() => beast.value?.name || "Great beast");
const beastImage = computed(() => raidBeastImage(beast.value));
const lastBeastId = computed(() => raid.value?.beastId);
const claims = computed(() => ourClaims(raid.value));
const allClaimed = computed(() => claims.value.every((row) => row.isClaimed));
const isOver = computed(() => summary.value.status !== "active");
const canStartNext = computed(() => isOver.value && allClaimed.value && mayStart.value);

const rewardLine = (reward: RaidReward): string => `+${reward.xp} XP, +${reward.ap} AP, +${reward.gp} GP`;

/** Pays one striker's loot, once: the store marks it paid and answers nothing to a second claim. The hero is paid by its id here. */
const claim = (heroKey: string): void => {
  const reward = store.claimReward(raid.value.id, heroKey);
  const isOwed = reward !== null;
  if (!isOwed) return;
  const heroId = isOutside.value ? heroKey.split("|")[1] : heroKey;
  applyQuestRewards(heroId, reward, `raid:${raid.value.id}`, undefined, `Raid: ${beastName.value}`);
  play$fx("openChest");
  claimedLines.value = { ...claimedLines.value, [heroKey]: rewardLine(paidQuestRewards(heroId, reward)) };
};

const begin = async (choice: { beastId: string; window: RaidWindow }): Promise<void> => {
  startError.value = "";
  if (!isOutside.value) {
    store.startHomeRaid({ ...choice, memberIds: props.members.map((member) => member.id) });
    isStarting.value = false;
    return;
  }
  const result = await startRaid(props.partyId, choice.beastId, choice.window);
  if (result.ok) isStarting.value = false;
  else startError.value = problemText(result.problem);
};

onMounted(async () => {
  try {
    await store.load();
    beasts.value = await new BestiaryDb(beastStorage).getBeasts();
  } catch (error) {
    debug.error("party: could not read the raids or the bestiary", error);
  }
  timers.startInterval(60_000, () => {
    now.value = new Date();
  });
});
</script>

<style scoped lang="scss">
@use "./partyUi" as *;

.party-raids__empty {
  @include party-window();
  text-align: center;

  i {
    font-size: 2.4rem;
    color: var(--gs-accent);
  }

  p {
    color: var(--gs-text-dim);
  }
}

.party-raids__start {
  @include party-button();
  width: 100%;
}

.party-raids__error {
  margin: 12px 20px 0;
  color: var(--gs-danger);
}
</style>
