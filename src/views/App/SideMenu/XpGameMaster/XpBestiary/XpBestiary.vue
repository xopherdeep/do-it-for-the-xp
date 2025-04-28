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

        <ion-buttons slot="end">

          <ion-button
            @click="importBeasts"
            title="Import Beasts"
            color="rpg"
          >
            <i class="fad fa-file-import fa-2x"></i>
          </ion-button>
          <ion-button
            @click="exportBeasts"
            title="Export Beasts"
            color="rpg"
          >
            <i class="fad fa-file-export fa-2x"></i>
          </ion-button>
        </ion-buttons>
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
import { actionSheetController, alertController, modalController, toastController } from "@ionic/vue";
import { add, createOutline, saveOutline } from 'ionicons/icons';
import XpAttachBeast from "./components/XpAttachBeast.vue";
import { backgroundManager } from "@/engine/core/BackgroundManager";
import { v4 as uuidv4 } from 'uuid';

import AddBeast from "./components/XpAddBeast.vue";
import BestiaryDb, { beastStorage, Beast } from "@/databases/BestiaryDb";

// Define interface for background presets (must match the one in XpBackgroundSelector)
interface BackgroundPreset {
  id: string;
  name: string;
  bg1: number;
  bg2: number;
  aspectRatio?: number;
}

export default defineComponent({
  name: "XpBestiary",
  mixins: [ionic],
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
      const modal = await modalController.create({
        component: AddBeast,
        cssClass: "fullscreen",
        componentProps: {
          beast,
        },
      });
      modal.onDidDismiss().then(this.loadBeasts).then(this.animateBg);
      modal.present();
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
    animateBg() {
      const randomBg = backgroundManager.getRandomBackground();
      
      backgroundManager.initBackground({
        canvasSelector: "canvas.beasts-bg",
        bg1: randomBg.bg1,
        bg2: randomBg.bg2,
        aspectRatio: 0,
        handleResize: true
      });
    },
    async saveCurrentBackgroundAsPreset() {
      // Get the current background settings from the background manager
      const bgSettings = backgroundManager.getBackgroundSettings();
      
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
              this.createBackgroundPreset(presetName, bgSettings);
            }
          }
        ]
      });
      
      await alert.present();
    },
    
    createBackgroundPreset(name, bgSettings) {
      // Storage key for custom presets - must match the one in XpBackgroundSelector
      const STORAGE_KEY = 'xp-custom-bg-presets';
      
      try {
        // Load existing presets
        let customPresets: BackgroundPreset[] = [];
        const savedPresets = localStorage.getItem(STORAGE_KEY);
        if (savedPresets) {
          customPresets = JSON.parse(savedPresets);
        }
        
        // Create new preset
        const newPreset: BackgroundPreset = {
          id: Date.now().toString(36) + Math.random().toString(36).substring(2),
          name: name,
          bg1: bgSettings.bg1,
          bg2: bgSettings.bg2,
          aspectRatio: bgSettings.aspectRatio || 0
        };
        
        // Add to presets array
        customPresets.push(newPreset);
        
        // Save back to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
        
        // Show confirmation toast
        toastController.create({
          message: `Background preset "${name}" saved!`,
          duration: 2000,
          position: 'top',
          color: 'success'
        }).then(toast => toast.present());
        
      } catch (e) {
        console.error('Failed to save background preset:', e);
        toastController.create({
          message: 'Failed to save background preset',
          duration: 2000,
          position: 'top',
          color: 'danger'
        }).then(toast => toast.present());
      }
    },
    async exportBeasts() {
      try {
        // Get all beasts
        const beasts = await this.bestiary.getBeasts();
        
        if (beasts.length === 0) {
          this.bestiary.showWarningToast("No beasts to export!");
          return;
        }
        
        // Create a data URL with the JSON data
        const jsonData = JSON.stringify(beasts, null, 2);
        const dataUrl = `data:text/json;charset=utf-8,${encodeURIComponent(jsonData)}`;
        
        // Create a temporary link element and trigger download
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `xp-beasts-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success toast
        this.bestiary.showSuccessToast(`${beasts.length} beasts exported successfully!`);
      } catch (error) {
        console.error('Failed to export beasts:', error);
        this.bestiary.showErrorToast("Failed to export beasts");
      }
    },
    
    async importBeasts() {
      try {
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        // Set up file change handler
        fileInput.onchange = async (event) => {
          const target = event.target as HTMLInputElement;
          if (!target || !target.files || target.files.length === 0) return;
          
          const file = target.files[0];
          if (!file) return;
          
          const reader = new FileReader();
          
          reader.onload = async (e) => {
            try {
              if (!e.target || e.target.result === null) {
                this.bestiary.showErrorToast("Failed to read file");
                return;
              }

              const content = e.target.result as string;
              const importedBeasts = JSON.parse(content);
              
              if (!Array.isArray(importedBeasts)) {
                this.bestiary.showErrorToast("Invalid beasts file format");
                return;
              }
              
              // Ask for confirmation with details about import
              const alert = await alertController.create({
                header: 'Import Beasts',
                message: `Do you want to import ${importedBeasts.length} beasts? This will add them to your existing collection.`,
                buttons: [
                  {
                    text: 'Cancel',
                    role: 'cancel'
                  },
                  {
                    text: 'Import',
                    handler: async () => {
                      // Import each beast
                      let successCount = 0;
                      
                      for (const beast of importedBeasts) {
                        try {
                          // Ensure each beast has a new UUID to avoid conflicts
                          const importedBeast = {
                            ...beast,
                            id: uuidv4()
                          };
                          
                          await this.bestiary.setBeast(importedBeast);
                          successCount++;
                        } catch (err) {
                          console.error('Error importing beast:', err);
                        }
                      }
                      
                      // Refresh beast list
                      await this.loadBeasts();
                      
                      // Show success toast
                      this.bestiary.showSuccessToast(`${successCount} beasts imported successfully!`);
                    }
                  }
                ]
              });
              
              await alert.present();
              
            } catch (parseError) {
              console.error('Error parsing import file:', parseError);
              this.bestiary.showErrorToast("Invalid JSON file");
            }
          };
          
          reader.readAsText(file);
        };
        
        // Trigger file selection
        fileInput.click();
        
      } catch (error) {
        console.error('Failed to import beasts:', error);
        this.bestiary.showErrorToast("Failed to import beasts");
      }
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
              text: 'Save Background as Preset',
              icon: saveOutline,
              cssClass: 'action-save',
              handler: () => {
                this.saveCurrentBackgroundAsPreset();
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
    },
  },
  mounted() {
    this.loadBeasts();
    this.animateBg();
  },
  unmounted() {
    backgroundManager.cleanupBackground();
  },
  setup() {
    const bestiary = new BestiaryDb(beastStorage);
    const beasts = ref([] as Beast[]);

    return {
      beasts,
      bestiary,
      add,
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
        background: transparent;
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
