<template>
  <ion-page>
    <ion-content class="ion-padding">
      <div class="flex flex-col items-center justify-center h-full">
        <i class="fad fa-paint-brush fa-4x mb-4 text-secondary"></i>
        <h2 class="text-xl font-bold">Decorate Shop</h2>
        <p class="text-medium">Customize appearance for {{ shopId }}.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Ionic from "@/mixins/ionic";

export default defineComponent({
  name: "XpShopDecorateTab",
  mixins: [Ionic],
  props: {
    shopId: { type: String, required: true }
  }
});
</script>
