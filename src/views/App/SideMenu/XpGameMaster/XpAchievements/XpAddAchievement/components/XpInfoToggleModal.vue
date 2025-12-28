<template>
  <ion-modal 
    :is-open="isOpen" 
    @did-dismiss="$emit('close')" 
    class="info-toggle-modal"
  >
    <div class="modal-content">
      <div class="modal-header">
        <div class="header-icon" :class="variant">
          <i :class="['fad', icon]"></i>
        </div>
        <span class="modal-title">{{ title }}</span>
        <ion-button fill="clear" @click="$emit('close')" class="close-btn">
          <i class="fal fa-times fa-lg"></i>
        </ion-button>
      </div>

      <div class="modal-body">
        <p class="description">{{ description }}</p>
        
        <div class="info-cards">
          <div 
            class="info-card" 
            :class="{ active: !selectedValue }"
            @click="selectedValue = false"
          >
            <div class="card-header">
              <i :class="['fad', offIcon || 'fa-toggle-off']"></i>
              <span>{{ offLabel }}</span>
            </div>
            <p class="card-desc">{{ offDescription }}</p>
          </div>
          
          <div 
            class="info-card" 
            :class="{ active: selectedValue }"
            @click="selectedValue = true"
          >
            <div class="card-header">
              <i :class="['fad', onIcon || 'fa-toggle-on']"></i>
              <span>{{ onLabel }}</span>
            </div>
            <p class="card-desc">{{ onDescription }}</p>
          </div>
        </div>

        <!-- Note/Advisory Box -->
        <div class="note-box" :class="[variant, selectedValue ? 'on' : 'off']">
          <div class="note-header">
            <i :class="['fad', selectedValue ? 'fa-dice-d20' : 'fa-dice-d4']"></i>
            <span>{{ selectedValue ? 'GM ADVISORY' : 'REWARD LOOP' }}</span>
          </div>
          <p class="note-text">{{ selectedValue ? onNote : offNote }}</p>
        </div>
      </div>

      <div class="modal-actions">
        <ion-button 
          fill="outline" 
          color="medium" 
          @click="$emit('close')" 
          class="cancel-btn"
        >
          Cancel
        </ion-button>
        <ion-button 
          color="success" 
          @click="handleSave" 
          class="save-btn"
        >
          <i class="fad fa-check-circle mr-2"></i>
          {{ confirmLabel }}
        </ion-button>
      </div>
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { IonModal, IonButton } from '@ionic/vue';

interface Props {
  isOpen: boolean;
  title: string;
  description: string;
  icon: string;
  variant: 'approval' | 'bonus';
  currentValue: boolean;
  onLabel: string;
  offLabel: string;
  onDescription: string;
  offDescription: string;
  onNote?: string;
  offNote?: string;
  onIcon?: string;
  offIcon?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  save: [value: boolean];
}>();

const selectedValue = ref(props.currentValue);

const confirmLabel = ref('');

const updateLabel = () => {
  confirmLabel.value = `SET AS ${selectedValue.value ? props.onLabel : props.offLabel}`;
}

watch(() => props.isOpen, (val) => {
  if (val) {
    selectedValue.value = props.currentValue;
    updateLabel();
  }
});

watch(selectedValue, updateLabel);

const handleSave = () => {
  emit('save', selectedValue.value);
};

defineOptions({
  name: 'XpInfoToggleModal'
});
</script>

<style lang="scss" scoped>
.info-toggle-modal {
  --width: 90%;
  --max-width: 440px;
  --height: auto;
  --max-height: 90vh;
  --border-radius: 24px;
  --background: transparent;
  
  &::part(content) {
    background: transparent;
  }
}

.modal-content {
  background: rgba(15, 15, 25, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.header-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  
  &.approval {
    background: rgba(var(--ion-color-primary-rgb), 0.2);
    i { color: var(--ion-color-primary); }
  }
  
  &.bonus {
    background: rgba(var(--ion-color-tertiary-rgb), 0.2);
    i { color: var(--ion-color-tertiary); }
  }
  
  i {
    font-size: 1.5rem;
  }
}

.modal-title {
  flex: 1;
  font-family: "Press Start 2P";
  font-size: 0.8rem;
  color: #fff;
  text-transform: uppercase;
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

.modal-body {
  margin-bottom: 24px;
}

.description {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0 0 20px;
}

.info-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.info-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover:not(.active) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &.active {
    border-color: var(--ion-color-success);
    background: rgba(var(--ion-color-success-rgb), 0.1);
    box-shadow: 0 4px 20px rgba(var(--ion-color-success-rgb), 0.2);
    
    .card-header {
      color: var(--ion-color-success);
    }
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 3px;
  
  i {
    font-size: 1.2rem;
  }
  
  span {
    font-family: "Press Start 2P";
    font-size: 0.6rem;
    text-transform: uppercase;
  }
}

.card-desc {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1;
  letter-spacing: 1px;
  margin: 0;
}

.note-box {
  border-radius: 12px;
  padding: 16px;
  margin-top: 12px;
  border: 1px solid transparent;
  transition: all 0.3s ease;

  &.on {
    background: rgba(var(--ion-color-warning-rgb), 0.1);
    border-color: rgba(var(--ion-color-warning-rgb), 0.3);
    .note-header { color: var(--ion-color-warning); }
  }

  &.off {
    background: rgba(var(--ion-color-success-rgb), 0.1);
    border-color: rgba(var(--ion-color-success-rgb), 0.3);
    .note-header { color: var(--ion-color-success); }
  }

  .note-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    i { font-size: 1.1rem; }
    span {
      font-family: "Press Start 2P";
      font-size: 0.55rem;
      letter-spacing: 1px;
    }
  }

  .note-text {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1;
    letter-spacing: 1px;
    margin: 0;
  }
}

.modal-actions {
  display: flex;
  gap: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 24px;
  
  .cancel-btn {
    flex: 1;
    --border-radius: 12px;
    font-size: 0.85rem;
  }
  
  .save-btn {
    flex: 2;
    --border-radius: 12px;
    font-family: "Press Start 2P";
    font-size: 0.55rem;
    --box-shadow: 0 4px 16px rgba(var(--ion-color-success-rgb), 0.3);
  }
}

.mr-2 {
  margin-right: 8px;
}
</style>
