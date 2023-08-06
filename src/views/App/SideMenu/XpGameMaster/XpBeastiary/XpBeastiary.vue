<template>
  <ion-page :class="$options.name">
    Hellos

  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import ionic from "@/mixins/ionic";
  
  export default defineComponent({
    name: 'xp-beastiary',
    mixins: [ionic],

  })
</script>

<style>

</style>
