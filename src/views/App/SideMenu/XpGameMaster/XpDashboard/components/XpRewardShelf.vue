<template>
  <ion-card>
    <ion-card-title>
      Reward Shelf
    </ion-card-title>
    <ion-grid>
      <ion-row>
        <ion-col>
          <i class="fad fa-trophy fa-5x"></i>
        </ion-col>
        <ion-col>
          <ion-row >
            80 Rewards
          </ion-row>
        </ion-col>
      </ion-row>
    </ion-grid>
  </ion-card>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import ionic from '@/mixins/ionic'

  export default defineComponent({
    name: 'xp-reward-shelf',
    mixins: [ionic]
  })
</script>

<style>

</style>
