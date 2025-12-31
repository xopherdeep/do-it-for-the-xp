<template>
  <div v-if="modelValue">
    <!-- Reimagined Quick Edit Popover -->
    <ion-popover :is-open="modelValue.isOpen" :event="modelValue.event"
      @didDismiss="$emit('update:modelValue', { ...modelValue, isOpen: false })" class="quick-edit-popover" mode="ios">
      <div class="popover-inner">
        <div class="popover-header">
          <span class="header-title">Quick Action</span>
          <span class="header-coords">{{ modelValue.row }},{{ modelValue.col }}</span>
        </div>

        <div class="type-grid" v-if="!showItems">
          <button v-for="type in types" :key="type" class="type-btn"
            :class="[type, { 'is-active': modelValue.roomType === type }]" @click="handleTypeClick(type)">
            <div class="icon-orb">
              <i :class="['fad', roomIcons[type]]"></i>
            </div>
            <span class="type-label">{{ formatTypeName(type) }}</span>
          </button>
        </div>

        <!-- Dungeon Items Grid (2x2) -->
        <div class="item-selection" v-else>
          <div class="selection-header">
            <button class="back-btn" @click="showItems = false">
              <i class="fas fa-arrow-left"></i>
            </button>
            <span>Select Loot</span>
          </div>

          <div class="item-grid">
            <button v-for="item in dungeonItems" :key="item.id" class="item-btn"
              :class="{ 'is-active': modelValue.content?.item === item.id }" @click="selectItem(item)">
              <div class="icon-orb">
                <i :class="['fad', 'fa-' + item.icon]"></i>
              </div>
              <span class="item-label">{{ item.name }}</span>
            </button>
            <!-- Empty Chest Option -->
            <button class="item-btn" :class="{ 'is-active': !modelValue.content?.item }" @click="selectItem(null)">
              <div class="icon-orb empty">
                <i class="fad fa-treasure-chest"></i>
              </div>
              <span class="item-label">Empty</span>
            </button>
          </div>
        </div>

        <div class="popover-divider"></div>

        <div class="popover-footer">
          <button class="action-btn clear-btn" @click="$emit('clear')">
            <i class="fas fa-eraser"></i>
            <span>Clear Cell</span>
          </button>

          <button class="action-btn cancel-btn" @click="$emit('update:modelValue', { ...modelValue, isOpen: false })">
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </ion-popover>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, watch, computed } from 'vue';
import { IonPopover } from '@ionic/vue';

export default defineComponent({
  name: 'XpTempleCreatorPopovers',
  components: {
    IonPopover
  },
  props: {
    modelValue: {
      type: Object as PropType<any>,
      required: true
    },
    roomIcons: {
      type: Object as PropType<Record<string, string>>,
      required: true
    },
    dungeonItems: {
      type: Array as PropType<any[]>,
      default: () => []
    },
    hasEntrance: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'apply-type', 'apply-content', 'clear'],
  setup(props, { emit }) {
    // Primary types - dynamic based on whether entrance exists
    const types = computed(() => {
      const baseTypes = ['monster', 'loot', 'boss', 'shop', 'health', 'teleport'];
      // If entrance already exists, show 'empty' instead; otherwise show 'entrance'
      if (props.hasEntrance) {
        baseTypes.push('empty');
      } else {
        baseTypes.push('entrance');
      }
      baseTypes.push('wall');
      return baseTypes;
    });
    const showItems = ref(false);

    watch(() => props.modelValue.isOpen, (isOpen) => {
      if (isOpen && props.modelValue.roomType === 'loot') {
        showItems.value = true;
      } else {
        showItems.value = false;
      }
    });

    const formatTypeName = (type: string) => {
      if (type === 'loot') return 'Chest';
      if (type === 'health') return 'Heal';
      return type.charAt(0).toUpperCase() + type.slice(1);
    };

    const handleTypeClick = (type: string) => {
      if (type === 'loot') {
        showItems.value = true;
        // Apply the type change immediately so parent knows it's loot
        emit('apply-type', 'loot');
      } else {
        emit('apply-type', type);
      }
    };

    const selectItem = (item: any) => {
      const content = item ? { item: item.id } : {};
      emit('apply-content', {
        roomType: 'loot',
        content,
        sides: props.modelValue.sides // Preserve sides
      });
      // Close popover handled by parent update or explicit close? 
      // Usually apply actions allow further editing or close. 
      // Let's keep it open or close it? Quick Edit implies close on action mostly.
      // But for 2-step (Loot -> Item), selecting item should probably close it.
      emit('update:modelValue', { ...props.modelValue, isOpen: false });
    };

    return {
      types,
      formatTypeName,
      showItems,
      handleTypeClick,
      selectItem
    };
  }
});
</script>

<style lang="scss" scoped>
.quick-edit-popover {
  --width: 260px;
  --background: transparent;
  --box-shadow: none;

  &::part(content) {
    background: transparent;
    border-radius: 20px;
  }
}

.popover-inner {
  background: rgba(15, 15, 25, 0.85);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.popover-header {
  padding: 14px 18px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .header-title {
    font-family: "Press Start 2P";
    font-size: 0.55rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .header-coords {
    font-family: "StatusPlz";
    font-size: 0.75rem;
    color: var(--ion-color-primary-tint);
    opacity: 0.8;
  }
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
}

/* Item Selection Mode */
.item-selection {
  padding: 16px;
}

.selection-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  span {
    font-family: "Press Start 2P";
    font-size: 0.6rem;
    color: #fff;
  }
}

.back-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: #fff;
  }
}

.item-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.item-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  /* Spacing between icon and label */
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  min-height: 90px;

  &:hover {
    background: rgba(255, 255, 255, 0.08);

    .icon-orb {
      transform: scale(1.1);
    }
  }

  &.is-active {
    background: rgba(var(--ion-color-secondary-rgb), 0.15);
    border-color: var(--ion-color-secondary);

    .item-label {
      color: #fff;
    }
  }

  .icon-orb {
    width: 40px;
    height: 40px;
    /* ... inherit other orb styles via class or duplicate base ... 
       Wait, I should check if .icon-orb is globally scoped or repeated. 
       It is repeated in .type-btn but not root. Let's make sure it works.
    */
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    transition: transform 0.2s;

    &.empty {
      color: rgba(255, 255, 255, 0.3);
    }
  }

  .item-label {
    font-family: "StatusPlz";
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    text-align: center;
    line-height: 1.2;
  }
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-4px);

    .icon-orb {
      box-shadow: 0 8px 20px rgba(var(--orb-color-rgb, 0, 0, 0), 0.5);
      border-color: rgba(255, 255, 255, 0.3);
    }
  }

  &:active {
    transform: scale(0.92);
  }

  &.is-active {
    .icon-orb {
      border-color: #fff;
      box-shadow: 0 0 15px rgba(var(--orb-color-rgb, 255, 255, 255), 0.4);
    }

    .type-label {
      color: #fff;
      font-weight: 600;
    }
  }

  .icon-orb {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--orb-bg, #333);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;

    i {
      font-size: 1.3rem;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }
  }

  .type-label {
    font-family: "StatusPlz";
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
  }

  /* Thematic Gradients */
  &.monster {
    --orb-bg: linear-gradient(135deg, #ff416c, #ff4b2b);
    --orb-color-rgb: 255, 75, 43;
  }

  &.boss {
    --orb-bg: linear-gradient(135deg, #667eea, #764ba2);
    --orb-color-rgb: 118, 75, 162;
  }

  &.loot {
    --orb-bg: linear-gradient(135deg, #f6d365, #fda085);
    --orb-color-rgb: 253, 160, 133;
  }

  &.shop {
    --orb-bg: linear-gradient(135deg, #fa709a, #fee140);
    --orb-color-rgb: 250, 112, 154;
  }

  &.health {
    --orb-bg: linear-gradient(135deg, #30cfd0, #330867);
    --orb-color-rgb: 48, 207, 208;
  }

  &.teleport {
    --orb-bg: linear-gradient(135deg, #a8edea, #fed6e3);
    --orb-color-rgb: 168, 237, 234;
  }

  &.entrance {
    --orb-bg: linear-gradient(135deg, #43e97b, #38f9d7);
    --orb-color-rgb: 56, 249, 215;
  }

  &.empty {
    --orb-bg: linear-gradient(135deg, #667eea, #764ba2);
    --orb-color-rgb: 102, 126, 234;
  }

  &.wall {
    --orb-bg: linear-gradient(135deg, #2c3e50, #000000);
    --orb-color-rgb: 0, 0, 0;
  }
}

.popover-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
  margin: 0 16px;
}

.popover-footer {
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  width: 100%;
  padding: 10px;
  border-radius: 12px;
  border: none;
  font-family: "Press Start 2P";
  font-size: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &.clear-btn {
    background: rgba(var(--ion-color-danger-rgb), 0.15);
    color: var(--ion-color-danger);
    border: 1px solid rgba(var(--ion-color-danger-rgb), 0.3);

    &:hover {
      background: var(--ion-color-danger);
      color: #fff;
    }
  }

  &.cancel-btn {
    background: transparent;
    color: rgba(255, 255, 255, 0.4);

    &:hover {
      color: #fff;
    }
  }
}
</style>
