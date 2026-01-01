<template>
    <div class="xp-point-slider">
        <!-- Difficulty Header -->
        <ion-item-group class="difficulty-section">
            <ion-item-divider>
                <i slot="start" class="fad fa-2x" :class="difficultyIcon" :style="{ color: 'var(--ion-color-rpg)' }" />
                <ion-label>
                    {{ label }}
                    <i class="fad fa-question-circle text-xs text-gray-500 ml-2" @click.stop="showHelp" />
                </ion-label>
                <ion-buttons slot="end">
                    <ion-button :disabled="fibonacciIndex === 0" @click="decreaseDifficulty" color="danger"
                        size="small">
                        <i class="fas fa-minus"></i>
                    </ion-button>

                    <ion-button :disabled="fibonacciIndex === fibonacciArray.length - 1" @click="increaseDifficulty"
                        color="success" size="small">
                        <i class="fas fa-plus"></i>
                    </ion-button>
                </ion-buttons>
            </ion-item-divider>

            <!-- Dropdown Selector -->
            <ion-item>
                <ion-label position="stacked">Choose Difficulty</ion-label>
                <ion-select :value="fibonacciIndex" interface="action-sheet" @ionChange="handleIndexChange"
                    placeholder="Select a value" mode="ios">
                    <ion-select-option v-for="(value, index) in fibonacciArray" :key="index" :value="index">
                        {{ value }} - {{ fibonacciDescriptions[index] }}
                    </ion-select-option>
                </ion-select>
            </ion-item>

            <!-- Slider -->
            <ion-item>
                <ion-label class="ion-text-wrap" position="stacked">
                    Estimated Effort
                    <p class="text-sm">The golden sequence determines the rewards!</p>
                </ion-label>
                <div class="difficulty-range w-full flex flex-row gap-2 justify-between">
                    <ion-range :value="fibonacciIndex" mode="ios" :min="0" :max="fibonacciArray.length - 1" :pin="true"
                        :snaps="true" :ticks="true" color="rpg" @ionChange="handleIndexChange"
                        :pin-formatter="displayFibonacciValue" />
                </div>
            </ion-item>
        </ion-item-group>

        <!-- Points Display -->
        <ion-item-group v-if="showPointsDisplay" class="points-section">
            <ion-item-divider>
                <ion-label>Points Awarded</ion-label>
            </ion-item-divider>

            <!-- XP -->
            <ion-item>
                <i class="fad fa-hand-holding-seedling fa-2x mr-3" slot="start"
                    style="color: var(--ion-color-success)" />
                <ion-label>
                    Experience (XP)
                    <p>Growth and leveling</p>
                </ion-label>
                <ion-badge class="text-white px-2" color="success" slot="end">
                    {{ computedXp.toLocaleString() }}
                    <i class="fad fa-hand-holding-seedling ml-2" />
                </ion-badge>
            </ion-item>

            <!-- GP -->
            <ion-item>
                <i class="fad fa-hand-holding-usd fa-2x mr-3" slot="start" style="color: var(--ion-color-warning)" />
                <ion-label>
                    Gold (GP)
                    <p>In-app spending</p>
                </ion-label>
                <ion-badge class="text-sm px-2" color="warning" slot="end">
                    {{ computedGp.toLocaleString() }}
                    <i class="fad fa-hand-holding-usd ml-2" />
                </ion-badge>
            </ion-item>

            <!-- AP -->
            <ion-item>
                <i class="fad fa-hand-holding-magic fa-2x mr-3" slot="start" style="color: var(--ion-color-danger)" />
                <ion-label>
                    Ability (AP)
                    <p>Special abilities</p>
                </ion-label>
                <ion-badge class="text-sm px-2" color="danger" slot="end">
                    {{ computedAp }}
                    <i class="fad fa-hand-holding-magic ml-2" />
                </ion-badge>
            </ion-item>
        </ion-item-group>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
    IonItemGroup,
    IonItemDivider,
    IonLabel,
    IonButtons,
    IonButton,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonRange,
    IonBadge,
    alertController,
} from '@ionic/vue';

import { DIFFICULTY_ICONS } from '@/constants';

// ─────────────────────────────────────────────────────────────
// Props & Emits
// ─────────────────────────────────────────────────────────────

interface Props {
    /** Model for difficulty index (0-10 corresponding to Fibonacci values) */
    modelValue?: number;
    /** Label for the section header */
    label?: string;
    /** Show the XP/GP/AP display section */
    showPointsDisplay?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: 0,
    label: 'Set Difficulty',
    showPointsDisplay: true,
});

const emit = defineEmits<{
    'update:modelValue': [value: number];
    'update:rewards': [rewards: { xp: number; gp: number; ap: number; difficulty: number }];
}>();

defineOptions({
    name: 'XpPointSlider',
});

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const fibonacciArray = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

const fibonacciDescriptions = [
    'Trivial',
    'Simple',
    'Easy',
    'Moderate',
    'Challenging',
    'Difficult',
    'Very Difficult',
    'Extremely Difficult',
    'Insane',
    'Legendary',
    'Mythical',
];

// ─────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────

const fibonacciIndex = ref(props.modelValue);

// ─────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────

const currentDifficulty = computed(() => fibonacciArray[fibonacciIndex.value] ?? 1);

const computedXp = computed(() => currentDifficulty.value * 100);
const computedGp = computed(() => currentDifficulty.value * 10);
const computedAp = computed(() => currentDifficulty.value * 1);

const difficultyIcon = computed(() => {
    return DIFFICULTY_ICONS[currentDifficulty.value] || 'fa-shield-check';
});

// ─────────────────────────────────────────────────────────────
// Methods
// ─────────────────────────────────────────────────────────────

const displayFibonacciValue = (index: number) => {
    const value = fibonacciArray[index];
    return value ? value.toString() : '0';
};

const increaseDifficulty = () => {
    if (fibonacciIndex.value < fibonacciArray.length - 1) {
        fibonacciIndex.value++;
    }
};

const decreaseDifficulty = () => {
    if (fibonacciIndex.value > 0) {
        fibonacciIndex.value--;
    }
};

const handleIndexChange = (ev: CustomEvent) => {
    fibonacciIndex.value = ev.detail.value;
};

const showHelp = async () => {
    const alert = await alertController.create({
        header: 'Fibonacci Difficulty',
        subHeader: 'Why these numbers?',
        message: 'We use the Fibonacci sequence (1, 2, 3, 5, 8...) to estimate effort. Harder tasks give disproportionately better rewards.',
        buttons: ['Got it'],
    });
    await alert.present();
};

// ─────────────────────────────────────────────────────────────
// Watchers
// ─────────────────────────────────────────────────────────────

// Sync external modelValue to internal state
watch(() => props.modelValue, (newVal) => {
    if (newVal !== fibonacciIndex.value) {
        fibonacciIndex.value = newVal;
    }
});

// Emit changes
watch(fibonacciIndex, (newIndex) => {
    emit('update:modelValue', newIndex);
    emit('update:rewards', {
        xp: computedXp.value,
        gp: computedGp.value,
        ap: computedAp.value,
        difficulty: currentDifficulty.value,
    });
});
</script>

<style lang="scss" scoped>
.xp-point-slider {
    width: 100%;
}

.difficulty-range {
    width: 100%;
}

.difficulty-section,
.points-section {
    margin-bottom: 1rem;
}
</style>
