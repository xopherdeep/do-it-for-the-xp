<template>
  <ion-modal 
    :is-open="isOpen" 
    @did-dismiss="$emit('close')" 
    class="type-selector-modal"
  >
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">{{ title }}</span>
        <ion-button fill="clear" @click="$emit('close')" class="close-btn">
          <i class="fal fa-times-square fa-2x"></i>
        </ion-button>
      </div>

      <!-- STEP 1: Selection -->
      <div v-if="step === 1" class="selection-grid">
        <button 
          v-for="option in options" 
          :key="option.value"
          class="selector-btn"
          :class="{ 'active': currentSelection === option.value }"
          @click="selectOption(option)"
        >
          <div class="btn-icon">
            <i :class="['fad', option.icon]"></i>
          </div>
          <div class="btn-info">
            <span class="btn-label">{{ option.name }}</span>
            <small v-if="option.text || option.shortDesc" class="btn-desc">
              {{ option.text || option.shortDesc }}
            </small>
          </div>
        </button>
      </div>

      <!-- STEP 2: Description & Confirm -->
      <div v-else-if="step === 2 && pendingOption" class="confirm-container">
        <div class="option-preview">
          <i :class="['fad', pendingOption.icon, 'preview-icon']"></i>
          <h2 class="option-name">{{ pendingOption.name }}</h2>
          <p class="option-description">{{ pendingOption.text || pendingOption.shortDesc }}</p>
          <div v-if="pendingOption.example" class="option-example">
            <i class="fad fa-lightbulb"></i>
            <span>{{ pendingOption.example }}</span>
          </div>
        </div>

        <div class="modal-actions">
          <ion-button fill="outline" color="medium" @click="step = 1" class="back-btn">
            Change
          </ion-button>
          <ion-button expand="block" color="rpg" @click="confirmSelection" class="confirm-btn">
            Choose Path
          </ion-button>
        </div>
      </div>
    </div>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, watch } from 'vue';
import { IonModal, IonButton } from '@ionic/vue';

export default defineComponent({
  name: 'XpTypeSelectorModal',
  components: { IonModal, IonButton },
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'Choose Type'
    },
    description: {
      type: String,
      default: ''
    },
    options: {
      type: Array as PropType<any[]>,
      default: () => []
    },
    currentSelection: {
      type: String,
      default: ''
    }
  },
  emits: ['close', 'select'],
  setup(props, { emit }) {
    const step = ref(1);
    const pendingOption = ref<any>(null);

    watch(() => props.isOpen, (newVal) => {
      if (newVal) {
        step.value = 1;
        pendingOption.value = null;
      }
    });

    const selectOption = (option: any) => {
      pendingOption.value = option;
      step.value = 2;
    };

    const confirmSelection = () => {
      if (pendingOption.value) {
        emit('select', pendingOption.value.value);
        emit('close');
      }
    };

    return {
      step,
      pendingOption,
      selectOption,
      confirmSelection
    };
  }
});
</script>

<style lang="scss" scoped>
.type-selector-modal {
  --width: 90%;
  --max-width: 400px;
  --height: auto;
  --max-height: 80vh;
  --border-radius: 24px;
  --background: transparent;
  
  &::part(content) {
    background: transparent;
  }
}

.modal-content {
  background: rgba(15, 15, 25, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  
  .modal-title {
    font-family: "Press Start 2P";
    font-size: 0.8rem;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .close-btn {
    --padding-start: 8px;
    --padding-end: 8px;
    margin: 0;
    --color: rgba(255, 255, 255, 0.6);
    
    &:hover {
      --color: #fff;
    }
  }
}

.selection-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selector-btn {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  line-height: 1.5;
  letter-spacing: 2px;
  text-align: left;

  &:hover {
    transform: translateX(8px);
    background: rgba(var(--ion-color-rpg-rgb), 0.1);
    border-color: var(--ion-color-rpg);
    
    .btn-icon {
      background: rgba(var(--ion-color-rpg-rgb), 0.2);
      i { color: var(--ion-color-rpg); transform: scale(1.1); }
    }
    
    .btn-label {
      color: #fff;
    }
  }
  
  &.active {
    border-color: var(--ion-color-rpg);
    background: rgba(var(--ion-color-rpg-rgb), 0.15);
    box-shadow: 0 0 24px rgba(var(--ion-color-rpg-rgb), 0.2);
    
    .btn-icon {
      background: rgba(var(--ion-color-rpg-rgb), 0.2);
      i { color: var(--ion-color-rpg); }
    }
    .btn-label { color: #fff; font-weight: bold; }
  }
  
  .btn-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    transition: all 0.3s;
    flex-shrink: 0;
    
    i {
      font-size: 1.5rem;
      color: rgba(255, 255, 255, 0.7);
    }
  }
  
  .btn-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 250px;
  }
  
  .btn-label {
    font-family: "Press Start 2P";
    font-size: 0.6rem;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
    display: block;
  }

  .btn-desc {
    font-family: "Press Start 2P";
    font-size: 0.45rem;
    text-transform: capitalize;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.4);
    line-height: 2;
    font-weight: normal;
  }
}

.confirm-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.option-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: rgba(255, 255, 255, 0.03);
  padding: 32px 20px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  
  .preview-icon {
    font-size: 4rem;
    color: var(--ion-color-rpg);
    margin-bottom: 20px;
    filter: drop-shadow(0 0 12px rgba(var(--ion-color-rpg-rgb), 0.4));
  }
  
  .option-name {
    font-family: "Press Start 2P";
    font-size: 1rem;
    color: #fff;
    margin: 0 0 16px;
  }
  
  .option-description {
    font-size: 1.2rem;
    line-height: 1;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 20px;
  }
  
  .option-example {
    font-size: 0.27rem;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(var(--ion-color-warning-rgb), 0.1);
    padding: 12px 16px;
    border-radius: 12px;
    text-align: left;
    font-family: "Press Start 2P";
    i { color: var(--ion-color-warning); font-size: 1.2rem; }
    span { font-size: 0.5rem; color: rgba(255, 255, 255, 0.8); font-style: italic; }
    letter-spacing: 1px;
  }
}

.modal-actions {
  display: flex;
  gap: 12px;
  
  .back-btn {
    flex: 1;
    --border-radius: 16px;
    font-family: "Press Start 2P";
    font-size: 0.6rem;
  }
  
  .confirm-btn {
    flex: 2;
    --border-radius: 16px;
    font-family: "Press Start 2P";
    font-size: 0.7rem;
    --box-shadow: 0 8px 24px rgba(var(--ion-color-rpg-rgb), 0.4);
  }
}
</style>
