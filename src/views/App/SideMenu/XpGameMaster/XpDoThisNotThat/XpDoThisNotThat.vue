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
        <ion-segment-button value="dos"> Do's </ion-segment-button>
        <ion-segment-button value="donts"> Don'ts </ion-segment-button>
        <ion-segment-button value="history"> History </ion-segment-button>
      </ion-segment>
    </ion-header>
    <ion-content> </ion-content>
    <ion-fab vertical="bottom" horizontal="end">
      <ion-fab-button @click="clickAdd">
        <ion-icon :icon="add" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>
<script lang="ts">
  import { defineComponent, ref, watch, computed } from "vue";
  import { modalController } from "@ionic/vue";
  import { add } from "ionicons/icons";
  import XpAddDoDont from "./components/XpAddDoDont.vue";
  import { useRoute } from "vue-router";
  import DoDontDb, { doDontStorage } from "@/databases/DoDontDb";

  import ionic from "@/mixins/ionic";
  export default defineComponent({
    name: "XpDoThisNotThat",
    mixins: [ionic],

    methods: {
      async clickAdd() {
        const modal = await modalController.create({
          component: XpAddDoDont,
          componentProps: {
            do: true,
          },
        });
        modal.present();
      },

      async loadDoDonts() {
        this.doDonts = await this.doDontDb.getAll();
      },
    },

    computed: {
      filteredDoDonts() {
        // Add your filtering logic here
      },

      groupedDoDonts() {
        // Add your grouping logic here
      },
    },

    setup() {
      const activeSegment = ref("dos");
      const doDontDb = new DoDontDb(doDontStorage);
      const doDonts = ref([]);

      const route = useRoute();
      watch(
        () => route.path,
        async (newPath, oldPath) => {
          if (newPath !== oldPath) {
            // Reload your component's data when the route changes
            await this.loadDoDonts();
          }
        },
        { immediate: true } // Fetch data immediately when the component is created
      );

      return { add, activeSegment, doDontDb, doDonts };
    },

    mounted() {
      this.loadDoDonts();
    },
  });
</script>
