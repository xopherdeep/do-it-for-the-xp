<template>
  <ion-card class="todays-achievements">
    <ion-card-title>Achievements</ion-card-title>
    <ion-button @click="$emit('change-bg')" expand="block">
      <i class="fad fa-ankh fa-2x"></i>
    </ion-button>
    <i v-for="n in 7" :key="n" class="fad fa-diamond fa-lg"></i>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "achievements-card",
  emits: ["change-bg"]
});
</script>

<style lang="scss" scoped>
.todays-achievements {
  ion-button {
    width: 100%;
  }

  padding: 1em 0 !important;
  height: calc(100vh - 50vh - 20vh - 5em) !important;
  text-align: center;

  i {
    width: calc((100% / 7) - 5px);
  }
}
</style>
