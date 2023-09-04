<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title>
          Abilities
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-fab
        vertical="bottom"
        horizontal="end"
      >
        <ion-fab-button>
          <ion-icon :icon="add" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref } from 'vue'
  import ionic from '@/mixins/ionic'

  import { add } from 'ionicons/icons'

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
    },
    setup() {
      const updateAbility = ref({
        
      })
      return {
        add
      }
    }
  })
</script>

<style scoped>
/* Styles go here */
</style>
