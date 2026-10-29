<template>
  <section class="raid-card" :class="`raid-card--${summary.status}`" data-cy="raid-card">
    <header class="raid-card__head">
      <img v-if="hasImage" class="raid-card__beast" :src="beastImage" :alt="beastName" />
      <div>
        <h2 class="raid-card__name">{{ beastName }}</h2>
        <p class="raid-card__status" data-cy="raid-status">{{ statusLine }}</p>
      </div>
    </header>

    <div class="raid-card__health">
      <progress class="raid-card__hp" :value="summary.hp" :max="healthMax" aria-label="Beast health"></progress>
      <span data-cy="raid-hp">{{ summary.hp }} / {{ summary.maxHp }}</span>
    </div>

    <ol class="raid-card__ledger">
      <li v-for="row in summary.ledger" :key="row.heroId" class="raid-card__row" data-cy="raid-ledger-row">
        <span class="raid-card__hero">
          {{ row.name }}
          <i v-if="row.isTop" class="fad fa-crown" aria-label="Top striker"></i>
        </span>
        <progress class="raid-card__bar" :value="row.barPercent" max="100" :aria-label="`${row.name} damage`"></progress>
        <span class="raid-card__damage">{{ row.damage }}</span>
      </li>
    </ol>

    <p v-if="hasFallen" class="raid-card__fame">
      <template v-if="hasTop">{{ summary.topStriker }} struck the most. </template>
      <template v-if="hasLastHit">{{ summary.lastHit }} landed the last hit.</template>
    </p>

    <ul v-if="hasClaims" class="raid-card__claims">
      <li v-for="row in claims" :key="row.heroId">
        <p v-if="row.isClaimed" class="raid-card__claimed" :data-cy="`raid-claimed-${row.heroId}`">
          {{ row.name }} claimed {{ claimedLines[row.heroId] || "the loot" }}
        </p>
        <button
          v-else
          type="button"
          class="raid-card__button is-primary"
          :data-cy="`raid-claim-${row.heroId}`"
          @click="emit('claim', row.heroId)"
        >
          Claim loot: {{ row.name }}
        </button>
      </li>
    </ul>

    <button
      v-if="canStartNext"
      type="button"
      class="raid-card__button"
      data-cy="raid-again"
      @click="emit('again')"
    >
      {{ againLabel }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ClaimRow, RaidSummary } from "@/lib/services/party/raidView";

interface RaidCardProps {
  summary: RaidSummary;
  beastName: string;
  beastImage: string;
  claims: ClaimRow[];
  /** What each hero was paid after claiming, by hero id ("+300 XP, +5 AP, +20 GP") */
  claimedLines: Record<string, string>;
  /** The next raid may begin: the beast fled, or it fell and every striker claimed */
  canStartNext: boolean;
}

interface RaidCardEmits {
  (event: "claim", heroId: string): void;
  (event: "again"): void;
}

const props = defineProps<RaidCardProps>();
const emit = defineEmits<RaidCardEmits>();

const hasImage = computed(() => props.beastImage !== "");
const healthMax = computed(() => Math.max(1, props.summary.maxHp));
const hasFallen = computed(() => props.summary.status === "defeated");
const hasTop = computed(() => props.summary.topStriker !== "");
const hasLastHit = computed(() => props.summary.lastHit !== "");
const hasClaims = computed(() => props.claims.length > 0);

const statusLine = computed(() => {
  const { status, timeLeft } = props.summary;
  const lines = { active: `Raid on! ${timeLeft}`, defeated: "Defeated!", retreated: "The beast fled…" };
  return lines[status];
});

const againLabel = computed(() => {
  const labels = { active: "", defeated: "Start another raid", retreated: "Try again" };
  return labels[props.summary.status];
});
</script>

<style scoped lang="scss">
@use "./partyUi" as *;

.raid-card {
  @include party-window();
}

.raid-card__head {
  display: flex;
  gap: 12px;
  align-items: center;
}

.raid-card__beast {
  width: 88px;
  height: 88px;
  object-fit: contain;
}

.raid-card__name {
  margin: 0;
  color: var(--gs-accent);
}

.raid-card__status {
  margin: 4px 0 0;
  color: var(--gs-text-dim);
}

.raid-card--defeated .raid-card__status {
  color: var(--gs-good);
}

.raid-card--retreated .raid-card__status {
  color: var(--gs-danger);
}

.raid-card__health {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 14px 0;
}

.raid-card__hp {
  @include party-meter(var(--gs-danger));
}

.raid-card__ledger {
  margin: 0;
  padding: 0;
  list-style: none;
}

.raid-card__row {
  display: grid;
  grid-template-columns: 5.5rem 1fr 3rem;
  gap: 8px;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--gs-divider);
}

.raid-card__bar {
  @include party-meter(var(--gs-good));
  height: 10px;
}

.raid-card__damage {
  text-align: right;
}

.raid-card__fame {
  color: var(--gs-text-dim);
}

.raid-card__claims {
  margin: 12px 0;
  padding: 0;
  list-style: none;
}

.raid-card__claimed {
  margin: 6px 0;
  color: var(--gs-good);
}

.raid-card__button {
  @include party-button();
  width: 100%;
  margin-top: 8px;
}
</style>
