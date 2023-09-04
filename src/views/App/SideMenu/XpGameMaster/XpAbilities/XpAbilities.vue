<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-title>
          Abilities
        </ion-title>
      </ion-toolbar>
    </ion-header>

  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import ionic from '@/mixins/ionic'

  export default defineComponent({
    name: 'XpAbilities',
    mixins: [ionic],
    data() {
      return {
        // data properties go here
      }
    },
    methods: {
      // methods go here
    }
  })
</script>

<style scoped>
/* Styles go here */
</style>
