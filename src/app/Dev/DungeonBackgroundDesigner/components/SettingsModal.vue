<template>
  <ion-modal :is-open="isOpen" @did-dismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Dungeon Background Settings</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <!-- Temple Selection -->
        <ion-item>
          <ion-label>Temple</ion-label>
          <ion-select 
            :value="selectedTemple" 
            @ionChange="templeChanged($event)"
            interface="alert"
          >
            <ion-select-option value="wind-temple">Wind Temple</ion-select-option>
            <ion-select-option value="fire-temple">Fire Temple</ion-select-option>
            <ion-select-option value="water-temple">Water Temple</ion-select-option>
            <ion-select-option value="earth-temple">Earth Temple</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Era Visual Style -->
        <ion-item>
          <ion-label>Visual Style</ion-label>
          <ion-select 
            :value="styles.selectedEraStyle" 
            @ionChange="styleChanged($event, 'era')"
            interface="alert"
          >
            <ion-select-option 
              v-for="style in styles.visualEraStyles" 
              :key="style.id" 
              :value="style.id"
            >
              {{ style.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Floor Style -->
        <ion-item>
          <ion-label>Floor Material</ion-label>
          <ion-select 
            :value="styles.floorStyle" 
            @ionChange="styleChanged($event, 'floor')"
            interface="alert"
          >
            <ion-select-option value="stone">Stone</ion-select-option>
            <ion-select-option value="wood">Wood</ion-select-option>
            <ion-select-option value="dirt">Dirt</ion-select-option>
            <ion-select-option value="marble">Marble</ion-select-option>
            <ion-select-option value="tile">Tile</ion-select-option>
            <ion-select-option value="crystal">Crystal</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Floor Pattern -->
        <ion-item>
          <ion-label>Floor Pattern</ion-label>
          <ion-select 
            :value="styles.floorPatternType" 
            @ionChange="styleChanged($event, 'floorPattern')"
            interface="alert"
          >
            <ion-select-option 
              v-for="pattern in styles.floorPatterns" 
              :key="pattern.id" 
              :value="pattern.id"
            >
              {{ pattern.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Wall Style -->
        <ion-item>
          <ion-label>Wall Material</ion-label>
          <ion-select 
            :value="styles.wallStyle" 
            @ionChange="styleChanged($event, 'wall')"
            interface="alert"
          >
            <ion-select-option value="brick">Brick</ion-select-option>
            <ion-select-option value="stone">Stone</ion-select-option>
            <ion-select-option value="rock">Rock</ion-select-option>
            <ion-select-option value="marble">Marble</ion-select-option>
            <ion-select-option value="ice">Ice</ion-select-option>
            <ion-select-option value="timber">Timber</ion-select-option>
            <ion-select-option value="temple">Temple</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Wall Pattern -->
        <ion-item>
          <ion-label>Wall Pattern</ion-label>
          <ion-select 
            :value="styles.wallPatternType" 
            @ionChange="styleChanged($event, 'wallPattern')"
            interface="alert"
          >
            <ion-select-option 
              v-for="pattern in styles.wallPatterns" 
              :key="pattern.id" 
              :value="pattern.id"
            >
              {{ pattern.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item-divider>Door Settings</ion-item-divider>

        <!-- Door Lock Toggles -->
        <ion-item>
          <ion-label>North Door Locked</ion-label>
          <ion-toggle 
            :checked="lockedDoors.north"
            @ionChange="toggleLock('north', $event)"
          ></ion-toggle>
        </ion-item>

        <ion-item>
          <ion-label>South Door Locked</ion-label>
          <ion-toggle 
            :checked="lockedDoors.south"
            @ionChange="toggleLock('south', $event)"
          ></ion-toggle>
        </ion-item>

        <ion-item>
          <ion-label>East Door Locked</ion-label>
          <ion-toggle 
            :checked="lockedDoors.east"
            @ionChange="toggleLock('east', $event)"
          ></ion-toggle>
        </ion-item>

        <ion-item>
          <ion-label>West Door Locked</ion-label>
          <ion-toggle 
            :checked="lockedDoors.west"
            @ionChange="toggleLock('west', $event)"
          ></ion-toggle>
        </ion-item>

        <ion-item-divider>Actions</ion-item-divider>

        <ion-item button @click="resetToEntrance">
          <ion-icon slot="start" :icon="refreshOutline"></ion-icon>
          <ion-label>Reset to Entrance</ion-label>
        </ion-item>

        <ion-item button @click="exportBackground">
          <ion-icon slot="start" :icon="downloadOutline"></ion-icon>
          <ion-label>Export Background Image</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonList, IonItem, IonLabel,
  IonSelect, IonSelectOption, IonItemDivider, IonToggle,
  IonIcon
} from '@ionic/vue';
import {
  refreshOutline,
  downloadOutline
} from 'ionicons/icons';
import { Direction, LockedDoors } from '../types';

export default defineComponent({
  name: 'SettingsModal',
  components: {
    IonModal, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonButton, IonList, IonItem, IonLabel,
    IonSelect, IonSelectOption, IonItemDivider, IonToggle,
    IonIcon
  },
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    selectedTemple: {
      type: String,
      required: true
    },
    currentPosition: {
      type: Array as unknown as () => [number, number],
      required: true
    },
    currentRoomType: {
      type: String,
      required: true
    },
    styles: {
      type: Object,
      required: true
    },
    lockedDoors: {
      type: Object as () => LockedDoors,
      required: true
    }
  },
  setup(props, { emit }) {
    // Handle temple selection change
    const templeChanged = (event: CustomEvent) => {
      emit('templeChanged', event.detail.value);
    };

    // Handle style selection changes
    const styleChanged = (event: CustomEvent, type: string) => {
      emit('styleChanged', { type, value: event.detail.value });
    };

    // Toggle door locks
    const toggleLock = (direction: Direction, event: CustomEvent) => {
      emit('toggleDoorLock', { direction, value: event.detail.checked });
    };

    // Reset to entrance
    const resetToEntrance = () => {
      emit('resetToEntrance');
    };

    // Export background
    const exportBackground = () => {
      emit('exportBackground');
    };

    return {
      templeChanged,
      styleChanged,
      toggleLock,
      resetToEntrance,
      exportBackground,
      refreshOutline,
      downloadOutline
    };
  }
});
</script>

<style scoped>
ion-modal {
  --height: 90%;
  --border-radius: 16px;
}
</style>