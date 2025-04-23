<template>
  <ion-page :class="$options.name">
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

    <ion-content class="ion-padding bg-slide">
      <ion-grid>
        <ion-row>
          <ion-col
            size="12"
            size-md="6"
            v-for="temple in temples"
            :key="temple.id"
          >
            <ion-card
              button
              @click="clickTemple(temple.id)"
              class="temple-card"
            >
              <ion-img
                :src="getBgImage(temple.world)"
                class="temple-bg-image"
                alt="Temple background"
              ></ion-img>

              <ion-card-header>

                <ion-card-title>

                  <ion-card-subtitle class="float-right">
                    <ion-chip :color="getTempleColor(temple.id)">
                      <i
                        :class="getTempleIcon(temple.id)"
                        class="mr-2 fa-lg"
                      ></i>
                      <ion-label>Level {{ temple.level || 1 }}</ion-label>
                    </ion-chip>
                  </ion-card-subtitle>

                  {{ getTempleName(temple.id) }}
                </ion-card-title>
              </ion-card-header>

              <ion-card-content>
                <p>{{ getTempleDescription(temple.id) }}</p>

                <ion-item
                  lines="none"
                  class="temple-stats"
                >
                  <ion-badge
                    color="danger"
                    slot="start"
                  >
                    <ion-icon name="people-outline"></ion-icon>
                    20 Members
                  </ion-badge>
                  <ion-badge
                    color="warning"
                    slot="end"
                  >
                    <ion-icon name="star-outline"></ion-icon>
                    Level {{ temple.level || 1 }}
                  </ion-badge>
                </ion-item>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
      <!-- Temple Creator Floating Action Button -->
      <ion-fab
        vertical="bottom"
        horizontal="end"
        slot="fixed"
      >
        <ion-fab-button
          @click="goToTempleCreator('new')"
          color="primary"
        >
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>

    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted } from "vue";
  import Ionic from "@/mixins/ionic";
  import { useRouter } from "vue-router";
  import { TempleDb, TempleInterface, templeStorage } from "@/databases/TempleDb";
  
  import { 
    waterOutline, musicalNotesOutline, colorPaletteOutline, 
    peopleOutline, starOutline, add
  } from 'ionicons/icons';

  const requireBg = require.context("@/assets/images/backgrounds/");

  export default defineComponent({
    name: "xp-temples",
    mixins: [Ionic],
    setup() {
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
        for (const temple of temples.value) {
          const data = await templeDb.getTempleById(temple.id);
          if (data) {
            templeData.value[temple.id] = data;
          }
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
        } catch (e) {
          // Try to use world-map as fallback instead of world-default
          try {
            return requireBg('./world-map.jpg');
          } catch (e2) {
            // If world-map doesn't exist, try other fallbacks in order
            try {
              return requireBg('./hometown.jpg');
            } catch (e3) {
              // If all fallbacks fail, return a blank transparent image
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
        } catch (e) {
          // Try to use world-map as fallback
          try {
            const img = requireBg('./world-map.jpg');
            return `url(${img})`;
          } catch (e2) {
            // If world-map doesn't exist, try hometown
            try {
              const img = requireBg('./hometown.jpg');
              return `url(${img})`;
            } catch (e3) {
              // If all fallbacks fail, return a gradient background
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

      const getTempleIcon = (templeId: string) => {
        const icons = {
          "wind-temple": "fad fa-wind",
          "earth-temple": "fad fa-mountain",
          "water-temple": "fad fa-water",
          "fire-temple": "fad fa-fire",
          "ice-temple": "fad fa-snowflake",
          "light-temple": "fad fa-sun",
          "shadow-temple": "fad fa-moon",
        };
        return icons[templeId] || "fad fa-place-of-worship";
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
          name: "xp-compendium-temple-settings",
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

      return {
        getBgUrl,
        getBgImage,
        clickTemple,
        getTempleIcon,
        getTempleIconName,
        getTempleColor,
        getTempleName,
        getTempleDescription,
        temples,
        goToTempleCreator,
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
      };
    },
  });
</script>

<style lang="scss" scoped>
  .xp-temples {
    // Global page styles
    ion-toolbar {
      --background: var(--ion-color-primary-shade);
      
      ion-title {
        font-family: var(--xp-font-fantasy, 'Fantasy');
        font-size: 1.5rem;
      }
    }
    
    ion-content {
      --background: var(--ion-background-color);
    }
    
    // Card styles
    .temple-card {
      margin: 1rem 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      
      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      }
      
      ion-card-header {
        background: rgba(0, 0, 0, 0.6);
        position: relative;
        z-index: 2;
        
        ion-card-title {
          font-family: var(--xp-font-fantasy, 'Fantasy');
          color: white;
          font-size: 1.5rem;
        }
      }
      
      ion-card-content {
        background: rgba(0, 0, 0, 0.4);
        color: white;
        position: relative;
        z-index: 2;
        padding: 1rem;
        
        p {
          margin-bottom: 1rem;
          font-size: 0.9rem;
          line-height: 1.4;
        }
      }
      
      .temple-bg-image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0.7;
        z-index: 1;
      }
      
      .temple-stats {
        --background: transparent;
        margin-top: 0.5rem;
        
        ion-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: 16px;
          
          ion-icon {
            font-size: 1rem;
          }
        }
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