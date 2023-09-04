<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title> Do This Not That </ion-title>
      </ion-toolbar>
      <ion-segment v-model="activeSegment">
        <ion-segment-button value="do"> Do's </ion-segment-button>
        <ion-segment-button value="dont"> Don'ts </ion-segment-button>
        <ion-segment-button value="history"> History </ion-segment-button>
      </ion-segment>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item-sliding
          v-for="(task, index) in dosDontsBySegment"
          :key="index"
        >
          <ion-item-options side="start">
            <ion-item-option color="danger" @click="clickDeleteDoDont(task)">
              <i class="fad fa-trash fa-lg mx-2 my-1" slot="top" />
              Remove
            </ion-item-option>
          </ion-item-options>
          <ion-item>
            <ion-label>
              {{ task.whatFor }}
              <p>
                <ion-badge
                  color="success"
                  slot="end"
                  v-if="task.points.xp"
                  class="mr-1"
                >
                  {{ task.points.xp }}
                  <i class="fad fa-hand-holding-seedling" />
                </ion-badge>
                <ion-badge
                  color="danger"
                  slot="end"
                  v-if="task.points.ap"
                  class="mx-1"
                >
                  {{ task.points.ap }}
                  <i class="fad fa-hand-holding-magic" />
                </ion-badge>
                <ion-badge
                  color="warning"
                  slot="end"
                  v-if="task.points.gp"
                  class="mx-1"
                >
                  <xp-gp :gp="task.points.gp" />
                </ion-badge>
              </p>
            </ion-label>
            <ion-buttons slot="end" class="m-0">
              <ion-button @click="clickAdd(task)">
                <i
                  class="fad fa-2x"
                  :class="
                    task.type === 'dont'
                      ? 'fad fa-thumbs-down'
                      : 'fad fa-thumbs-up'
                  "
                />
              </ion-button>
            </ion-buttons>
            <i class="fad fa-grip-vertical mr-1" slot="end" />
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="primary" @click="clickAdd(task)">
              <i class="fad fa-edit fa-lg mx-2 my-1" slot="top" />
              Edit
            </ion-item-option>
            <ion-item-option color="primary" @click="clickCloneDoDont(task)">
              Clone
              <i class="fad fa-clone fa-lg mx-2 my-1" slot="top" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>
    </ion-content>
    <ion-fab vertical="bottom" horizontal="end">
      <ion-fab-button @click="clickAdd()">
        <ion-icon :icon="add" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>
<script lang="ts">
  import { defineComponent, ref, watch, computed } from "vue";
  import { alertController, modalController } from "@ionic/vue";
  import { add } from "ionicons/icons";
  import XpAddDoDont from "./components/XpAddDoDont.vue";
  import { useRoute } from "vue-router";
  import DoDontDb, { DosDont, dosDontsStorage } from "@/databases/DosDontsDb";

  import ionic from "@/mixins/ionic";
  export default defineComponent({
    name: "XpDoThisNotThat",
    mixins: [ionic],

    computed: {
      dosDontsBySegment() {
        return this.doDonts.filter(
          (doDont) => doDont.type === this.activeSegment
        );
      },
    },

    methods: {
      async clickDeleteDoDont(doDont: DosDont) {
        const alert = await alertController.create({
          header: "Delete",
          mode: "ios",
          message: `Are you sure you want to delete ${doDont.whatFor}?`,
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Delete",
              role: "destructive",
              handler: () => this.deleteDoDont(doDont),
            },
          ],
        });
        alert.present();
      },
      async deleteDoDont(doDont: DosDont) {
        await this.doDontDb.remove(doDont.id).then(() => {
          this.loadDoDonts();
        });
      },
      async clickAdd(doDont?: DosDont) {
        const modal = await modalController.create({
          component: XpAddDoDont,
          componentProps: {
            do: true,
            doDont,
          },
        });
        modal.onDidDismiss().then(() => {
          this.loadDoDonts();
        });
        modal.present();
      },
      async clickCloneDoDont(doDont: DosDont) {
        await this.doDontDb.clone(doDont).then(() => {
          this.loadDoDonts();
        });
      },
    },

    setup() {
      const activeSegment = ref("do");
      const doDontDb = new DoDontDb(dosDontsStorage);
      const doDonts = ref([] as DosDont[]);

      const route = useRoute();

      const loadDoDonts = async () => {
        doDonts.value = await doDontDb.getAll();
      };
      watch(
        () => route.path,
        async () => await loadDoDonts(),
        { immediate: true } // Fetch data immediately when the component is created
      );

      return {
        add,
        activeSegment,
        doDontDb,
        doDonts,
        loadDoDonts,
      };
    },

    mounted() {
      this.loadDoDonts();
    },
  });
</script>
