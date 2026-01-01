<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-buttons slot="start">
        <ion-back-button :default-href="backHref" />
      </ion-buttons>

      <ion-title>
        Floor Editor
      </ion-title>

      <ion-buttons slot="end">
        <!-- Grid Size Controls -->
        <div class="grid-config-container">
          <div class="dim-group">
            <span class="dim-label">H</span>
            <input
              type="number"
              :value="gridHeight"
              @change="updateHeight"
              class="dim-input"
              min="1"
              max="50"
            />
          </div>
          <span class="dim-separator">×</span>
          <div class="dim-group">
            <span class="dim-label">W</span>
            <input
              type="number"
              :value="gridWidth"
              @change="updateWidth"
              class="dim-input"
              min="1"
              max="50"
            />
          </div>
          <ion-button
            fill="clear"
            class="resize-btn"
            @click="$emit('resize')"
            title="Apply/Resize Grid"
          >
            <i class="fas fa-sync-alt"></i>
          </ion-button>
        </div>

        <!-- Entrance Coords -->
        <ion-button
          fill="clear"
          class="entrance-btn"
          disabled
        >
          <i class="fad fa-dungeon"></i>
          <span>{{ entranceDisplay }}</span>
        </ion-button>

        <!-- Toggle Preview -->
        <ion-button
          @click="$emit('toggle-preview')"
          color="rpg"
        >
          <i class="fas fa-code" />
          {{ showPreview ? 'Editor' : 'Preview' }}
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { 
  IonHeader, IonToolbar, IonTitle, IonButtons, 
  IonBackButton, IonButton,
  alertController
} from '@ionic/vue';

export default defineComponent({
  name: 'XpTempleCreatorHeader',
  components: {
    IonHeader, IonToolbar, IonTitle, IonButtons,
    IonBackButton, IonButton
  },
  props: {
    templeId: { type: String, required: true },
    templeName: { type: String, default: 'Temple' },
    templeIcon: { type: String, default: 'fad fa-place-of-worship' },
    gridSize: { type: String, default: '6x6' },
    entranceDisplay: { type: String, default: '1x 1y' },
    showPreview: { type: Boolean, default: false },
    backHref: { type: String, default: '/game-master/compendium/temples' },
    currentLevelId: { type: String, default: '1F' },
    floors: { type: Array as () => string[], default: () => ['1F'] }
  },
  emits: ['update:gridSize', 'update:currentLevelId', 'resize', 'toggle-preview', 'save', 'floor-change', 'add-floor', 'remove-floor'],
  setup(props, { emit }) {
    const gridHeight = computed(() => props.gridSize.split('x')[0]);
    const gridWidth = computed(() => props.gridSize.split('x')[1]);

    const updateHeight = (event: Event) => {
      const val = (event.target as HTMLInputElement).value;
      emit('update:gridSize', `${val}x${gridWidth.value}`);
      emit('resize');
    };

    const updateWidth = (event: Event) => {
      const val = (event.target as HTMLInputElement).value;
      emit('update:gridSize', `${gridHeight.value}x${val}`);
      emit('resize');
    };

    const promptAddFloor = async () => {
      const alert = await alertController.create({
        header: 'New Floor Name',
        inputs: [
          {
            name: 'floorName',
            type: 'text',
            placeholder: 'e.g. 2F, B1, Attic'
          }
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Add',
            handler: (data) => {
              if (data.floorName) {
                emit('add-floor', data.floorName);
              }
            }
          }
        ]
      });

      await alert.present();
    };

    return {
      gridHeight,
      gridWidth,
      updateHeight,
      updateWidth,
      promptAddFloor
    };
  }
});
</script>

<style lang="scss" scoped>
  .grid-config-container {
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 4px 8px;
    margin-right: 12px;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);

    .dim-group {
      display: flex;
      align-items: center;
      gap: 4px;

      .dim-label {
        font-family: "Press Start 2P";
        font-size: 0.5rem;
        color: rgba(255, 255, 255, 0.4);
        margin-top: 2px;
      }

      .dim-input {
        background: transparent;
        border: none;
        color: #fff;
        font-family: "StatusPlz";
        font-size: 1.1rem;
        width: 32px;
        text-align: center;
        padding: 0;
        font-weight: bold;

        &:focus {
          outline: none;
          color: var(--ion-color-primary);
        }

        // Hide arrows
        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      }
    }

    .dim-separator {
      color: rgba(255, 255, 255, 0.2);
      font-size: 0.8rem;
      margin: 0 4px;
      font-weight: bold;
    }

    .resize-btn {
      --color: rgba(255, 255, 255, 0.5);
      margin: 0 0 0 4px;
      height: 28px;
      width: 28px;
      font-size: 0.8rem;

      &:hover {
        --color: var(--ion-color-primary);
      }
    }
  }

  .entrance-btn {
    --color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
    margin-right: 8px;

    i {
      margin-right: 6px;
    }
  }

  .mr-2 {
    margin-right: 0.5rem;
  }
</style>
