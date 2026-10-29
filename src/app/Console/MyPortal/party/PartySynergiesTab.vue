<template>
  <div class="party-synergies" data-cy="party-synergies">
    <section class="party-synergies__card">
      <h2 class="party-synergies__title"><i class="fad fa-sparkles" aria-hidden="true"></i> Party Synergy</h2>
      <p class="party-synergies__buff" data-cy="party-synergy-buff">Strikes x{{ buff }} today</p>
      <p class="party-synergies__hint">{{ hint }}</p>

      <ul class="party-synergies__heroes">
        <li
          v-for="member in members"
          :key="member.id"
          class="party-synergies__hero"
          :class="{ 'is-done': isDone(member) }"
          :data-cy="`party-synergy-hero-${member.id}`"
        >
          <span>{{ nameOf(member) }}</span>
          <span>{{ isDone(member) ? "finished a chore" : "not yet" }}</span>
        </li>
      </ul>

      <p class="party-synergies__note">
        When heroes finish chores side by side on the same day, every raid strike that day hits a little harder.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { synergyBuff } from "@/lib/services/party/partyRules";
import type { PartyMember } from "@/lib/services/party/partyStats";

const props = defineProps<{ members: PartyMember[]; heroIdsToday: string[] }>();

const buff = computed(() => synergyBuff(props.heroIdsToday));
const heroCount = computed(() => new Set(props.heroIdsToday).size);

/** What the party needs to do next to power up */
const hint = computed(() => {
  const count = heroCount.value;
  const hints = [
    "Two heroes finishing chores today make strikes x1.1",
    "Two heroes finishing chores today make strikes x1.1",
    "One more hero today makes strikes x1.2",
    "Full party power!",
  ];
  return hints[Math.min(count, hints.length - 1)];
});

const isDone = (member: PartyMember): boolean => props.heroIdsToday.includes(member.id);
const nameOf = (member: PartyMember): string => member.name?.nick || member.name?.full || "Hero";
</script>

<style scoped lang="scss">
@use "./partyUi" as *;

.party-synergies__card {
  @include party-window();
}

.party-synergies__title {
  margin: 0 0 8px;
  color: var(--gs-accent);
}

.party-synergies__buff {
  margin: 0;
  font-size: 1.4rem;
  color: var(--gs-good);
}

.party-synergies__hint,
.party-synergies__note {
  color: var(--gs-text-dim);
}

.party-synergies__heroes {
  margin: 12px 0;
  padding: 0;
  list-style: none;
}

.party-synergies__hero {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--gs-divider);
  color: var(--gs-text-dim);

  &.is-done {
    color: var(--gs-good);
  }
}
</style>
