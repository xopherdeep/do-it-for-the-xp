<template>
  <xp-rpg-page
    :loading="isLoading"
    title="Temples"
    header-icon="fa-hand-holding-water"
  >
    <template #actions>
      <ion-button
        color="rpg"
        class="generate-btn"
        title="Generate a temple from a seed"
        @click="openGenerator"
      >
        <i class="fad fa-dice-d20 fa-2x"></i>
      </ion-button>
      <ion-button
        color="rpg"
        class="blood-moon-btn"
        title="Blood moons: each hero's progress per temple, schedule or raise a reset"
        @click="openBloodMoons"
      >
        <i class="fad fa-moon fa-2x"></i>
      </ion-button>
      <ion-button
        title="Sound settings"
        aria-label="Sound settings"
        @click="clickSoundSettings"
      >
        <i class="fad fa-volume-up fa-2x"></i>
      </ion-button>
      <ion-button
        title="Theme settings"
        aria-label="Theme settings"
        @click="clickThemeSettings"
      >
        <i class="fad fa-palette fa-2x"></i>
      </ion-button>
    </template>

    <ion-grid>
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
            :aria-label="templeLabel(temple)"
            class="temple-card portrait-card"
            @mouseenter="hoveredTempleId = temple.id"
            @mouseleave="hoveredTempleId = null"
          >
            <div class="img-wrapper">
              <ion-img
                :src="temple.bgImage"
                class="temple-bg-image"
                :alt="templeLabel(temple)"
              ></ion-img>
              <div
                v-if="temple.generated"
                class="generated-banner rpg-box"
              >
                <i class="fad fa-dice-d20 mr-1"></i>
                <span class="generated-name">{{ temple.customName || temple.name || temple.id }}</span>
                <span class="generated-seed">seed {{ temple.seed }}</span>
              </div>
            </div>
          </ion-card>
        </ion-col>
      </ion-row>
    </ion-grid>

    <xp-temple-generate-modal
      :is-open="generatorOpen"
      @close="generatorOpen = false"
      @saved="onGenerated"
    />

    <xp-blood-moon-modal
      :is-open="bloodMoonsOpen"
      :temples="templeChoices"
      @close="bloodMoonsOpen = false"
    />

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
        <i class="fad fa-hand-holding-water fa-2x"></i>
      </ion-fab-button>
    </ion-fab>
  </xp-rpg-page>
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

  import { createOutline, cloudDownloadOutline, diceOutline } from "ionicons/icons";
  import XpRpgPage from "@/components/templates/pages/XpRpgPage.vue";
  import XpTempleGenerateModal from "./components/XpTempleGenerateModal.vue";
  import XpBloodMoonModal from "./components/XpBloodMoonModal.vue";
  import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
  import { ensureBuiltInTemples } from "@/lib/engine/core/dungeons/importAllTemples";
  import { play$fx } from "@/assets/fx";
  import { useProStore } from "@/lib/store/stores/pro";

  // Only world-*.webp / hometown.webp are looked up by key; keep the filter (a bare context bundles all 90 MB)
  const requireBg = require.context("@/assets/images/backgrounds/", false, /^\.\/(world-[a-z-]+|hometown)\.webp$/);

  export default defineComponent({
    name: "xp-temples",
    mixins: [Ionic],
    components: {
      XpRpgPage,
      XpTempleGenerateModal,
      XpBloodMoonModal,
    },
    setup() {
      const isLoading = ref(true);
      const hoveredTempleId = ref<string | null>(null);
      const $router = useRouter();
      const templeDb = new TempleDb(templeStorage);
      const templeData = ref({} as Record<string, TempleInterface>);
      // Temples saved by the creator or the generator that are not one of the nine shipped ones
      const customTemples = ref([] as TempleInterface[]);
      const generatorOpen = ref(false);
      const bloodMoonsOpen = ref(false);

      // One card per world, in world-map order; ids and worlds match TEMPLE_METADATA and the region pages
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
          id: "shadow-temple",
          world: "swamps",
          level: 9,
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
          id: "storm-temple",
          world: "clouds",
          level: 8,
        },
        {
          id: "moon-temple",
          world: "moon",
          level: 4,
        },
      ];

      // Load temple data from storage
      const loadTempleData = async () => {
        isLoading.value = true;
        try {
          await ensureBuiltInTemples();
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
          await loadCustomTemples();
        } finally {
          isLoading.value = false;
        }
      };

      // Every stored temple with a layout that is not one of the nine: generated ones and hand-made extras
      const loadCustomTemples = async () => {
        const shipped = new Set(temples.map((temple) => temple.id));
        const keys = await templeStorage.keys();
        const found: TempleInterface[] = [];
        for (const key of keys) {
          if (shipped.has(key)) continue;
          const data = await templeDb.getTempleById(key);
          if (data?.dungeonLayout) found.push(data);
        }
        customTemples.value = found.sort((a, b) => (a.customName || a.name || a.id).localeCompare(b.customName || b.name || b.id));
      };

      // A generated temple's card wears the world of its element, when an authored temple shares it
      const worldForElement = (element?: string) =>
        Object.values(TEMPLE_METADATA).find((meta) => meta.element === element)?.world || "plains";

      // Load temple data when component is mounted
      onMounted(() => {
        loadTempleData();
      });

      // Internal helper for background images
      const _getBgImage = (world: string) => {
        try {
          return requireBg(`./world-${world}.webp`);
        } catch (error) {
          debug.warn(`Could not load world-${world}.webp:`, error);
          try {
            return requireBg("./world-map.webp");
          } catch (error) {
            debug.warn("Could not load world-map.webp fallback:", error);
            try {
              return requireBg("./hometown.webp");
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
        const shipped = temples.map((temple) => {
          const data = templeData.value[temple.id];
          return {
            ...data,
            ...temple,
            generated: false,
            bgImage: _getBgImage(temple.world),
            // We can add other computed properties here if we need to restore UI later
            // Currently purely focused on the cards functionality
          };
        });
        const custom = customTemples.value.map((temple) => ({
          ...temple,
          world: worldForElement(temple.element),
          level: temple.level ?? 1,
          generated: true,
          bgImage: _getBgImage(worldForElement(temple.element)),
        }));
        return [...shipped, ...custom];
      });

      // The temples the blood moon panel can pick from, named as their cards are
      const templeChoices = computed(() =>
        processedTemples.value.map((temple) => ({
          id: temple.id,
          name: temple.customName || temple.name || TEMPLE_METADATA[temple.id]?.name || temple.id,
        }))
      );

      const openBloodMoons = () => {
        play$fx("openMenu");
        bloodMoonsOpen.value = true;
      };

      const pro = useProStore();

      // Temple Creator is XP Pro: making a temple (by hand or from a seed) opens the upsell for a free family
      const openGenerator = async () => {
        if (!(await pro.requirePro("templeCreator"))) return;
        play$fx("openMenu");
        generatorOpen.value = true;
      };

      // The generator saved a temple: close the modal and show its card
      const onGenerated = async (record: TempleInterface) => {
        generatorOpen.value = false;
        await loadCustomTemples();
        debug.log(`Generated temple saved: ${record.id}`);
      };

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
          name: "xp-temple-settings",
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
              handler: async () => {
                if (!(await pro.requirePro("templeCreator"))) return;
                goToTempleCreator("new");
              },
            },
            {
              text: "Generate Temple",
              icon: diceOutline,
              cssClass: "action-generate",
              handler: () => {
                openGenerator();
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

      // The world's name is painted into the card art; say it for screen readers
      const templeLabel = (temple: { id: string; world?: string; customName?: string; name?: string }) => {
        const name = TEMPLE_METADATA[temple.id]?.name || temple.customName || temple.name || temple.id;
        return temple.world ? `${name}, ${temple.world}` : name;
      };

      return {
        processedTemples,
        templeLabel,
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
        generatorOpen,
        openGenerator,
        onGenerated,
        bloodMoonsOpen,
        templeChoices,
        openBloodMoons,
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

      // A generated temple names itself on its card: it has no portrait of its own
      .generated-banner {
        position: absolute;
        left: 6px;
        right: 6px;
        bottom: 6px;
        padding: 4px 8px;
        display: flex;
        flex-direction: column;
        font-size: 0.8rem;
        line-height: 1.2;

        .generated-name {
          font-weight: bold;
        }

        .generated-seed {
          font-family: monospace;
          font-size: 0.7rem;
          opacity: 0.75;
        }
      }
    }

    // Floating button
    ion-fab-button {
      --box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }
  }
</style>
