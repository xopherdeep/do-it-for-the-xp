<template>
  <div class="navigation-controls">
    <ion-button 
      class="nav-btn north" 
      :disabled="!canMoveUp || isDoorLocked('north')"
      @click="move('north')"
    >
      <ion-icon :icon="arrowUpOutline"></ion-icon>
      <ion-icon v-if="isDoorLocked('north')" :icon="lockClosedOutline" class="lock-icon"></ion-icon>
    </ion-button>
    <ion-button 
      class="nav-btn south" 
      :disabled="!canMoveDown || isDoorLocked('south')"
      @click="move('south')"
    >
      <ion-icon :icon="arrowDownOutline"></ion-icon>
      <ion-icon v-if="isDoorLocked('south')" :icon="lockClosedOutline" class="lock-icon"></ion-icon>
    </ion-button>
    <ion-button 
      class="nav-btn west" 
      :disabled="!canMoveLeft || isDoorLocked('west')"
      @click="move('west')"
    >
      <ion-icon :icon="arrowBackOutline"></ion-icon>
      <ion-icon v-if="isDoorLocked('west')" :icon="lockClosedOutline" class="lock-icon"></ion-icon>
    </ion-button>
    <ion-button 
      class="nav-btn east" 
      :disabled="!canMoveRight || isDoorLocked('east')"
      @click="move('east')"
    >
      <ion-icon :icon="arrowForwardOutline"></ion-icon>
      <ion-icon v-if="isDoorLocked('east')" :icon="lockClosedOutline" class="lock-icon"></ion-icon>
    </ion-button>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import { 
  arrowUpOutline, 
  arrowDownOutline, 
  arrowBackOutline, 
  arrowForwardOutline,
  lockClosedOutline
} from 'ionicons/icons';
import { Direction } from '../types';

export default defineComponent({
  name: 'NavigationControls',
  components: {
    IonButton,
    IonIcon
  },
  props: {
    canMoveUp: {
      type: Boolean,
      default: false
    },
    canMoveDown: {
      type: Boolean,
      default: false
    },
    canMoveLeft: {
      type: Boolean,
      default: false
    },
    canMoveRight: {
      type: Boolean,
      default: false
    },
    isDoorLocked: {
      type: Function as PropType<(direction: Direction) => boolean>,
      required: true
    }
  },
  setup(props, { emit }) {
    const move = (direction: Direction) => {
      emit('move', direction);
    };

    return {
      move,
      arrowUpOutline,
      arrowDownOutline,
      arrowBackOutline,
      arrowForwardOutline,
      lockClosedOutline
    };
  }
});
</script>

<style scoped>
.navigation-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  grid-template-areas:
    ". north ."
    "west . east"
    ". south .";
  grid-gap: 10px;
  z-index: 10;
}

.nav-btn {
  --background: rgba(0, 0, 0, 0.6);
  --background-hover: rgba(0, 0, 0, 0.8);
  --border-radius: 50%;
  width: 50px;
  height: 50px;
  position: relative;
}

.north {
  grid-area: north;
}

.south {
  grid-area: south;
}

.east {
  grid-area: east;
}

.west {
  grid-area: west;
}

.lock-icon {
  position: absolute;
  bottom: 0;
  right: 0;
  font-size: 14px;
  color: #FFD700;
}
</style>