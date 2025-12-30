<template>
  <xp-rpg-page title="Bestiary" header-icon="fa-hand-holding-heart" :loading="isLoading" back-button-href="/game-master"
    :on-refresh="handleRefresh">
    <template #actions>
      <ion-button @click="saveBackgroundPreset" fill="clear" color="light" size="small">
        <i class="fad fa-palette mr-1"></i>
        Save BG
      </ion-button>
    </template>

    <!-- Search Area -->
    <div class="search-container">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input type="text" v-model="searchQuery" placeholder="Search bestiary..." class="beast-search-input" />
      </div>
      <div class="beast-count">{{ filteredBeasts.length }} Beasts</div>
    </div>

    <!-- Grid Area -->
    <div class="beast-grid">
      <ion-grid>
        <ion-row>
          <!-- Add New Card -->
          <ion-col size="4" size-md="3" size-lg="2">
            <XpBeastSelectorItem id="__add_new__" name="Add New" icon="fa-paw-claws" :bg1="addNewBg1" :bg2="addNewBg2"
              class="add-new-card" @click="clickAddBeast()" />
          </ion-col>

          <ion-col size="4" size-md="3" size-lg="2" v-for="beast in filteredBeasts" :key="beast.id">
            <XpBeastSelectorItem :id="beast.id" :name="beast.name" :avatar="beast.avatar" :bg1="beast.bg1"
              :bg2="beast.bg2" @click="presentBeastOptions(beast)" />
          </ion-col>
        </ion-row>
      </ion-grid>

      <div v-if="filteredBeasts.length === 0" class="no-results">
        <i class="fad fa-ghost fa-3x"></i>
        <p>No beasts found in the bestiary...</p>
      </div>
    </div>

    <ion-fab slot="fixed" vertical="bottom" horizontal="center">
      <ion-fab-button @click="presentActionSheet" color="rpg">
        <i class="fad fa-hand-holding-heart fa-2x" />
      </ion-fab-button>
    </ion-fab>
  </xp-rpg-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import ionic from "@/lib/mixins/ionic";
import {
  actionSheetController,
  alertController,
  modalController,
  IonGrid,
  IonRow,
  IonCol,
  IonButton, // Added IonButton import
} from "@ionic/vue";
import {
  createOutline,
  saveOutline,
  trashOutline,
  attachOutline,
  createSharp,
  listOutline,
} from "ionicons/icons";
import { useRouter } from "vue-router";
import XpAttachBeast from "./components/XpAttachBeast.vue";
import XpBeastSelectorItem from "./components/XpBeastSelectorItem.vue";
import BeastTaskListModal from "./components/BeastTaskListModal.vue";

import BestiaryDb, { beastStorage, Beast } from "@/lib/databases/BestiaryDb";
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";
import debug from "@/lib/utils/debug";
import XpRpgPage from "@/components/templates/pages/XpRpgPage.vue";

export default defineComponent({
  name: "XpBestiary",
  mixins: [ionic],
  components: {
    IonGrid,
    IonRow,
    IonCol,
    IonButton, // Added IonButton to components
    XpBeastSelectorItem,
    XpRpgPage,
  },
  data() {
    return {};
  },
  methods: {
    async presentBeastOptions(beast: Beast) {
      const actionSheet = await actionSheetController.create({
        header: beast.name,
        subHeader: `${beast.checklist?.length || 0} Checks | ${beast.achievementIds?.length || 0
          } Achievements`,
        mode: "ios",
        buttons: [
          {
            text: "Edit Beast",
            icon: createSharp,
            handler: () => {
              this.clickAddBeast(beast);
            },
          },
          {
            text: "View Task List",
            icon: listOutline,
            handler: () => {
              this.presentBeastTasks(beast);
            },
          },
          {
            text: "Attach to Achievements",
            icon: attachOutline,
            handler: () => {
              this.clickAttachBeast(beast);
            },
          },
          {
            text: "Delete Beast",
            role: "destructive",
            icon: trashOutline,
            handler: () => {
              this.clickDeleteBeast(beast);
            },
          },
          {
            text: "Cancel",
            role: "cancel",
          },
        ],
      });
      await actionSheet.present();
    },
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
        .then(() => this.loadBeasts())
        .then(this.bestiary.showDeleteToast);
    },
    async clickAddBeast(beast?: Beast) {
      if (beast) {
        this.router.push({
          name: "xp-create-update-beast",
          params: { id: beast.id },
        });
      } else {
        // Pass the Add New box bg settings to the new beast
        this.router.push({
          name: "xp-create-update-beast",
          query: {
            bg1: this.addNewBg1,
            bg2: this.addNewBg2,
          },
        });
      }
    },

    async presentBeastTasks(beast: Beast) {
      const modal = await modalController.create({
        component: BeastTaskListModal,
        componentProps: {
          beast
        },
        mode: 'ios',
        initialBreakpoint: 0.8,
        breakpoints: [0, 0.8, 1]
      });

      await modal.present();
    },

    async clickAttachBeast(beast: Beast) {
      const modal = await modalController.create({
        component: XpAttachBeast,
        cssClass: "fullscreen",
        componentProps: {
          beast,
        },
      });

      await modal.present();

      const { data } = await modal.onDidDismiss();
      if (data) {
        beast.achievementIds = data;
        await this.bestiary.setBeast(beast);
        await this.bestiary.showSuccessToast("Attachments saved!");
        await this.loadBeasts();
      }
    },

    getAvatar(id: number | string) {
      const pad = id.toString().padStart(3, "0");
      return require(`@/assets/images/beasts/${pad}.png`);
    },

    async loadBeasts(silent = false) {
      if (!silent) this.isLoading = true;
      try {
        const beasts = await this.bestiary.getBeasts();
        this.setBeasts(beasts);
      } finally {
        if (!silent) this.isLoading = false;
      }
    },

    setBeasts(beasts: Beast[]) {
      this.beasts = beasts;
    },

    async presentActionSheet() {
      const actionSheet = await actionSheetController.create({
        header: "Bestiary Actions",
        cssClass: "bestiary-action-sheet",
        mode: "ios",
        buttons: [
          {
            text: "Create New Beast",
            icon: createOutline,
            cssClass: "action-create rpg-box",
            handler: () => {
              this.clickAddBeast();
            },
          },
          {
            text: "Import Beasts",
            icon: "fas:file-import",
            cssClass: "action-import",
            handler: () => {
              // Use the new method from BestiaryDb
              this.bestiary.importBestiary(() => this.loadBeasts());
            },
          },
          {
            text: "Export Beasts",
            icon: "fas:file-export",
            cssClass: "action-export",
            handler: () => {
              // Use the new method from BestiaryDb
              this.bestiary.exportBestiary();
            },
          },
          {
            text: "Save Background as Preset",
            icon: saveOutline,
            cssClass: "action-save",
            handler: () => {
              this.saveBackgroundPreset();
            },
          },
          {
            text: "Cancel",
            icon: "fas:times-circle",
            role: "cancel",
            cssClass: "action-cancel",
            handler: () => {
              // Just close the action sheet
            },
          },
        ],
      });
      await actionSheet.present();
    },

    // Ionic specific lifecycle hooks - moved inside methods object
    ionViewWillEnter() {
      debug.log("ionViewWillEnter - XpBestiary");
      // Regenerate Add New background each time we enter
      this.regenerateAddNewBg();
    },

    ionViewDidEnter() {
      debug.log("ionViewDidEnter - XpBestiary");
    },

    // Pull-to-refresh handler
    handleRefresh(complete: () => void) {
      this.loadBeasts(true).then(() => {
        this.regenerateAddNewBg();
        complete();
      });
    },

    async saveBackgroundPreset() {
      // Save the current Add New background as a preset
      const presetName = `Beast BG ${Date.now()}`;
      backgroundManager.saveState(presetName, {
        tick: 0,
        bg1: this.addNewBg1,
        bg2: this.addNewBg2,
      });

      await this.bestiary.showSuccessToast(
        `Saved: BG1=${this.addNewBg1}, BG2=${this.addNewBg2}`
      );
    },
  },

  mounted() {
    debug.log("mounted - XpBestiary");
    this.loadBeasts();
  },

  unmounted() {
    debug.log("unmounted - XpBestiary");
  },

  setup() {
    const bestiary = new BestiaryDb(beastStorage);
    const beasts = ref([] as Beast[]);
    const router = useRouter();
    const searchQuery = ref("");
    const isLoading = ref(true);

    const filteredBeasts = computed(() => {
      if (!searchQuery.value) return beasts.value;
      const query = searchQuery.value.toLowerCase();
      return beasts.value.filter((beast) =>
        beast.name.toLowerCase().includes(query)
      );
    });

    // Generate fresh backgrounds for Add New box (refs so they can be updated)
    const addNewBg1 = ref(Math.floor(Math.random() * 325));
    const addNewBg2 = ref(Math.floor(Math.random() * 325));

    // Function to regenerate the Add New background
    const regenerateAddNewBg = () => {
      addNewBg1.value = Math.floor(Math.random() * 325);
      addNewBg2.value = Math.floor(Math.random() * 325);
    };

    return {
      beasts,
      bestiary,
      router,
      searchQuery,
      filteredBeasts,
      addNewBg1,
      addNewBg2,
      isLoading,
      regenerateAddNewBg,
      add: "add-outline",
    };
  },
});
</script>

<style lang="scss" scoped>
/* @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); */

p {
  font-family: "StatusPlz" !important;
  font-size: 0.75em;
}

h2 {
  font-size: 0.75em;
  font-family: "Press Start 2P" !important;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.5);
}

ion-content {
  position: relative;

  .bestiary-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: transparent;
  }

  .search-container {
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .search-box {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;

    i {
      position: absolute;
      left: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    .beast-search-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 30px;
      padding: 10px 16px 10px 40px;
      color: #fff;
      font-family: "StatusPlz";
      font-size: 1rem;
      outline: none;
      transition: all 0.2s ease;

      &:focus {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--ion-color-primary);
        box-shadow: 0 0 10px rgba(var(--ion-color-primary-rgb), 0.3);
      }
    }
  }

  .beast-count {
    font-family: "Press Start 2P";
    font-size: 0.6rem;
    color: var(--ion-color-primary);
    background: rgba(var(--ion-color-primary-rgb), 0.1);
    padding: 8px 12px;
    border-radius: 20px;
    border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
  }

  .beast-grid {
    flex: 1;
    padding: 10px;
  }

  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: rgba(255, 255, 255, 0.3);
    text-align: center;

    i {
      margin-bottom: 16px;
    }

    p {
      font-family: "Press Start 2P";
      font-size: 0.8rem;
    }
  }

  .add-new-card {
    --card-border: 2px dashed rgba(0, 0, 0, 0.4);
    --card-bg: rgba(0, 0, 0, 0.2);

    &:hover {
      --card-border: 2px dashed var(--ion-color-primary);
    }
  }
}
</style>

<style lang="scss">
/* Global styles for action sheet are now handled in earthbound.scss */
</style>
