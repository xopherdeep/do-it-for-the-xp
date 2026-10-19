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
  import { actionSheetController, onIonViewWillEnter } from "@ionic/vue";

  import { createOutline, cloudDownloadOutline, diceOutline } from "ionicons/icons";
  import XpRpgPage from "@/components/templates/pages/XpRpgPage.vue";
  import XpTempleGenerateModal from "./components/XpTempleGenerateModal.vue";
  import XpBloodMoonModal from "./components/XpBloodMoonModal.vue";
  import { mintTempleId } from "./templeWizard";
  import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
  import { ensureBuiltInTemples } from "@/lib/engine/core/dungeons/importAllTemples";
  import { play$fx } from "@/assets/fx";
  import { useProStore } from "@/lib/store/stores/pro";
  import { importPackFile, usePackLibrary } from "@/hooks/usePackLibrary";

  /** The parts of a temple its card label reads */
  interface TempleLabelSource {
    id: string;
    world?: string;
    customName?: string;
    name?: string;
  }

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
          const isShipped = shipped.has(key);
          if (isShipped) continue;
          const data = await templeDb.getTempleById(key);
          const isCustomTemple = !!data?.dungeonLayout;
          if (isCustomTemple) found.push(data);
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

      // Back from a temple's pages: a temple made or deleted there shows (or goes) without a reload
      onIonViewWillEnter(() => {
        if (!isLoading.value) void loadCustomTemples();
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
        const hasPro = await pro.requirePro("templeCreator");
        if (!hasPro) return;
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
        // Navigate to the creator page with the id of the temple it will keep (see Create New Temple for a new one)
        $router.push({
          name: "xp-temple-settings",
          params: {
            templeId,
          },
        });
      };

      // Import opens the pack import flow Settings > Packs uses (a file from the Town Hall or another family).
      // The packs already added are read first, so the file's pack is saved beside them and not over them.
      const packShelf = usePackLibrary();
      const importTemple = async () => {
        await packShelf.refreshPacks();
        await importPackFile(packShelf);
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
                const hasPro = await pro.requirePro("templeCreator");
                if (!hasPro) return;
                // A real id from the first tap: every save (the Creator's, the General card's) writes under the id of
                // its route, and the old placeholder "new" was the same for every temple, so a second one overwrote the first
                goToTempleCreator(mintTempleId());
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
              text: "Import a pack",
              icon: cloudDownloadOutline,
              cssClass: "action-import",
              handler: () => {
                void importTemple();
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
      const templeLabel = (temple: TempleLabelSource) => {
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

<style lang="scss" scoped src="./_XpTemples.scss" />
