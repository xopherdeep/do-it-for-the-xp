<template>
  <div class="loot-settings config-box">
    <div class="config-label">Chest Contents</div>
    
    <!-- Chest Type Grid -->
    <div class="chest-type-grid">
      <div 
        v-for="chest in chestTypes" 
        :key="chest.id"
        class="chest-option"
        :class="{ active: selectedChestType === chest.id }"
        @click="$emit('select-chest-type', chest.id)"
      >
        <i :class="['fad', chest.icon]"></i>
        <span>{{ chest.label }}</span>
      </div>
    </div>

    <!-- Dungeon Items (Strict 2x2 Grid) -->
    <div v-if="selectedChestType === 'dungeon'" class="dungeon-items mt-15">
      <div class="item-grid items-2">
        <div 
          v-for="item in dungeonItems" 
          :key="item.id"
          class="item-option mini"
          :class="{ active: selectedDungeonItem === item.id }"
          @click="$emit('select-dungeon-item', item.id)"
        >
          <i :class="['fad', item.icon]"></i>
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- Key Items (Narrative & Pegasus) -->
    <div v-if="selectedChestType === 'key-item'" class="key-items mt-15">
      <div class="item-grid items-3">
        <div 
          v-for="item in keyItems" 
          :key="item.id"
          class="item-option mini"
          :class="{ active: selectedDungeonItem === item.id }"
          @click="$emit('select-dungeon-item', item.id)"
          :title="item.description"
        >
          <!-- Handle both font-awesome classes and simple icon names -->
          <i :class="item.icon.startsWith('fa') ? ['fad', item.icon] : ['fad', 'fa-' + item.icon]"></i>
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- Gold -->
    <div v-if="selectedChestType === 'gold'" class="amount-section mt-15">
      <div class="amount-info">
        <span>{{ goldAmount }} GP</span>
      </div>
      <ion-range 
        :min="10" 
        :max="500" 
        :step="10"
        :value="goldAmount"
        @ion-change="$emit('update-gold', $event.detail.value)"
        color="warning"
      />
    </div>

    <!-- Consumables -->
    <div v-if="selectedChestType === 'consumable'" class="consumable-items mt-15">
      <div class="item-grid items-3">
        <div 
          v-for="item in consumableItems" 
          :key="item.id"
          class="item-option mini"
          :class="{ active: selectedItems?.includes(item.id) }"
          @click="$emit('toggle-consumable', item.id)"
        >
          <i :class="['fad', item.icon]"></i>
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- Mimic Option -->
    <div 
      class="mimic-config-toggle mt-15 glass-box" 
      :class="{ active: isMimic }" 
      @click="$emit('toggle-mimic')"
    >
      <div class="toggle-left">
        <i :class="isMimic ? 'fas fa-eye-evil' : 'fad fa-treasure-chest'"></i>
        <span>Mimic Trap</span>
      </div>
      <ion-toggle :checked="isMimic" @ion-change="$emit('update-mimic', $event.detail.checked)" />
    </div>

    <!-- Mimic Details -->
    <div v-if="isMimic" class="mimic-details mt-10">
      <div class="mimic-type-grid mini">
        <div 
          class="mimic-option mini"
          :class="{ active: mimicType === 'random' || !mimicType }"
          @click="$emit('select-mimic-type', 'random')"
        >
          <i class="fad fa-dice"></i>
          <span>Random</span>
        </div>
        <div 
          class="mimic-option mini"
          :class="{ active: mimicType === 'mimic' }"
          @click="$emit('select-mimic-type', 'mimic')"
        >
          <i class="fad fa-treasure-chest"></i>
          <span>Classic</span>
        </div>
        <div 
          class="mimic-option mini"
          :class="{ active: mimicType === 'custom' }"
          @click="$emit('select-mimic-type', 'custom')"
        >
          <i class="fad fa-paw-claws"></i>
          <span>Pick</span>
        </div>
      </div>
      
      <!-- Custom Mimic Beast Selector -->
      <div v-if="mimicType === 'custom'" class="mimic-custom-visual mt-10">
        <div v-if="mimicBeast" class="beast-card-wrapper max-w-120 mx-auto" @click="$emit('open-mimic-selector')">
          <XpBeastSelectorItem 
            :name="mimicBeast.name"
            :avatar="mimicBeast.avatar"
            :bg1="mimicBeast.bg1"
            :bg2="mimicBeast.bg2"
          />
          <div class="edit-overlay"><i class="fas fa-pen"></i></div>
        </div>
        <div v-else class="beast-selection-trigger mini" @click="$emit('open-mimic-selector')">
          <div class="trigger-left">
            <i class="fad fa-paw-claws"></i>
            <span>Select Mimic Beast</span>
          </div>
          <i class="fas fa-chevron-right op-30"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { IonRange, IonToggle } from '@ionic/vue';
import XpBeastSelectorItem from '@/views/App/SideMenu/XpGameMaster/XpBestiary/components/XpBeastSelectorItem.vue';
import { Beast } from '@/lib/databases/BestiaryDb';
import { CHEST_TYPES, CONSUMABLE_ITEMS, DUNGEON_ITEMS, KEY_ITEMS } from '../hooks';

export default defineComponent({
  name: 'RoomLootConfig',
  components: { IonRange, IonToggle, XpBeastSelectorItem },
  props: {
    selectedChestType: { type: String, default: '' },
    selectedDungeonItem: { type: String, default: '' },
    selectedItems: { type: Array as PropType<string[]>, default: () => [] },
    goldAmount: { type: Number, default: 50 },
    isMimic: { type: Boolean, default: false },
    mimicType: { type: String, default: 'random' },
    mimicBeast: { type: Object as PropType<Beast | null>, default: null }
  },
  emits: [
    'select-chest-type', 
    'select-dungeon-item', 
    'toggle-consumable',
    'update-gold',
    'toggle-mimic',
    'update-mimic',
    'select-mimic-type',
    'open-mimic-selector'
  ],
  setup() {
    return {
      chestTypes: CHEST_TYPES,
      dungeonItems: DUNGEON_ITEMS,
      consumableItems: CONSUMABLE_ITEMS,
      keyItems: KEY_ITEMS
    };
  }
});
</script>

<style lang="scss" scoped>
.config-box {
  .config-label {
    font-family: "Press Start 2P";
    font-size: 0.65rem;
    color: #fff;
    opacity: 0.7;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
  }
}

.chest-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.chest-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  
  i { font-size: 1.3rem; color: rgba(255, 255, 255, 0.5); transition: color 0.2s; }
  span { font-family: "StatusPlz"; font-size: 0.65rem; color: rgba(255, 255, 255, 0.5); }
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  &.active {
    background: rgba(255, 215, 64, 0.15);
    border-color: #ffd740;
    i { color: #ffd740; }
    span { color: #fff; }
  }
}

.item-grid {
  display: grid;
  gap: 8px;
  
  &.items-3 {
    grid-template-columns: repeat(3, 1fr);
  }

  &.items-2 {
    grid-template-columns: repeat(2, 1fr);
  }
}

.item-option.mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  
  i { font-size: 1.1rem; color: rgba(255, 255, 255, 0.4); }
  span { font-family: "StatusPlz"; font-size: 0.5rem; color: rgba(255, 255, 255, 0.4); }
  
  &.active {
    background: rgba(var(--ion-color-primary-rgb), 0.15);
    border-color: var(--ion-color-primary);
    i { color: var(--ion-color-primary); }
    span { color: #fff; }
  }
}

.amount-section {
  .amount-info {
    display: flex;
    justify-content: center;
    margin-bottom: 4px;
    span { font-family: "Press Start 2P"; font-size: 0.8rem; color: #ffd740; }
  }
}

.glass-box {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px 20px;
}

.mimic-config-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  
  .toggle-left {
    display: flex;
    align-items: center;
    gap: 12px;
    i { font-size: 1.2rem; color: #ffd740; transition: color 0.3s; }
    span { font-family: "StatusPlz"; font-size: 1.1rem; color: #fff; }
  }

  &.active {
    background: rgba(var(--ion-color-danger-rgb), 0.1);
    border-color: rgba(var(--ion-color-danger-rgb), 0.3);
    .toggle-left i { color: var(--ion-color-danger); }
  }
}

.mimic-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.mimic-option.mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 6px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  
  i { font-size: 1.1rem; color: rgba(255, 255, 255, 0.4); transition: all 0.2s; }
  span { font-family: "StatusPlz"; font-size: 0.55rem; color: rgba(255, 255, 255, 0.5); }
  
  &:hover {
    background: rgba(255, 82, 82, 0.1);
    border-color: rgba(255, 82, 82, 0.3);
    i { color: #ff8a80; }
  }
  
  &.active {
    background: rgba(255, 82, 82, 0.15);
    border-color: rgba(255, 82, 82, 0.5);
    box-shadow: 0 0 15px rgba(255, 82, 82, 0.2);
    i { color: #ff5252; }
    span { color: #fff; }
  }
}

.beast-selection-trigger.mini {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;

  .trigger-left {
    display: flex;
    align-items: center;
    gap: 12px;
    i { font-size: 1rem; color: var(--ion-color-primary); }
    span { font-family: "StatusPlz"; font-size: 0.8rem; color: #fff; }
  }
  
  &:hover { 
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--ion-color-primary);
  }
}

.beast-card-wrapper {
  position: relative;
  
  &:hover {
    .edit-overlay { opacity: 1; transform: scale(1.1); }
  }
}

.edit-overlay {
  position: absolute;
  bottom: 30px;
  right: 10px;
  z-index: 5;
  background: rgba(var(--ion-color-primary-rgb), 0.8);
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.8rem;
  opacity: 0;
  transition: all 0.2s;
  cursor: pointer;
}

.mt-10 { margin-top: 10px; }
.mt-15 { margin-top: 15px; }
.op-30 { opacity: 0.3; }
.max-w-120 { max-width: 120px; }
.mx-auto { margin-left: auto; margin-right: auto; }
</style>
