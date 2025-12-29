<template>
  <ion-page :class="$options.name" style="background: transparent">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button default-href="/game-master" />
        </ion-buttons>
        <i class="fad fa-2x fa-hand-holding-water" slot="start" />
        <ion-title> Temples </ion-title>
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
            v-for="temple in processedTemples"
            :key="temple.id"
          >
            <ion-card
              button
              @click="clickTemple(temple.id)"
              class="temple-card portrait-card"
              @mouseenter="hoveredTempleId = temple.id"
              @mouseleave="hoveredTempleId = null"
            >
              <div class="img-wrapper">
                <ion-img
                  :src="temple.bgImage"
                  class="temple-bg-image"
                  alt="Temple background"
                ></ion-img>
              </div>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
      <!-- Temple Creator Floating Action Button -->
      <ion-fab vertical="bottom" horizontal="center" slot="fixed">
        <ion-fab-button @click="presentActionSheet" color="rpg">
          <i class="fad fa-hand-holding-water fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted, computed } from "vue";
  import Ionic from "@/lib/mixins/ionic";
  import { useRouter } from "vue-router";
  import {
    TempleDb,
    TempleInterface,
    templeStorage,
  } from "@/lib/databases/TempleDb";
  import debug from "@/lib/utils/debug";
  import { actionSheetController } from "@ionic/vue";

  import { createOutline, cloudDownloadOutline } from "ionicons/icons";
  import XpLoading from "@/components/molecules/Loading/XpLoading.vue";

  const requireBg = require.context("@/assets/images/backgrounds/");

  export default defineComponent({
    name: "xp-temples",
    mixins: [Ionic],
    components: {
      XpLoading,
    },
    setup() {
      const isLoading = ref(true);
      const hoveredTempleId = ref<string | null>(null);
      const $router = useRouter();
      const templeDb = new TempleDb(templeStorage);
      const templeData = ref({} as Record<string, TempleInterface>);

      // Map with explicit connection between display names and temple IDs
      const temples = [
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
          level: 5,
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
      ];

      // Load temple data from storage
      const loadTempleData = async () => {
        isLoading.value = true;
        try {
          const promises = temples.map(async (temple) => {
            const data = await templeDb.getTempleById(temple.id);
            return { id: temple.id, data };
          });

          const results = await Promise.all(promises);

          results.forEach(({ id, data }) => {
            if (data) {
              templeData.value[id] = data;
            }
          });
        } finally {
          isLoading.value = false;
        }
      };

      // Load temple data when component is mounted
      onMounted(() => {
        loadTempleData();
      });

      // Internal helper for background images
      const _getBgImage = (world: string) => {
        try {
          return requireBg(`./world-${world}.jpg`);
        } catch (error) {
          debug.warn(`Could not load world-${world}.jpg:`, error);
          try {
            return requireBg("./world-map.jpg");
          } catch (error) {
            debug.warn("Could not load world-map.jpg fallback:", error);
            try {
              return requireBg("./hometown.jpg");
            } catch {
              // If all fallbacks fail, return a blank transparent image
              return "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
            }
          }
        }
      };

      // Computed property to prepare all view data at once
      // This allows the template to be very dumb and fast
      const processedTemples = computed(() => {
        return temples.map((temple) => {
          const data = templeData.value[temple.id];
          return {
            ...data,
            ...temple,
            bgImage: _getBgImage(temple.world),
            // We can add other computed properties here if we need to restore UI later
            // Currently purely focused on the cards functionality
          };
        });
      });

      const clickTemple = (templeId: string) => {
        $router.push({
          name: "xp-temple-dashboard",
          params: {
            templeId,
          },
        });
      };

      const goToTempleCreator = (templeId: string) => {
        // Navigate to the creator page, passing 'new' or an existing templeId
        $router.push({
          name: "xp-temple-creator",
          params: {
            templeId,
          },
        });
      };

      const presentActionSheet = async () => {
        const actionSheet = await actionSheetController.create({
          header: "Temple Actions",
          cssClass: "temple-action-sheet",
          mode: "ios",
          buttons: [
            {
              text: "Create New Temple",
              icon: createOutline,
              cssClass: "action-create",
              handler: () => {
                goToTempleCreator("new");
              },
            },
            {
              text: "Import Temple",
              icon: cloudDownloadOutline,
              cssClass: "action-import",
              handler: () => {
                // Import temple functionality would go here
              },
            },
            {
              text: "Cancel",
              role: "cancel",
              cssClass: "action-cancel",
              handler: () => {
                // Just close the action sheet
              },
            },
          ],
        });
        await actionSheet.present();
      };

      return {
        processedTemples,
        clickTemple,
        goToTempleCreator,
        presentActionSheet,
        createOutline,
        clickSoundSettings() {
          $router.push({ name: "xp-settings-sound" });
        },
        clickThemeSettings() {
          $router.push({ name: "xp-settings-theme" });
        },
        hoveredTempleId,
        isLoading,
      };
    },
  });
</script>

<style lang="scss" scoped>
  .xp-temples {
    // Global page styles
    ion-toolbar {
      ion-title {
        font-family: var(--xp-font-fantasy, "Fantasy");
        font-size: 1.5rem;
      }
    }

    // Card styles
    .temple-card {
      margin: 8px;
      border-radius: 12px;
      overflow: hidden;
      // Loading placeholder - dark background so it has 'weight' before image loads
      background: #1a1a2e;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      position: relative;
      border: 2px solid rgba(255, 255, 255, 0.05);

      &.portrait-card {
        aspect-ratio: 1 / 1.3;
        display: flex;
        flex-direction: column;
      }

      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 20px rgba(0, 0, 0, 0.5);
        border-color: rgba(255, 255, 255, 0.3);

        .temple-bg-image {
          transform: scale(1.05);
          opacity: 1;
        }
      }

      .img-wrapper {
        width: 100%;
        height: 100%;
        overflow: hidden;
        position: relative;
      }

      .temple-bg-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0.9;
        transition: transform 0.5s ease, opacity 0.3s ease;
      }
    }

    // Floating button
    ion-fab-button {
      --box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }
  }
</style>
