<template>
  <div class="day-selector">
    <div 
      v-for="day in daysOfWeek" 
      :key="day.value"
      class="day-unit"
      :class="day.color"
    >
      <div 
        class="day-btn"
        :class="{ 'day-btn--selected': selectedDays.includes(day.index) }"
        @click="toggleDay(day.index)"
      >
        {{ day.label }}
      </div>
      <div class="day-symbol">
        {{ day.symbol }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from "vue";

export default defineComponent({
  name: "XpDaySelector",
  props: {
    modelValue: {
      type: Array as PropType<number[]>, // 0-6
      default: () => [],
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    
    const getLocalDayName = (dayIndex: number) => {
        // Jan 5, 2025 is a Sunday
        const date = new Date(2025, 0, 5 + dayIndex);
        return date.toLocaleDateString(undefined, { weekday: 'short' });
    };

    const daysOfWeek = [
      { label: getLocalDayName(0), value: 'sun', index: 0, color: 'indigo', symbol: '☉' }, 
      { label: getLocalDayName(1), value: 'mon', index: 1, color: 'violet', symbol: '☾' },
      { label: getLocalDayName(2), value: 'tue', index: 2, color: 'red', symbol: '♂' },
      { label: getLocalDayName(3), value: 'wed', index: 3, color: 'orange', symbol: '☿' },
      { label: getLocalDayName(4), value: 'thu', index: 4, color: 'yellow', symbol: '♃' },
      { label: getLocalDayName(5), value: 'fri', index: 5, color: 'green', symbol: '♀' },
      { label: getLocalDayName(6), value: 'sat', index: 6, color: 'blue', symbol: '♄' },
    ];

    const selectedDays = computed(() => props.modelValue || []);

    const toggleDay = (dayIndex: number) => {
      const current = [...selectedDays.value];
      const index = current.indexOf(dayIndex);
      
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(dayIndex);
      }
      
      // Sort for consistency
      current.sort((a, b) => a - b);
      emit("update:modelValue", current);
    };

    return {
      daysOfWeek,
      selectedDays,
      toggleDay
    };
  },
});
</script>

<style lang="scss" scoped>
.day-selector {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  width: 100%;
}

.day-unit {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.day-btn {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-weight: 700;
  color: var(--ion-color-medium);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.9rem;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  &.day-btn--selected {
    color: #fff;
    transform: scale(1.1);
    z-index: 1;
    border-width: 2px;
  }
}

.day-symbol {
  font-size: 1.42rem;
  opacity: 0.3;
  transition: all 0.3s ease;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: serif;
}

// ROYGBIV Spectrum Logic
.day-unit {
  &.red {
    .day-btn:hover, .day-btn--selected {
      background: linear-gradient(90deg, #b30000 0%, #ff4c4c 100%);
      border-color: #ff8080;
      box-shadow: 0 0 15px rgba(255, 0, 0, 0.4);
    }
    .day-btn--selected ~ .day-symbol, .day-btn:hover ~ .day-symbol {
      color: #ff4c4c;
      opacity: 1;
      text-shadow: 0 0 8px rgba(255, 76, 76, 0.6);
    }
  }
  &.orange {
    .day-btn:hover, .day-btn--selected {
      background: linear-gradient(90deg, #cc5200 0%, #ff944d 100%);
      border-color: #ffb380;
      box-shadow: 0 0 15px rgba(255, 127, 0, 0.4);
    }
    .day-btn--selected ~ .day-symbol, .day-btn:hover ~ .day-symbol {
      color: #ff944d;
      opacity: 1;
      text-shadow: 0 0 8px rgba(255, 148, 77, 0.6);
    }
  }
  &.yellow {
    .day-btn:hover, .day-btn--selected {
      background: linear-gradient(90deg, #e6e600 0%, #ffff80 100%);
      border-color: #ffffb3;
      color: #000;
      box-shadow: 0 0 15px rgba(255, 255, 0, 0.4);
    }
    .day-btn--selected ~ .day-symbol, .day-btn:hover ~ .day-symbol {
      color: #ffff80;
      opacity: 1;
      text-shadow: 0 0 8px rgba(255, 255, 128, 0.6);
    }
  }
  &.green {
    .day-btn:hover, .day-btn--selected {
      background: linear-gradient(90deg, #009900 0%, #4dff4d 100%);
      border-color: #b3ffb3;
      color: #000;
      box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
    }
    .day-btn--selected ~ .day-symbol, .day-btn:hover ~ .day-symbol {
      color: #4dff4d;
      opacity: 1;
      text-shadow: 0 0 8px rgba(77, 255, 77, 0.6);
    }
  }
  &.blue {
    .day-btn:hover, .day-btn--selected {
      background: linear-gradient(90deg, #0047b3 0%, #4d94ff 100%);
      border-color: #80b3ff;
      box-shadow: 0 0 15px rgba(0, 71, 179, 0.4);
    }
    .day-btn--selected ~ .day-symbol, .day-btn:hover ~ .day-symbol {
      color: #4d94ff;
      opacity: 1;
      text-shadow: 0 0 8px rgba(77, 148, 255, 0.6);
    }
  }
  &.indigo {
    .day-btn:hover, .day-btn--selected {
      background: linear-gradient(90deg, #30064e 0%, #6a0dad 100%);
      border-color: #9d4edd;
      box-shadow: 0 0 15px rgba(106, 13, 173, 0.4);
    }
    .day-btn--selected ~ .day-symbol, .day-btn:hover ~ .day-symbol {
      color: #9d4edd;
      opacity: 1;
      text-shadow: 0 0 8px rgba(157, 78, 221, 0.6);
    }
  }
  &.violet {
    .day-btn:hover, .day-btn--selected {
      background: linear-gradient(90deg, #660080 0%, #bf00ff 100%);
      border-color: #d633ff;
      box-shadow: 0 0 15px rgba(191, 0, 255, 0.4);
    }
    .day-btn--selected ~ .day-symbol, .day-btn:hover ~ .day-symbol {
      color: #bf00ff;
      opacity: 1;
      text-shadow: 0 0 8px rgba(191, 0, 255, 0.6);
    }
  }
}
</style>
