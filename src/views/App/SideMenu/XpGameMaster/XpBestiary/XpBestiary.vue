<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title>
          Bestiary
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item-sliding
          v-for="beast in beasts"
          :key="beast.id"
        >
          <ion-item>
            <ion-avatar slot="start">
              <ion-skeleton-text></ion-skeleton-text>
              <!-- <ion-img>
              </ion-img> -->
            </ion-avatar>
            <ion-label>
              {{ beast.name }}
              <p>
                {{ beast.checklist.length }} Checks
                found on
                {{ beast.achievementIds?.length }} Achievements
              </p>
            </ion-label>
            <ion-buttons slot="end">
              <ion-button @click="clickAddBeast(beast)">
                <i class="fad fa-edit fa-lg" />
              </ion-button>
              <ion-button @click="clickAttachBeast(beast)">
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
    </ion-content>
    <ion-fab
      vertical="bottom"
      horizontal="end"
    >
      <ion-fab-button>
        <ion-icon :icon="add" />
      </ion-fab-button>
      <ion-fab-list side="top">
        <ion-fab-button @click="clickAddBeast">
          <i class="fad fa-dragon"></i>
        </ion-fab-button>
        <!-- <ion-fab-button @click="clickDiscover">
          <i class="fad fa-search"></i>
        </ion-fab-button>
        <ion-fab-button>
          <i class="fad fa-thumbs-up"></i>
        </ion-fab-button> -->
      </ion-fab-list>
    </ion-fab>

  </ion-page>
</template>

<script lang="ts">
  import { computed, defineComponent, ref } from 'vue'
  import { add } from 'ionicons/icons'
  import ionic from "@/mixins/ionic";
  import { alertController, modalController } from '@ionic/vue';
  import XpAttachBeast from './components/XpAttachBeast.vue';

  import AddBeast from './components/XpAddBeast.vue'
  import BestiaryDb, { beastStorage, Beast } from '@/databases/BestiaryDb';

  export default defineComponent({
    name: 'xp-bestiary',
    mixins: [ionic],
    methods: {
      async clickDeleteBeast(beast: Beast) {
        const alert = await alertController.create({
          header: 'Delete Beast',
          mode: 'ios',
          message: `Are you sure you want to delete ${beast.name}?`,
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel'
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: () => {
                this.deleteBeast(beast)
              }
            }
          ]
        });
        alert.present();

      },
      async deleteBeast(beast: Beast) {
        await this.bestiary.deleteBeast(beast)
          .then(this.loadBeasts)
          .then(this.bestiary.showDeleteToast)
      },
      async clickAddBeast(beast?: Beast) {
        const modal = await modalController.create({
          component: AddBeast,
          componentProps: {
            beast
          }
        });
        modal.onDidDismiss().then(this.loadBeasts);
        modal.present()
      },

      async clickAttachBeast(beast: Beast) {
        const modal = await modalController.create({
          component: XpAttachBeast,
          componentProps: {
            beast

          }
        });
        modal.onDidDismiss().then(async ({ data }) => {
          if (data) {
            beast.achievementIds = data
            await this.bestiary
              .setBeast(beast)
              .then(() => this.bestiary.showSuccessToast("Attachments saved!"))
          }
        }).then(this.loadBeasts);
        modal.present()
      },


      async loadBeasts() {
        await this.bestiary
          .getBeasts()
          .then(this.setBeasts)
      },
      setBeasts(beasts: Beast[]) {
        this.beasts = beasts
      }

    },
    mounted() {
      this.loadBeasts()
    },
    setup() {
      const bestiary = new BestiaryDb(beastStorage)
      const beasts = ref([] as Beast[])

      return {
        beasts,
        bestiary,
        add
      };
    }
  })
</script>

<style lang="scss" scoped>
  ion-fab-list {
    ion-fab-button {
      &::before {
        position: absolute;
        right: 53px;
        top: 12px;
        cursor: pointer;
      }

      &:nth-child(1)::before {
        content: "Create your Own ";
      }

      &:nth-child(2)::before {
        content: "Add from Discover";
      }

      &:nth-child(3)::before {
        content: "Add from Recommended";
      }
    }
  }
</style>
