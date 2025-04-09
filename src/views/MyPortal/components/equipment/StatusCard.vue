<template>
  <ion-card class="status">
    <ion-card-title>Status</ion-card-title>
    <ion-card-content class="content">
      <i class="fad fa-3x fa-dice-d4"></i>
      <i class="fad fa-3x fa-dice-d6"></i>
      <i class="fad fa-3x fa-dice-d8"></i>
      <i class="fad fa-3x fa-dice-d10"></i>
      <i class="fad fa-3x fa-dice-d12"></i>
      <i class="fad fa-3x fa-dice-d20"></i>
    </ion-card-content>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "status-card"
});
</script>

<style lang="scss" scoped>
.status {
  height: 20vh;
}
</style>
