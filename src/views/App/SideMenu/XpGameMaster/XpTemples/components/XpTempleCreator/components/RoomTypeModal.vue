<template>
  <ion-modal 
    :is-open="isOpen" 
    @did-dismiss="$emit('close')" 
    class="room-type-modal"
  >
    <div class="modal-content dialpad-modal">
      <div class="modal-header">
        <!-- Back button -->
        <ion-button 
          v-if="step > 1" 
          fill="clear" 
          @click="handleBack" 
          class="back-btn"
        >
          <i class="fas fa-chevron-left"></i>
        </ion-button>
        <span v-else class="header-spacer"></span>
        
        <span class="modal-title">{{ title }}</span>
        
        <ion-button fill="clear" @click="$emit('close')" class="close-btn">
          <i class="fal fa-times-square fa-2x"></i>
        </ion-button>
      </div>
      
      <!-- STEP 1: Category Selection -->
      <div v-if="step === 1" class="dialpad-grid categories-grid">
        <button 
          v-for="category in categories" 
          :key="category.name"
          class="dialpad-btn category-btn"
          :class="getCategoryColorClass(category.name)"
          @click="selectCategory(category)"
        >
          <div class="dialpad-icon">
            <i :class="['fad', category.icon]"></i>
          </div>
          <span class="dialpad-label">{{ category.name }}</span>
        </button>
      </div>
      
      <!-- STEP 2: Room Type Selection -->
      <div v-else-if="step === 2 && selectedCategory" class="dialpad-grid types-grid">
        <button 
          v-for="type in selectedCategory.types" 
          :key="type"
          class="dialpad-btn type-dialpad-btn"
          :class="{ 'active': currentType === type, ['type-' + type]: true }"
          @click="selectType(type)"
        >
          <div class="dialpad-icon">
            <i :class="['fad', roomIcons[type]]"></i>
          </div>
          <span class="dialpad-label">{{ type }}</span>
        </button>
      </div>

      <!-- STEP 3: Configuration - Delegated via slot -->
      <div v-else-if="step === 3" class="config-step">
        <slot name="config"></slot>
        
        <ion-button expand="block" class="modal-apply-btn mt-20" @click="$emit('confirm')">
          Confirm Configuration
        </ion-button>
      </div>
    </div>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue';
import { IonModal, IonButton } from '@ionic/vue';
import { ROOM_ICONS } from '@/lib/engine/dungeons/roomTypes';
import { ROOM_CATEGORIES } from '../hooks';

interface RoomCategory {
  name: string;
  icon: string;
  types: string[];
}

export default defineComponent({
  name: 'RoomTypeModal',
  components: { IonModal, IonButton },
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    step: {
      type: Number,
      default: 1
    },
    selectedCategory: {
      type: Object as PropType<RoomCategory | null>,
      default: null
    },
    currentType: {
      type: String,
      default: ''
    }
  },
  emits: ['close', 'back', 'select-category', 'select-type', 'confirm', 'update:step'],
  setup(props, { emit }) {
    const roomIcons = ROOM_ICONS;
    const categories = ROOM_CATEGORIES;
    
    const title = computed(() => {
      if (props.step === 1) return 'Select Category';
      if (props.step === 2) return props.selectedCategory?.name || 'Select Type';
      if (props.step === 3) {
        const type = props.currentType || '';
        return type.charAt(0).toUpperCase() + type.slice(1) + ' Config';
      }
      return 'Room Editor';
    });
    
    const getCategoryColorClass = (categoryName: string) => {
      switch (categoryName) {
        case 'Combat': return 'category-combat';
        case 'Resources': return 'category-resources';
        case 'Recovery': return 'category-recovery';
        case 'Navigation': return 'category-navigation';
        case 'Structure': return 'category-structure';
        default: return '';
      }
    };
    
    const selectCategory = (category: RoomCategory) => {
      emit('select-category', category);
    };
    
    const selectType = (type: string) => {
      emit('select-type', type);
    };
    
    const handleBack = () => {
      emit('back');
    };
    
    return {
      roomIcons,
      categories,
      title,
      getCategoryColorClass,
      selectCategory,
      selectType,
      handleBack
    };
  }
});
</script>

<style lang="scss" scoped>
.room-type-modal {
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
  background: rgba(20, 20, 30, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  
  .header-spacer {
    width: 40px;
  }
  
  .back-btn {
    --padding-start: 8px;
    --padding-end: 8px;
    margin: 0;
    width: 40px;
    
    i {
      font-size: 1.2rem;
      color: rgba(255, 255, 255, 0.7);
    }
    
    &:hover i {
      color: #fff;
    }
  }
  
  .modal-title {
    font-family: "Press Start 2P";
    font-size: 0.7rem;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 1px;
    flex: 1;
    text-align: center;
  }
  
  .close-btn {
    --padding-start: 8px;
    --padding-end: 8px;
    margin: 0;
    width: 44px;
    --color: #fff;
    opacity: 0.8;
    transition: opacity 0.2s;
    
    &:hover {
      opacity: 1;
    }
    
    i {
      // Size handled by fa-2x
    }
  }
}

/* Dialpad Grid Layout */
.dialpad-grid {
  display: grid;
  gap: 12px;
  
  &.categories-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  &.types-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Dialpad Button Base */
.dialpad-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px 16px;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 110px;
  
  &:hover {
    transform: scale(1.03);
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  .dialpad-icon {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    transition: all 0.25s;
    
    i {
      font-size: 1.8rem;
      color: rgba(255, 255, 255, 0.6);
      transition: all 0.25s;
    }
  }
  
  .dialpad-label {
    font-family: "Press Start 2P";
    font-size: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.7);
    transition: color 0.25s;
  }
}

/* Category Button Colors */
.category-btn {
  &.category-combat {
    &:hover, &:focus {
      border-color: rgba(255, 82, 82, 0.5);
      background: rgba(255, 82, 82, 0.1);
      .dialpad-icon { background: rgba(255, 82, 82, 0.15); i { color: #ff5252; } }
      .dialpad-label { color: #ff5252; }
    }
  }
  
  &.category-resources {
    &:hover, &:focus {
      border-color: rgba(255, 215, 64, 0.5);
      background: rgba(255, 215, 64, 0.1);
      .dialpad-icon { background: rgba(255, 215, 64, 0.15); i { color: #ffd740; } }
      .dialpad-label { color: #ffd740; }
    }
  }
  
  &.category-recovery {
    &:hover, &:focus {
      border-color: rgba(255, 128, 171, 0.5);
      background: rgba(255, 128, 171, 0.1);
      .dialpad-icon { background: rgba(255, 128, 171, 0.15); i { color: #ff80ab; } }
      .dialpad-label { color: #ff80ab; }
    }
  }
  
  &.category-navigation {
    &:hover, &:focus {
      border-color: rgba(64, 196, 255, 0.5);
      background: rgba(64, 196, 255, 0.1);
      .dialpad-icon { background: rgba(64, 196, 255, 0.15); i { color: #40c4ff; } }
      .dialpad-label { color: #40c4ff; }
    }
  }
  
  &.category-structure {
    &:hover, &:focus {
      border-color: rgba(179, 136, 255, 0.5);
      background: rgba(179, 136, 255, 0.1);
      .dialpad-icon { background: rgba(179, 136, 255, 0.15); i { color: #b388ff; } }
      .dialpad-label { color: #b388ff; }
    }
  }
}

/* Room Type Dialpad Buttons */
.type-dialpad-btn {
  &.active {
    border-color: var(--ion-color-primary);
    background: rgba(var(--ion-color-primary-rgb), 0.15);
    box-shadow: 0 0 20px rgba(var(--ion-color-primary-rgb), 0.3);
    
    .dialpad-icon { 
      background: rgba(var(--ion-color-primary-rgb), 0.2);
      i { color: var(--ion-color-primary); }
    }
    .dialpad-label { color: #fff; }
  }
  
  /* Combat types */
  &.type-monster, &.type-boss, &.type-miniboss, &.type-trap {
    &:hover, &.active {
      border-color: rgba(255, 82, 82, 0.6);
      background: rgba(255, 82, 82, 0.15);
      .dialpad-icon { background: rgba(255, 82, 82, 0.2); i { color: #ff5252; } }
    }
  }
  
  /* Resource types */
  &.type-loot, &.type-key, &.type-master, &.type-shop {
    &:hover, &.active {
      border-color: rgba(255, 215, 64, 0.6);
      background: rgba(255, 215, 64, 0.15);
      .dialpad-icon { background: rgba(255, 215, 64, 0.2); i { color: #ffd740; } }
    }
  }
  
  &.type-shop {
    &:hover, &.active {
      border-color: rgba(105, 240, 174, 0.6);
      background: rgba(105, 240, 174, 0.15);
      .dialpad-icon { background: rgba(105, 240, 174, 0.2); i { color: #69f0ae; } }
    }
  }
  
  /* Recovery types */
  &.type-health, &.type-mana {
    &:hover, &.active {
      border-color: rgba(255, 128, 171, 0.6);
      background: rgba(255, 128, 171, 0.15);
      .dialpad-icon { background: rgba(255, 128, 171, 0.2); i { color: #ff80ab; } }
    }
  }
  
  /* Navigation types */
  &.type-entrance, &.type-teleport, &.type-puzzle, &.type-secret {
    &:hover, &.active {
      border-color: rgba(64, 196, 255, 0.6);
      background: rgba(64, 196, 255, 0.15);
      .dialpad-icon { background: rgba(64, 196, 255, 0.2); i { color: #40c4ff; } }
    }
  }
  
  &.type-puzzle, &.type-secret {
    &:hover, &.active {
      border-color: rgba(179, 136, 255, 0.6);
      background: rgba(179, 136, 255, 0.15);
      .dialpad-icon { background: rgba(179, 136, 255, 0.2); i { color: #b388ff; } }
    }
  }
  
  /* Structure types */
  &.type-empty, &.type-wall {
    &:hover, &.active {
      border-color: rgba(158, 158, 158, 0.6);
      background: rgba(158, 158, 158, 0.15);
      .dialpad-icon { background: rgba(158, 158, 158, 0.2); i { color: #9e9e9e; } }
    }
  }
}

/* Config Step Styles */
.config-step {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 4px;

  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
}

.modal-apply-btn {
  --border-radius: 16px;
  --background: linear-gradient(135deg, var(--ion-color-primary), #6366f1);
  --background-hover: linear-gradient(135deg, #4facfe, #00f2fe);
  --color: #fff;
  --padding-top: 18px;
  --padding-bottom: 18px;
  font-family: "Press Start 2P";
  font-size: 0.75rem;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 8px 16px rgba(var(--ion-color-primary-rgb), 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(var(--ion-color-primary-rgb), 0.5);
    filter: brightness(1.1);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }
}

.mt-20 { margin-top: 20px; }
</style>
