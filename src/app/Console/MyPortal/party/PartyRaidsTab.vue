<template>
  <div class="party-raids" data-cy="party-raids">
    <party-raid-start
      v-if="isStarting"
      :beasts="beasts"
      :default-window="store.defaultWindow"
      :initial-beast-id="lastBeastId"
      @begin="begin"
      @cancel="isStarting = false"
    />
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
    <section v-else class="party-raids__empty" data-cy="party-raids-empty">
      <i class="fad fa-dragon" aria-hidden="true"></i>
      <h2>No raid yet</h2>
      <p>A great beast is waiting. Finish chores together to strike it down.</p>
      <button type="button" class="party-raids__start is-primary" data-cy="party-start-raid" @click="isStarting = true">
        Start a raid
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { play$fx } from "@/assets/fx";
import { useTimers } from "@/hooks/useTimers";
import { BestiaryDb, beastStorage, type Beast } from "@/lib/databases/BestiaryDb";
import { HOME_PARTY_ID } from "@/lib/services/party/partyRules";
import type { PartyMember } from "@/lib/services/party/partyStats";
import type { RaidReward, RaidWindow } from "@/lib/services/party/raidRules";
import { claimRows, raidSummary } from "@/lib/services/party/raidView";
import { applyQuestRewards, paidQuestRewards } from "@/lib/services/quests/QuestCompletionService";
import { usePartyStore } from "@/lib/store/stores/party";
import debug from "@/lib/utils/debug";
import { raidBeastImage } from "./beastFace";
import PartyRaidStart from "./PartyRaidStart.vue";
import RaidCard from "./RaidCard.vue";

const props = withDefaults(defineProps<{ members: PartyMember[]; partyId?: string }>(), { partyId: HOME_PARTY_ID });

const store = usePartyStore();
const timers = useTimers();
const beasts = ref<Beast[]>([]);
const isStarting = ref(false);
const now = ref(new Date());
const claimedLines = ref<Record<string, string>>({});

const names = computed(() =>
  Object.fromEntries(props.members.map((member) => [member.id, member.name?.nick || member.name?.full || "Hero"]))
);
const raid = computed(() => store.raidsOf(props.partyId)[0]);
const hasRaid = computed(() => Boolean(raid.value));
const summary = computed(() => raidSummary(raid.value, names.value, now.value));
const beast = computed(() => beasts.value.find((candidate) => String(candidate.id) === raid.value?.beastId));
const beastName = computed(() => beast.value?.name || "Great beast");
const beastImage = computed(() => raidBeastImage(beast.value));
const lastBeastId = computed(() => raid.value?.beastId);
const claims = computed(() => claimRows(raid.value, names.value, store.paid));
const allClaimed = computed(() => claims.value.every((row) => row.isClaimed));
const isOver = computed(() => summary.value.status !== "active");
const canStartNext = computed(() => isOver.value && allClaimed.value);

const rewardLine = (reward: RaidReward): string => `+${reward.xp} XP, +${reward.ap} AP, +${reward.gp} GP`;

/** Pays one striker's loot, once: the store marks it paid and answers nothing to a second claim */
const claim = (heroId: string): void => {
  const reward = store.claimReward(raid.value.id, heroId);
  const isOwed = reward !== null;
  if (!isOwed) return;
  applyQuestRewards(heroId, reward, `raid:${raid.value.id}`, undefined, `Raid: ${beastName.value}`);
  play$fx("openChest");
  claimedLines.value = { ...claimedLines.value, [heroId]: rewardLine(paidQuestRewards(heroId, reward)) };
};

const begin = (choice: { beastId: string; window: RaidWindow }): void => {
  store.startHomeRaid({ ...choice, memberIds: props.members.map((member) => member.id) });
  isStarting.value = false;
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
</style>
