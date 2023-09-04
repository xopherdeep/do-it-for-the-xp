<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title> Do This Not That </ion-title>
      </ion-toolbar>
      <ion-segment v-modle="activeSegment">
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
  import { defineComponent, ref } from "vue";
  import { modalController } from "@ionic/vue";
  import { add } from "ionicons/icons";
  import XpAddDoDont from "./components/XpAddDoDont.vue";

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
    },

    setup() {
      const activeSegment = ref("dos");
      return { add, activeSegment };
    },
  });
</script>
