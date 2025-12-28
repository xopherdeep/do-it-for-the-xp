<template>
  <div class="xp-beast-selector">
    <!-- Header/Filter Area -->
    <div class="selector-header">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search beasts..." 
          class="beast-search-input"
        />
      </div>
      <div class="selection-count">
        {{ selectedIds.length }} selected
      </div>
    </div>

    <!-- Grid Area -->
    <div class="beast-grid-container">
      <ion-grid>
        <ion-row>
          <ion-col 
            size="4" 
            v-for="beast in filteredBeasts" 
            :key="beast.id"
          >
            <XpBeastSelectorItem 
              :name="beast.name"
              :avatar="beast.avatar"
              :bg1="beast.bg1"
              :bg2="beast.bg2"
              :selected="isSelected(beast.id)"
              @select="toggleSelection(beast.id)"
            />
          </ion-col>
        </ion-row>
      </ion-grid>
      
      <div v-if="filteredBeasts.length === 0" class="no-results">
        <i class="fad fa-ghost fa-3x"></i>
        <p>No beasts found...</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType, computed } from 'vue';
import { IonGrid, IonRow, IonCol } from '@ionic/vue';
import XpBeastSelectorItem from './XpBeastSelectorItem.vue';
import { Beast } from '@/lib/databases/BestiaryDb';

export default defineComponent({
  name: 'XpBeastSelector',
  components: {
    IonGrid, IonRow, IonCol,
    XpBeastSelectorItem
  },
  props: {
    beasts: {
      type: Array as PropType<Beast[]>,
      required: true
    },
    initialSelectedIds: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    multiple: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:selectedIds'],
  setup(props, { emit }) {
    const searchQuery = ref('');
    const selectedIds = ref<string[]>([...props.initialSelectedIds]);

    const filteredBeasts = computed(() => {
      if (!searchQuery.value) return props.beasts;
      const query = searchQuery.value.toLowerCase();
      return props.beasts.filter(beast => 
        beast.name.toLowerCase().includes(query)
      );
    });

    const isSelected = (id: string) => selectedIds.value.includes(id);

    const toggleSelection = (id: string) => {
      if (props.multiple) {
        const index = selectedIds.value.indexOf(id);
        if (index === -1) {
          selectedIds.value.push(id);
        } else {
          selectedIds.value.splice(index, 1);
        }
      } else {
        selectedIds.value = [id];
      }
      emit('update:selectedIds', [...selectedIds.value]);
    };

    return {
      searchQuery,
      selectedIds,
      filteredBeasts,
      isSelected,
      toggleSelection
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-beast-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
}

.selector-header {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}

.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;

  i {
    position: absolute;
    left: 12px;
    color: rgba(255, 255, 255, 0.5);
  }

  .beast-search-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 30px;
    padding: 10px 16px 10px 40px;
    color: #fff;
    font-family: "StatusPlz";
    font-size: 1rem;
    outline: none;
    transition: all 0.2s ease;

    &:focus {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--ion-color-primary);
      box-shadow: 0 0 10px rgba(var(--ion-color-primary-rgb), 0.3);
    }
  }
}

.selection-count {
  font-family: "Press Start 2P";
  font-size: 0.6rem;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
  padding: 8px 12px;
  border-radius: 20px;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
}

.beast-grid-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;

  i {
    margin-bottom: 16px;
  }

  p {
    font-family: "Press Start 2P";
    font-size: 0.8rem;
  }
}
</style>
