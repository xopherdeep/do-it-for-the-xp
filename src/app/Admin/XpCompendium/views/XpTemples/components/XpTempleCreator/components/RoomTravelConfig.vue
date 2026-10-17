<template>
  <div class="travel-settings config-box">
    <div class="config-label">Target Destination</div>
    <div v-if="circleHint" class="config-hint">Only needed with several floors or more than two circles on a floor.</div>
    
    <div class="target-floor-select mt-10">
      <div class="low-label">Target Floor</div>
      <ion-select 
        :modelValue="targetLevel || undefined"
        :placeholder="automaticFloor"
        @ionChange="$event.detail.value && $emit('update:targetLevel', $event.detail.value)"
        interface="action-sheet"
        class="glass-select"
      >
        <ion-select-option v-for="floor in floors" :key="floor" :value="floor">
          {{ floor }}
        </ion-select-option>
      </ion-select>
    </div>

    <div class="target-coords mt-15">
      <div class="low-label">Target Coords (x, y)</div>
      <div class="coords-inputs">
        <div class="coord-field">
          <span>X</span>
          <ion-input 
            type="number" 
            placeholder="X" 
            :modelValue="targetX"
            @ionChange="$emit('update:targetX', $event.detail.value)"
            class="glass-input"
          ></ion-input>
        </div>
        <div class="coord-field">
          <span>Y</span>
          <ion-input 
            type="number" 
            placeholder="Y" 
            :modelValue="targetY"
            @ionChange="$emit('update:targetY', $event.detail.value)"
            class="glass-input"
          ></ion-input>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { IonSelect, IonSelectOption, IonInput } from '@ionic/vue';

export default defineComponent({
  name: 'RoomTravelConfig',
  components: { IonSelect, IonSelectOption, IonInput },
  props: {
    /** Circles pair themselves; say when the controls are worth touching. Stairs have no such hint. */
    circleHint: {
      type: Boolean,
      default: false
    },
    floors: {
      type: Array as PropType<string[]>,
      default: () => ['1F']
    },
    /** The floor picked; empty when none is (stairs then go to the neighbouring floor and show `automaticFloor`) */
    targetLevel: {
      type: String,
      default: '1F'
    },
    /** What an unpicked stairs target reads, e.g. "Next floor (automatic)" */
    automaticFloor: {
      type: String,
      default: ''
    },
    targetX: {
      type: Number,
      default: 0
    },
    targetY: {
      type: Number,
      default: 0
    }
  },
  emits: ['update:targetLevel', 'update:targetX', 'update:targetY']
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

  .config-hint {
    font-family: "StatusPlz";
    font-size: 0.8rem;
    opacity: 0.7;
    margin: -4px 0 12px;
  }
}

.travel-settings {
  .low-label {
    font-size: 0.75rem;
    opacity: 0.7;
    margin-bottom: 5px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .glass-select {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    --padding-start: 12px;
    --padding-end: 12px;
  }

  .coords-inputs {
    display: flex;
    gap: 10px;

    .coord-field {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0 10px;

      span {
        font-family: "StatusPlz";
        font-size: 0.8rem;
        opacity: 0.5;
      }

      .glass-input {
        --padding-start: 0;
        font-family: "StatusPlz";
      }
    }
  }
}

.mt-10 { margin-top: 10px; }
.mt-15 { margin-top: 15px; }
</style>
