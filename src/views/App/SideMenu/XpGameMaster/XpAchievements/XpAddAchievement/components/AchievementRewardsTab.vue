<template>
  <ion-card-content class="achievement-rewards-tab">
    <ion-list>
      <!-- Fibonacci Sequence Slider with Dropdown -->
      <ion-item-group class="mb-4">
        <ion-item-divider>
          <i
            slot="start"
            class="fad fa-2x"
            :class="difficultyIcon"
            :style="isFibonacci ? { color: 'var(--ion-color-rpg)' } : {}"
          />
          <ion-label>
            Set By Difficulty
            <i class="fad fa-question-circle text-xs text-gray-500 ml-2" @click.stop="showDifficultyHelp" />
          </ion-label>
          <ion-buttons slot="end">
            <ion-button
              :disabled="achievement.difficulty === 1"
              @click="$emit('decrease-difficulty')"
              color="danger"
              size="small"
            >
              <i class="fas fa-minus"></i>
            </ion-button>

            <ion-button
              :disabled="achievement.difficulty === 144"
              @click="$emit('increase-difficulty')"
              color="success"
              size="small"
            >
              <i class="fas fa-plus"></i>
            </ion-button>
          </ion-buttons>
        </ion-item-divider>
        
        <!-- Fibonacci dropdown menu -->
        <ion-item>
          <ion-label position="stacked">Choose Fibonacci Value</ion-label>
          <ion-select
            :value="fibonacciIndex"
            interface="action-sheet"
            @ionChange="$emit('update:fibonacciIndex', $event.detail.value)"
            placeholder="Select a value"
            mode="ios"
          >
            <ion-select-option
              v-for="(value, index) in fibonacciArray"
              :key="index"
              :value="index"
            >
              {{ value }} - {{ fibonacciDescriptions[index] || 'Custom' }}
            </ion-select-option>
          </ion-select>
        </ion-item>
        
        <ion-item>
          <ion-label
            class="ion-text-wrap"
            position="stacked"
          >
            Estimated Amount of Effort
            <p class="text-sm">Choose wisely - the golden sequence determines the rewards!</p>
          </ion-label>
          <div class="difficulty-range w-full flex flex-row gap-2 justify-between">
            <ion-range
              :value="fibonacciIndex"
              mode="ios"
              :min="0"
              :max="fibonacciArray.length - 1"
              :pin="true"
              :snaps="true"
              :ticks="true"
              color="rpg"
              @ionChange="$emit('update:fibonacciIndex', $event.detail.value as number)"
              :pin-formatter="displayFibonacciValue"
            >
            </ion-range>
          </div>
        </ion-item>
      </ion-item-group>

      <!-- Points to Award -->
      <ion-item-group class="mb-4">
        <ion-item-divider>
          <ion-label>
            Amount of Points to Award
            <i class="fad fa-question-circle text-xs text-gray-500 ml-2" @click.stop="showCurrencyHelp" />
          </ion-label>
        </ion-item-divider>

        <!-- Experience Points (XP) -->
        <ion-item-sliding>
          <ion-item-options side="end">
            <ion-item-option color="success">
              <i class="fad fa-hand-holding-seedling fa-2x" slot="end" />
              <ion-input
                slot="end"
                :value="achievement.xp"
                @ionInput="updateField('xp', $event.detail.value)"
                type="number"
                placeholder="Enter XP"
                class="ion-text-right"
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
            <ion-item-option color="warning">
              <i class="fad fa-hand-holding-usd fa-2x" />
              <ion-input
                slot="end"
                :value="achievement.gp"
                @ionInput="updateField('gp', $event.detail.value)"
                type="number"
                class="ion-text-right text-xl"
                placeholder="Enter GP"
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
            <ion-item-option color="danger">
              <i class="fad fa-hand-holding-magic fa-2x" />
              <ion-input
                class="ion-text-right text-xl"
                :value="achievement.ap"
                @ionInput="updateField('ap', $event.detail.value)"
                type="number"
                placeholder="Enter AP"
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
  IonButtons,
  IonButton,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonRange,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonInput,
  IonBadge,
} from '@ionic/vue';

interface Achievement {
  xp?: number;
  gp?: number;
  ap?: number;
  difficulty?: number;
}

interface Props {
  achievement: Achievement;
  fibonacciIndex: number;
  fibonacciArray: number[];
  fibonacciDescriptions: string[];
  difficultyIcon: string;
  isFibonacci: boolean;
  displayFibonacciValue: (value: number) => string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:achievement': [value: Achievement];
  'update:fibonacciIndex': [value: number];
  'increase-difficulty': [];
  'decrease-difficulty': [];
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

import { alertController } from '@ionic/vue';

const showDifficultyHelp = async () => {
  const alert = await alertController.create({
    header: 'Fibonacci Difficulty',
    subHeader: 'Why these numbers?',
    message: 'We use the Fibonacci sequence (1, 2, 3, 5, 8...) to estimate effort. This creates a natural curve where harder tasks give disproportionately better rewards compared to many small tasks.',
    buttons: ['Got it']
  });
  await alert.present();
};

const showCurrencyHelp = async () => {
  const alert = await alertController.create({
    header: 'The Economy',
    message: `
      <ul>
        <li><strong>XP (Experience):</strong> Measure your growth and level up.</li>
        <li><strong>GP (Gold):</strong> Buy real-world rewards or in-game items.</li>
        <li><strong>AP (Ability):</strong> Use special abilities like "Freeze" or "Double Rewards".</li>
      </ul>
    `,
    buttons: ['Got it']
  });
  await alert.present();
};
</script>

<style lang="scss" scoped>
.achievement-rewards-tab {
  width: 100%;
}

.difficulty-range {
  width: 100%;
}
</style>
