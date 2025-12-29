<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="$emit('close')"
    class="food-selector-modal"
  >
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-title>Favorite Food</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding icon-colors bg-slide bg-slide-modal">
      <div class="selection-header">
        <h2 class="earthbound-title">What do you enjoy eating most?</h2>
        <p>Your choice will appear on your Gamer Card!</p>
      </div>

      <div class="food-grid">
        <div
          v-for="food in foodOptions"
          :key="food.value"
          class="food-card"
          :class="{ active: food.value === modelValue }"
          @click="selectFood(food.value)"
        >
          <div class="food-icon-container">
            <i :class="`fad ${food.icon} fa-3x`"></i>
          </div>
          <span class="food-name">{{ food.value }}</span>
          <div
            v-if="food.value === modelValue"
            class="active-badge"
          >
            <i class="fas fa-check"></i>
          </div>
        </div>
      </div>

      <div class="footer-spacer"></div>
    </ion-content>

    <!-- <ion-footer
      class="rpg-box ion-padding"
      v-if="modelValue"
    >
      <div class="footer-actions">
        <ion-button
          fill="outline"
          color="rpg"
          @click="$emit('close')"
          class="confirm-button"
        >
          Select {{ modelValue }}
        </ion-button>
      </div>
    </ion-footer> -->
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { FOOD_OPTIONS } from "@/constants";
import { closeOutline } from 'ionicons/icons';
import ionic from "@/mixins/ionic";

export default defineComponent({
  name: 'FoodSelector',
  mixins: [ionic],
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    modelValue: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue', 'close'],
  setup(props, { emit }) {
    const foodOptions = ref(FOOD_OPTIONS);

    const selectFood = (foodValue: string) => {
      emit('update:modelValue', foodValue);
      // Small delay for visual feedback before auto-closing
      setTimeout(() => {
        emit('close');
      }, 200);
    };

    return {
      foodOptions,
      closeOutline,
      selectFood
    };
  }
});
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound" as eb;

  ion-content {
    --background: transparent;
    background: transparent;
  }

  .food-selector-modal {
    --width: 100%;
    --height: 100%;
  }

  .selection-header {
    text-align: center;
    margin-bottom: 2rem;

    h2 {
      font-size: 1.5rem;
      color: eb.$eb-color-pale-yellow;
      margin-bottom: 0.5rem;
    }

    p {
      color: eb.$eb-color-cream;
      opacity: 0.8;
    }
  }

  .food-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 1rem;
    padding-bottom: 2rem;
  }

  .food-card {
    background: rgba(30, 30, 45, 0.6);
    border-radius: 16px;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px solid transparent;
    transition: all 0.25s ease;
    position: relative;
    cursor: pointer;

    &:hover {
      transform: translateY(-5px);
      background: rgba(45, 45, 65, 0.8);
      border-color: eb.$eb-color-minty-blue;
      box-shadow: 0 8px 20px rgba(104, 208, 184, 0.2);
    }

    &.active {
      background: rgba(104, 208, 184, 0.15);
      border-color: eb.$eb-color-minty-blue;
      box-shadow: 0 0 15px rgba(104, 208, 184, 0.3);

      .food-icon-container i {
        color: eb.$eb-color-minty-blue;
        transform: scale(1.1);
      }

      .food-name {
        color: eb.$eb-color-minty-blue;
        font-weight: 700;
      }
    }
  }

  .food-icon-container {
    margin-bottom: 1rem;
    transition: transform 0.2s ease;

    i {
      color: eb.$eb-color-cream;
      transition: all 0.2s ease;
    }
  }

  .food-name {
    font-size: 1rem;
    color: eb.$eb-color-cream;
    text-align: center;
    line-height: 1.2;
  }

  .active-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: eb.$eb-color-minty-blue;
    color: eb.$eb-color-slate;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    border: 2px solid eb.$eb-color-pale-yellow;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .footer-actions {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .confirm-button {
    --border-radius: 8px;
    height: 40px;
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    --border-width: 2px;
    margin: 0 auto;
    min-width: 200px;
  }

  .footer-spacer {
    height: 80px;
  }
</style>