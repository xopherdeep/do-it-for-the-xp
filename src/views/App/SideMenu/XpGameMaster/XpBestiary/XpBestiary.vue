<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box icon-colors">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>

        <i
          slot="start"
          class="fad fa-hand-holding-heart fa-2x"
        />
        <ion-title>
          Bestiary </ion-title>

        <!-- Removed import/export buttons from here -->
      </ion-toolbar>
    </ion-header>
    <ion-content class="relative">
      <canvas class="beasts-bg" />
      <ion-list class="bg-transparent">
        <ion-item-sliding
          v-for="beast in beasts"
          :key="beast.id"
        >
          <ion-item>
            <ion-thumbnail
              slot="start"
              class="cursor-pointer"
              id="beast-avatar"
            >
              <ion-img
                v-if="beast?.avatar"
                :src="getAvatar(beast.avatar)"
                class="w-full p-0 m-0"
              />
              <ion-skeleton-text v-else />
            </ion-thumbnail>
            <ion-label>
              <h2>{{ beast.name }}</h2>
              <p>
                {{ beast.checklist.length }} Checks found on
                {{ beast.achievementIds?.length }} Achievements
              </p>
            </ion-label>
            <ion-buttons slot="end">
              <ion-button
                @click="clickAddBeast(beast)"
                color="rpg"
              >
                <i class="fad fa-paw-claws fa-lg" />
              </ion-button>
              <ion-button
                @click="clickAttachBeast(beast)"
                color="rpg"
              >
                <i class="fad fa-paperclip fa-lg" />
              </ion-button>
            </ion-buttons>
          </ion-item>
          <ion-item-options side="start">
            <ion-item-option
              color="danger"
              @click="clickDeleteBeast(beast)"
            >
              <i class="fad fa-trash fa-lg mr-2" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
      <ion-fab
        slot="fixed"
        vertical="bottom"
        horizontal="center"
      >
        <ion-fab-button @click="presentActionSheet" color="rpg">
          <i class="fad fa-hand-holding-heart fa-2x"/>
        </ion-fab-button>
      </ion-fab>

    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import ionic from "@/mixins/ionic";
import { actionSheetController, alertController, modalController } from "@ionic/vue";
import { createOutline, saveOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';
import XpAttachBeast from "./components/XpAttachBeast.vue";
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";

import BestiaryDb, { 
  beastStorage, 
  Beast, 
  BESTIARY_BG_SETTINGS_KEY, 
  BgSettings 
} from "@/lib/databases/BestiaryDb";
import debug from "@/lib/utils/debug";

// Define a unique ID for this page for background management
const PAGE_ID = 'xp-bestiary';

export default defineComponent({
  name: "XpBestiary",
  mixins: [ionic],
  data() {
    return {
      // Background state with default values
      bgSettings: {
        bg1: 0,
        bg2: 0,
        aspectRatio: 0  // Set a default value (changed from 0 to a useful default)
      } as BgSettings
    };
  },
  methods: {
    async clickDeleteBeast(beast: Beast) {
      const alert = await alertController.create({
        header: "Delete Beast",
        mode: "ios",
        message: `Are you sure you want to delete ${beast.name}?`,
        buttons: [
          {
            text: "Cancel",
            role: "cancel",
          },
          {
            text: "Delete",
            role: "destructive",
            handler: () => {
              this.deleteBeast(beast);
            },
          },
        ],
      });
      alert.present();
    },
    async deleteBeast(beast: Beast) {
      await this.bestiary
        .deleteBeast(beast)
        .then(this.loadBeasts)
        .then(this.bestiary.showDeleteToast);
    },
    async clickAddBeast(beast?: Beast) {
      if (beast) {
        this.router.push(`/game-master/compendium/bestiary/create-update/${beast.id}`);
      } else {
        this.router.push('/game-master/compendium/bestiary/create-update');
      }
    },

    async clickAttachBeast(beast: Beast) {
      const modal = await modalController.create({
        component: XpAttachBeast,
        cssClass: "fullscreen",
        componentProps: {
          beast,
        },
      });
      modal
        .onDidDismiss()
        .then(async ({ data }) => {
          if (data) {
            beast.achievementIds = data;
            await this.bestiary
              .setBeast(beast)
              .then(() =>
                this.bestiary.showSuccessToast("Attachments saved!")
              );
          }
        })
        .then(this.loadBeasts);
      modal.present();
    },
    getAvatar(id) {
      const pad = id.toString().padStart(3, '0')
      return require(`@/assets/images/beasts/${pad}.png`);
    },

    async loadBeasts() {
      await this.bestiary.getBeasts().then(this.setBeasts);
    },
    setBeasts(beasts: Beast[]) {
      this.beasts = beasts;
    },
    
    // Initialize background with random settings
    initBackground() {
      debug.log('Initializing bestiary background');
      // Always get a random background
      const randomBg = backgroundManager.getRandomBackground();
      this.bgSettings.bg1 = randomBg.bg1;
      this.bgSettings.bg2 = randomBg.bg2;
      
      // Initialize the background
      backgroundManager.initBackground({
        canvasSelector: "canvas.beasts-bg",
        bg1: this.bgSettings.bg1,
        bg2: this.bgSettings.bg2,
        aspectRatio: 0,
        handleResize: true,
        page: PAGE_ID
      });
    },
    
    // Force reinitialize the background
    reInitBackground() {
      debug.log('Force reinitializing bestiary background');
      // Cleanup first if active
      if (backgroundManager.isActiveFor(PAGE_ID)) {
        backgroundManager.cleanupBackground();
      }
      
      // Then initialize with saved settings or new random ones
      this.loadSavedBackgroundSettings();
      this.initBackground();
    },
    
    // Load saved background settings from localStorage
    loadSavedBackgroundSettings() {
      try {
        const savedBgSettings = localStorage.getItem(BESTIARY_BG_SETTINGS_KEY);
        if (savedBgSettings) {
          const settings = JSON.parse(savedBgSettings) as BgSettings;
          
          // Ensure aspectRatio has a value even if it was undefined in storage
          this.bgSettings = {
            bg1: settings.bg1,
            bg2: settings.bg2,
            // aspectRatio: settings.aspectRatio ?? 48 // Use nullish coalescing to provide default
          };
          
          // Apply saved settings to the background
          backgroundManager.updateBackground({
            bg1: settings.bg1,
            bg2: settings.bg2,
            // aspectRatio: settings.aspectRatio ?? 0
          });
          
          debug.log('Loaded saved background settings:', this.bgSettings);
        }
      } catch (e) {
        debug.error('Error loading saved background settings:', e);
      }
    },
    
    // Save background settings to localStorage - now using BestiaryDb method
    saveBgSettings() {
      this.bestiary.saveBgSettings(this.bgSettings);
    },
    
    async saveCurrentBackgroundAsPreset() {
      // Get the current background settings from the background manager
      const bgSettings = backgroundManager.getBackgroundSettings();
      
      // Update our local settings from the manager
      this.bgSettings.bg1 = bgSettings.bg1;
      this.bgSettings.bg2 = bgSettings.bg2;
      this.bgSettings.aspectRatio = bgSettings.aspectRatio;
      
      // Save to localStorage for persistence
      this.saveBgSettings();
      
      // Create a dialog to name the preset
      const alert = await alertController.create({
        header: 'Save Background Preset',
        inputs: [
          {
            name: 'name',
            type: 'text',
            placeholder: `Background (${bgSettings.bg1}/${bgSettings.bg2})`,
            value: `Background (${bgSettings.bg1}/${bgSettings.bg2})`
          }
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Save',
            handler: (data) => {
              const presetName = data.name || `Background (${bgSettings.bg1}/${bgSettings.bg2})`;
              this.bestiary.saveBackgroundPreset(presetName, bgSettings);
            }
          }
        ]
      });
      
      await alert.present();
    },
    
    async presentActionSheet() {
      const actionSheet = await actionSheetController
        .create({
          header: 'Bestiary Actions',
          cssClass: 'bestiary-action-sheet',
          mode: 'ios',
          buttons: [
            {
              text: 'Create New Beast',
              icon: createOutline,
              cssClass: 'action-create rpg-box',
              handler: () => {
                this.clickAddBeast();
              }
            },
            {
              text: 'Import Beasts',
              icon: 'fas:file-import',
              cssClass: 'action-import',
              handler: () => {
                // Use the new method from BestiaryDb
                this.bestiary.importBestiary(() => this.loadBeasts());
              }
            },
            {
              text: 'Export Beasts',
              icon: 'fas:file-export',
              cssClass: 'action-export',
              handler: () => {
                // Use the new method from BestiaryDb
                this.bestiary.exportBestiary();
              }
            },
            {
              text: 'Save Background as Preset',
              icon: saveOutline,
              cssClass: 'action-save',
              handler: () => {
                this.saveCurrentBackgroundAsPreset();
              }
            },
            {
              text: 'Cancel',
              icon: 'fas:times-circle',
              role: 'cancel',
              cssClass: 'action-cancel',
              handler: () => {
                // Just close the action sheet
              }
            },
          ],
        });
      await actionSheet.present();
    },
    
    // Ionic specific lifecycle hooks - moved inside methods object
    ionViewWillEnter() {
      debug.log('ionViewWillEnter - XpBestiary');
      this.reInitBackground();
    },
    
    ionViewDidEnter() {
      debug.log('ionViewDidEnter - XpBestiary');
      // Ensure background is properly initialized
      if (!backgroundManager.isActiveFor(PAGE_ID)) {
        this.reInitBackground();
      }
    }
  },
  
  mounted() {
    debug.log('mounted - XpBestiary');
    this.loadBeasts();
    this.initBackground();
    this.loadSavedBackgroundSettings();
  },
  
  activated() {
    debug.log('activated - XpBestiary');
    // Always reinitialize on activation regardless of current state
    if (this.reInitBackground) {
      this.reInitBackground();
    } else {
      debug.log('forceReinitBackground not available in activated hook');
      // Fallback initialization
      if (backgroundManager.isActiveFor(PAGE_ID)) {
        backgroundManager.cleanupBackground();
      }
      this.initBackground();
    }
  },
  
  unmounted() {
    debug.log('unmounted - XpBestiary');
    // Only clean up if this component was the last one to initialize the background
    if (backgroundManager.isActiveFor(PAGE_ID)) {
      backgroundManager.cleanupBackground();
    }
  },
  
  setup() {
    const bestiary = new BestiaryDb(beastStorage);
    const beasts = ref([] as Beast[]);
    const router = useRouter();

    return {
      beasts,
      bestiary,
      router,
      add: 'add-outline'
    };
  },
});
</script>

<style lang="scss" scoped>
  /* @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); */

  
  p {
    font-family: "StatusPlz" !important;
  font-size: .75em;
  }

  h2 {
    font-size: .75em;
    font-family: "Press Start 2P" !important;
    text-shadow: 0 1px 5px rgba(0, 0, 0, 0.5);
  }

  ion-content {
    position: relative;


    .beasts-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
    }

    ion-list {
      background: transparent !important;

      ion-item {
        --background: transparent;
        font-family: "Press Start 2P";


      }


    }
  }
</style>

<style lang="scss">
/* Global styles for action sheet - not scoped */
.bestiary-action-sheet {
  --background: rgba(var(--ion-background-color-rgb), 0.9);
  --backdrop-opacity: 0.6;
  --button-background-selected: rgba(var(--ion-color-primary-rgb), 0.1);

  .action-create::part(icon) {
    color: var(--ion-color-success);
    opacity: 1;
  }

  .action-import::part(icon) {
    color: var(--ion-color-primary);
    opacity: 1;
  }

  .action-export::part(icon) {
    color: var(--ion-color-secondary);
    opacity: 1;
  }

  .action-save::part(icon) {
    color: var(--ion-color-warning);
    opacity: 1;
  }

  .action-cancel::part(icon) {
    color: var(--ion-color-danger);
    opacity: 1;
  }
}
</style>
