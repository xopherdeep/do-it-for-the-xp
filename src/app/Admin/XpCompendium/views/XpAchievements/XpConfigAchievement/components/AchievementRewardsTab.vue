<template>
  <ion-card-content class="achievement-rewards-tab">
    <ion-list>
      <!-- Points to Award -->
      <ion-item-group class="mb-4">
        <ion-item-divider>
          <ion-label>Amount of Points to Award</ion-label>
        </ion-item-divider>

        <!-- Experience Points (XP) -->
        <ion-item-sliding>
          <ion-item-options side="end">
            <ion-item-option color="success" class="reward-option">
              <i class="fad fa-hand-holding-seedling fa-2x" slot="start" />
              <ion-input
                :value="achievement.xp"
                @ionInput="updateField('xp', $event.detail.value)"
                type="number"
                placeholder="XP"
                aria-label="Experience points"
                class="reward-input ion-text-right"
              ></ion-input>
              <ion-label slot="end"> XP </ion-label>
            </ion-item-option>
          </ion-item-options>
          <ion-item>
            <i
              class="fad fa-hand-holding-seedling fa-2x mr-3"
              slot="start"
              style="color: var(--ion-color-success)"
            />
            <ion-label>
              Experience Points (XP)
              <p>Motivates and tracks skill growth.</p>
            </ion-label>
            <ion-badge
              class="ion-float-right text-white px-2"
              color="success"
              slot="end"
            >
              {{ achievement.xp }}
              <i class="fad fa-hand-holding-seedling ml-2" />
            </ion-badge>
            <i
              class="fad fa-grip-vertical fa-lg mr-3"
              slot="end"
            />
          </ion-item>
        </ion-item-sliding>

        <!-- Gold Points (GP) -->
        <ion-item-sliding>
          <ion-item-options side="end">
            <ion-item-option color="warning" class="reward-option">
              <i class="fad fa-hand-holding-usd fa-2x" slot="start" />
              <ion-input
                :value="achievement.gp"
                @ionInput="updateField('gp', $event.detail.value)"
                type="number"
                placeholder="GP"
                aria-label="Gold points"
                class="reward-input ion-text-right"
              ></ion-input>
              <ion-label slot="end">GP</ion-label>
            </ion-item-option>
          </ion-item-options>
          <ion-item>
            <i
              class="fad fa-hand-holding-usd fa-2x mr-3"
              slot="start"
              style="color: var(--ion-color-warning)"
            />
            <ion-label>
              Gold Points (GP)
              <p>In-app currency, teaching financial literacy.</p>
            </ion-label>
            <ion-badge
              class="ion-float-right text-sm px-2"
              color="warning"
              slot="end"
            >
              {{ formatGp(achievement.gp) }}
              <i class="fad fa-hand-holding-usd ml-2" />
            </ion-badge>
            <i
              class="fad fa-grip-vertical fa-lg mr-3"
              slot="end"
            />
          </ion-item>
        </ion-item-sliding>

        <!-- Ability Points (AP) -->
        <ion-item-sliding>
          <ion-item-options side="end">
            <ion-item-option color="danger" class="reward-option">
              <i class="fad fa-hand-holding-magic fa-2x" slot="start" />
              <ion-input
                :value="achievement.ap"
                @ionInput="updateField('ap', $event.detail.value)"
                type="number"
                placeholder="AP"
                aria-label="Ability points"
                class="reward-input ion-text-right"
              ></ion-input>
              <ion-label slot="end"> AP </ion-label>
            </ion-item-option>
          </ion-item-options>
          <ion-item>
            <i
              class="fad fa-hand-holding-magic fa-2x mr-3"
              slot="start"
              style="color: var(--ion-color-danger)"
            />
            <ion-label>
              Ability Points (AP)
              <p>Unlocks abilities, encourages strategic planning.</p>
            </ion-label>
            <ion-badge
              class="ion-float-right text-sm px-2"
              color="danger"
              slot="end"
            >
              {{ achievement.ap }}
              <i class="fad fa-hand-holding-magic ml-2" />
            </ion-badge>
            <i
              class="fad fa-grip-vertical fa-lg mr-3"
              slot="end"
            />
          </ion-item>
        </ion-item-sliding>
      </ion-item-group>
    </ion-list>
  </ion-card-content>
</template>

<script setup lang="ts">
import {
  IonCardContent,
  IonList,
  IonItemGroup,
  IonItemDivider,
  IonLabel,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonInput,
  IonBadge,
} from '@ionic/vue';

/**
 * The rewards grid of step four: what the quest pays in XP, GP and AP. The difficulty that sets them is the slider at
 * the bottom of the step (XpConfigAchievement), and the tier chip and minutes sit above this grid (QuestRewardsTab).
 */
interface Achievement {
  xp?: number;
  gp?: number;
  ap?: number;
}

interface Props {
  achievement: Achievement;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:achievement': [value: Achievement];
}>();

defineOptions({
  name: 'AchievementRewardsTab'
});

const updateField = (field: keyof Achievement, value: unknown) => {
  const numValue = typeof value === 'string' ? parseInt(value, 10) || 0 : value;
  emit('update:achievement', { ...props.achievement, [field]: numValue });
};

const formatGp = (gp?: number) => {
  if (!gp) return '0';
  return gp.toLocaleString();
};
</script>

<style lang="scss" scoped>
// Fill the screen edge to edge and down to the nav, with no card margin
.achievement-rewards-tab {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;

  > ion-list {
    flex: 1;
    padding-bottom: 16px;
  }
}

// The row revealed by sliding an XP/GP/AP item: 16px at the edges so the
// icon and the number clear the screen edge, and a big number to type into
.reward-option {
  min-width: 220px;

  &::part(native) {
    padding-inline: 16px;
  }

  i {
    flex: 0 0 auto;
    margin-inline-end: 12px;
  }

  ion-label {
    flex: 0 0 auto;
    margin-inline-start: 8px;
    font-weight: 700;
  }
}

.reward-input {
  flex: 0 0 auto;
  width: 5ch;
  font-size: 2.25rem;
  font-weight: 700;
  --padding-start: 0;
  --padding-end: 0;
}

.difficulty-range {
  width: 100%;
}
</style>
