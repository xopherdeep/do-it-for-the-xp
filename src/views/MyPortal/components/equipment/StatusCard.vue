<template>
  <ion-card class="status">
    <ion-card-title>Status</ion-card-title>
    <ion-card-content class="content">
      <div class="dice-grid">
        <div class="dice-item">
          <i class="fad fa-3x fa-dice-d4"></i>
        </div>
        <div class="dice-item">
          <i class="fad fa-3x fa-dice-d6"></i>
        </div>
        <div class="dice-item">
          <i class="fad fa-3x fa-dice-d8"></i>
        </div>
        <div class="dice-item">
          <i class="fad fa-3x fa-dice-d10"></i>
        </div>
        <div class="dice-item">
          <i class="fad fa-3x fa-dice-d12"></i>
        </div>
        <div class="dice-item">
          <i class="fad fa-3x fa-dice-d20"></i>
        </div>
      </div>
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
  // height: 20vh; // Removed fixed height
  display: flex; // Added for consistency
  flex-direction: column; // Added for consistency

  .content {
    display: flex;
    justify-content: center;
    align-items: center;
    // height: calc(100% - 44px); // Removed height calculation
    padding: 0;
    flex: 1; // Allow content to take space
  }
  .dice-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    grid-template-rows: 1fr;
    gap: 10px;
    width: 100%;
    height: 100%;
    padding: 10px;
  }
  
  .dice-item {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 5px;
    border-radius: 8px;
    background-color: rgba(255, 255, 255, 0.05);
  }
}
</style>
