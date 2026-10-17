<template>
  <ion-card class="max-w-2xl late-chores" data-cy="late-chores">
    <ion-list>
      <ion-item-divider>
        <ion-label>Late chores</ion-label>
      </ion-item-divider>
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">
          <p>What happens when a chore is not done by its due time. All of it is off until you switch it on, and any chore can bend these rules in its own settings.</p>
        </ion-label>
      </ion-item>

      <ion-item lines="none">
        <ion-label class="ion-text-wrap">
          <h2>Lock late chores</h2>
          <p>A chore not done by its due time closes. Heroes see "Too late" and cannot claim it or win its loot.</p>
        </ion-label>
        <ion-toggle
          data-cy="late-lock-toggle"
          :checked="late.lockLate"
          :disabled="!canManage"
          @ionChange="rules.setLateChores({ lockLate: $event.detail.checked })"
        ></ion-toggle>
      </ion-item>

      <ion-item lines="none">
        <ion-label class="ion-text-wrap">
          <h2>Late chores pay less</h2>
          <p>Heroes can still finish a past-due chore (unless you lock them) but only collect part of the loot.</p>
        </ion-label>
        <ion-toggle
          data-cy="late-pay-toggle"
          :checked="late.reducedPay"
          :disabled="!canManage"
          @ionChange="rules.setLateChores({ reducedPay: $event.detail.checked })"
        ></ion-toggle>
      </ion-item>
      <ion-item :disabled="!late.reducedPay || !canManage">
        <ion-label>
          <h2>Late share</h2>
          <p>How much of the XP, GP and AP a late finish pays</p>
        </ion-label>
        <ion-select
          slot="end"
          interface="popover"
          data-cy="late-share-select"
          :value="late.lateShare"
          @ionChange="rules.setLateChores({ lateShare: Number($event.detail.value) })"
        >
          <ion-select-option v-for="share in shares" :key="share" :value="share">{{ share }}%</ion-select-option>
        </ion-select>
      </ion-item>

      <ion-item lines="none">
        <ion-label class="ion-text-wrap">
          <h2>Late penalty</h2>
          <p>When a chore passes its due time undone, the hero loses points once. GP comes from the wallet (never below 0) and XP never drops a level.</p>
        </ion-label>
        <ion-toggle
          data-cy="late-penalty-toggle"
          :checked="late.penalty"
          :disabled="!canManage"
          @ionChange="rules.setLateChores({ penalty: $event.detail.checked })"
        ></ion-toggle>
      </ion-item>
      <ion-item :disabled="!late.penalty || !canManage">
        <ion-label>
          <h2>Penalty is</h2>
          <p>{{ modeHint }}</p>
        </ion-label>
        <ion-select
          slot="end"
          interface="popover"
          data-cy="late-mode-select"
          :value="late.penaltyMode"
          @ionChange="changeMode($event.detail.value)"
        >
          <ion-select-option value="percent">A share of the reward</ion-select-option>
          <ion-select-option value="flat">A flat amount</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item :disabled="!late.penalty || !canManage" lines="none">
        <ion-label>
          <h2>Amount</h2>
        </ion-label>
        <ion-select
          slot="end"
          interface="popover"
          data-cy="late-amount-select"
          :value="late.penaltyAmount"
          @ionChange="rules.setLateChores({ penaltyAmount: Number($event.detail.value) })"
        >
          <ion-select-option v-for="amount in amounts" :key="amount" :value="amount">{{ amountLabel(amount) }}</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-list>
  </ion-card>
</template>

<script setup lang="ts">
import { IonCard, IonItem, IonItemDivider, IonLabel, IonList, IonSelect, IonSelectOption, IonToggle } from "@ionic/vue";
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { PERCENT_PENALTIES, FLAT_PENALTIES, LATE_SHARES, type PenaltyMode } from "@/lib/services/quests/lateRules";

/** The family's late chore rules (lock, reduced pay, penalty). Only a Game Master changes them; a hero sees how they are set. */
defineProps<LateChoresCardProps>();

interface LateChoresCardProps {
  canManage: boolean;
}

const rules = useGameRulesStore();
const { lateChores: late } = storeToRefs(rules);
const shares = LATE_SHARES;
const isPercent = computed(() => late.value.penaltyMode === "percent");
const amounts = computed(() => (isPercent.value ? PERCENT_PENALTIES : FLAT_PENALTIES));
const modeHint = computed(() =>
  isPercent.value ? "That share of the chore's XP and GP" : "That many XP and that many GP, whatever the chore pays"
);
const amountLabel = (amount: number): string => (isPercent.value ? `${amount}%` : `${amount} each`);

// The two modes count in different units, so switching starts the new unit on its usual amount
const changeMode = (mode: PenaltyMode) => {
  const isUnchanged = mode === late.value.penaltyMode;
  if (isUnchanged) return;
  const usual = mode === "percent" ? 25 : 5;
  void rules.setLateChores({ penaltyMode: mode, penaltyAmount: usual });
};
</script>
