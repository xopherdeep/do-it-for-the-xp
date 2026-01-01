<template>
  <ion-page class="xp-temple-dashboard">
    <ion-content
      class="transparent-content"
      :fullscreen="true"
    >
      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="loading-wrapper"
      >
        <XpLoading />
      </div>

      <!-- Content (shown when loaded) -->
      <div
        v-if="!isLoading"
        class="content-wrapper"
      >
        <!-- Header Section -->
        <XpTempleTitle :temple-id="templeId" />

        <!-- Stats and Map Row -->
        <div class="stats-map-row">
          <!-- Mini Map Preview (Left) -->
          <div
            class="mini-map-wrapper"
            v-if="previewMaze && previewMaze.length"
            @click="goToLayout"
          >
            <div class="mini-map">
              <div
                v-for="(row, y) in previewMaze"
                :key="y"
                class="map-row"
              >
                <div
                  v-for="(cell, x) in row"
                  :key="x"
                  class="map-cell"
                  :class="{ 'is-room': isRoom(cell) }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Stats Grid (Right) -->
          <div class="temple-stats">
            <div
              class="stat-card"
              @click="goToTab('rooms')"
            >
              <i class="fad fa-door-open fa-2x text-primary"></i>
              <div class="stat-info">
                <span class="stat-value">{{ roomCount }}</span>
                <span class="stat-label">Rooms</span>
              </div>
            </div>
            <div
              class="stat-card"
              @click="goToTab('beasts')"
            >
              <i class="fad fa-dragon fa-2x text-danger"></i>
              <div class="stat-info">
                <span class="stat-value">{{ beastCount }}</span>
                <span class="stat-label">Beasts</span>
              </div>
            </div>
            <div
              class="stat-card"
              @click="goToTab('layout')"
            >
              <i class="fad fa-layer-group fa-2x text-warning"></i>
              <div class="stat-info">
                <span class="stat-value">{{ floorCount }}</span>
                <span class="stat-label">Floors</span>
              </div>
            </div>
            <div
              class="stat-card"
              @click="goToTab('attributes/general')"
            >
              <i class="fad fa-mountain fa-2x text-success"></i>
              <div class="stat-info">
                <span class="stat-value text-capitalize">{{ templeMetadata.world }}</span>
                <span class="stat-label">World</span>
              </div>
            </div>
          </div>
        </div>

        <ion-button
          expand="block"
          class="enter-button"
          @click="goToLayout"
        >
          <i class="fad fa-dungeon mr-2"></i>
          Enter Temple
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useRouter } from "vue-router";
import { IonPage, IonContent, IonButton } from "@ionic/vue";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";

import XpTempleTitle from "../XpTempleCreator/XpTempleTitle.vue";
import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
import { TempleDataInjectionKey } from "../../hooks/useTempleData";
import { inject } from "vue";

export default defineComponent({
  name: "XpTempleDashboard",
  components: {
    IonPage,
    IonContent,
    IonButton,
    XpLoading,
    XpTempleTitle
  },
  props: {
    templeId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const router = useRouter();
    
    // Inject shared temple data from XpTempleSettings
    const { 
      temple: templeData, 
      isLoading,
      previewMaze,
      isRoom,
      composition
    } = inject(TempleDataInjectionKey)!;

    // Data loading is handled by the parent XpTempleSettings via useTempleData
    // We could add an onIonViewWillEnter to refresh if needed, 
    // but the parent's useTempleData already handles it on mount.

    const templeMetadata = computed(() => {
      return TEMPLE_METADATA[props.templeId] || {
        ...TEMPLE_METADATA['wind-temple'],
        name: props.templeId,
        id: props.templeId,
        world: 'plains'
      };
    });

    const templeName = computed(() => {
      if (templeData.value?.customName) return templeData.value.customName;
      return templeMetadata.value.name;
    });

    const templeDescription = computed(() => {
      if (templeData.value?.customDescription) return templeData.value.customDescription;
      return templeMetadata.value.description;
    });

    const templeIcon = computed(() => {
      return templeMetadata.value.icon;
    });

    const roomCount = computed(() => {
      return composition.value.roomTypes.reduce((acc, curr) => acc + curr.count, 0);
    });

    const beastCount = computed(() => {
      return composition.value.monsters.reduce((acc, curr) => acc + curr.count, 0);
    });

    const floorCount = computed(() => {
      const maze = templeData.value?.dungeonLayout?.maze;
      if (!maze) return 1;
      if (Array.isArray(maze)) return 1;
      return Object.keys(maze).length;
    });

    const goToTab = (tabPath: string) => {
      router.push(`/game-master/compendium/temples/${props.templeId}/${tabPath}`);
    };

    const goToLayout = () => {
      goToTab('layout');
    };

    return {
      isLoading,
      templeName,
      templeDescription,
      templeIcon,
      roomCount,
      beastCount,
      floorCount,
      templeMetadata,
      previewMaze,
      isRoom,
      goToLayout,
      goToTab
    };
  }
});
</script>

<style lang="scss" scoped>
  .transparent-content {
    --background: transparent;
  }

  .loading-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100%;
    padding: 24px;
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;

    .loading-text {
      font-family: "Apple Kid", sans-serif;
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
    }
  }

  .content-wrapper {
    padding: 24px 16px 40px;
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }


  /* Stats and Map Row - Refined 2 Column Layout */
  .stats-map-row {
    display: grid;
    grid-template-columns: 1.3fr 0.7fr;
    gap: 24px;
    align-items: stretch;

    @media (max-width: 400px) {
      grid-template-columns: 1fr;
    }
  }

  .temple-stats {
    display: flex;
    flex-direction: column;
    gap: 12px;
    justify-content: center;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    background: rgba(25, 27, 46, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      transform: translateY(-4px) scale(1.02);
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-color: rgba(var(--ion-color-primary-rgb), 0.3);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);

      i {
        transform: scale(1.1);
      }
    }

    &:active {
      transform: translateY(-2px) scale(0.98);
      background: rgba(var(--ion-color-primary-rgb), 0.2);
    }

    i {
      width: 32px;
      text-align: center;
      margin-bottom: 0;
      transition: transform 0.3s ease;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .stat-value {
      font-family: "StatusPlz", monospace;
      font-size: 1.4rem;
      color: #fff;
      margin-bottom: 0;
    }

    .stat-label {
      font-family: "Apple Kid", sans-serif;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  }

  .mini-map-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 32px;
    background: rgba(25, 27, 46, 0.6);
    backdrop-filter: blur(12px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    min-height: 350px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      transform: scale(1.02);
      background: rgba(var(--ion-color-tertiary-rgb), 0.05);
      border-color: rgba(var(--ion-color-tertiary-rgb), 0.3);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);

      .map-cell.is-room {
        transform: scale(1.1);
        box-shadow: 0 0 15px rgba(var(--ion-color-tertiary-rgb), 0.8);
      }
    }

    &:active {
      transform: scale(0.98);
    }
  }

  .mini-map {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .map-row {
      display: flex;
      gap: 6px;
    }

    .map-cell {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      transition: all 0.3s ease;

      &.is-room {
        background: var(--ion-color-tertiary);
        box-shadow: 0 0 12px rgba(var(--ion-color-tertiary-rgb), 0.6);
      }
    }
  }

  .enter-button {
    --background: var(--ion-color-primary);
    --border-radius: 12px;
    font-family: "Twoson", serif;
    font-size: 1.2rem;
    letter-spacing: 2px;
    height: 60px;
    margin-top: 12px;
    --box-shadow: 0 10px 20px rgba(var(--ion-color-primary-rgb), 0.4);
  }

  /* Utility classes */
  .text-primary {
    color: var(--ion-color-primary);
  }

  .text-danger {
    color: var(--ion-color-danger);
  }

  .text-warning {
    color: var(--ion-color-warning);
  }

  .text-success {
    color: var(--ion-color-success);
  }

  .text-capitalize {
    text-transform: capitalize;
  }
</style>
