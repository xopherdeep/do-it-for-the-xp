<template>
  <ion-header>
    <ion-toolbar>
      <ion-title> Add </ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="bg-slide"> </ion-content>
  <ion-footer> </ion-footer>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import { modalController } from "@ionic/vue";

  export default defineComponent({
    name: "XpAddDoDont",
    props: {
      do: {
        type: Boolean,
        default: true,
      },
    },
    methods: {
      dismiss() {
        modalController.dismiss();
      },
    },
  });
</script>
