<template>
  <ion-page :class="$options.name" style="background: transparent">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button default-href="/game-master" />
        </ion-buttons>
        <i
          class="fad fa-2x fa-hand-holding-water"
          slot="start"
        />
        <ion-title>
          Temples
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="clickSoundSettings">
            <i class="fad fa-volume-up fa-2x"></i>
          </ion-button>
          <ion-button @click="clickThemeSettings">
            <i class="fad fa-palette fa-2x"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" style="--background: transparent">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-wrapper">
        <XpLoading />
      </div>

      <ion-grid v-else>
        <ion-row>
          <ion-col
            size="6"
            size-lg="4"
            size-xl="3"
            v-for="temple in temples"
            :key="temple.id"
          >
            <ion-card
              button
              @click="clickTemple(temple.id)"
              class="temple-card portrait-card"
              @mouseenter="hoveredTempleId = temple.id"
              @mouseleave="hoveredTempleId = null"
            >
              <ion-img
                :src="getBgImage(temple.world)"
                class="temple-bg-image"
                alt="Temple background"
              ></ion-img>

              <div class="card-overlay">
                <div class="world-label">{{ temple.world }}</div>
              </div>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
      <!-- Temple Creator Floating Action Button -->
      <ion-fab
        vertical="bottom"
        horizontal="center"
        slot="fixed"
      >
        <ion-fab-button
          @click="presentActionSheet"
          color="rpg"
        >
          <i class="fad fa-hand-holding-water fa-2x"/>
        </ion-fab-button>
      </ion-fab>

    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted } from "vue";
  import Ionic from "@/mixins/ionic";
  import { useRouter } from "vue-router";
  import { TempleDb, TempleInterface, templeStorage } from "@/lib/databases/TempleDb";
  import debug from "@/lib/utils/debug";
  import { actionSheetController } from "@ionic/vue";
  
  import { 
    waterOutline, musicalNotesOutline, colorPaletteOutline, 
    peopleOutline, starOutline, add, createOutline, cloudDownloadOutline
  } from 'ionicons/icons';
  import { getTempleIcon } from "@/lib/engine/dungeons/templeIcons";
  import XpLoading from "@/components/molecules/Loading/XpLoading.vue";

  const requireBg = require.context("@/assets/images/backgrounds/");

  export default defineComponent({
    name: "xp-temples",
    mixins: [Ionic],
    components: {
      XpLoading
    },
    setup() {
      const isLoading = ref(true);
      const hoveredTempleId = ref<string | null>(null);
      const $router = useRouter();
      const templeDb = new TempleDb(templeStorage);
      const templeData = ref({} as Record<string, TempleInterface>);
      
      // Map with explicit connection between display names and temple IDs
      const temples = ref([
        {
          id: "wind-temple",
          world: "plains",
          level: 1,
        },
        {
          id: "water-temple",
          world: "islands",
          level: 2,
        },
        {
          id: "earth-temple",
          world: "forest",
          level: 3,
        },
        {
          id: "moon-temple",
          world: "swamps",
          level: 4,
        },
        {
          id: "fire-temple",
          world: "mountains",
          level: 5
        },

        {
          id: "light-temple",
          world: "desert",
          level: 6,
        },

        {
          id: "ice-temple",
          world: "ice",
          level: 7,
        },
        {
          id: "lightning-temple",
          world: "clouds",
          level: 8,
        },
        {
          id: "shadow-temple",
          world: "moon",
          level: 9,
        },
      ]);

      // Load temple data from storage
      const loadTempleData = async () => {
        isLoading.value = true;
        try {
          for (const temple of temples.value) {
            const data = await templeDb.getTempleById(temple.id);
            if (data) {
              templeData.value[temple.id] = data;
            }
          }
        } finally {
          isLoading.value = false;
        }
      };

      // Load temple data when component is mounted
      onMounted(() => {
        loadTempleData();
      });

      // For ionic image components
      const getBgImage = (world: string) => {
        try {
          return requireBg(`./world-${world}.jpg`);
        } catch (error) {
          // Try to use world-map as fallback instead of world-default
          debug.warn(`Could not load world-${world}.jpg:`, error);
          try {
            return requireBg('./world-map.jpg');
          } catch (error) {
            // If world-map doesn't exist, try other fallbacks in order
            debug.warn('Could not load world-map.jpg fallback:', error);
            try {
              return requireBg('./hometown.jpg');
            } catch (error) {
              // If all fallbacks fail, return a blank transparent image
              debug.error('All background image fallbacks failed:', error);
              return 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
            }
          }
        }
      };

      // For custom styles - kept for backward compatibility
      const getBgUrl = (world: string) => {
        try {
          const img = requireBg(`./world-${world}.jpg`);
          return `url(${img})`;
        } catch (error) {
          // Try to use world-map as fallback
          debug.warn(`Could not load world-${world}.jpg for URL:`, error);
          try {
            const img = requireBg('./world-map.jpg');
            return `url(${img})`;
          } catch (error) {
            // If world-map doesn't exist, try hometown
            debug.warn('Could not load world-map.jpg URL fallback:', error);
            try {
              const img = requireBg('./hometown.jpg');
              return `url(${img})`;
            } catch (error) {
              // If all fallbacks fail, return a gradient background
              debug.error('All background image URL fallbacks failed:', error);
              return 'linear-gradient(135deg, #2c3e50, #4a69bd)';
            }
          }
        }
      };

      // Temple icon name for Ionicons
      const getTempleIconName = (templeId: string) => {
        const icons = {
          "wind-temple": "fad fa-wind",
          "earth-temple": "leaf-outline",
          "water-temple": "water-outline",
          "fire-temple": "flame-outline",
          "ice-temple": "snow-outline",
          "light-temple": "sunny-outline",
          "shadow-temple": "moon-outline",
        };
        return icons[templeId] || "home-outline";
      };

      // Temple color for ion-chip
      const getTempleColor = (templeId: string) => {
        const colors = {
          "wind-temple": "medium",
          "earth-temple": "success",
          "water-temple": "primary",
          "fire-temple": "danger",
          "ice-temple": "light",
          "light-temple": "warning",
          "shadow-temple": "dark",
        };
        return colors[templeId] || "medium";
      };

      const getTempleIconLocal = (templeId: string) => {
        return getTempleIcon(templeId);
      };

      const getTempleName = (templeId: string) => {
        // First check if there's a custom name in the temple data
        if (templeData.value[templeId]?.customName) {
          return templeData.value[templeId].customName;
        }

        // Fall back to default names - ensure these match what's shown in the UI
        const names = {
          "wind-temple": "Temple of Zephyr",
          "earth-temple": "Gaia Sanctuary",
          "water-temple": "Aqua Haven",
          "fire-temple": "Inferno Citadel",
          "ice-temple": "Frost Keep",
          "light-temple": "Solar Sanctum",
          "shadow-temple": "Lunar Shrine",
        };
        return names[templeId] || templeId;
      };

      const getTempleDescription = (templeId: string) => {
        // First check if there's a custom description in the temple data
        if (templeData.value[templeId]?.customDescription) {
          return templeData.value[templeId].customDescription;
        }

        // Fall back to default descriptions
        const descriptions = {
          "wind-temple": "Masters of aerial magic and swift techniques",
          "earth-temple": "Guardians of nature and earthen powers",
          "water-temple": "Wielders of healing and fluid combat",
          "fire-temple": "Home to powerful offensive spells",
          "ice-temple": "Specialists in ice magic and defense",
          "light-temple": "Light magic and restoration abilities",
          "shadow-temple": "Dark magic and mysterious arts",
        };
        return descriptions[templeId] || "";
      };

      const clickTemple = (templeId: string) => {
        $router.push({
          name: "xp-temple-splash",
          params: {
            templeId,
          },
        });
      };

      const goToTempleCreator = (templeId: string) => {
        // Navigate to the creator page, passing 'new' or an existing templeId
        $router.push({
          name: 'xp-temple-creator', // Ensure your route name matches
          params: {
            templeId
          }
        });
      };

      const presentActionSheet = async () => {
        const actionSheet = await actionSheetController.create({
          header: 'Temple Actions',
          cssClass: 'temple-action-sheet',
          mode: 'ios',
          buttons: [
            {
              text: 'Create New Temple',
              icon: createOutline,
              cssClass: 'action-create',
              handler: () => {
                goToTempleCreator('new');
              }
            },
            {
              text: 'Import Temple',
              icon: cloudDownloadOutline,
              cssClass: 'action-import',
              handler: () => {
                // Import temple functionality would go here
                // This is a placeholder for future implementation
              }
            },
            {
              text: 'Cancel',
              role: 'cancel',
              cssClass: 'action-cancel',
              handler: () => {
                // Just close the action sheet
              }
            },
          ],
        });
        await actionSheet.present();
      };

      return {
        getBgUrl,
        getBgImage,
        clickTemple,
        getTempleIcon: getTempleIconLocal,
        getTempleIconName,
        getTempleColor,
        getTempleName,
        getTempleDescription,
        temples,
        goToTempleCreator,
        presentActionSheet,
        // Ionicons
        waterOutline,
        musicalNotesOutline,
        colorPaletteOutline,
        peopleOutline,
        starOutline,
        add,
        clickSoundSettings() {
          $router.push({ name: "xp-settings-sound" });
        },
        clickThemeSettings() {
          $router.push({ name: "xp-settings-theme" });
        },
        hoveredTempleId,
        isLoading
      };
    },
  });
</script>

<style lang="scss" scoped>
  .xp-temples {



    // Global page styles
    ion-toolbar {
      ion-title {
        font-family: var(--xp-font-fantasy, 'Fantasy');
        font-size: 1.5rem;
      }
    }
    
    ion-content {
      // --background: var(--ion-background-color);
    }
    
    // Card styles
    .temple-card {
      margin: 4px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.05);

      &.portrait-card {
        aspect-ratio: 1 / 1.4;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }
      
      &:hover {
        transform: translateY(-8px) scale(1.02);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
        
        .temple-bg-image {
          transform: scale(1.1);
          opacity: 0.9;
        }

        .card-overlay {
          background: linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.4) 100%);
        }
      }

      .card-overlay {
        position: relative;
        z-index: 2;
        background: linear-gradient(to right, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 60%, rgba(0, 0, 0, 0) 100%);
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.3s ease;
      }

      .card-weather-fx {
        z-index: 1.5;
        opacity: 0.8;
      }

      .info-block {
        width: 100%;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
      }

      .world-label {
        position: absolute;
        top: 60%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: var(--xp-font-fantasy, 'Fantasy');
        font-size: 2.2rem;
        opacity: 0.15;
        color: white;
        text-transform: uppercase;
        letter-spacing: 4px;
        pointer-events: none;
        white-space: nowrap;
        z-index: 1;
        width: 100%;
        text-align: center;
      }
      
      ion-card-header {
        padding: 8px 12px;
        background: transparent !important;
        position: relative;
        z-index: 3;
        
        .level-badge {
          margin-bottom: 6px;
          display: flex;
          justify-content: flex-start;
          
          ion-chip {
            height: 22px;
            margin: 0;
            padding: 0 10px;
            --background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.1);

            i { 
              font-size: 0.8rem;
              margin-right: 6px;
              color: var(--ion-color-primary);
            }
            ion-label {
              font-size: 0.65rem;
              font-weight: 800;
              letter-spacing: 0.5px;
              color: white;
            }
          }
        }

        ion-card-title.title-block {
          font-family: var(--xp-font-fantasy, 'Fantasy'), serif;
          color: white;
          font-size: 1.1rem;
          line-height: 1.2;
          background: rgba(30, 0, 45, 0.8); // Slightly more transparent RPG purple
          padding: 6px 12px;
          margin: 4px 0;
          display: inline-block; // Don't force full width
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }
      }
      
      ion-card-content {
        padding: 0px 4px 0px 0px; // Minimal padding since overlay has its own
        color: rgba(255, 255, 255, 0.8);
        position: relative;
        z-index: 3;
        text-align: left;
        
        p {
          margin: 0;
          font-size: 0.75rem;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      }
      
      .temple-bg-image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center center;
        opacity: 1;
        z-index: 1;
        transition: transform 0.6s ease;
      }
    }
    
    // Floating button
    ion-fab-button {
      --box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }
    
    // Responsive adjustments
    @media (max-width: 768px) {
      ion-card-title {
        font-size: 1.2rem;
      }
      
      ion-card-content p {
        font-size: 0.8rem;
      }
    }
  }
</style>