<template>
  <ion-page :class="$options.name" style="background: transparent">
    <ion-header>
      <ion-toolbar class="rpg-box icon-colors">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>

        <i slot="start" class="fad fa-hand-holding-heart fa-2x" />
        <ion-title> Bestiary </ion-title>

        <!-- Removed import/export buttons from here -->
      </ion-toolbar>
    </ion-header>
    <ion-content
      class="relative transparent-content"
      style="--background: transparent"
    >
      <div v-if="isLoading" class="loading-wrapper-centered">
        <XpLoading />
      </div>

      <div v-else class="bestiary-container">
        <!-- Search Area -->
        <div class="search-container">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search bestiary..."
              class="beast-search-input"
            />
          </div>
          <div class="beast-count">{{ filteredBeasts.length }} Beasts</div>
        </div>

        <!-- Grid Area -->
        <div class="beast-grid">
          <ion-grid>
            <ion-row>
              <!-- Add New Card -->
              <ion-col size="4" size-md="3" size-lg="2">
                <XpBeastSelectorItem
                  id="__add_new__"
                  name="Add New"
                  icon="fa-paw-claws"
                  :bg1="addNewBg1"
                  :bg2="addNewBg2"
                  class="add-new-card"
                  @click="clickAddBeast()"
                />
              </ion-col>

              <ion-col
                size="4"
                size-md="3"
                size-lg="2"
                v-for="beast in filteredBeasts"
                :key="beast.id"
              >
                <XpBeastSelectorItem
                  :id="beast.id"
                  :name="beast.name"
                  :avatar="beast.avatar"
                  :bg1="beast.bg1"
                  :bg2="beast.bg2"
                  @click="presentBeastOptions(beast)"
                />
              </ion-col>
            </ion-row>
          </ion-grid>

          <div v-if="filteredBeasts.length === 0" class="no-results">
            <i class="fad fa-ghost fa-3x"></i>
            <p>No beasts found in the bestiary...</p>
          </div>
        </div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="center">
        <ion-fab-button @click="presentActionSheet" color="rpg">
          <i class="fad fa-hand-holding-heart fa-2x" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
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
  } from "@ionic/vue";
  import {
    createOutline,
    saveOutline,
    trashOutline,
    attachOutline,
    createSharp,
  } from "ionicons/icons";
  import { useRouter } from "vue-router";
  import XpAttachBeast from "./components/XpAttachBeast.vue";
  import XpBeastSelectorItem from "./components/XpBeastSelectorItem.vue";

  import BestiaryDb, { beastStorage, Beast } from "@/lib/databases/BestiaryDb";
  import { backgroundManager } from "@/lib/engine/core/BackgroundManager";
  import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
  import debug from "@/lib/utils/debug";

  export default defineComponent({
    name: "XpBestiary",
    mixins: [ionic],
    components: {
      IonGrid,
      IonRow,
      IonCol,
      XpBeastSelectorItem,
      XpLoading,
    },
    data() {
      return {};
    },
    methods: {
      async presentBeastOptions(beast: Beast) {
        const actionSheet = await actionSheetController.create({
          header: beast.name,
          subHeader: `${beast.checklist?.length || 0} Checks | ${
            beast.achievementIds?.length || 0
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
          .then(this.loadBeasts)
          .then(this.bestiary.showDeleteToast);
      },
      async clickAddBeast(beast?: Beast) {
        if (beast) {
          this.router.push({
            name: "xp-create-update-beast",
            params: { id: beast.id },
          });
        } else {
          this.router.push({ name: "xp-create-update-beast" });
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
        const pad = id.toString().padStart(3, "0");
        return require(`@/assets/images/beasts/${pad}.png`);
      },

      async loadBeasts() {
        this.isLoading = true;
        try {
          await this.bestiary.getBeasts().then(this.setBeasts);
        } finally {
          this.isLoading = false;
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
                // Background presets are currently tied to the EB engine
                // which is disabled for the index page.
                this.bestiary.showWarningToast(
                  "Presets only available for beast backgrounds."
                );
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
      },

      ionViewDidEnter() {
        debug.log("ionViewDidEnter - XpBestiary");
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

      // Check registry for existing "Add New" pattern to keep it stable
      const savedAddNew = backgroundManager.getState("__add_new__");
      const addNewBg1 =
        savedAddNew?.bg1 !== undefined
          ? savedAddNew.bg1
          : Math.floor(Math.random() * 325);
      const addNewBg2 =
        savedAddNew?.bg2 !== undefined
          ? savedAddNew.bg2
          : Math.floor(Math.random() * 325);

      // Save it back to ensure it stays consistent
      if (!savedAddNew) {
        backgroundManager.saveState("__add_new__", {
          tick: 0,
          bg1: addNewBg1,
          bg2: addNewBg2,
        });
      }

      return {
        beasts,
        bestiary,
        router,
        searchQuery,
        filteredBeasts,
        addNewBg1,
        addNewBg2,
        isLoading,
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
