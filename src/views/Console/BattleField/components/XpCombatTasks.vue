<template>
  <div class="xp-combat-tasks">
    <div class="tasks-container eb-box">
      <div class="tasks-header">
        <i class="fad fa-clipboard-list header-icon"></i>
        <span class="header-text">WHAT'S NEXT?</span>
      </div>
      <div class="tasks-list">
        <div 
          v-for="task in tasks" 
          :key="task.id"
          class="combat-task-item"
          :class="{ 'is-completed': task.isCompleted }"
          @click="handleTaskClick(task)"
        >
          <div class="task-checkbox">
            <i v-if="task.isCompleted" class="fad fa-check-double check-icon"></i>
            <i v-else class="fad fa-circle-notch notch-icon"></i>
          </div>
          <div class="task-name">{{ task.name }}</div>
          <div class="task-strike" v-if="task.isCompleted"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { CombatTask } from '@/lib/services/battle/BattleService';

export default defineComponent({
  name: 'xp-combat-tasks',
  props: {
    tasks: {
      type: Array as PropType<CombatTask[]>,
      required: true
    }
  },
  emits: ['task-complete'],
  setup(props, { emit }) {
    const handleTaskClick = (task: CombatTask) => {
      if (!task.isCompleted) {
        emit('task-complete', task.id);
      }
    };

    return {
      handleTaskClick
    };
  }
});
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

.xp-combat-tasks {
  width: 100%;
  max-width: 400px;
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: auto;
}

.tasks-container {
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.85);
  border-radius: 8px;
  @include eb-box();
}

.tasks-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 8px;

  .header-icon {
    font-size: 20px;
    color: var(--ion-color-secondary);
  }

  .header-text {
    font-family: 'Twoson', sans-serif;
    font-size: 1.2rem;
    letter-spacing: 1px;
    color: #fff;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  }
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.combat-task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border-left: 4px solid transparent;

  &:hover:not(.is-completed) {
    background: rgba(255, 255, 255, 0.1);
    border-left-color: var(--ion-color-secondary);
    transform: translateX(4px);
  }

  &.is-completed {
    cursor: default;
    opacity: 0.6;
    background: rgba(45, 211, 111, 0.1);
    border-left-color: #2dd36f;
  }

  .task-checkbox {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    .check-icon {
      color: #2dd36f;
      font-size: 1.2rem;
    }
    
    .notch-icon {
      color: rgba(255, 255, 255, 0.4);
      font-size: 1rem;
    }
  }

  .task-name {
    font-family: 'StatusPlz', sans-serif;
    font-size: 1.1rem;
    color: #fff;
    flex: 1;
  }

  .task-strike {
    position: absolute;
    left: 48px;
    right: 12px;
    height: 2px;
    background: #2dd36f;
    top: 50%;
    transform: translateY(-50%);
    animation: strike 0.3s ease-out forwards;
  }
}

@keyframes strike {
  from { width: 0; opacity: 0; }
  to { width: calc(100% - 60px); opacity: 1; }
}

@keyframes pulse-task {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.2); }
  70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
}

.combat-task-item:not(.is-completed):first-child {
  animation: pulse-task 2s infinite;
  border-left-color: var(--ion-color-secondary);
}
</style>
