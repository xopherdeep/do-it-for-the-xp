<template>
  <ion-item button detail>
    <i class="fad fa-place-of-worship fa-lg" slot="start" />
    <ion-label>
      Game World
      <p>Configure how and where everything is.</p>
    </ion-label>
  </ion-item>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import ionic from "@/mixins/ionic";

  export default defineComponent({
    name: "xp-temples",
    mixins: [ionic],
  });
</script>

<style lang="scss" scoped>
  .xp-temples {
  }
</style>
