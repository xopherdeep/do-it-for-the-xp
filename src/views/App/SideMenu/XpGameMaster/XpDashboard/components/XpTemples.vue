<template>
  <ion-item button detail class="temples-item" @click="navigateToTemples">
    <i class="fad fa-place-of-worship fa-2x" slot="start" />
    <ion-label>
      <div class="temples-header">
        <span>Game World</span>
        <ion-badge color="primary">{{ templeCount }} Temples</ion-badge>
      </div>
      <p>Configure how and where everything is.</p>
    </ion-label>
    <ion-note slot="end" color="medium">
      <i class="fad fa-map-marked-alt mr-1"></i>
      World Map
    </ion-note>
  </ion-item>
</template>

<script lang="ts">
  import { defineComponent, ref } from "vue";
  import ionic from "@/mixins/ionic";
  import { useRouter } from "vue-router";

  export default defineComponent({
    name: "xp-temples",
    mixins: [ionic],
    setup() {
      const router = useRouter();
      const templeCount = ref(7); // This would come from actual data
      
      const navigateToTemples = () => {
        router.push('/game-master/compendium/temples');
      };
      
      return {
        templeCount,
        navigateToTemples
      };
    }
  });
</script>

<style lang="scss" scoped>
  .temples-item {
    --background: rgba(var(--ion-color-primary-rgb), 0.05);
    margin-bottom: 8px;
    border-radius: 8px;
    
    ion-note {
      font-size: 12px;
      display: flex;
      align-items: center;
    }
  }
  
  .temples-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    ion-badge {
      margin-left: 8px;
    }
  }
</style>
