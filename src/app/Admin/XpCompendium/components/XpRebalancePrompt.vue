<template>
  <!-- The GM's opt-in rebalance: a reveal-style box at the app root, the rows above and the buttons in thumb reach -->
  <Teleport to="ion-app" defer>
    <div
      v-if="open"
      class="rb"
      role="dialog"
      aria-modal="true"
      aria-label="Rebalance my shop and Powers"
      data-cy="rebalance-prompt"
      @keydown.esc="cancel"
    >
      <button type="button" class="rb__backdrop" tabindex="-1" aria-label="Close" @click="cancel"></button>

      <section class="rb__panel">
        <h2 class="rb__title">Rebalance</h2>

        <p v-if="isLoading" class="rb__text">Counting the old price tags...</p>

        <template v-else-if="isDone">
          <p class="rb__text" data-cy="rebalance-done">{{ doneLine }}</p>
        </template>

        <template v-else-if="rows.length === 0">
          <p class="rb__text" data-cy="rebalance-empty">
            Nothing to rebalance. Every item and Power already uses the new prices, or you set them yourself.
          </p>
        </template>

        <template v-else>
          <p class="rb__text">
            These items still use the old starter prices. Pick the ones to update; anything you changed yourself is not
            listed.
          </p>

          <ul class="rb__rows" role="group" aria-label="Rows to update" data-cy="rebalance-rows">
            <li v-for="row in rows" :key="`${row.kind}:${row.id}`">
              <button
                type="button"
                class="rb__row"
                role="checkbox"
                :aria-checked="picked.has(row.id)"
                :class="{ 'is-on': picked.has(row.id) }"
                :data-cy="`rebalance-row-${row.id}`"
                @click="toggle(row.id)"
              >
                <i class="fas rb__tick" :class="picked.has(row.id) ? 'fa-check-square' : 'fa-square'" aria-hidden="true"></i>
                <i class="fad rb__kind" :class="KIND_ICON[row.kind]" aria-hidden="true"></i>
                <span class="rb__name">{{ row.name }}</span>
                <span class="rb__change">
                  {{ row.from }} <i class="fas fa-long-arrow-right" aria-hidden="true"></i> {{ row.to }}
                  <small>{{ KIND_UNIT[row.kind] }}</small>
                </span>
              </button>
            </li>
          </ul>
        </template>

        <p v-if="error" class="rb__error" role="alert">{{ error }}</p>

        <div class="rb__actions">
          <button
            v-if="canApply"
            type="button"
            class="rb__button rb__button--primary"
            :disabled="isApplyDisabled"
            data-cy="rebalance-apply"
            @click="apply"
          >
            Update {{ picked.size }} <i class="fas fa-caret-right" aria-hidden="true"></i>
          </button>
          <button type="button" class="rb__button rb__button--ghost" :disabled="isSaving" data-cy="rebalance-close" @click="cancel">
            {{ closeLabel }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { play$fx } from "@/assets/fx";
import AccessoriesDb, { accessoriesStorage, type Accessory } from "@/lib/databases/AccessoriesDb";
import AbilitiesDb, { abilitiesStorage } from "@/lib/databases/AbilitiesDb";
import type { Ability } from "@/hooks/abilities/abilityConstants";
import { loadFamilySettings, saveFamilySettings, type FamilySettings } from "@/lib/services/family/familySettings";
import {
  applyRebalance,
  planRebalance,
  type RebalanceKind,
  type RebalanceRow,
  type RebalanceState,
} from "@/lib/services/economy/rebalancePresets";

/**
 * Rebalance my shop and Powers: shows the family's saved presets still at the old starter prices or AP gates (and the
 * old 10 GP per $1 cash-out rate), ticked by default, and updates only the ticked rows when the GM taps Update. It runs
 * only from this prompt, never on load or from a guard, and never deletes anything (rebalancePresets.ts).
 */
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const KIND_ICON: Record<RebalanceKind, string> = { reward: "fa-gift", power: "fa-magic", rate: "fa-coins" };
const KIND_UNIT: Record<RebalanceKind, string> = { reward: "GP", power: "AP", rate: "GP per $1" };

const accessoriesDb = new AccessoriesDb(accessoriesStorage);
const abilitiesDb = new AbilitiesDb(abilitiesStorage);

const isLoading = ref(false);
const isSaving = ref(false);
const isDone = ref(false);
const error = ref("");
const updated = ref(0);
const rows = ref<RebalanceRow[]>([]);
const picked = ref(new Set<string>());
let state: RebalanceState | null = null;
let settings: FamilySettings | null = null;

const canApply = computed(() => !isLoading.value && !isDone.value && rows.value.length > 0);
const isApplyDisabled = computed(() => isSaving.value || picked.value.size === 0);
const closeLabel = computed(() => (isDone.value || rows.value.length === 0 ? "Close" : "Not now"));

const doneLine = computed(() =>
  updated.value === 1 ? "Done. 1 price tag now uses the new economy." : `Done. ${updated.value} price tags now use the new economy.`,
);

const load = async () => {
  isLoading.value = true;
  isDone.value = false;
  error.value = "";
  try {
    const [accessories, abilities, family] = await Promise.all([
      accessoriesDb.getAccessories() as Promise<Accessory[]>,
      abilitiesDb.getAbilities(),
      loadFamilySettings(),
    ]);
    settings = family;
    state = { accessories: accessories ?? [], abilities: (abilities ?? []) as Ability[], cashOut: family.cashOut };
    rows.value = planRebalance(state);
    picked.value = new Set(rows.value.map((row) => row.id));
  } catch {
    rows.value = [];
    error.value = "The ledger would not open. Try again in a moment.";
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    play$fx("openMenu");
    void load();
  },
  { immediate: true },
);

const toggle = (id: string) => {
  play$fx("cursor");
  const next = new Set(picked.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  picked.value = next;
};

const apply = async () => {
  const before = state;
  const family = settings;
  const isMissingData = !before || !family;
  const isNothingPicked = picked.value.size === 0;
  const isBlocked = isMissingData || isNothingPicked;
  if (isBlocked) return;
  isSaving.value = true;
  error.value = "";
  try {
    const after = applyRebalance(before, picked.value);
    // Only the records that changed are written back, each through its own save path
    const writes: Promise<unknown>[] = [];
    after.accessories.forEach((item, index) => {
      const isChanged = item !== before.accessories[index];
      if (isChanged) writes.push(accessoriesDb.setAccessory(item));
    });
    after.abilities.forEach((ability, index) => {
      const isChanged = ability !== before.abilities[index];
      if (isChanged) writes.push(abilitiesDb.setAbility(ability));
    });
    const rateChanged = after.cashOut !== before.cashOut;
    if (rateChanged) writes.push(saveFamilySettings({ ...family, cashOut: after.cashOut }));
    await Promise.all(writes);
    updated.value = writes.length;
    state = after;
    isDone.value = true;
    play$fx("select");
  } catch {
    error.value = "Some price tags would not save. Nothing was removed; try again.";
    play$fx("no");
  } finally {
    isSaving.value = false;
  }
};

const cancel = () => {
  if (isSaving.value) return;
  if (!isDone.value) play$fx("no");
  emit("close");
};
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;
@use "@/app/Console/TempleGrounds/components/templeReveal" as *;

@include reveal-keyframes;

.rb {
  --reveal-glow: #{$reveal-gold};
  --reveal-glow-soft: rgba(255, 216, 74, 0.45);
  @include reveal-overlay-docked;
  position: fixed;
  z-index: 100001;
}

.rb__backdrop {
  position: absolute;
  padding: 0;
  border: 0;
  cursor: default;
  inset: 0;
  background: rgba(10, 2, 10, 0.62);
}

.rb__panel {
  @include reveal-panel;
  display: flex;
  flex-direction: column;
  max-height: calc(100% - 16px);
  animation: reveal-panel-in 0.32s 0.05s cubic-bezier(0.2, 0.9, 0.3, 1.15) forwards;
}

.rb__title {
  @include reveal-title;
  flex: none;
  font-size: 1.3rem;
}

.rb__text {
  flex: none;
  margin: 0 4px 4px;
  font-family: $eb-font-status;
  font-size: 1rem;
  line-height: 1.4;
  color: $eb-color-cream;
  text-shadow: 1px 1px 0 $reveal-ink;
}

.rb__rows {
  @include reveal-choice-list;
}

.rb__row {
  @include reveal-choice-row;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 4px 10px 4px 8px;
  font-family: $eb-font-status;

  &.is-on {
    @include reveal-choice-row-selected;
  }
}

.rb__tick {
  flex: none;
  width: 18px;
  color: $eb-color-pale-yellow;
}

.rb__kind {
  flex: none;
  width: 22px;
  text-align: center;
  color: $eb-color-cream;
  --fa-secondary-opacity: 0.5;
}

.rb__name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 1rem;
  color: $eb-color-cream;
  text-shadow: 1px 1px 0 $reveal-ink;
  overflow-wrap: anywhere;
}

.rb__change {
  flex: none;
  font-size: 0.95rem;
  color: $reveal-gold;
  text-shadow: 1px 1px 0 $reveal-ink;
  white-space: nowrap;

  small {
    font-size: 0.75rem;
    color: rgba(231, 230, 179, 0.8);
  }
}

.rb__error {
  flex: none;
  margin: 8px 4px 0;
  font-family: $eb-font-status;
  font-size: 0.95rem;
  color: var(--gs-danger);
  text-shadow: 1px 1px 0 $reveal-ink;
}

.rb__actions {
  @include reveal-actions-stacked;
}

.rb__button {
  @include reveal-button;
  @include reveal-button-tall;

  &--primary {
    @include reveal-button-primary;
  }
  &--ghost {
    @include reveal-button-ghost;
  }
}
</style>
