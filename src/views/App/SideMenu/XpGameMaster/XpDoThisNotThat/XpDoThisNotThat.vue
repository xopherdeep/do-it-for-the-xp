<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title>
          {{ doDonts.length }}
          Do This, Not That!
        </ion-title>
      </ion-toolbar>
      <ion-segment v-model="activeSegment">
        <ion-segment-button value="do">
          {{ dos.length }} Do's
        </ion-segment-button>
        <ion-segment-button value="dont">
          {{ donts.length }} Don'ts
        </ion-segment-button>
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
            <ion-avatar slot="start">
              <ion-skeleton-text></ion-skeleton-text>
            </ion-avatar>
            <ion-label>
              {{ task.whatFor }}
              <p>
                <ion-badge
                  v-if="task.awardPoints.ap"
                  slot="end"
                  color="danger"
                  class="mr-1"
                >
                  {{ task.points.ap }}
                  <i class="fad fa-hand-holding-magic" />
                </ion-badge>
                <ion-badge
                  v-if="task.awardPoints.xp"
                  slot="end"
                  color="success"
                  class="mx-1"
                >
                  {{ task.points.xp }}
                  <i class="fad fa-hand-holding-seedling" />
                </ion-badge>
                <ion-badge
                  v-if="task.awardPoints.gp"
                  slot="end"
                  color="warning"
                  class="mx-1"
                >
                  <xp-gp :gp="task.points.gp" />

                  <i class="fad fa-hand-holding-usd ml-1" />
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
            <i class="fad fa-grip-vertical ml-1" slot="end" />
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
  import { defineComponent, ref, watch } from "vue";
  import { alertController, modalController } from "@ionic/vue";
  import { add } from "ionicons/icons";
  import XpAddDoDont from "./components/XpAddDoDont.vue";
  import { useRoute } from "vue-router";
  import DosDontsDb, { DosDont } from "@/databases/DosDontsDb";

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
      dos() {
        const isDo = (doDont) => doDont.type === "do";
        return this.doDonts.filter(isDo);
      },
      donts() {
        const isDont = (doDont) => doDont.type === "dont";
        return this.doDonts.filter(isDont);
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
              handler: () => this.deleteDoDont(doDont).then(showToast),
            },
          ],
        });
        const showToast = () => this.doDontDb.showSuccessToast("Deleted!");
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
          cssClass: "fullscreen",
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
        await this.doDontDb.cloneDosDont(doDont).then(() => {
          this.loadDoDonts();
        });
      },
    },

    setup() {
      const route = useRoute();
      const query = route.query;
      const segment = query.openDo === "false" ? "dont" : "do";
      const activeSegment = ref(segment);

      // const activeSegment = ref("do");
      const doDontDb = new DosDontsDb();
      const doDonts = ref([] as DosDont[]);

      const loadDoDonts = async () => {
        const all = await doDontDb.getAll();
        //sort them a-z
        doDonts.value = all.sort((a, b) => a.whatFor.localeCompare(b.whatFor));
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
