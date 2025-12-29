<template>
  <ion-page>
    <ion-content class="ion-padding">
      <div class="flex flex-col items-center justify-center h-full">
        <i class="fad fa-user-friends fa-4x mb-4 text-light"></i>
        <h2 class="text-xl font-bold">Shop Clerk</h2>
        <p class="text-medium">Manage the NPC shopkeeper for {{ shopId }}.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import Ionic from "@/lib/mixins/ionic";

  export default defineComponent({
    name: "XpShopClerkTab",
    mixins: [Ionic],
    props: {
      shopId: { type: String, required: true },
    },
  });
</script>
