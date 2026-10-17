<template>
  <ion-list class="late-rule-list" lines="none">
    <ion-item class="late-rule-item" data-test="late-rule-item">
      <ion-label class="ion-text-wrap">
        Late rule
        <p>{{ LATE_OVERRIDE_HINTS[choice] }}</p>
      </ion-label>
      <ion-select
        slot="end"
        interface="action-sheet"
        aria-label="What happens when this chore is late"
        data-test="late-rule-select"
        :value="choice"
        @ionChange="pick($event.detail.value)"
      >
        <ion-select-option v-for="option in LATE_OVERRIDES" :key="option" :value="option">
          {{ LATE_OVERRIDE_LABELS[option] }}
        </ion-select-option>
      </ion-select>
    </ion-item>
  </ion-list>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { IonItem, IonLabel, IonList, IonSelect, IonSelectOption } from "@ionic/vue";
import { AchievementFormInjectionKey } from "../../hooks/useAchievementForm";
import {
  LATE_OVERRIDES,
  LATE_OVERRIDE_HINTS,
  LATE_OVERRIDE_LABELS,
  lateOverrideOf,
  type LateOverride,
} from "@/lib/services/quests/lateRules";

/** The chore's own say on late: follow the family's late chore rules (Settings > Chores), or bend them for this chore. */
const { achievement } = inject(AchievementFormInjectionKey)!;

const choice = computed<LateOverride>(() => lateOverrideOf(achievement.value));

// "Use the family's" is the absence of a choice, so old and new chores read the same
const pick = (value: LateOverride) => {
  const isUnchanged = value === choice.value;
  if (isUnchanged) return;
  achievement.value.lateRule = value === "family" ? undefined : value;
};
</script>
